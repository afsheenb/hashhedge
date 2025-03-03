// pkg/ark/client.go
package ark

import (
    "context"
    "errors"
    "fmt"
    "io"
    "sync"
    "time"

    "github.com/ark-network/ark/api-spec/protobuf/gen/ark/v1"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/credentials/insecure"
    "google.golang.org/grpc/status"
    "github.com/rs/zerolog/log"
)

// RetryConfig defines retry behavior for ASP communications
type RetryConfig struct {
    MaxRetries  int
    InitialBackoff time.Duration
    MaxBackoff time.Duration
    BackoffFactor float64
}

// DefaultRetryConfig provides sensible defaults for retry behavior
var DefaultRetryConfig = RetryConfig{
    MaxRetries:     5,
    InitialBackoff: 500 * time.Millisecond,
    MaxBackoff:     30 * time.Second,
    BackoffFactor:  1.5,
}

// Client wraps the Ark protocol gRPC client with enhanced reliability
type Client struct {
    conn             *grpc.ClientConn
    client           arkv1.ArkServiceClient
    streamMutex      sync.Mutex
    streamCtx        context.Context
    streamCancel     context.CancelFunc
    txStream         arkv1.ArkService_GetTransactionsStreamClient
    reconnectStream  chan struct{}
    retryConfig      RetryConfig
    host             string
    port             int
    connectTimeout   time.Duration
    requestTimeout   time.Duration
}

// Config holds the Ark service configuration
type Config struct {
    Host            string
    Port            int
    ConnectTimeout  time.Duration
    RequestTimeout  time.Duration
    RetryConfig     *RetryConfig
}

// NewClient creates a new Ark protocol client with enhanced reliability
func NewClient(cfg Config) (*Client, error) {
    // Use default retry config if none provided
    retryConfig := DefaultRetryConfig
    if cfg.RetryConfig != nil {
        retryConfig = *cfg.RetryConfig
    }
    
    // Create client instance first, connection established in Connect method
    client := &Client{
        host:           cfg.Host,
        port:           cfg.Port,
        connectTimeout: cfg.ConnectTimeout,
        requestTimeout: cfg.RequestTimeout,
        retryConfig:    retryConfig,
        reconnectStream: make(chan struct{}, 1),
    }
    
    // Establish initial connection
    if err := client.Connect(); err != nil {
        return nil, err
    }
    
    // Start stream management
    client.streamCtx, client.streamCancel = context.WithCancel(context.Background())
    go client.manageTransactionStream(client.streamCtx)
    
    return client, nil
}

// Connect establishes a connection to the ASP
func (c *Client) Connect() error {
    addr := fmt.Sprintf("%s:%d", c.host, c.port)
    
    ctx, cancel := context.WithTimeout(context.Background(), c.connectTimeout)
    defer cancel()
    
    conn, err := grpc.DialContext(
        ctx,
        addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithBlock(),
    )
    if err != nil {
        return fmt.Errorf("failed to connect to Ark service: %w", err)
    }
    
    c.conn = conn
    c.client = arkv1.NewArkServiceClient(conn)
    
    return nil
}

// Close closes the client connection and stops stream management
func (c *Client) Close() error {
    // Cancel stream context to stop management goroutine
    if c.streamCancel != nil {
        c.streamCancel()
    }
    
    // Close connection if exists
    if c.conn != nil {
        return c.conn.Close()
    }
    return nil
}

// withRetry executes the provided function with retry logic
func (c *Client) withRetry(operation string, f func() error) error {
    var lastErr error
    backoff := c.retryConfig.InitialBackoff
    
    for attempt := 0; attempt <= c.retryConfig.MaxRetries; attempt++ {
        // On any attempt other than the first, log we're retrying
        if attempt > 0 {
            log.Info().
                Str("operation", operation).
                Int("attempt", attempt).
                Dur("backoff", backoff).
                Err(lastErr).
                Msg("Retrying ASP operation")
        }
        
        // Execute the function
        if err := f(); err == nil {
            // Success - return nil
            return nil
        } else {
            lastErr = err
            
            // Check if error is not retriable
            if isNonRetriableError(err) {
                log.Error().
                    Str("operation", operation).
                    Err(err).
                    Msg("Non-retriable error from ASP")
                return err
            }
            
            // If we've hit max retries, return the error
            if attempt == c.retryConfig.MaxRetries {
                break
            }
            
            // Wait before retrying
            time.Sleep(backoff)
            
            // Increase backoff for next attempt, up to max
            backoff = time.Duration(float64(backoff) * c.retryConfig.BackoffFactor)
            if backoff > c.retryConfig.MaxBackoff {
                backoff = c.retryConfig.MaxBackoff
            }
        }
    }
    
    return fmt.Errorf("operation %s failed after %d attempts: %w", 
        operation, c.retryConfig.MaxRetries+1, lastErr)
}

// isNonRetriableError identifies errors that shouldn't be retried
func isNonRetriableError(err error) bool {
    if err == nil {
        return false
    }
    
    // Check gRPC status codes that shouldn't be retried
    if s, ok := status.FromError(err); ok {
        switch s.Code() {
        case codes.InvalidArgument,
             codes.NotFound,
             codes.AlreadyExists,
             codes.PermissionDenied,
             codes.Unauthenticated:
            return true
        }
    }
    
    return false
}

// GetInfo retrieves information about the Ark service with retries
func (c *Client) GetInfo(ctx context.Context) (*arkv1.GetInfoResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    var result *arkv1.GetInfoResponse
    err := c.withRetry("GetInfo", func() error {
        var err error
        result, err = c.client.GetInfo(ctx, &arkv1.GetInfoRequest{})
        return err
    })
    
    return result, err
}

// RegisterInputsForNextRound registers inputs for the next round with retries
func (c *Client) RegisterInputsForNextRound(
    ctx context.Context,
    serializedPsbts []string,
) (*arkv1.RegisterInputsForNextRoundResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.RegisterInputsForNextRoundRequest{
        SerializedPsbts: serializedPsbts,
    }
    
    var result *arkv1.RegisterInputsForNextRoundResponse
    err := c.withRetry("RegisterInputsForNextRound", func() error {
        var err error
        result, err = c.client.RegisterInputsForNextRound(ctx, req)
        return err
    })
    
    return result, err
}

// RegisterOutputsForNextRound registers outputs for the next round with retries
func (c *Client) RegisterOutputsForNextRound(
    ctx context.Context,
    outputs []*arkv1.Output,
) (*arkv1.RegisterOutputsForNextRoundResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.RegisterOutputsForNextRoundRequest{
        Outputs: outputs,
    }
    
    var result *arkv1.RegisterOutputsForNextRoundResponse
    err := c.withRetry("RegisterOutputsForNextRound", func() error {
        var err error
        result, err = c.client.RegisterOutputsForNextRound(ctx, req)
        return err
    })
    
    return result, err
}

// SubmitSignedForfeitTxs submits signed forfeit transactions with retries
func (c *Client) SubmitSignedForfeitTxs(
    ctx context.Context,
    roundID string,
    serializedPsbts []string,
) (*arkv1.SubmitSignedForfeitTxsResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.SubmitSignedForfeitTxsRequest{
        RoundId:         roundID,
        SerializedPsbts: serializedPsbts,
    }
    
    var result *arkv1.SubmitSignedForfeitTxsResponse
    err := c.withRetry("SubmitSignedForfeitTxs", func() error {
        var err error
        result, err = c.client.SubmitSignedForfeitTxs(ctx, req)
        return err
    })
    
    return result, err
}

// manageTransactionStream maintains the transaction stream connection
func (c *Client) manageTransactionStream(ctx context.Context) {
    // Start initial stream
    if err := c.establishTransactionStream(); err != nil {
        log.Error().Err(err).Msg("Failed to establish initial transaction stream")
        // Queue reconnection attempt
        c.queueStreamReconnect()
    }
    
    // Monitor for stream issues and handle reconnection
    for {
        select {
        case <-ctx.Done():
            // Context cancelled, exit the goroutine
            return
            
        case <-c.reconnectStream:
            // Attempt to reconnect with backoff
            backoff := c.retryConfig.InitialBackoff
            maxAttempts := c.retryConfig.MaxRetries
            
            for attempt := 0; attempt <= maxAttempts; attempt++ {
                if attempt > 0 {
                    log.Info().
                        Int("attempt", attempt).
                        Dur("backoff", backoff).
                        Msg("Attempting to reconnect transaction stream")
                    
                    // Wait before retrying
                    select {
                    case <-ctx.Done():
                        return
                    case <-time.After(backoff):
                        // Continue with reconnection attempt
                    }
                    
                    // Increase backoff for next attempt
                    backoff = time.Duration(float64(backoff) * c.retryConfig.BackoffFactor)
                    if backoff > c.retryConfig.MaxBackoff {
                        backoff = c.retryConfig.MaxBackoff
                    }
                }
                
                // Attempt to establish the stream
                if err := c.establishTransactionStream(); err == nil {
                    log.Info().Msg("Transaction stream successfully reconnected")
                    break
                } else if attempt == maxAttempts {
                    log.Error().
                        Err(err).
                        Int("attempts", attempt+1).
                        Msg("Failed to reconnect transaction stream after multiple attempts")
                }
            }
        }
    }
}

// establishTransactionStream creates a new transaction stream
func (c *Client) establishTransactionStream() error {
    c.streamMutex.Lock()
    defer c.streamMutex.Unlock()
    
    // Close existing stream if any
    if c.txStream != nil {
        // Ignore errors from closing the stream
        _ = c.txStream.CloseSend()
        c.txStream = nil
    }
    
    // Create new stream
    var err error
    c.txStream, err = c.client.GetTransactionsStream(context.Background(), &arkv1.GetTransactionsStreamRequest{})
    if err != nil {
        return fmt.Errorf("failed to establish transaction stream: %w", err)
    }
    
    // Start goroutine to process stream messages
    go c.processTransactionStream()
    
    return nil
}

// processTransactionStream handles messages from the transaction stream
func (c *Client) processTransactionStream() {
    for {
        response, err := c.txStream.Recv()
        if err != nil {
            if err == io.EOF || errors.Is(err, context.Canceled) {
                // Stream closed normally
                log.Info().Msg("Transaction stream closed normally")
            } else {
                // Stream error, queue reconnection
                log.Error().Err(err).Msg("Error in transaction stream")
                c.queueStreamReconnect()
            }
            return
        }
        
        // Process the received transaction
        // Here you would typically dispatch this to appropriate handlers
        log.Info().
            Str("txid", response.GetTxid()).
            Str("type", response.GetType().String()).
            Msg("Received transaction from stream")
            
        // Example of dispatching based on transaction type
        switch response.GetType() {
        case arkv1.TransactionType_TRANSACTION_TYPE_ROUND:
            // Handle round transaction
        case arkv1.TransactionType_TRANSACTION_TYPE_FORFEIT:
            // Handle forfeit transaction
        case arkv1.TransactionType_TRANSACTION_TYPE_OUT_OF_ROUND:
            // Handle out-of-round transaction
        case arkv1.TransactionType_TRANSACTION_TYPE_EXIT:
            // Handle exit transaction
        }
    }
}

// queueStreamReconnect triggers a stream reconnection attempt
func (c *Client) queueStreamReconnect() {
    // Non-blocking send to reconnection channel
    select {
    case c.reconnectStream <- struct{}{}:
        // Successfully queued reconnection
    default:
        // Reconnection already queued, do nothing
    }
}

// GetTransactionsStream gets a stream of transactions
// Note: This is a lower-level method; the client automatically manages
// the stream via manageTransactionStream for production use
func (c *Client) GetTransactionsStream(
    ctx context.Context,
) (arkv1.ArkService_GetTransactionsStreamClient, error) {
    req := &arkv1.GetTransactionsStreamRequest{}
    return c.client.GetTransactionsStream(ctx, req)
}

// CreateOutOfRoundTransaction creates an out-of-round transaction for direct transfers
func (c *Client) CreateOutOfRoundTransaction(
    ctx context.Context,
    senderPSBT string,
    outputs []*arkv1.Output,
) (*arkv1.CreateOutOfRoundTransactionResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.CreateOutOfRoundTransactionRequest{
        SerializedPsbt: senderPSBT,
        Outputs:        outputs,
    }
    
    var result *arkv1.CreateOutOfRoundTransactionResponse
    err := c.withRetry("CreateOutOfRoundTransaction", func() error {
        var err error
        result, err = c.client.CreateOutOfRoundTransaction(ctx, req)
        return err
    })
    
    return result, err
}

// SignOutOfRoundTransaction submits a signed OOR transaction
func (c *Client) SignOutOfRoundTransaction(
    ctx context.Context,
    txID string,
    signedPSBT string,
) (*arkv1.SignOutOfRoundTransactionResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.SignOutOfRoundTransactionRequest{
        TxId:           txID,
        SerializedPsbt: signedPSBT,
    }
    
    var result *arkv1.SignOutOfRoundTransactionResponse
    err := c.withRetry("SignOutOfRoundTransaction", func() error {
        var err error
        result, err = c.client.SignOutOfRoundTransaction(ctx, req)
        return err
    })
    
    return result, err
}

// GetExitPath generates an exit transaction to convert a VTXO to on-chain
func (c *Client) GetExitPath(
    ctx context.Context,
    vtxoID string,
    destinationAddress string,
    feeRate int64,
) (*arkv1.GetExitPathResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, c.requestTimeout)
    defer cancel()
    
    req := &arkv1.GetExitPathRequest{
        VtxoId:             vtxoID,
        DestinationAddress: destinationAddress,
        FeeRate:            feeRate,
    }
    
    var result *arkv1.GetExitPathResponse
    err := c.withRetry("GetExitPath", func() error {
        var err error
        result, err = c.client.GetExitPath(ctx, req)
        return err
    })
    
    return result, err
}

// CheckASPStatus verifies if the ASP is operational
func (c *Client) CheckASPStatus(ctx context.Context) (bool, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second) // Short timeout for status check
    defer cancel()
    
    _, err := c.GetInfo(ctx)
    if err != nil {
        log.Error().Err(err).Msg("ASP status check failed")
        return false, err
    }
    
    return true, nil
}
