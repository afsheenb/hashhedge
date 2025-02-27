
-- internal/db/migrations/000001_init_schema.up.sql

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- User keys table
CREATE TABLE user_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pub_key VARCHAR(255) NOT NULL,
    key_type VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (user_id, pub_key)
);

-- Contracts table
CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    contract_type VARCHAR(10) NOT NULL CHECK (contract_type IN ('CALL', 'PUT')),
    strike_hash_rate DOUBLE PRECISION NOT NULL,
    start_block_height BIGINT NOT NULL,
    end_block_height BIGINT NOT NULL,
    target_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    contract_size BIGINT NOT NULL,
    premium BIGINT NOT NULL,
    buyer_pub_key VARCHAR(255) NOT NULL,
    seller_pub_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('CREATED', 'ACTIVE', 'SETTLED', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    setup_tx_id VARCHAR(64),
    final_tx_id VARCHAR(64),
    settlement_tx_id VARCHAR(64)
);

-- Contract transactions table
CREATE TABLE contract_transactions (
    id UUID PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    transaction_id VARCHAR(64) NOT NULL,
    tx_type VARCHAR(20) NOT NULL,
    tx_hex TEXT NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    contract_type VARCHAR(10) NOT NULL CHECK (contract_type IN ('CALL', 'PUT')),
    strike_hash_rate DOUBLE PRECISION NOT NULL,
    start_block_height BIGINT NOT NULL,
    end_block_height BIGINT NOT NULL,
    price BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    remaining_quantity INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'PARTIAL', 'FILLED', 'CANCELLED', 'EXPIRED')),
    pub_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Trades table
CREATE TABLE trades (
    id UUID PRIMARY KEY,
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    price BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add indices for performance
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_contract_type_hash_rate ON orders(contract_type, strike_hash_rate);
CREATE INDEX idx_user_keys_user_id ON user_keys(user_id);
CREATE INDEX idx_contract_transactions_contract_id ON contract_transactions(contract_id);
CREATE INDEX idx_trades_buy_order_id ON trades(buy_order_id);
CREATE INDEX idx_trades_sell_order_id ON trades(sell_order_id);
