
// internal/server/handlers.go
package server

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"hashhedge/internal/contract"
	"hashhedge/internal/models"
	"hashhedge/internal/orderbook"
)

// Handler contains all HTTP handlers
type Handler struct {
	contractService *contract.Service
	orderBook       *orderbook.OrderBook
}

// NewHandler creates a new Handler
func NewHandler(contractService *contract.Service, orderBook *orderbook.OrderBook) *Handler {
	return &Handler{
		contractService: contractService,
		orderBook:       orderBook,
	}
}

// response is a generic response structure
type response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// errorResponse sends an error response
func errorResponse(w http.ResponseWriter, statusCode int, message string) {
	respondJSON(w, statusCode, response{
		Success: false,
		Error:   message,
	})
}

// GetContract handles retrieving contract details
func (h *Handler) GetContract(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	contract, err := h.contractService.GetContract(r.Context(), contractID)
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Contract not found")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    contract,
	})
}

// GetOrderBook handles retrieving the current order book state
func (h *Handler) GetOrderBook(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	contractTypeStr := r.URL.Query().Get("type")
	strikeHashRateStr := r.URL.Query().Get("strike_hash_rate")
	limitStr := r.URL.Query().Get("limit")

	var contractType models.ContractType
	switch contractTypeStr {
	case "call":
		contractType = models.ContractTypeCall
	case "put":
		contractType = models.ContractTypePut
	default:
		errorResponse(w, http.StatusBadRequest, "Invalid contract type")
		return
	}

	strikeHashRate, err := strconv.ParseFloat(strikeHashRateStr, 64)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid strike hash rate")
		return
	}

	limit := 50
	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid limit")
			return
		}
	}

	orderBook, err := h.orderBook.GetOrderBook(r.Context(), contractType, strikeHashRate, limit)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to get order book")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    orderBook,
	})
}

// PlaceOrder handles creating a new order
type PlaceOrderRequest struct {
	UserID          string  `json:"user_id"`
	Side            string  `json:"side"`
	ContractType    string  `json:"contract_type"`
	StrikeHashRate  float64 `json:"strike_hash_rate"`
	StartBlockHeight int64   `json:"start_block_height"`
	EndBlockHeight  int64   `json:"end_block_height"`
	Price           int64   `json:"price"`
	Quantity        int     `json:"quantity"`
	PubKey          string  `json:"pub_key"`
	ExpiresIn       *int    `json:"expires_in,omitempty"` // Optional: minutes until expiration
}

func (h *Handler) PlaceOrder(w http.ResponseWriter, r *http.Request) {
	var req PlaceOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate request
	if req.UserID == "" || req.PubKey == "" {
		errorResponse(w, http.StatusBadRequest, "User ID and pub key are required")
		return
	}

	if req.StrikeHashRate <= 0 {
		errorResponse(w, http.StatusBadRequest, "Strike hash rate must be positive")
		return
	}

	if req.Price <= 0 {
		errorResponse(w, http.StatusBadRequest, "Price must be positive")
		return
	}

	if req.Quantity <= 0 {
		errorResponse(w, http.StatusBadRequest, "Quantity must be positive")
		return
	}

	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Determine side
	var side models.OrderSide
	switch req.Side {
	case "buy":
		side = models.OrderSideBuy
	case "sell":
		side = models.OrderSideSell
	default:
		errorResponse(w, http.StatusBadRequest, "Invalid side")
		return
	}

	// Determine contract type
	var contractType models.ContractType
	switch req.ContractType {
	case "call":
		contractType = models.ContractTypeCall
	case "put":
		contractType = models.ContractTypePut
	default:
		errorResponse(w, http.StatusBadRequest, "Invalid contract type")
		return
	}

	// Create order object
	order := &models.Order{
		UserID:           userID,
		Side:             side,
		ContractType:     contractType,
		StrikeHashRate:   req.StrikeHashRate,
		StartBlockHeight: req.StartBlockHeight,
		EndBlockHeight:   req.EndBlockHeight,
		Price:            req.Price,
		Quantity:         req.Quantity,
		PubKey:           req.PubKey,
	}

	// Set expiration if provided
	if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
		expiresAt := time.Now().Add(time.Duration(*req.ExpiresIn) * time.Minute)
		order.ExpiresAt = &expiresAt
	}

	// Place the order
	placedOrder, err := h.orderBook.PlaceOrder(r.Context(), order)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to place order")
		return
	}

	respondJSON(w, http.StatusCreated, response{
		Success: true,
		Data:    placedOrder,
	})
}

// CancelOrder handles cancelling an order
func (h *Handler) CancelOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	orderID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	err = h.orderBook.CancelOrder(r.Context(), orderID)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to cancel order")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
	})
}

// SettleContract handles contract settlement
func (h *Handler) SettleContract(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	tx, buyerWins, err := h.contractService.SettleContract(r.Context(), contractID)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to settle contract")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data: map[string]interface{}{
			"transaction": tx,
			"buyer_wins":  buyerWins,
		},
	})
}

// GetUserOrders handles retrieving all orders for a user
func (h *Handler) GetUserOrders(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Parse pagination parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	if limitStr != "" {
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid limit")
			return
		}
	}

	offset := 0
	if offsetStr != "" {
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid offset")
			return
		}
	}

	orders, err := h.orderBook.ListUserOrders(r.Context(), userID, limit, offset)
	if err != nil {
		errorResponse(w, http.StatusInternalServerError, "Failed to get user orders")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    orders,
	})
}
