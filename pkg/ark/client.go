// pkg/ark/client.go
package ark

import (
    "context"
    "fmt"
    "time"

    "github.com/ark-network/ark/api-spec/protobuf/gen/ark/v1"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// Client wraps the Ark protocol gRPC client
type Client struct {
    conn   *grpc.ClientConn
    client arkv1.ArkServiceClient
}

// Config holds the Ark service configuration
type Config struct {
    Host            string
    Port            int
    ConnectTimeout  time.Duration
    RequestTimeout  time.Duration
}

// NewClient creates a new Ark protocol client
func NewClient(cfg Config) (*Client, error) {
    // Set up a connection to the server
    addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
    
    ctx, cancel := context.WithTimeout(context.Background(), cfg.ConnectTimeout)
    defer cancel()
    
    conn, err := grpc.DialContext(
        ctx,
        addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithBlock(),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to connect to Ark service: %w", err)
    }
    
    client := arkv1.NewArkServiceClient(conn)
    
    return &Client{
        conn:   conn,
        client: client,
    }, nil
}

// Close closes the client connection
func (c *Client) Close() error {
    if c.conn != nil {
        return c.conn.Close()
    }
    return nil
}

// GetInfo retrieves information about the Ark service
func (c *Client) GetInfo(ctx context.Context) (*arkv1.GetInfoResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    return c.client.GetInfo(ctx, &arkv1.GetInfoRequest{})
}

// RegisterInputsForNextRound registers inputs for the next round
func (c *Client) RegisterInputsForNextRound(
    ctx context.Context,
    serializedPsbts []string,
) (*arkv1.RegisterInputsForNextRoundResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    req := &arkv1.RegisterInputsForNextRoundRequest{
        SerializedPsbts: serializedPsbts,
    }
    
    return c.client.RegisterInputsForNextRound(ctx, req)
}

// RegisterOutputsForNextRound registers outputs for the next round
func (c *Client) RegisterOutputsForNextRound(
    ctx context.Context,
    outputs []*arkv1.Output,
) (*arkv1.RegisterOutputsForNextRoundResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    req := &arkv1.RegisterOutputsForNextRoundRequest{
        Outputs: outputs,
    }
    
    return c.client.RegisterOutputsForNextRound(ctx, req)
}

// SubmitSignedForfeitTxs submits signed forfeit transactions
func (c *Client) SubmitSignedForfeitTxs(
    ctx context.Context,
    roundID string,
    serializedPsbts []string,
) (*arkv1.SubmitSignedForfeitTxsResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    req := &arkv1.SubmitSignedForfeitTxsRequest{
        RoundId:         roundID,
        SerializedPsbts: serializedPsbts,
    }
    
    return c.client.SubmitSignedForfeitTxs(ctx, req)
}

// GetTransactionsStream gets a stream of transactions
func (c *Client) GetTransactionsStream(
    ctx context.Context,
) (arkv1.ArkService_GetTransactionsStreamClient, error) {
    req := &arkv1.GetTransactionsStreamRequest{}
    return c.client.GetTransactionsStream(ctx, req)
}
