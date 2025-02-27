// internal/models/contract.go
package models

import (
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

// Transaction represents the various transactions associated with a contract
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
