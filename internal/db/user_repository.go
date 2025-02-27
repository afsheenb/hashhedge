// internal/db/user_repository.go
package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"hashhedge/internal/models"
)

// UserRepository provides access to user-related database operations
type UserRepository struct {
	db *DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create inserts a new user into the database
func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	user.CreatedAt = time.Now().UTC()
	user.UpdatedAt = user.CreatedAt

	query := `
		INSERT INTO users (
			id, username, password_hash, email, created_at, updated_at, last_login_at
		) VALUES (
			:id, :username, :password_hash, :email, :created_at, :updated_at, :last_login_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User

	query := `SELECT * FROM users WHERE id = $1`
	err := r.db.GetContext(ctx, &user, query, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	return &user, nil
}

// GetByUsername retrieves a user by username
func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User

	query := `SELECT * FROM users WHERE username = $1`
	err := r.db.GetContext(ctx, &user, query, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by username: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User

	query := `SELECT * FROM users WHERE email = $1`
	err := r.db.GetContext(ctx, &user, query, email)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE users
		SET username = :username,
		    password_hash = :password_hash,
		    email = :email,
		    updated_at = :updated_at,
		    last_login_at = :last_login_at
		WHERE id = :id
	`

	_, err := r.db.NamedExecContext(ctx, query, user)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

// UpdateLastLogin updates only the last login timestamp of a user
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	
	query := `
		UPDATE users
		SET last_login_at = $1,
		    updated_at = $1
		WHERE id = $2
	`

	_, err := r.db.ExecContext(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	return nil
}

// AddKey adds a new key for a user
func (r *UserRepository) AddKey(ctx context.Context, key *models.UserKey) error {
	if key.ID == uuid.Nil {
		key.ID = uuid.New()
	}
	key.CreatedAt = time.Now().UTC()

	query := `
		INSERT INTO user_keys (
			id, user_id, pub_key, key_type, label, created_at
		) VALUES (
			:id, :user_id, :pub_key, :key_type, :label, :created_at
		)
	`

	_, err := r.db.NamedExecContext(ctx, query, key)
	if err != nil {
		return fmt.Errorf("failed to add user key: %w", err)
	}

	return nil
}

// GetKeysByUserID retrieves all keys for a specific user
func (r *UserRepository) GetKeysByUserID(ctx context.Context, userID uuid.UUID) ([]*models.UserKey, error) {
	var keys []*models.UserKey

	query := `
		SELECT * FROM user_keys
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &keys, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get keys by user ID: %w", err)
	}

	return keys, nil
}

// DeleteKey removes a key by its ID
func (r *UserRepository) DeleteKey(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM user_keys WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete key: %w", err)
	}

	return nil
}
