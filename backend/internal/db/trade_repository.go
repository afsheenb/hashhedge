
// internal/db/trade_repository.go
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"hashhedge/internal/models"
)

// TradeRepository provides access to trade-related database operations
type TradeRepository struct {
	db *DB
}

// NewTradeRepository creates a new trade repository
func NewTradeRepository(db *DB) *TradeRepository {
	return &TradeRepository{db: db}
}

// Create inserts a new trade into the database
func (r *TradeRepository) Create(ctx context.Context, tx *sqlx.Tx, trade *models.Trade) error {
	if trade.ID == uuid.Nil {
		trade.ID = uuid.New()
	}
	trade.ExecutedAt = time.Now().UTC()

	query := `
		INSERT INTO trades (
			id, buy_order_id, sell_order_id, contract_id, price, quantity, executed_at
		) VALUES (
			:id, :buy_order_id, :sell_order_id, :contract_id, :price, :quantity, :executed_at
		)
	`

	var err error
	if tx != nil {
		_, err = tx.NamedExecContext(ctx, query, trade)
	} else {
		_, err = r.db.NamedExecContext(ctx, query, trade)
	}

	if err != nil {
		return fmt.Errorf("failed to create trade: %w", err)
	}

	return nil
}

// GetByID retrieves a trade by its ID
func (r *TradeRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Trade, error) {
	var trade models.Trade

	query := `SELECT * FROM trades WHERE id = $1`
	err := r.db.GetContext(ctx, &trade, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get trade by ID: %w", err)
	}

	return &trade, nil
}

// ListByContractID retrieves all trades for a specific contract
func (r *TradeRepository) ListByContractID(ctx context.Context, contractID uuid.UUID) ([]*models.Trade, error) {
	var trades []*models.Trade

	query := `
		SELECT * FROM trades
		WHERE contract_id = $1
		ORDER BY executed_at DESC
	`

	err := r.db.SelectContext(ctx, &trades, query, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to list trades by contract ID: %w", err)
	}

	return trades, nil
}

// ListByUserID retrieves all trades for a specific user (either as buyer or seller)
func (r *TradeRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Trade, error) {
	var trades []*models.Trade

	query := `
		SELECT t.* FROM trades t
		JOIN orders bo ON t.buy_order_id = bo.id 
		JOIN orders so ON t.sell_order_id = so.id
		WHERE bo.user_id = $1 OR so.user_id = $1
		ORDER BY t.executed_at DESC
		LIMIT $2 OFFSET $3
	`

	err := r.db.SelectContext(ctx, &trades, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list trades by user ID: %w", err)
	}

	return trades, nil
}

// GetRecentTrades retrieves recent trades across all contracts
func (r *TradeRepository) GetRecentTrades(ctx context.Context, limit int) ([]*models.Trade, error) {
	var trades []*models.Trade

	query := `
		SELECT * FROM trades
		ORDER BY executed_at DESC
		LIMIT $1
	`

	err := r.db.SelectContext(ctx, &trades, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent trades: %w", err)
	}

	return trades, nil
}
