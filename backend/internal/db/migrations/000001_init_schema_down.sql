-- internal/db/migrations/000001_init_schema.down.sql

DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS contract_transactions;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS user_keys;
DROP TABLE IF EXISTS users;
