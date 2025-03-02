// internal/db/order_repository.go
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"hashhedge/internal/models"
)

// OrderRepository provides access to order-related database operations
type OrderRepository struct {
	db *DB
}

// NewOrderRepository creates a new order repository
func NewOrderRepository(db *DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// Create inserts a new order into the database
func (r *OrderRepository) Create(ctx context.Context, order *models.Order) error {
	if order.ID == uuid.Nil {
		order.ID = uuid.New()
	}
	order.CreatedAt = time.Now().UTC()
	order.UpdatedAt = order.CreatedAt
	order.RemainingQuantity = order.Quantity

	query := `
		INSERT INTO orders (
			id, user_id, side, contract_type, strike_hash_rate, start_block_height,
			end_block_height, price, quantity, remaining_quantity, status,
			pub_key, created_at, updated_at, expires_at
		) VALUES (
			:id, :user_id, :side, :contract_type, :strike_hash_rate, :start_block_height,
			:end_block_height, :price, :quantity, :remaining_quantity, :status,
			:pub_key, :created_at, :updated_at, :expires_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, order)
	if err != nil {
		return fmt.Errorf("failed to create order: %w", err)
	}

	return nil
}

// GetByID retrieves an order by its ID
func (r *OrderRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Order, error) {
	var order models.Order

	query := `SELECT * FROM orders WHERE id = $1`
	err := r.db.GetContext(ctx, &order, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get order by ID: %w", err)
	}

	return &order, nil
}

// Update updates an existing order
func (r *OrderRepository) Update(ctx context.Context, order *models.Order) error {
	order.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE orders
		SET side = :side,
		    contract_type = :contract_type,
		    strike_hash_rate = :strike_hash_rate,
		    start_block_height = :start_block_height,
		    end_block_height = :end_block_height,
		    price = :price,
		    quantity = :quantity,
		    remaining_quantity = :remaining_quantity,
		    status = :status,
		    pub_key = :pub_key,
		    updated_at = :updated_at,
		    expires_at = :expires_at
		WHERE id = :id
	`

	_, err := r.db.NamedExecContext(ctx, query, order)
	if err != nil {
		return fmt.Errorf("failed to update order: %w", err)
	}

	return nil
}

// UpdateStatus updates only the status of an order
func (r *OrderRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.OrderStatus) error {
	query := `
		UPDATE orders
		SET status = $1,
		    updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.ExecContext(ctx, query, status, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	return nil
}

// DecrementRemainingQuantity decreases the remaining quantity of an order
func (r *OrderRepository) DecrementRemainingQuantity(ctx context.Context, id uuid.UUID, amount int) error {
	query := `
		UPDATE orders
		SET remaining_quantity = remaining_quantity - $1,
		    updated_at = $2,
		    status = CASE
		        WHEN remaining_quantity - $1 <= 0 THEN 'FILLED'
		        ELSE 'PARTIAL'
		    END
		WHERE id = $3
	`

	_, err := r.db.ExecContext(ctx, query, amount, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("failed to decrement remaining quantity: %w", err)
	}

	return nil
}

// ListOpenOrders retrieves open orders that match the given criteria
func (r *OrderRepository) ListOpenOrders(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	side models.OrderSide,
	limit, offset int,
) ([]*models.Order, error) {
	var orders []*models.Order

	query := `
		SELECT * FROM orders
		WHERE contract_type = $1
		AND strike_hash_rate = $2
		AND side = $3
		AND (status = 'OPEN' OR status = 'PARTIAL')
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY CASE 
		    WHEN side = 'BUY' THEN price
		    ELSE -price
		END DESC
		LIMIT $4 OFFSET $5
	`

	err := r.db.SelectContext(
		ctx,
		&orders,
		query,
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

// ListAllOpenOrders retrieves all open orders regardless of parameters
func (r *OrderRepository) ListAllOpenOrders(ctx context.Context) ([]*models.Order, error) {
	var orders []*models.Order

	query := `
		SELECT * FROM orders
		WHERE (status = 'OPEN' OR status = 'PARTIAL')
		AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at
	`

	err := r.db.SelectContext(ctx, &orders, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list all open orders: %w", err)
	}

	return orders, nil
}

// ListUserOrders retrieves orders for a specific user
func (r *OrderRepository) ListUserOrders(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Order, error) {
	var orders []*models.Order

	query := `
		SELECT * FROM orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	err := r.db.SelectContext(ctx, &orders, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list user orders: %w", err)
	}

	return orders, nil
}

// CancelExpiredOrders cancels orders that have expired
func (r *OrderRepository) CancelExpiredOrders(ctx context.Context) (int64, error) {
	query := `
		UPDATE orders
		SET status = 'EXPIRED',
		    updated_at = $1
		WHERE (status = 'OPEN' OR status = 'PARTIAL')
		AND expires_at IS NOT NULL
		AND expires_at <= $1
	`

	result, err := r.db.ExecContext(ctx, query, time.Now().UTC())
	if err != nil {
		return 0, fmt.Errorf("failed to cancel expired orders: %w", err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return affected, nil
}height = :start_block_
