// internal/contract/hashrate/calculator.go
package hashrate

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"hashhedge/pkg/bitcoin"
)

// HashRate represents the Bitcoin network hash rate in EH/s
type HashRate float64

// HashRateCalculator calculates the current Bitcoin network hash rate
type HashRateCalculator struct {
	client *bitcoin.Client
	// Cache the last calculation to reduce RPC calls
	cacheMutex      sync.RWMutex
	lastCalculation *HashRate
	lastCalcTime    time.Time
	cacheDuration   time.Duration
}

// New creates a new HashRateCalculator
func New(client *bitcoin.Client) *HashRateCalculator {
	return &HashRateCalculator{
		client:        client,
		cacheDuration: time.Minute * 5, // Default 5 minute cache
	}
}

// WithCacheDuration sets a custom cache duration
func (c *HashRateCalculator) WithCacheDuration(duration time.Duration) *HashRateCalculator {
	c.cacheDuration = duration
	return c
}

// CalculateCurrentHashRate calculates the current network hash rate in EH/s
func (c *HashRateCalculator) CalculateCurrentHashRate(ctx context.Context) (float64, error) {
	// Check cache first
	c.cacheMutex.RLock()
	if c.lastCalculation != nil && time.Since(c.lastCalcTime) < c.cacheDuration {
		result := *c.lastCalculation
		c.cacheMutex.RUnlock()
		return float64(result), nil
	}
	c.cacheMutex.RUnlock()

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
	hashRate := (bestBlock.Difficulty * math.Pow(2, 32)) / (timeDiff * 1e12)

	// Update cache
	c.cacheMutex.Lock()
	hashRateValue := HashRate(hashRate)
	c.lastCalculation = &hashRateValue
	c.lastCalcTime = time.Now()
	c.cacheMutex.Unlock()

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

	// Use a sliding window approach for more accurate calculation
	windowSize := int64(10) // Use up to 10 blocks for sliding window
	if windowSize > (endHeight - startHeight) {
		windowSize = endHeight - startHeight
	}
	
	totalDifficulty := 0.0
	totalTime := 0.0
	blocksProcessed := 0

	for i := int64(0); i < windowSize; i++ {
		height := endHeight - i
		prevHeight := height - 1
		
		if prevHeight < startHeight {
			break
		}
		
		blockHash, err := c.client.GetBlockHash(ctx, height)
		if err != nil {
			return 0, fmt.Errorf("failed to get block hash at height %d: %w", height, err)
		}
		
		block, err := c.client.GetBlock(ctx, blockHash)
		if err != nil {
			return 0, fmt.Errorf("failed to get block at height %d: %w", height, err)
		}
		
		prevBlockHash, err := c.client.GetBlockHash(ctx, prevHeight)
		if err != nil {
			return 0, fmt.Errorf("failed to get previous block hash at height %d: %w", prevHeight, err)
		}
		
		prevBlock, err := c.client.GetBlock(ctx, prevBlockHash)
		if err != nil {
			return 0, fmt.Errorf("failed to get previous block at height %d: %w", prevHeight, err)
		}
		
		// Calculate time difference
		timeDiff := block.Time.Sub(prevBlock.Time).Seconds()
		if timeDiff > 0 {
			totalTime += timeDiff
			totalDifficulty += block.Difficulty
			blocksProcessed++
		}
	}
	
	if blocksProcessed == 0 {
		return 0, fmt.Errorf("no valid blocks found in the specified range")
	}

	// Average values
	avgTimeDiff := totalTime / float64(blocksProcessed)
	avgDifficulty := totalDifficulty / float64(blocksProcessed)

	// Calculate hash rate: (difficulty * 2^32) / (time * 10^12)
	hashRate := (avgDifficulty * math.Pow(2, 32)) / (avgTimeDiff * 1e12)

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

// GetAverageHashRate calculates the average hash rate over the last N blocks
func (c *HashRateCalculator) GetAverageHashRate(
	ctx context.Context,
	numBlocks int64,
) (float64, error) {
	// Get current tip
	bestBlockHash, err := c.client.GetBestBlockHash(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := c.client.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get best block: %w", err)
	}
	
	endHeight := bestBlock.Height
	startHeight := endHeight - numBlocks
	if startHeight < 0 {
		startHeight = 0
	}
	
	return c.CalculateHashRateForPeriod(ctx, startHeight, endHeight)
}
