
package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	
	"hashhedge/internal/contract"
	"hashhedge/internal/db"
	"hashhedge/internal/models"
	"hashhedge/internal/orderbook"
)

// Handler contains all HTTP handlers
type Handler struct {
	contractService *contract.Service
	orderBook       *orderbook.OrderBook
	userRepo        *db.UserRepository
}

// NewHandler creates a new Handler
func NewHandler(contractService *contract.Service, orderBook *orderbook.OrderBook, userRepo *db.UserRepository) *Handler {
	return &Handler{
		contractService: contractService,
		orderBook:       orderBook,
		userRepo:        userRepo,
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
		log.Error().Err(err).Msg("Failed to encode JSON response")
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

// validateUserPermissions validates if the user has permissions to access a resource
// For MVP, we'll do simple validation, but this should be expanded for production
func (h *Handler) validateUserPermissions(r *http.Request, resourceUserID uuid.UUID) bool {
	// In a real implementation, this would check JWT tokens, session data, etc.
	// For MVP, we'll assume the user ID in the request is valid
	// and compare it with the resource's user ID if applicable
	
	// Get user ID from request context/headers/etc.
	// For MVP, we'll just return true
	return true
}

// sanitizeInput performs basic input sanitization
func sanitizeInput(input string) string {
	// Simple sanitization for MVP - should be expanded for production
	input = strings.TrimSpace(input)
	input = strings.Replace(input, "<", "&lt;", -1)
	input = strings.Replace(input, ">", "&gt;", -1)
	return input
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
		log.Error().Err(err).Str("contractID", id).Msg("Failed to get contract")
		errorResponse(w, http.StatusNotFound, "Contract not found")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    contract,
	})
}

// ListActiveContracts handles listing all active contracts
func (h *Handler) ListActiveContracts(w http.ResponseWriter, r *http.Request) {
	// Parse pagination parameters
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid limit")
			return
		}
	}

	offset := 0
	if offsetStr != "" {
		var err error
		offset, err = strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid offset")
			return
		}
	}

	contracts, err := h.contractService.ListActiveContracts(r.Context(), limit, offset)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list active contracts")
		errorResponse(w, http.StatusInternalServerError, "Failed to list active contracts")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    contracts,
	})
}

// CreateContractRequest represents the request to create a new contract
type CreateContractRequest struct {
	ContractType     string    `json:"contract_type"`
	StrikeHashRate   float64   `json:"strike_hash_rate"`
	StartBlockHeight int64     `json:"start_block_height"`
	EndBlockHeight   int64     `json:"end_block_height"`
	TargetTimestamp  time.Time `json:"target_timestamp"`
	ContractSize     int64     `json:"contract_size"`
	Premium          int64     `json:"premium"`
	BuyerPubKey      string    `json:"buyer_pub_key"`
	SellerPubKey     string    `json:"seller_pub_key"`
}

// CreateContract handles creating a new contract directly (not through order matching)
func (h *Handler) CreateContract(w http.ResponseWriter, r *http.Request) {
	var req CreateContractRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate request
	if req.ContractType != "CALL" && req.ContractType != "PUT" {
		errorResponse(w, http.StatusBadRequest, "Invalid contract type")
		return
	}

	if req.StrikeHashRate <= 0 {
		errorResponse(w, http.StatusBadRequest, "Strike hash rate must be positive")
		return
	}

	if req.StartBlockHeight <= 0 {
		errorResponse(w, http.StatusBadRequest, "Start block height must be positive")
		return
	}

	if req.EndBlockHeight <= req.StartBlockHeight {
		errorResponse(w, http.StatusBadRequest, "End block height must be greater than start block height")
		return
	}

	if req.TargetTimestamp.Before(time.Now()) {
		errorResponse(w, http.StatusBadRequest, "Target timestamp must be in the future")
		return
	}

	if req.ContractSize <= 0 {
		errorResponse(w, http.StatusBadRequest, "Contract size must be positive")
		return
	}

	if req.Premium < 0 {
		errorResponse(w, http.StatusBadRequest, "Premium cannot be negative")
		return
	}

	// Sanitize inputs
	req.BuyerPubKey = sanitizeInput(req.BuyerPubKey)
	req.SellerPubKey = sanitizeInput(req.SellerPubKey)

	if req.BuyerPubKey == "" || req.SellerPubKey == "" {
		errorResponse(w, http.StatusBadRequest, "Both buyer and seller public keys are required")
		return
	}

	// Convert contract type
	var contractType models.ContractType
	if req.ContractType == "CALL" {
		contractType = models.ContractTypeCall
	} else {
		contractType = models.ContractTypePut
	}

	// Create the contract
	contract, err := h.contractService.CreateContract(
		r.Context(),
		contractType,
		req.StrikeHashRate,
		req.StartBlockHeight,
		req.EndBlockHeight,
		req.TargetTimestamp,
		req.ContractSize,
		req.Premium,
		req.BuyerPubKey,
		req.SellerPubKey,
	)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create contract")
		errorResponse(w, http.StatusInternalServerError, "Failed to create contract")
		return
	}

	respondJSON(w, http.StatusCreated, response{
		Success: true,
		Data:    contract,
	})
}

// CancelContract handles cancelling a contract
func (h *Handler) CancelContract(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	// Get the contract first to check permissions
	contract, err := h.contractService.GetContract(r.Context(), contractID)
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Contract not found")
		return
	}

	// In a real implementation, check if the user has permission to cancel this contract
	// For MVP, we'll skip detailed permission checks

	err = h.contractService.CancelContract(r.Context(), contractID)
	if err != nil {
		if errors.Is(err, errors.New("contract cannot be cancelled")) {
			errorResponse(w, http.StatusBadRequest, err.Error())
			return
		}
		
		log.Error().Err(err).Str("contractID", id).Msg("Failed to cancel contract")
		errorResponse(w, http.StatusInternalServerError, "Failed to cancel contract")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    "Contract cancelled successfully",
	})
}

// SetupContractRequest represents the request to set up a contract
type SetupContractRequest struct {
	BuyerInputs   []string `json:"buyer_inputs"`
	SellerInputs  []string `json:"seller_inputs"`
}

// SetupContract handles creating the setup transaction for a contract
func (h *Handler) SetupContract(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	var req SetupContractRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate inputs
	if len(req.BuyerInputs) == 0 || len(req.SellerInputs) == 0 {
		errorResponse(w, http.StatusBadRequest, "Both buyer and seller inputs are required")
		return
	}

	// Generate setup transaction
	tx, err := h.contractService.GenerateSetupTransaction(
		r.Context(),
		contractID,
		req.BuyerInputs,
		req.SellerInputs,
	)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Msg("Failed to generate setup transaction")
		errorResponse(w, http.StatusInternalServerError, "Failed to generate setup transaction")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    tx,
	})
}

// GenerateFinalTx handles creating the final transaction for a contract
func (h *Handler) GenerateFinalTx(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	// Generate final transaction
	tx, err := h.contractService.GenerateFinalTransaction(r.Context(), contractID)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Msg("Failed to generate final transaction")
		errorResponse(w, http.StatusInternalServerError, "Failed to generate final transaction")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    tx,
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

	// Check if contract can be settled
	canSettle, reason, err := h.contractService.CheckSettlementConditions(r.Context(), contractID)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Msg("Failed to check settlement conditions")
		errorResponse(w, http.StatusInternalServerError, "Failed to check settlement conditions")
		return
	}

	if !canSettle {
		errorResponse(w, http.StatusBadRequest, "Contract cannot be settled: "+reason)
		return
	}

	// Settle the contract
	tx, buyerWins, err := h.contractService.SettleContract(r.Context(), contractID)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Msg("Failed to settle contract")
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

// BroadcastTxRequest represents the request to broadcast a transaction
type BroadcastTxRequest struct {
	TxID string `json:"tx_id"`
}

// BroadcastTx handles broadcasting a contract transaction
func (h *Handler) BroadcastTx(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	var req BroadcastTxRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate request
	if req.TxID == "" {
		errorResponse(w, http.StatusBadRequest, "Transaction ID is required")
		return
	}
	
	// Parse the transaction ID
	txID, err := uuid.Parse(req.TxID)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid transaction ID format")
		return
	}

	// Broadcast the transaction
	broadcastTxID, err := h.contractService.BroadcastTransaction(r.Context(), contractID, txID)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Str("txID", req.TxID).Msg("Failed to broadcast transaction")
		errorResponse(w, http.StatusInternalServerError, "Failed to broadcast transaction")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data: map[string]string{
			"broadcast_tx_id": broadcastTxID,
		},
	})
}

// SwapContractParticipantRequest represents the request to swap a contract participant
type SwapContractParticipantRequest struct {
	CurrentPubKey      string `json:"current_pub_key"`
	NewPubKey          string `json:"new_pub_key"`
	NewParticipantInput string `json:"new_participant_input"`
}

// SwapContractParticipant handles swapping a contract participant
func (h *Handler) SwapContractParticipant(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contractID, err := uuid.Parse(id)
	if err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid contract ID")
		return
	}

	var req SwapContractParticipantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate and sanitize request
	req.CurrentPubKey = sanitizeInput(req.CurrentPubKey)
	req.NewPubKey = sanitizeInput(req.NewPubKey)
	
	if req.CurrentPubKey == "" || req.NewPubKey == "" {
		errorResponse(w, http.StatusBadRequest, "Both current and new public keys are required")
		return
	}
	
	if req.NewParticipantInput == "" {
		errorResponse(w, http.StatusBadRequest, "New participant input is required")
		return
	}

	// Get the contract to check permissions
	contract, err := h.contractService.GetContract(r.Context(), contractID)
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Contract not found")
		return
	}
	
	// Verify that the current public key belongs to one of the participants
	if contract.BuyerPubKey != req.CurrentPubKey && contract.SellerPubKey != req.CurrentPubKey {
		errorResponse(w, http.StatusBadRequest, "Current public key does not match any participant")
		return
	}

	// Swap the participant
	tx, err := h.contractService.SwapContractParticipant(
		r.Context(), 
		contractID, 
		req.CurrentPubKey, 
		req.NewPubKey,
		req.NewParticipantInput,
	)
	if err != nil {
		log.Error().Err(err).Str("contractID", id).Msg("Failed to swap contract participant")
		errorResponse(w, http.StatusInternalServerError, "Failed to swap contract participant")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    tx,
	})
}

// GetOrderBook handles retrieving the current order book state
func (h *Handler) GetOrderBook(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	contractTypeStr := r.URL.Query().Get("type")
	strikeHashRateStr := r.URL.Query().Get("strike_hash_rate")
	limitStr := r.URL.Query().Get("limit")

	if contractTypeStr == "" {
		errorResponse(w, http.StatusBadRequest, "Contract type is required")
		return
	}
	
	if strikeHashRateStr == "" {
		errorResponse(w, http.StatusBadRequest, "Strike hash rate is required")
		return
	}

	var contractType models.ContractType
	switch strings.ToLower(contractTypeStr) {
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
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil || limit <= 0 {
			errorResponse(w, http.StatusBadRequest, "Invalid limit")
			return
		}
	}

	orders, err := h.orderBook.GetOrderBook(r.Context(), contractType, strikeHashRate, limit)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get order book")
		errorResponse(w, http.StatusInternalServerError, "Failed to get order book")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    orders,
	})
}

// PlaceOrderRequest represents the request to place a new order
type PlaceOrderRequest struct {
	UserID           string  `json:"user_id"`
	Side             string  `json:"side"`
	ContractType     string  `json:"contract_type"`
	StrikeHashRate   float64 `json:"strike_hash_rate"`
	StartBlockHeight int64   `json:"start_block_height"`
	EndBlockHeight   int64   `json:"end_block_height"`
	Price            int64   `json:"price"`
	Quantity         int     `json:"quantity"`
	PubKey           string  `json:"pub_key"`
	ExpiresIn        *int    `json:"expires_in,omitempty"` // Optional: minutes until expiration
}

// PlaceOrder handles creating a new order
func (h *Handler) PlaceOrder(w http.ResponseWriter, r *http.Request) {
	var req PlaceOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate and sanitize request
	if req.UserID == "" {
		errorResponse(w, http.StatusBadRequest, "User ID is required")
		return
	}

	req.PubKey = sanitizeInput(req.PubKey)
	if req.PubKey == "" {
		errorResponse(w, http.StatusBadRequest, "Public key is required")
		return
	}

	if req.StrikeHashRate <= 0 {
		errorResponse(w, http.StatusBadRequest, "Strike hash rate must be positive")
		return
	}

	if req.StartBlockHeight <= 0 {
		errorResponse(w, http.StatusBadRequest, "Start block height must be positive")
		return
	}

	if req.EndBlockHeight <= req.StartBlockHeight {
		errorResponse(w, http.StatusBadRequest, "End block height must be greater than start block height")
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
	switch strings.ToLower(req.Side) {
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
	switch strings.ToLower(req.ContractType) {
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
		log.Error().Err(err).Msg("Failed to place order")
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

	// Get the order to check permissions
	order, err := h.orderBook.GetOrderByID(r.Context(), orderID)
	if err != nil {
		errorResponse(w, http.StatusNotFound, "Order not found")
		return
	}

	// In a real implementation, check if the user has permission to cancel this order
	// For MVP, we'll skip detailed permission checks

	err = h.orderBook.CancelOrder(r.Context(), orderID)
	if err != nil {
		log.Error().Err(err).Str("orderID", id).Msg("Failed to cancel order")
		errorResponse(w, http.StatusInternalServerError, "Failed to cancel order")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    "Order cancelled successfully",
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
		log.Error().Err(err).Str("userID", id).Msg("Failed to get user orders")
		errorResponse(w, http.StatusInternalServerError, "Failed to get user orders")
		return
	}

	respondJSON(w, http.StatusOK, response{
		Success: true,
		Data:    orders,
	})
}
