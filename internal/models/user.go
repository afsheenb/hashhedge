// internal/models/user.go
package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user of the platform
type User struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Username      string    `json:"username" db:"username"`
	PasswordHash  string    `json:"-" db:"password_hash"`
	Email         string    `json:"email" db:"email"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// UserKey represents a key owned by a user
type UserKey struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	PubKey    string    `json:"pub_key" db:"pub_key"`
	KeyType   string    `json:"key_type" db:"key_type"` // e.g., "taproot", "secp256k1"
	Label     string    `json:"label" db:"label"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
