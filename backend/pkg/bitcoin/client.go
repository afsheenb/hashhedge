package bitcoin

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/btcsuite/btcd/btcjson"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
	"github.com/btcsuite/btcd/wire"
)

// Block represents a Bitcoin block with the information we need
type Block struct {
	Hash              string
	Height            int64
	Time              time.Time
	Difficulty        float64
	PreviousBlockHash string
}

// Client wraps a Bitcoin RPC client
type Client struct {
	rpcClient *rpcclient.Client
}

// NewClient creates a new Bitcoin client
func NewClient(host, user, pass string, useTLS bool) (*Client, error) {
	// Configure RPC connection
	connCfg := &rpcclient.ConnConfig{
		Host:         host,
		User:         user,
		Pass:         pass,
		HTTPPostMode: true,
		DisableTLS:   !useTLS,
	}

	client, err := rpcclient.New(connCfg, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create Bitcoin RPC client: %w", err)
	}

	return &Client{
		rpcClient: client,
	}, nil
}

// Close shuts down the client
func (c *Client) Close() {
	if c.rpcClient != nil {
		c.rpcClient.Shutdown()
	}
}

// GetBestBlockHash returns the hash of the best block in the longest blockchain
func (c *Client) GetBestBlockHash(ctx context.Context) (string, error) {
	hash, err := c.rpcClient.GetBestBlockHashAsync().Receive()
	if err != nil {
		return "", fmt.Errorf("failed to get best block hash: %w", err)
	}
	return hash.String(), nil
}

// GetBlockHash returns the hash of the block at the given height
func (c *Client) GetBlockHash(ctx context.Context, height int64) (string, error) {
	hash, err := c.rpcClient.GetBlockHashAsync(height).Receive()
	if err != nil {
		return "", fmt.Errorf("failed to get block hash at height %d: %w", height, err)
	}
	return hash.String(), nil
}

// GetBlock retrieves a block by its hash
func (c *Client) GetBlock(ctx context.Context, hash string) (*Block, error) {
	blockHash, err := chainhash.NewHashFromStr(hash)
	if err != nil {
		return nil, fmt.Errorf("invalid block hash %s: %w", hash, err)
	}

	blockVerbose, err := c.rpcClient.GetBlockVerboseAsync(blockHash).Receive()
	if err != nil {
		return nil, fmt.Errorf("failed to get block %s: %w", hash, err)
	}

	// Convert Unix timestamp to time.Time
	blockTime := time.Unix(blockVerbose.Time, 0)

	block := &Block{
		Hash:              hash,
		Height:            blockVerbose.Height,
		Time:              blockTime,
		Difficulty:        blockVerbose.Difficulty,
		PreviousBlockHash: blockVerbose.PreviousHash,
	}

	return block, nil
}

// GetRawTransaction retrieves the raw transaction with the given hash
func (c *Client) GetRawTransaction(ctx context.Context, txID string) (string, error) {
	txHash, err := chainhash.NewHashFromStr(txID)
	if err != nil {
		return "", fmt.Errorf("invalid transaction ID %s: %w", txID, err)
	}

	tx, err := c.rpcClient.GetRawTransactionAsync(txHash).Receive()
	if err != nil {
		return "", fmt.Errorf("failed to get raw transaction %s: %w", txID, err)
	}

	return tx.String(), nil
}

// GetRawTransactionVerbose retrieves detailed information about a transaction
func (c *Client) GetRawTransactionVerbose(ctx context.Context, txHash *chainhash.Hash) (*btcjson.TxRawResult, error) {
	tx, err := c.rpcClient.GetRawTransactionVerboseAsync(txHash).Receive()
	if err != nil {
		return nil, fmt.Errorf("failed to get verbose transaction %s: %w", txHash.String(), err)
	}
	
	return tx, nil
}

// GetBlockHeaderVerbose retrieves detailed information about a block header
func (c *Client) GetBlockHeaderVerbose(ctx context.Context, blockHash *chainhash.Hash) (*btcjson.GetBlockHeaderVerboseResult, error) {
	header, err := c.rpcClient.GetBlockHeaderVerboseAsync(blockHash).Receive()
	if err != nil {
		return nil, fmt.Errorf("failed to get block header %s: %w", blockHash.String(), err)
	}
	
	return header, nil
}

// GetBlockCount returns the current block height
func (c *Client) GetBlockCount(ctx context.Context) (int64, error) {
	count, err := c.rpcClient.GetBlockCountAsync().Receive()
	if err != nil {
		return 0, fmt.Errorf("failed to get block count: %w", err)
	}
	
	return count, nil
}

// SendRawTransaction broadcasts a raw transaction to the network
func (c *Client) SendRawTransaction(ctx context.Context, tx *wire.MsgTx, allowHighFees bool) (*chainhash.Hash, error) {
	txHash, err := c.rpcClient.SendRawTransactionAsync(tx, allowHighFees).Receive()
	if err != nil {
		return nil, fmt.Errorf("failed to broadcast transaction: %w", err)
	}
	
	return txHash, nil
}

// BroadcastTransaction broadcasts a raw transaction to the network
func (c *Client) BroadcastTransaction(ctx context.Context, txHex string) (string, error) {
	// Decode the transaction hex
	txBytes, err := hex.DecodeString(txHex)
	if err != nil {
		return "", fmt.Errorf("failed to decode transaction hex: %w", err)
	}

	// Deserialize the transaction
	var tx wire.MsgTx
	if err := tx.Deserialize(hex.NewDecoder(txBytes)); err != nil {
		return "", fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	txHash, err := c.rpcClient.SendRawTransactionAsync(&tx, false).Receive()
	if err != nil {
		return "", fmt.Errorf("failed to broadcast transaction: %w", err)
	}

	return txHash.String(), nil
}

// GetBlockchainInfo retrieves information about the blockchain
func (c *Client) GetBlockchainInfo(ctx context.Context) (*btcjson.GetBlockChainInfoResult, error) {
	info, err := c.rpcClient.GetBlockChainInfoAsync().Receive()
	if err != nil {
		return nil, fmt.Errorf("failed to get blockchain info: %w", err)
	}

	return info, nil
}

// EstimateFee estimates the fee for a transaction with the given number of inputs and outputs
func (c *Client) EstimateFee(ctx context.Context, numInputs, numOutputs int, feeRate float64) (int64, error) {
	// Estimate transaction size
	// P2PKH input: ~148 bytes, P2PKH output: ~34 bytes
	// Add 10 bytes for version, locktime, etc.
	txSize := 10 + (numInputs * 148) + (numOutputs * 34)
	
	// Calculate fee based on size and fee rate (satoshis per byte)
	fee := int64(float64(txSize) * feeRate)
	
	// Ensure minimum relay fee (typically 1000 satoshis)
	minFee := int64(1000)
	if fee < minFee {
		fee = minFee
	}
	
	return fee, nil
}
