// cmd/server/main.go
package main

import (
	"context"
	"flag"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	
	"hashhedge/internal/config"
	"hashhedge/internal/contract"
	"hashhedge/internal/contract/hashrate"
	"hashhedge/internal/db"
	"hashhedge/internal/orderbook"
	"hashhedge/internal/server"
	"hashhedge/pkg/bitcoin"
	"hashhedge/pkg/taproot"
)

func main() {
	// Parse command-line flags
	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	flag.Parse()

	// Configure logging
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})
	
	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}
	
	// Create database connection
	database, err := db.New(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	
	// Create Bitcoin client
	bitcoinClient, err := bitcoin.NewClient(
		cfg.Bitcoin.Host,
		cfg.Bitcoin.User,
		cfg.Bitcoin.Password,
		cfg.Bitcoin.UseTLS,
	)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create Bitcoin client")
	}
	defer bitcoinClient.Close()
	
	// Create repositories
	contractRepo := db.NewContractRepository(database)
	orderRepo := db.NewOrderRepository(database)
	tradeRepo := db.NewTradeRepository(database)
	userRepo := db.NewUserRepository(database)
	
	// Create services
	hashRateCalculator := hashrate.New(bitcoinClient)
	taprootScriptBuilder := taproot.NewScriptBuilder()
	
	contractService := contract.NewService(
		contractRepo,
		hashRateCalculator,
		bitcoinClient,
		taprootScriptBuilder,
	)
	
	orderBook := orderbook.NewOrderBook(
		database,
		orderRepo,
		tradeRepo,
		contractRepo,
		contractService,
	)
	
	// Start the order book background tasks
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	orderBook.Start(ctx)
	
	// Create HTTP handler
	handler := server.NewHandler(contractService, orderBook)
	router := server.NewRouter(handler)
	
	// Create and start HTTP server
	httpServer := server.NewServer(cfg.Server, router)
	if err := httpServer.Start(); err != nil {
		log.Fatal().Err(err).Msg("Server error")
	}
}
