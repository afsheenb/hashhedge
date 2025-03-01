// internal/db/contract_repository.go
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"hashhedge/internal/models"
)

// ContractRepository provides access to contract-related database operations
type ContractRepository struct {
	db *DB
}

// NewContractRepository creates a new contract repository
func NewContractRepository(db *DB) *ContractRepository {
	return &ContractRepository{db: db}
}

// Create inserts a new contract into the database
func (r *ContractRepository) Create(ctx context.Context, contract *models.Contract) error {
	if contract.ID == uuid.Nil {
		contract.ID = uuid.New()
	}
	contract.CreatedAt = time.Now().UTC()
	contract.UpdatedAt = contract.CreatedAt

	query := `
		INSERT INTO contracts (
			id, contract_type, strike_hash_rate, start_block_height, end_block_height,
			target_timestamp, contract_size, premium, buyer_pub_key, seller_pub_key,
			status, created_at, updated_at, expires_at, setup_tx_id, final_tx_id, settlement_tx_id
		) VALUES (
			:id, :contract_type, :strike_hash_rate, :start_block_height, :end_block_height,
			:target_timestamp, :contract_size, :premium, :buyer_pub_key, :seller_pub_key,
			:status, :created_at, :updated_at, :expires_at, :setup_tx_id, :final_tx_id, :settlement_tx_id
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, contract)
	if err != nil {
		return fmt.Errorf("failed to create contract: %w", err)
	}

	return nil
}

// GetByID retrieves a contract by its ID
func (r *ContractRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Contract, error) {
	var contract models.Contract

	query := `SELECT * FROM contracts WHERE id = $1`
	err := r.db.GetContext(ctx, &contract, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract by ID: %w", err)
	}

	return &contract, nil
}

// Update updates an existing contract
func (r *ContractRepository) Update(ctx context.Context, contract *models.Contract) error {
	contract.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE contracts
		SET contract_type = :contract_type,
			strike_hash_rate = :strike_hash_rate,
			start_block_height = :start_block_height,
			end_block_height = :end_block_height,
			target_timestamp = :target_timestamp,
			contract_size = :contract_size,
			premium = :premium,
			buyer_pub_key = :buyer_pub_key,
			seller_pub_key = :seller_pub_key,
			status = :status,
			updated_at = :updated_at,
			expires_at = :expires_at,
			setup_tx_id = :setup_tx_id,
			final_tx_id = :final_tx_id,
			settlement_tx_id = :settlement_tx_id
		WHERE id = :id
	`

	_, err := r.db.NamedExecContext(ctx, query, contract)
	if err != nil {
		return fmt.Errorf("failed to update contract: %w", err)
	}

	return nil
}

// UpdateStatus updates only the status of a contract
func (r *ContractRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.ContractStatus) error {
	query := `
		UPDATE contracts
		SET status = $1,
		    updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.ExecContext(ctx, query, status, time.Now().UTC(), id)
	if err != nil {
		return fmt.Errorf("failed to update contract status: %w", err)
	}

	return nil
}

// ListByStatus retrieves contracts by their status
func (r *ContractRepository) ListByStatus(ctx context.Context, status models.ContractStatus, limit, offset int) ([]*models.Contract, error) {
	var contracts []*models.Contract

	query := `
		SELECT * FROM contracts
		WHERE status = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	err := r.db.SelectContext(ctx, &contracts, query, status, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list contracts by status: %w", err)
	}

	return contracts, nil
}

// AddTransaction adds a transaction associated with a contract
func (r *ContractRepository) AddTransaction(ctx context.Context, tx *models.ContractTransaction) error {
	if tx.ID == uuid.Nil {
		tx.ID = uuid.New()
	}
	tx.CreatedAt = time.Now().UTC()

	query := `
		INSERT INTO contract_transactions (
			id, contract_id, transaction_id, tx_type, tx_hex, confirmed, created_at, confirmed_at
		) VALUES (
			:id, :contract_id, :transaction_id, :tx_type, :tx_hex, :confirmed, :created_at, :confirmed_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, tx)
	if err != nil {
		return fmt.Errorf("failed to add contract transaction: %w", err)
	}

	return nil
}

// ConfirmTransaction marks a transaction as confirmed
func (r *ContractRepository) ConfirmTransaction(ctx context.Context, txID string) error {
	now := time.Now().UTC()
	
	query := `
		UPDATE contract_transactions
		SET confirmed = TRUE,
		    confirmed_at = $1
		WHERE transaction_id = $2
	`

	_, err := r.db.ExecContext(ctx, query, now, txID)
	if err != nil {
		return fmt.Errorf("failed to confirm transaction: %w", err)
	}

	return nil
}

// GetTransactionsByContractID retrieves all transactions for a contract
func (r *ContractRepository) GetTransactionsByContractID(ctx context.Context, contractID uuid.UUID) ([]*models.ContractTransaction, error) {
	var transactions []*models.ContractTransaction

	query := `
		SELECT * FROM contract_transactions
		WHERE contract_id = $1
		ORDER BY created_at ASC
	`

	err := r.db.SelectContext(ctx, &transactions, query, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions for contract: %w", err)
	}

	return transactions, nil
}

// CountActiveContracts counts the number of active contracts
func (r *ContractRepository) CountActiveContracts(ctx context.Context) (int, error) {
	var count int

	query := `
		SELECT COUNT(*) FROM contracts
		WHERE status = $1
	`

	err := r.db.GetContext(ctx, &count, query, models.ContractStatusActive)
	if err != nil {
		return 0, fmt.Errorf("failed to count active contracts: %w", err)
	}

	return count, nil
}
