
// internal/contract/hashrate/calculator.go
package hashrate

import (
	"context"
	"fmt"
	"math"
	"time"

	"hashhedge/pkg/bitcoin"
)

// HashRateCalculator calculates the current Bitcoin network hash rate
type HashRateCalculator struct {
	client *bitcoin.Client
}

// New creates a new HashRateCalculator
func New(client *bitcoin.Client) *HashRateCalculator {
	return &HashRateCalculator{
		client: client,
	}
}

// CalculateCurrentHashRate calculates the current network hash rate in EH/s
func (c *HashRateCalculator) CalculateCurrentHashRate(ctx context.Context) (float64, error) {
	// Get the latest block info to calculate difficulty and time between blocks
	bestBlockHash, err := c.client.GetBestBlockHash(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := c.client.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get best block: %w", err)
	}

	// Get previous block to calculate time difference
	prevBlockHash := bestBlock.PreviousBlockHash
	prevBlock, err := c.client.GetBlock(ctx, prevBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get previous block: %w", err)
	}

	// Calculate time difference in seconds
	timeDiff := bestBlock.Time.Sub(prevBlock.Time).Seconds()
	if timeDiff <= 0 {
		return 0, fmt.Errorf("invalid time difference between blocks: %v", timeDiff)
	}

	// Calculate hash rate: (difficulty * 2^32) / (time * 10^12)
	// This converts to exahashes per second (EH/s)
	hashRate := (float64(bestBlock.Difficulty) * math.Pow(2, 32)) / (timeDiff * 1e12)

	return hashRate, nil
}

// CalculateHashRateForPeriod calculates the hash rate for a specific time period
func (c *HashRateCalculator) CalculateHashRateForPeriod(
	ctx context.Context,
	startHeight, endHeight int64,
) (float64, error) {
	if startHeight >= endHeight {
		return 0, fmt.Errorf("start height must be less than end height")
	}

	// Get blocks at start and end height
	startBlockHash, err := c.client.GetBlockHash(ctx, startHeight)
	if err != nil {
		return 0, fmt.Errorf("failed to get start block hash: %w", err)
	}

	startBlock, err := c.client.GetBlock(ctx, startBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get start block: %w", err)
	}

	endBlockHash, err := c.client.GetBlockHash(ctx, endHeight)
	if err != nil {
		return 0, fmt.Errorf("failed to get end block hash: %w", err)
	}

	endBlock, err := c.client.GetBlock(ctx, endBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get end block: %w", err)
	}

	// Calculate time difference in seconds
	timeDiff := endBlock.Time.Sub(startBlock.Time).Seconds()
	if timeDiff <= 0 {
		return 0, fmt.Errorf("invalid time difference between blocks: %v", timeDiff)
	}

	// Calculate blocks per day
	blocksMined := endHeight - startHeight
	secondsPerBlock := timeDiff / float64(blocksMined)
	
	// Use the average difficulty over the period
	avgDifficulty := (startBlock.Difficulty + endBlock.Difficulty) / 2

	// Calculate hash rate: (difficulty * 2^32) / (time * 10^12)
	hashRate := (float64(avgDifficulty) * math.Pow(2, 32)) / (secondsPerBlock * 1e12)

	return hashRate, nil
}

// IsHashRateHigherThanTarget checks if the hash rate between two block heights
// is higher than the target hash rate
func (c *HashRateCalculator) IsHashRateHigherThanTarget(
	ctx context.Context,
	startHeight, endHeight int64,
	targetHashRate float64,
) (bool, float64, error) {
	hashRate, err := c.CalculateHashRateForPeriod(ctx, startHeight, endHeight)
	if err != nil {
		return false, 0, err
	}

	return hashRate > targetHashRate, hashRate, nil
}

// CheckHashRateBeforeTime checks if a target block height was reached before a specific time
func (c *HashRateCalculator) CheckHashRateBeforeTime(
	ctx context.Context,
	startHeight, targetHeight int64,
	targetTime time.Time,
) (bool, error) {
	// Get the current best block
	bestBlockHash, err := c.client.GetBestBlockHash(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := c.client.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return false, fmt.Errorf("failed to get best block: %w", err)
	}

	bestHeight := bestBlock.Height

	// If we haven't reached the target height yet and the target time has passed
	if bestHeight < targetHeight && time.Now().After(targetTime) {
		return false, nil
	}

	// If we've reached the target height, get that block's timestamp
	if bestHeight >= targetHeight {
		targetBlockHash, err := c.client.GetBlockHash(ctx, targetHeight)
		if err != nil {
			return false, fmt.Errorf("failed to get target block hash: %w", err)
		}

		targetBlock, err := c.client.GetBlock(ctx, targetBlockHash)
		if err != nil {
			return false, fmt.Errorf("failed to get target block: %w", err)
		}

		// If the target block was mined before the target time, hash rate was higher than expected
		return targetBlock.Time.Before(targetTime), nil
	}

	// We haven't reached the target height yet and the target time hasn't passed
	return false, nil
}
