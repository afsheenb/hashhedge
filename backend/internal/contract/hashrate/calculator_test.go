// internal/contract/hashrate/calculator_test.go
package hashrate

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"hashhedge/pkg/bitcoin"
)

// MockBitcoinClient is a mock for the bitcoin client
type MockBitcoinClient struct {
	mock.Mock
}

func (m *MockBitcoinClient) GetBestBlockHash(ctx context.Context) (string, error) {
	args := m.Called(ctx)
	return args.String(0), args.Error(1)
}

func (m *MockBitcoinClient) GetBlockHash(ctx context.Context, height int64) (string, error) {
	args := m.Called(ctx, height)
	return args.String(0), args.Error(1)
}

func (m *MockBitcoinClient) GetBlock(ctx context.Context, hash string) (*bitcoin.Block, error) {
	args := m.Called(ctx, hash)
	return args.Get(0).(*bitcoin.Block), args.Error(1)
}

func (m *MockBitcoinClient) GetRawTransaction(ctx context.Context, txID string) (string, error) {
	args := m.Called(ctx, txID)
	return args.String(0), args.Error(1)
}

func (m *MockBitcoinClient) BroadcastTransaction(ctx context.Context, txHex string) (string, error) {
	args := m.Called(ctx, txHex)
	return args.String(0), args.Error(1)
}

func (m *MockBitcoinClient) Close() {
	m.Called()
}

func TestCalculateCurrentHashRate(t *testing.T) {
	mockClient := new(MockBitcoinClient)
	
	// Mock responses
	bestBlockHash := "00000000000000000007f4e75ae5e736fb0cca17a3d7dfe7164912403116e664"
	bestBlock := &bitcoin.Block{
		Hash:       bestBlockHash,
		Height:     700000,
		Time:       time.Now(),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: "000000000000000000017fe4f8526eb457ddf61f6f8a0e658ae10d2fa5cd6e9a",
	}
	
	prevBlock := &bitcoin.Block{
		Hash:       bestBlock.PreviousBlockHash,
		Height:     699999,
		Time:       bestBlock.Time.Add(-10 * time.Minute),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: "previous_hash",
	}
	
	mockClient.On("GetBestBlockHash", mock.Anything).Return(bestBlockHash, nil)
	mockClient.On("GetBlock", mock.Anything, bestBlockHash).Return(bestBlock, nil)
	mockClient.On("GetBlock", mock.Anything, bestBlock.PreviousBlockHash).Return(prevBlock, nil)
	
	calculator := New(mockClient)
	
	// Test
	hashRate, err := calculator.CalculateCurrentHashRate(context.Background())
	
	assert.NoError(t, err)
	assert.Greater(t, hashRate, 0.0)
	
	mockClient.AssertExpectations(t)
}

func TestCalculateHashRateForPeriod(t *testing.T) {
	mockClient := new(MockBitcoinClient)
	
	// Mock responses
	startBlockHash := "000000000000000000017fe4f8526eb457ddf61f6f8a0e658ae10d2fa5cd6e9a"
	endBlockHash := "00000000000000000007f4e75ae5e736fb0cca17a3d7dfe7164912403116e664"
	
	startBlock := &bitcoin.Block{
		Hash:       startBlockHash,
		Height:     699000,
		Time:       time.Now().Add(-24 * time.Hour),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: "previous_hash",
	}
	
	endBlock := &bitcoin.Block{
		Hash:       endBlockHash,
		Height:     700000,
		Time:       time.Now(),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: startBlockHash,
	}
	
	mockClient.On("GetBlockHash", mock.Anything, int64(699000)).Return(startBlockHash, nil)
	mockClient.On("GetBlockHash", mock.Anything, int64(700000)).Return(endBlockHash, nil)
	mockClient.On("GetBlock", mock.Anything, startBlockHash).Return(startBlock, nil)
	mockClient.On("GetBlock", mock.Anything, endBlockHash).Return(endBlock, nil)
	
	calculator := New(mockClient)
	
	// Test
	hashRate, err := calculator.CalculateHashRateForPeriod(context.Background(), 699000, 700000)
	
	assert.NoError(t, err)
	assert.Greater(t, hashRate, 0.0)
	
	mockClient.AssertExpectations(t)
}

func TestIsHashRateHigherThanTarget(t *testing.T) {
	mockClient := new(MockBitcoinClient)
	
	// Mock responses
	startBlockHash := "000000000000000000017fe4f8526eb457ddf61f6f8a0e658ae10d2fa5cd6e9a"
	endBlockHash := "00000000000000000007f4e75ae5e736fb0cca17a3d7dfe7164912403116e664"
	
	startBlock := &bitcoin.Block{
		Hash:       startBlockHash,
		Height:     699000,
		Time:       time.Now().Add(-24 * time.Hour),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: "previous_hash",
	}
	
	endBlock := &bitcoin.Block{
		Hash:       endBlockHash,
		Height:     700000,
		Time:       time.Now(),
		Difficulty: 21448277761059.71,
		PreviousBlockHash: startBlockHash,
	}
	
	mockClient.On("GetBlockHash", mock.Anything, int64(699000)).Return(startBlockHash, nil)
	mockClient.On("GetBlockHash", mock.Anything, int64(700000)).Return(endBlockHash, nil)
	mockClient.On("GetBlock", mock.Anything, startBlockHash).Return(startBlock, nil)
	mockClient.On("GetBlock", mock.Anything, endBlockHash).Return(endBlock, nil)
	
	calculator := New(mockClient)
	
	// Test with a very low target (should be higher)
	isHigher, actualRate, err := calculator.IsHashRateHigherThanTarget(context.Background(), 699000, 700000, 1.0)
	
	assert.NoError(t, err)
	assert.True(t, isHigher)
	assert.Greater(t, actualRate, 1.0)
	
	// Test with a very high target (should be lower)
	isHigher, actualRate, err = calculator.IsHashRateHigherThanTarget(context.Background(), 699000, 700000, 1000.0)
	
	assert.NoError(t, err)
	assert.False(t, isHigher)
	assert.Less(t, actualRate, 1000.0)
	
	mockClient.AssertExpectations(t)
}
