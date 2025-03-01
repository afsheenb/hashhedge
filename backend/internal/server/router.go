
// internal/server/router.go
package server

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates a new HTTP router
func NewRouter(h *Handler) http.Handler {
	r := chi.NewRouter()

	// Basic middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS middleware
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Contract routes
		r.Route("/contracts", func(r chi.Router) {
			r.Get("/{id}", h.GetContract)
			r.Post("/{id}/settle", h.SettleContract)
		})

		// Order routes
		r.Route("/orders", func(r chi.Router) {
			r.Post("/", h.PlaceOrder)
			r.Delete("/{id}", h.CancelOrder)
			r.Get("/user/{id}", h.GetUserOrders)
		})

		// Order book routes
		r.Get("/orderbook", h.GetOrderBook)
	})

	return r
}
