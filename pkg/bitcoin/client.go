G/ pkg/bitcoin/client.go
package bitcoin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/btcsuite/btcd/btcjson"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/rpcclient"
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

// BroadcastTransaction broadcasts a raw transaction to the network
func (c *Client) BroadcastTransaction(ctx context.Context, txHex string) (string, error) {
	txHash, err := c.rpcClient.SendRawTransactionAsync(txHex).Receive()
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
