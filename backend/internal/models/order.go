package models

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// OrderSide represents whether the order is buying or selling
type OrderSide string

const (
	OrderSideBuy  OrderSide = "BUY"
	OrderSideSell OrderSide = "SELL"
)

// OrderStatus represents the current state of an order
type OrderStatus string

const (
	OrderStatusOpen      OrderStatus = "OPEN"
	OrderStatusPartial   OrderStatus = "PARTIAL"
	OrderStatusFilled    OrderStatus = "FILLED"
	OrderStatusCancelled OrderStatus = "CANCELLED"
	OrderStatusExpired   OrderStatus = "EXPIRED"
)

// Order represents an order in the order book
type Order struct {
	ID                 uuid.UUID    `json:"id" db:"id"`
	UserID             uuid.UUID    `json:"user_id" db:"user_id"`
	Side               OrderSide    `json:"side" db:"side"`
	ContractType       ContractType `json:"contract_type" db:"contract_type"`
	StrikeHashRate     float64      `json:"strike_hash_rate" db:"strike_hash_rate"`
	StartBlockHeight   int64        `json:"start_block_height" db:"start_block_height"`
	EndBlockHeight     int64        `json:"end_block_height" db:"end_block_height"`
	Price              int64        `json:"price" db:"price"`               // In satoshis
	Quantity           int          `json:"quantity" db:"quantity"`         // Number of contracts
	RemainingQuantity  int          `json:"remaining_quantity" db:"remaining_quantity"`
	Status             OrderStatus  `json:"status" db:"status"`
	PubKey             string       `json:"pub_key" db:"pub_key"`
	CreatedAt          time.Time    `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at" db:"updated_at"`
	ExpiresAt          *time.Time   `json:"expires_at,omitempty" db:"expires_at"`
}

// Validate checks if the order is valid
func (o *Order) Validate() error {
	if o.UserID == uuid.Nil {
		return errors.New("user ID cannot be empty")
	}

	if o.Side != OrderSideBuy && o.Side != OrderSideSell {
		return errors.New("invalid order side")
	}

	if o.ContractType != ContractTypeCall && o.ContractType != ContractTypePut {
		return errors.New("invalid contract type")
	}

	if o.StrikeHashRate <= 0 {
		return errors.New("strike hash rate must be positive")
	}

	if o.StartBlockHeight <= 0 {
		return errors.New("start block height must be positive")
	}

	if o.EndBlockHeight <= o.StartBlockHeight {
		return errors.New("end block height must be greater than start block height")
	}

	if o.Price <= 0 {
		return errors.New("price must be positive")
	}

	if o.Quantity <= 0 {
		return errors.New("quantity must be positive")
	}

	if o.PubKey == "" {
		return errors.New("public key cannot be empty")
	}

	return nil
}

// CanBeCancelled checks if an order can be cancelled
func (o *Order) CanBeCancelled() bool {
	return o.Status == OrderStatusOpen || o.Status == OrderStatusPartial
}

// Trade represents a matched order that resulted in a contract
type Trade struct {
	ID           uuid.UUID `json:"id" db:"id"`
	BuyOrderID   uuid.UUID `json:"buy_order_id" db:"buy_order_id"`
	SellOrderID  uuid.UUID `json:"sell_order_id" db:"sell_order_id"`
	ContractID   uuid.UUID `json:"contract_id" db:"contract_id"`
	Price        int64     `json:"price" db:"price"`
	Quantity     int       `json:"quantity" db:"quantity"`
	ExecutedAt   time.Time `json:"executed_at" db:"executed_at"`
}

// Validate checks if the trade is valid
func (t *Trade) Validate() error {
	if t.BuyOrderID == uuid.Nil {
		return errors.New("buy order ID cannot be empty")
	}

	if t.SellOrderID == uuid.Nil {
		return errors.New("sell order ID cannot be empty")
	}

	if t.ContractID == uuid.Nil {
		return errors.New("contract ID cannot be empty")
	}

	if t.Price <= 0 {
		return errors.New("price must be positive")
	}

	if t.Quantity <= 0 {
		return errors.New("quantity must be positive")
	}

	return nil
}
