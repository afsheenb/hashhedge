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


// internal/orderbook/orderbook.go
// Enhanced implementation of match_buy_order and match_sell_order

// matchBuyOrder matches a buy order against the order book
func (ob *OrderBook) matchBuyOrder(ctx context.Context, buyOrder *models.Order) (bool, error) {
	key := OrderKey{
		ContractType:     buyOrder.ContractType,
		StrikeHashRate:   buyOrder.StrikeHashRate,
		StartBlockHeight: buyOrder.StartBlockHeight,
		EndBlockHeight:   buyOrder.EndBlockHeight,
	}

	ob.mu.Lock()
	defer ob.mu.Unlock()

	// Find matching sell orders
	sellOrders, ok := ob.asks[key]
	if !ok || len(sellOrders) == 0 {
		return false, nil // No matching orders found
	}

	// Sort sells by price (ascending) and time priority
	sort.SliceStable(sellOrders, func(i, j int) bool {
		if sellOrders[i].Price == sellOrders[j].Price {
			return sellOrders[i].CreatedAt.Before(sellOrders[j].CreatedAt)
		}
		return sellOrders[i].Price < sellOrders[j].Price
	})

	matched := false
	var ordersToRemove []int
	var ordersToUpdate []*models.Order

	// Transaction for atomic execution of all matches
	err := ob.db.WithTransaction(ctx, func(tx *sqlx.Tx) error {
		// Try to match with existing sell orders
		for i, sellOrder := range sellOrders {
			// Break if buy order is fully filled
			if buyOrder.RemainingQuantity <= 0 {
				break
			}

			// Skip if price doesn't match
			if sellOrder.Price > buyOrder.Price {
				break // No more matches possible since sells are sorted by price
			}

			// Skip orders that aren't open or partial
			if sellOrder.Status != models.OrderStatusOpen && sellOrder.Status != models.OrderStatusPartial {
				ordersToRemove = append(ordersToRemove, i)
				continue
			}

			// Determine match quantity
			matchQty := min(buyOrder.RemainingQuantity, sellOrder.RemainingQuantity)

			if matchQty <= 0 {
				continue
			}

			matched = true

			// Execute the trade
			err := ob.executeTrade(ctx, tx, buyOrder, sellOrder, matchQty)
			if err != nil {
				return fmt.Errorf("failed to execute trade: %w", err)
			}

			// Update remaining quantities
			buyOrder.RemainingQuantity -= matchQty
			sellOrder.RemainingQuantity -= matchQty

			// Update order statuses
			if buyOrder.RemainingQuantity == 0 {
				buyOrder.Status = models.OrderStatusFilled
			} else {
				buyOrder.Status = models.OrderStatusPartial
			}

			if sellOrder.RemainingQuantity == 0 {
				sellOrder.Status = models.OrderStatusFilled
				ordersToRemove = append(ordersToRemove, i)
			} else {
				sellOrder.Status = models.OrderStatusPartial
				ordersToUpdate = append(ordersToUpdate, sellOrder)
			}
		}

		// Update orders in database
		for _, order := range ordersToUpdate {
			if err := ob.orderRepo.Update(ctx, order); err != nil {
				return fmt.Errorf("failed to update sell order: %w", err)
			}
		}

		// Update the buy order in the database if it matched anything
		if matched {
			if err := ob.orderRepo.Update(ctx, buyOrder); err != nil {
				return fmt.Errorf("failed to update buy order: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return false, err
	}

	// Remove filled orders from in-memory book (outside transaction)
	for i := len(ordersToRemove) - 1; i >= 0; i-- {
		idx := ordersToRemove[i]
		// Remove element by replacing with last element and reducing slice length
		if idx < len(sellOrders)-1 {
			sellOrders[idx] = sellOrders[len(sellOrders)-1]
		}
		sellOrders = sellOrders[:len(sellOrders)-1]
	}

	// Update the asks map with the modified orders
	if len(sellOrders) > 0 {
		ob.asks[key] = sellOrders
	} else {
		delete(ob.asks, key)
	}

	return matched, nil
}

// matchSellOrder matches a sell order against the order book
func (ob *OrderBook) matchSellOrder(ctx context.Context, sellOrder *models.Order) (bool, error) {
	key := OrderKey{
		ContractType:     sellOrder.ContractType,
		StrikeHashRate:   sellOrder.StrikeHashRate,
		StartBlockHeight: sellOrder.StartBlockHeight,
		EndBlockHeight:   sellOrder.EndBlockHeight,
	}

	ob.mu.Lock()
	defer ob.mu.Unlock()

	// Find matching buy orders
	buyOrders, ok := ob.bids[key]
	if !ok || len(buyOrders) == 0 {
		return false, nil // No matching orders found
	}

	// Sort buys by price (descending) and time priority
	sort.SliceStable(buyOrders, func(i, j int) bool {
		if buyOrders[i].Price == buyOrders[j].Price {
			return buyOrders[i].CreatedAt.Before(buyOrders[j].CreatedAt)
		}
		return buyOrders[i].Price > buyOrders[j].Price
	})

	matched := false
	var ordersToRemove []int
	var ordersToUpdate []*models.Order

	// Transaction for atomic execution of all matches
	err := ob.db.WithTransaction(ctx, func(tx *sqlx.Tx) error {
		// Try to match with existing buy orders
		for i, buyOrder := range buyOrders {
			// Break if sell order is fully filled
			if sellOrder.RemainingQuantity <= 0 {
				break
			}

			// Skip if price doesn't match
			if buyOrder.Price < sellOrder.Price {
				break // No more matches possible since buys are sorted by price
			}

			// Skip orders that aren't open or partial
			if buyOrder.Status != models.OrderStatusOpen && buyOrder.Status != models.OrderStatusPartial {
				ordersToRemove = append(ordersToRemove, i)
				continue
			}

			// Determine match quantity
			matchQty := min(sellOrder.RemainingQuantity, buyOrder.RemainingQuantity)

			if matchQty <= 0 {
				continue
			}

			matched = true

			// Execute the trade
			err := ob.executeTrade(ctx, tx, buyOrder, sellOrder, matchQty)
			if err != nil {
				return fmt.Errorf("failed to execute trade: %w", err)
			}

			// Update remaining quantities
			sellOrder.RemainingQuantity -= matchQty
			buyOrder.RemainingQuantity -= matchQty

			// Update order statuses
			if sellOrder.RemainingQuantity == 0 {
				sellOrder.Status = models.OrderStatusFilled
			} else {
				sellOrder.Status = models.OrderStatusPartial
			}

			if buyOrder.RemainingQuantity == 0 {
				buyOrder.Status = models.OrderStatusFilled
				ordersToRemove = append(ordersToRemove, i)
			} else {
				buyOrder.Status = models.OrderStatusPartial
				ordersToUpdate = append(ordersToUpdate, buyOrder)
			}
		}

		// Update orders in database
		for _, order := range ordersToUpdate {
			if err := ob.orderRepo.Update(ctx, order); err != nil {
				return fmt.Errorf("failed to update buy order: %w", err)
			}
		}

		// Update the sell order in the database if it matched anything
		if matched {
			if err := ob.orderRepo.Update(ctx, sellOrder); err != nil {
				return fmt.Errorf("failed to update sell order: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return false, err
	}

	// Remove filled orders from in-memory book (outside transaction)
	for i := len(ordersToRemove) - 1; i >= 0; i-- {
		idx := ordersToRemove[i]
		// Remove element by replacing with last element and reducing slice length
		if idx < len(buyOrders)-1 {
			buyOrders[idx] = buyOrders[len(buyOrders)-1]
		}
		buyOrders = buyOrders[:len(buyOrders)-1]
	}

	// Update the bids map with the modified orders
	if len(buyOrders) > 0 {
		ob.bids[key] = buyOrders
	} else {
		delete(ob.bids, key)
	}

	return matched, nil
}

// executeTrade handles the execution of a trade between a buy and sell order with extensive error handling
func (ob *OrderBook) executeTrade(
	ctx context.Context,
	tx *sqlx.Tx,
	buyOrder *models.Order,
	sellOrder *models.Order,
	quantity int,
) error {
	// Validate the trade parameters
	if quantity <= 0 {
		return fmt.Errorf("invalid trade quantity: %d", quantity)
	}

	if buyOrder.RemainingQuantity < quantity {
		return fmt.Errorf("insufficient buy order quantity: have %d, need %d",
			buyOrder.RemainingQuantity, quantity)
	}

	if sellOrder.RemainingQuantity < quantity {
		return fmt.Errorf("insufficient sell order quantity: have %d, need %d",
			sellOrder.RemainingQuantity, quantity)
	}

	// Ensure order parameters match
	if buyOrder.ContractType != sellOrder.ContractType ||
		buyOrder.StrikeHashRate != sellOrder.StrikeHashRate ||
		buyOrder.StartBlockHeight != sellOrder.StartBlockHeight ||
		buyOrder.EndBlockHeight != sellOrder.EndBlockHeight {
		return fmt.Errorf("order parameters mismatch between buy and sell orders")
	}

	// Use mid price for the trade (average of buy and sell prices)
	// Ensure we don't overflow by using int64 arithmetic
	midPrice := (int64(buyOrder.Price) + int64(sellOrder.Price)) / 2

	// Create trade timestamp
	tradeTime := time.Now().UTC()

	// Calculate target timestamp based on start height and estimated time to end height
	// Use average Bitcoin block time of 10 minutes
	blocksToTarget := buyOrder.EndBlockHeight - buyOrder.StartBlockHeight
	estimatedTimeToTarget := time.Duration(blocksToTarget) * 10 * time.Minute
	targetTimestamp := tradeTime.Add(estimatedTimeToTarget)

	// Create a contract for this trade
	contract, err := ob.contractService.CreateContract(
		ctx,
		buyOrder.ContractType,
		buyOrder.StrikeHashRate,
		buyOrder.StartBlockHeight,
		buyOrder.EndBlockHeight,
		targetTimestamp,
		midPrice,
		0, // No premium in simple model
		buyOrder.PubKey,
		sellOrder.PubKey,
	)
	if err != nil {
		return fmt.Errorf("failed to create contract for trade: %w", err)
	}

	// Create a trade record
	trade := &models.Trade{
		ID:          uuid.New(),
		BuyOrderID:  buyOrder.ID,
		SellOrderID: sellOrder.ID,
		ContractID:  contract.ID,
		Price:       midPrice,
		Quantity:    quantity,
		ExecutedAt:  tradeTime,
	}

	// Validate the trade
	if err := trade.Validate(); err != nil {
		return fmt.Errorf("invalid trade: %w", err)
	}

	// Save trade to database
	if err := ob.tradeRepo.Create(ctx, tx, trade); err != nil {
		return fmt.Errorf("failed to create trade record: %w", err)
	}

	// Update order quantities and status in database
	// We use custom SQL to ensure this is atomic
	if err := ob.orderRepo.DecrementRemainingQuantity(ctx, buyOrder.ID, quantity); err != nil {
		return fmt.Errorf("failed to update buy order quantity: %w", err)
	}

	if err := ob.orderRepo.DecrementRemainingQuantity(ctx, sellOrder.ID, quantity); err != nil {
		return fmt.Errorf("failed to update sell order quantity: %w", err)
	}

	// Update the in-memory order statuses to match what's in the database
	// This will be reflected in the return from matchBuyOrder/matchSellOrder
	buyOrder.RemainingQuantity -= quantity
	if buyOrder.RemainingQuantity <= 0 {
		buyOrder.Status = models.OrderStatusFilled
	} else {
		buyOrder.Status = models.OrderStatusPartial
	}

	sellOrder.RemainingQuantity -= quantity
	if sellOrder.RemainingQuantity <= 0 {
		sellOrder.Status = models.OrderStatusFilled
	} else {
		sellOrder.Status = models.OrderStatusPartial
	}

	// Log the trade
	log.Info().
		Str("trade_id", trade.ID.String()).
		Str("contract_id", contract.ID.String()).
		Str("buy_order_id", buyOrder.ID.String()).
		Str("sell_order_id", sellOrder.ID.String()).
		Int64("price", midPrice).
		Int("quantity", quantity).
		Msg("Trade executed")

	// Send trade execution event for websocket clients
	ob.publishTradeEvent(trade, contract)

	return nil
}

// publishTradeEvent publishes a trade event to any subscribers
func (ob *OrderBook) publishTradeEvent(trade *models.Trade, contract *models.Contract) {
	event := models.TradeEvent{
		ID:             trade.ID,
		ContractID:     contract.ID,
		ContractType:   contract.ContractType,
		StrikeHashRate: contract.StrikeHashRate,
		Price:          trade.Price,
		Quantity:       trade.Quantity,
		ExecutedAt:     trade.ExecutedAt,
	}

	if ob.eventPublisher != nil {
		// Non-blocking publish - if the channel is full, we'll drop the event
		select {
		case ob.eventPublisher <- event:
			// Event published successfully
		default:
			// Channel full, log and continue
			log.Warn().
				Str("trade_id", trade.ID.String()).
				Msg("Failed to publish trade event - channel full")
		}
	}
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
