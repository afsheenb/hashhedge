package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// ContractType represents the type of hash rate option
type ContractType string

const (
	// CALL option betting that hash rate increases
	ContractTypeCall ContractType = "CALL"
	// PUT option betting that hash rate decreases
	ContractTypePut ContractType = "PUT"
)

// ContractStatus represents the current state of a contract
type ContractStatus string

const (
	ContractStatusCreated    ContractStatus = "CREATED"
	ContractStatusActive     ContractStatus = "ACTIVE"
	ContractStatusSettled    ContractStatus = "SETTLED"
	ContractStatusExpired    ContractStatus = "EXPIRED"
	ContractStatusCancelled  ContractStatus = "CANCELLED"
)

// Contract represents a hash rate binary option contract
type Contract struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	ContractType     ContractType    `json:"contract_type" db:"contract_type"`
	StrikeHashRate   float64         `json:"strike_hash_rate" db:"strike_hash_rate"` // In EH/s
	StartBlockHeight int64           `json:"start_block_height" db:"start_block_height"`
	EndBlockHeight   int64           `json:"end_block_height" db:"end_block_height"`
	TargetTimestamp  time.Time       `json:"target_timestamp" db:"target_timestamp"`
	ContractSize     int64           `json:"contract_size" db:"contract_size"` // In satoshis
	Premium          int64           `json:"premium" db:"premium"`             // In satoshis
	BuyerPubKey      string          `json:"buyer_pub_key" db:"buyer_pub_key"`
	SellerPubKey     string          `json:"seller_pub_key" db:"seller_pub_key"`
	Status           ContractStatus  `json:"status" db:"status"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at" db:"updated_at"`
	ExpiresAt        time.Time       `json:"expires_at" db:"expires_at"`
	SetupTxID        *string         `json:"setup_tx_id,omitempty" db:"setup_tx_id"`
	FinalTxID        *string         `json:"final_tx_id,omitempty" db:"final_tx_id"`
	SettlementTxID   *string         `json:"settlement_tx_id,omitempty" db:"settlement_tx_id"`
}

// Validate checks if the contract is valid
func (c *Contract) Validate() error {
	if c.ContractType != ContractTypeCall && c.ContractType != ContractTypePut {
		return errors.New("invalid contract type")
	}

	if c.StrikeHashRate <= 0 {
		return errors.New("strike hash rate must be positive")
	}

	if c.StartBlockHeight <= 0 {
		return errors.New("start block height must be positive")
	}

	if c.EndBlockHeight <= c.StartBlockHeight {
		return errors.New("end block height must be greater than start block height")
	}

	if c.TargetTimestamp.Before(time.Now()) {
		return errors.New("target timestamp must be in the future")
	}

	if c.ContractSize <= 0 {
		return errors.New("contract size must be positive")
	}

	if c.Premium < 0 {
		return errors.New("premium cannot be negative")
	}

	if c.BuyerPubKey == "" {
		return errors.New("buyer public key cannot be empty")
	}

	if c.SellerPubKey == "" {
		return errors.New("seller public key cannot be empty")
	}

	return nil
}

// CanBeActivated checks if a contract can be activated
func (c *Contract) CanBeActivated() bool {
	return c.Status == ContractStatusCreated
}

// CanBeSettled checks if a contract can be settled
func (c *Contract) CanBeSettled() bool {
	return c.Status == ContractStatusActive && 
           (time.Now().After(c.TargetTimestamp) || time.Now().After(c.ExpiresAt))
}

// CanBeCancelled checks if a contract can be cancelled
func (c *Contract) CanBeCancelled() bool {
	return c.Status == ContractStatusCreated
}

// IsExpired checks if a contract is expired but not settled
func (c *Contract) IsExpired() bool {
	return c.Status == ContractStatusActive && time.Now().After(c.ExpiresAt)
}

// ContractTransaction represents the various transactions associated with a contract
type ContractTransaction struct {
	ID            uuid.UUID   `json:"id" db:"id"`
	ContractID    uuid.UUID   `json:"contract_id" db:"contract_id"`
	TransactionID string      `json:"transaction_id" db:"transaction_id"`
	TxType        string      `json:"tx_type" db:"tx_type"` // setup, final, settlement
	TxHex         string      `json:"tx_hex" db:"tx_hex"`
	Confirmed     bool        `json:"confirmed" db:"confirmed"`
	CreatedAt     time.Time   `json:"created_at" db:"created_at"`
	ConfirmedAt   *time.Time  `json:"confirmed_at,omitempty" db:"confirmed_at"`
}

// Validate checks if the contract transaction is valid
func (tx *ContractTransaction) Validate() error {
	if tx.ContractID == uuid.Nil {
		return errors.New("contract ID cannot be empty")
	}

	if tx.TransactionID == "" {
		return errors.New("transaction ID cannot be empty")
	}

	if tx.TxType == "" {
		return errors.New("transaction type cannot be empty")
	}

	if tx.TxType != "setup" && tx.TxType != "final" && tx.TxType != "settlement" && tx.TxType != "swap" {
		return errors.New("invalid transaction type")
	}

	if tx.TxHex == "" {
		return errors.New("transaction hex cannot be empty")
	}

	return nil
}
