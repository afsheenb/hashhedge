// internal/orderbook/orderbook.go
package orderbook

import (
	"context"
	"fmt"
	"sync"
	"time"

    "github.com/jmoiron/sqlx"
	"github.com/google/uuid"
	"hashhedge/internal/contract"
	"hashhedge/internal/db"
	"hashhedge/internal/models"
)

type OrderBook struct {
    orderRepo    *db.OrderRepository
    tradeRepo    *db.TradeRepository
    contractRepo *db.ContractRepository
    contractSvc  *contract.Service
    db           *db.DB
    mu           sync.RWMutex
}


// NewOrderBook creates a new order book - update constructor
func NewOrderBook(
    db *db.DB,
    orderRepo *db.OrderRepository,
    tradeRepo *db.TradeRepository,
    contractRepo *db.ContractRepository,
    contractSvc *contract.Service,
) *OrderBook {
    return &OrderBook{
        db:           db,
        orderRepo:    orderRepo,
        tradeRepo:    tradeRepo,
        contractRepo: contractRepo,
        contractSvc:  contractSvc,
    }
}

// PlaceOrder adds a new order to the order book
func (ob *OrderBook) PlaceOrder(ctx context.Context, order *models.Order) (*models.Order, error) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	// Ensure the order ID is set
	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}

	// Set order status and timestamps
	order.Status = models.OrderStatusOpen
	order.CreatedAt = time.Now().UTC()
	order.UpdatedAt = order.CreatedAt
	order.RemainingQuantity = order.Quantity

	// Save the order to the database
	err := ob.orderRepo.Create(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	// Try to match the order
	matched, err := ob.tryMatchOrder(ctx, order)
	if err != nil {
		return nil, fmt.Errorf("failed to match order: %w", err)
	}

	// If order was fully matched, update its status
	if matched && order.RemainingQuantity == 0 {
		order.Status = models.OrderStatusFilled
		err = ob.orderRepo.Update(ctx, order)
		if err != nil {
			return nil, fmt.Errorf("failed to update order status: %w", err)
		}
	} else if matched {
		order.Status = models.OrderStatusPartial
		err = ob.orderRepo.Update(ctx, order)
		if err != nil {
			return nil, fmt.Errorf("failed to update order status: %w", err)
		}
	}

	return order, nil
}

// CancelOrder cancels an open order
func (ob *OrderBook) CancelOrder(ctx context.Context, orderID uuid.UUID) error {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	// Get the order
	order, err := ob.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("failed to get order: %w", err)
	}

	// Check if the order can be cancelled
	if order.Status != models.OrderStatusOpen && order.Status != models.OrderStatusPartial {
		return fmt.Errorf("order is not in a cancellable state")
	}

	// Update order status
	err = ob.orderRepo.UpdateStatus(ctx, orderID, models.OrderStatusCancelled)
	if err != nil {
		return fmt.Errorf("failed to cancel order: %w", err)
	}

	return nil
}

// GetOrderByID retrieves an order by its ID
func (ob *OrderBook) GetOrderByID(ctx context.Context, orderID uuid.UUID) (*models.Order, error) {
	order, err := ob.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	return order, nil
}

// ListOpenOrders retrieves open orders that match the given criteria
func (ob *OrderBook) ListOpenOrders(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	side models.OrderSide,
	limit, offset int,
) ([]*models.Order, error) {
	orders, err := ob.orderRepo.ListOpenOrders(
		ctx,
		contractType,
		strikeHashRate,
		side,
		limit,
		offset,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list open orders: %w", err)
	}

	return orders, nil
}

// GetOrderBook returns the current state of the order book for a specific contract type and hash rate
func (ob *OrderBook) GetOrderBook(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	limit int,
) (map[string][]*models.Order, error) {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	// Get buy orders
	buyOrders, err := ob.orderRepo.ListOpenOrders(
		ctx,
		contractType,
		strikeHashRate,
		models.OrderSideBuy,
		limit,
		0,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get buy orders: %w", err)
	}

	// Get sell orders
	sellOrders, err := ob.orderRepo.ListOpenOrders(
		ctx,
		contractType,
		strikeHashRate,
		models.OrderSideSell,
		limit,
		0,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get sell orders: %w", err)
	}

	// Create order book response
	orderBook := map[string][]*models.Order{
		"buys":  buyOrders,
		"sells": sellOrders,
	}

	return orderBook, nil
}

// tryMatchOrder attempts to match a new order with existing orders
func (ob *OrderBook) tryMatchOrder(ctx context.Context, order *models.Order) (bool, error) {
	// Determine the opposite side of the order
	oppositeSide := models.OrderSideSell
	if order.Side == models.OrderSideSell {
		oppositeSide = models.OrderSideBuy
	}

	// Get matching orders
	matchingOrders, err := ob.orderRepo.ListOpenOrders(
		ctx,
		order.ContractType,
		order.StrikeHashRate,
		oppositeSide,
		100, // Limit to 100 potential matches
		0,
	)
	if err != nil {
		return false, fmt.Errorf("failed to get matching orders: %w", err)
	}

	if len(matchingOrders) == 0 {
		return false, nil // No matches found
	}

	// Check price compatibility
	var compatibleOrders []*models.Order
	for _, match := range matchingOrders {
		if (order.Side == models.OrderSideBuy && order.Price >= match.Price) ||
			(order.Side == models.OrderSideSell && order.Price <= match.Price) {
			compatibleOrders = append(compatibleOrders, match)
		}
	}

	if len(compatibleOrders) == 0 {
		return false, nil // No compatible matches
	}

	// Execute trades
	matched := false
	err = ob.db.WithTransaction(ctx, func(tx *sqlx.Tx) error {
		for _, match := range compatibleOrders {
			// Break if the order is completely filled
			if order.RemainingQuantity <= 0 {
				break
			}

			// Determine trade quantity
			tradeQty := order.RemainingQuantity
			if match.RemainingQuantity < tradeQty {
				tradeQty = match.RemainingQuantity
			}

			// Determine trade price (use the existing order's price)
			tradePrice := match.Price

			// Create a new contract for this trade
			var buyerPubKey, sellerPubKey string
			var buyOrderID, sellOrderID uuid.UUID

			if order.Side == models.OrderSideBuy {
				buyerPubKey = order.PubKey
				sellerPubKey = match.PubKey
				buyOrderID = order.ID
				sellOrderID = match.ID
			} else {
				buyerPubKey = match.PubKey
				sellerPubKey = order.PubKey
				buyOrderID = match.ID
				sellOrderID = order.ID
			}

			// Create the contract
			contract, err := ob.contractSvc.CreateContract(
				ctx,
				order.ContractType,
				order.StrikeHashRate,
				order.StartBlockHeight,
				order.EndBlockHeight,
				time.Now().Add(14*24*time.Hour), // 14 days target time (example)
				order.Price,                     // Contract size based on price
				0,                               // No premium in this simple model
				buyerPubKey,
				sellerPubKey,
			)
			if err != nil {
				return fmt.Errorf("failed to create contract for trade: %w", err)
			}

			// Create the trade record
			trade := &models.Trade{
				ID:          uuid.New(),
				BuyOrderID:  buyOrderID,
				SellOrderID: sellOrderID,
				ContractID:  contract.ID,
				Price:       tradePrice,
				Quantity:    tradeQty,
				ExecutedAt:  time.Now().UTC(),
			}

			err = ob.tradeRepo.Create(ctx, tx, trade)
			if err != nil {
				return fmt.Errorf("failed to create trade: %w", err)
			}

			// Update the remaining quantities
			order.RemainingQuantity -= tradeQty
			match.RemainingQuantity -= tradeQty

			// Update the matching order
			err = ob.orderRepo.DecrementRemainingQuantity(ctx, match.ID, tradeQty)
			if err != nil {
				return fmt.Errorf("failed to update matching order: %w", err)
			}

			matched = true
		}

		return nil
	})

	if err != nil {
		return false, err
	}

	return matched, nil
}

// Start begins periodic tasks like cancelling expired orders
func (ob *OrderBook) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Cancel expired orders
				_, err := ob.orderRepo.CancelExpiredOrders(ctx)
				if err != nil {
					fmt.Printf("Failed to cancel expired orders: %v\n", err)
				}
			}
		}
	}()
}
