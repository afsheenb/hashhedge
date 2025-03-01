// internal/server/server.go
package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"
)

// Config holds server configuration
type Config struct {
	Host         string
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// Server represents the HTTP server
type Server struct {
	server *http.Server
	router http.Handler
}

// NewServer creates a new HTTP server
func NewServer(cfg Config, router http.Handler) *Server {
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)

	httpServer := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	return &Server{
		server: httpServer,
		router: router,
	}
}

// Start starts the HTTP server
func (s *Server) Start() error {
	// Channel to listen for errors from the server
	errCh := make(chan error, 1)

	// Start server in a goroutine
	go func() {
		log.Info().Msgf("Starting server on %s", s.server.Addr)
		errCh <- s.server.ListenAndServe()
	}()

	// Channel to listen for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	// Block until an error or interrupt is received
	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-sigCh:
		log.Info().Msgf("Received signal: %s", sig)
	}

	// Graceful shutdown
	return s.Stop()
}

// Stop stops the HTTP server gracefully
func (s *Server) Stop() error {
	log.Info().Msg("Shutting down server...")

	// Create a deadline for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Attempt to shut down the server gracefully
// internal/server/server.go (continued)
	// Attempt to shut down the server gracefully
	if err := s.server.Shutdown(ctx); err != nil {
		return fmt.Errorf("server shutdown error: %w", err)
	}

	log.Info().Msg("Server stopped successfully")
	return nil
}
