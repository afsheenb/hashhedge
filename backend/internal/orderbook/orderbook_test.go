// internal/orderbook/orderbook_test.go
package orderbook

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"hashhedge/internal/models"
)

// MockOrderRepository is a mock for the order repository
type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) Create(ctx context.Context, order *models.Order) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockOrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Order), args.Error(1)
}

func (m *MockOrderRepository) Update(ctx context.Context, order *models.Order) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}

func (m *MockOrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.OrderStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockOrderRepository) DecrementRemainingQuantity(ctx context.Context, id uuid.UUID, amount int) error {
	args := m.Called(ctx, id, amount)
	return args.Error(0)
}

func (m *MockOrderRepository) ListOpenOrders(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	side models.OrderSide,
	limit, offset int,
) ([]*models.Order, error) {
	args := m.Called(ctx, contractType, strikeHashRate, side, limit, offset)
	return args.Get(0).([]*models.Order), args.Error(1)
}

func (m *MockOrderRepository) ListUserOrders(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Order, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]*models.Order), args.Error(1)
}

func (m *MockOrderRepository) CancelExpiredOrders(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

// MockTradeRepository is a mock for the trade repository
type MockTradeRepository struct {
	mock.Mock
}

func (m *MockTradeRepository) Create(ctx context.Context, tx interface{}, trade *models.Trade) error {
	args := m.Called(ctx, tx, trade)
	return args.Error(0)
}

func (m *MockTradeRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Trade, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Trade), args.Error(1)
}

func (m *MockTradeRepository) ListByContractID(ctx context.Context, contractID uuid.UUID) ([]*models.Trade, error) {
	args := m.Called(ctx, contractID)
	return args.Get(0).([]*models.Trade), args.Error(1)
}

func (m *MockTradeRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Trade, error) {
	args := m.Called(ctx, userID, limit, offset)
	return args.Get(0).([]*models.Trade), args.Error(1)
}

func (m *MockTradeRepository) GetRecentTrades(ctx context.Context, limit int) ([]*models.Trade, error) {
	args := m.Called(ctx, limit)
	return args.Get(0).([]*models.Trade), args.Error(1)
}

// MockContractRepository is a mock for the contract repository
type MockContractRepository struct {
	mock.Mock
}

func (m *MockContractRepository) Create(ctx context.Context, contract *models.Contract) error {
	args := m.Called(ctx, contract)
	return args.Error(0)
}

func (m *MockContractRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Contract, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Contract), args.Error(1)
}

func (m *MockContractRepository) Update(ctx context.Context, contract *models.Contract) error {
	args := m.Called(ctx, contract)
	return args.Error(0)
}

func (m *MockContractRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.ContractStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockContractRepository) ListByStatus(ctx context.Context, status models.ContractStatus, limit, offset int) ([]*models.Contract, error) {
	args := m.Called(ctx, status, limit, offset)
	return args.Get(0).([]*models.Contract), args.Error(1)
}

func (m *MockContractRepository) AddTransaction(ctx context.Context, tx *models.ContractTransaction) error {
	args := m.Called(ctx, tx)
	return args.Error(0)
}

func (m *MockContractRepository) ConfirmTransaction(ctx context.Context, txID string) error {
	args := m.Called(ctx, txID)
	return args.Error(0)
}

func (m *MockContractRepository) GetTransactionsByContractID(ctx context.Context, contractID uuid.UUID) ([]*models.ContractTransaction, error) {
	args := m.Called(ctx, contractID)
	return args.Get(0).([]*models.ContractTransaction), args.Error(1)
}

func (m *MockContractRepository) CountActiveContracts(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

// MockContractService is a mock for the contract service
type MockContractService struct {
	mock.Mock
}

func (m *MockContractService) CreateContract(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	startBlockHeight int64,
	endBlockHeight int64,
	targetTimestamp time.Time,
	contractSize int64,
	premium int64,
	buyerPubKey string,
	sellerPubKey string,
) (*models.Contract, error) {
	args := m.Called(ctx, contractType, strikeHashRate, startBlockHeight, endBlockHeight, targetTimestamp, contractSize, premium, buyerPubKey, sellerPubKey)
	return args.Get(0).(*models.Contract), args.Error(1)
}

func (m *MockContractService) GetContract(ctx context.Context, id uuid.UUID) (*models.Contract, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.Contract), args.Error(1)
}

func TestPlaceOrder(t *testing.T) {
	mockOrderRepo := new(MockOrderRepository)
	mockTradeRepo := new(MockTradeRepository)
	mockContractRepo := new(MockContractRepository)
	mockContractSvc := new(MockContractService)
	
	orderBook := NewOrderBook(mockOrderRepo, mockTradeRepo, mockContractRepo, mockContractSvc)
	
	// Create a sample order
	order := &models.Order{
		ID:               uuid.New(),
		UserID:           uuid.New(),
		Side:             models.OrderSideBuy,
		ContractType:     models.ContractTypeCall,
		StrikeHashRate:   350.0,
		StartBlockHeight: 700000,
		EndBlockHeight:   702016,
		Price:            100000,
		Quantity:         1,
		PubKey:           "pubkey123",
	}
	
	// Set up mock behavior
	mockOrderRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Order")).Return(nil)
	mockOrderRepo.On("ListOpenOrders", mock.Anything, models.ContractTypeCall, 350.0, models.OrderSideSell, 100, 0).Return([]*models.Order{}, nil)
	
	// Execute the method
	result, err := orderBook.PlaceOrder(context.Background(), order)
	
	// Assert expectations
	assert.NoError(t, err)
	assert.Equal(t, order.ID, result.ID)
	assert.Equal(t, models.OrderStatusOpen, result.Status)
	assert.Equal(t, order.Quantity, result.RemainingQuantity)
	
	mockOrderRepo.AssertExpectations(t)
	mockTradeRepo.AssertExpectations(t)
	mockContractRepo.AssertExpectations(t)
	mockContractSvc.AssertExpectations(t)
}
