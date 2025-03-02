// internal/config/config.go
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds the application configuration
type Config struct {
	Server   ServerConfig   `yaml:"server"`
	Database DatabaseConfig `yaml:"database"`
	Bitcoin  BitcoinConfig  `yaml:"bitcoin"`
	ArkASP   ArkASPConfig   `yaml:"ark_asp"`
}

// ServerConfig holds the HTTP server configuration
type ServerConfig struct {
	Host         string        `yaml:"host"`
	Port         int           `yaml:"port"`
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	IdleTimeout  time.Duration `yaml:"idle_timeout"`
}

// DatabaseConfig holds the database configuration
type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	SSLMode  string `yaml:"sslmode"`
}

// BitcoinConfig holds the Bitcoin RPC configuration
type BitcoinConfig struct {
	Host     string `yaml:"host"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	UseTLS   bool   `yaml:"use_tls"`
}

// ArkASPConfig holds the Ark Service Provider configuration
type ArkASPConfig struct {
	Host            string        `yaml:"host"`
	Port            int           `yaml:"port"`
	PubKey          string        `yaml:"pub_key"`
	ConnectTimeout  time.Duration `yaml:"connect_timeout"`
	RequestTimeout  time.Duration `yaml:"request_timeout"`
}

// Load loads the configuration from a file
func Load(path string) (*Config, error) {
	// Default configuration
	cfg := &Config{
		Server: ServerConfig{
			Host:         "localhost",
			Port:         8080,
			ReadTimeout:  30 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  120 * time.Second,
		},
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "postgres",
			Password: "postgres",
			DBName:   "hashhedge",
			SSLMode:  "disable",
		},
		Bitcoin: BitcoinConfig{
			Host:     "localhost:8332",
			User:     "bitcoin",
			Password: "password",
			UseTLS:   false,
		},
		ArkASP: ArkASPConfig{
			Host:           "localhost",
			Port:           50051,
			PubKey:         "0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0",
			ConnectTimeout: 10 * time.Second,
			RequestTimeout: 30 * time.Second,
		},
	}

	// Read configuration file if provided
	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}

		if err := yaml.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("failed to parse config file: %w", err)
		}
	}

	// Override with environment variables if they exist
	if serverHost := os.Getenv("SERVER_HOST"); serverHost != "" {
		cfg.Server.Host = serverHost
	}
	
	if serverPort := os.Getenv("SERVER_PORT"); serverPort != "" {
		if port, err := strconv.Atoi(serverPort); err == nil {
			cfg.Server.Port = port
		}
	}
	
	if dbHost := os.Getenv("DB_HOST"); dbHost != "" {
		cfg.Database.Host = dbHost
	}
	
	if dbPort := os.Getenv("DB_PORT"); dbPort != "" {
		if port, err := strconv.Atoi(dbPort); err == nil {
			cfg.Database.Port = port
		}
	}
	
	if dbUser := os.Getenv("DB_USER"); dbUser != "" {
		cfg.Database.User = dbUser
	}
	
	if dbPassword := os.Getenv("DB_PASSWORD"); dbPassword != "" {
		cfg.Database.Password = dbPassword
	}
	
	if dbName := os.Getenv("DB_NAME"); dbName != "" {
		cfg.Database.DBName = dbName
	}
	
	if dbSSLMode := os.Getenv("DB_SSLMODE"); dbSSLMode != "" {
		cfg.Database.SSLMode = dbSSLMode
	}
	
	if bitcoinHost := os.Getenv("BITCOIN_HOST"); bitcoinHost != "" {
		cfg.Bitcoin.Host = bitcoinHost
	}
	
	if bitcoinUser := os.Getenv("BITCOIN_USER"); bitcoinUser != "" {
		cfg.Bitcoin.User = bitcoinUser
	}
	
	if bitcoinPassword := os.Getenv("BITCOIN_PASSWORD"); bitcoinPassword != "" {
		cfg.Bitcoin.Password = bitcoinPassword
	}
	
	if bitcoinUseTLS := os.Getenv("BITCOIN_USE_TLS"); bitcoinUseTLS != "" {
		cfg.Bitcoin.UseTLS = bitcoinUseTLS == "true" || bitcoinUseTLS == "1"
	}
	
	if arkHost := os.Getenv("ARK_HOST"); arkHost != "" {
		cfg.ArkASP.Host = arkHost
	}
	
	if arkPort := os.Getenv("ARK_PORT"); arkPort != "" {
		if port, err := strconv.Atoi(arkPort); err == nil {
			cfg.ArkASP.Port = port
		}
	}
	
	if arkPubKey := os.Getenv("ARK_PUBKEY"); arkPubKey != "" {
		cfg.ArkASP.PubKey = arkPubKey
	}

	// Validate the configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Server validation
	if c.Server.Port <= 0 || c.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", c.Server.Port)
	}
	
	// Database validation
	if c.Database.Port <= 0 || c.Database.Port > 65535 {
		return fmt.Errorf("invalid database port: %d", c.Database.Port)
	}
	
	if c.Database.User == "" {
		return fmt.Errorf("database user cannot be empty")
	}
	
	if c.Database.DBName == "" {
		return fmt.Errorf("database name cannot be empty")
	}
	
	// Bitcoin validation
	if c.Bitcoin.Host == "" {
		return fmt.Errorf("Bitcoin host cannot be empty")
	}
	
	if c.Bitcoin.User == "" {
		return fmt.Errorf("Bitcoin user cannot be empty")
	}
	
	// ARK validation
	if c.ArkASP.Port <= 0 || c.ArkASP.Port > 65535 {
		return fmt.Errorf("invalid ARK port: %d", c.ArkASP.Port)
	}
	
	if c.ArkASP.PubKey == "" {
		return fmt.Errorf("ARK ASP public key cannot be empty")
	}

	return nil
}
