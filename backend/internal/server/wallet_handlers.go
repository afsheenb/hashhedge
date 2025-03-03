// internal/server/wallet_handlers.go

// ExitInfoResponse represents the emergency exit information
type ExitInfoResponse struct {
    AllowedNetworks   []string `json:"allowed_networks"`
    MaxRetryAttempts  int      `json:"max_retry_attempts"`
    ExitTransactions []*ExitTransactionInfo `json:"exit_transactions"`
}

type ExitTransactionInfo struct {
    ID             uuid.UUID `json:"id"`
    Type           string    `json:"type"`
    CreatedAt      time.Time `json:"created_at"`
    Status         string    `json:"status"`
    InputAmount    int64     `json:"input_amount"`
    OutputAmount   int64     `json:"output_amount"`
    DestinationAddress string `json:"destination_address"`
}

type EmergencyExitRequest struct {
    TransactionHex     string `json:"exit_tx_hex"`
    DestinationAddress string `json:"destination_address"`
    Network           string `json:"network"`
    FeeRate           int    `json:"fee_rate"`
}

type EmergencyExitResponse struct {
    PSBT          string `json:"psbt"`
    TransactionID string `json:"transaction_id"`
    InputAmount   int64  `json:"input_amount"`
    OutputAmount  int64  `json:"output_amount"`
    Fee           int64  `json:"fee"`
}

type WalletService interface {
    GetExitTransactions(ctx context.Context, userID uuid.UUID) ([]*ExitTransactionInfo, error)
    CreateEmergencyExit(
        ctx context.Context,
        userID uuid.UUID,
        txHex,
        destinationAddress,
        network string,
        feeRate int,
    ) (*EmergencyExitResponse, error)
    ListExitTransactions(ctx context.Context, userID uuid.UUID, page, limit int) ([]*ExitTransactionInfo, int, error)
    DownloadExitTransaction(ctx context.Context, userID uuid.UUID, txID uuid.UUID) ([]byte, string, error)
    BroadcastExitTransaction(ctx context.Context, userID uuid.UUID, txID uuid.UUID) (*BroadcastResult, error)
}

// HandleGetExitInfo retrieves emergency exit configuration and transaction history
func (h *Handler) HandleGetExitInfo(w http.ResponseWriter, r *http.Request) {
    // Retrieve user context (would come from authentication middleware)
    userID := getUserIDFromContext(r.Context())

    // Fetch exit transactions for the user
    exitTransactions, err := h.walletService.GetExitTransactions(r.Context(), userID)
    if err != nil {
        http.Error(w, "Failed to retrieve exit transactions", http.StatusInternalServerError)
        return
    }

    response := ExitInfoResponse{
        AllowedNetworks:  []string{"mainnet", "testnet"},
        MaxRetryAttempts: 3,
        ExitTransactions: exitTransactions,
    }

    respondJSON(w, http.StatusOK, response)
}

// HandleCreateEmergencyExit processes an emergency exit transaction
func (h *Handler) HandleCreateEmergencyExit(w http.ResponseWriter, r *http.Request) {
    var request EmergencyExitRequest
    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Validate input
    if err := validateEmergencyExitRequest(request); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Get user context
    userID := getUserIDFromContext(r.Context())

    // Generate emergency exit PSBT
    exitTransaction, err := h.walletService.CreateEmergencyExit(
        r.Context(),
        userID,
        request.TransactionHex,
        request.DestinationAddress,
        request.Network,
        request.FeeRate,
    )
    if err != nil {
        http.Error(w, "Failed to create emergency exit", http.StatusInternalServerError)
        return
    }

    respondJSON(w, http.StatusCreated, exitTransaction)
}

// HandleListExitTransactions retrieves user's exit transaction history
func (h *Handler) HandleListExitTransactions(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromContext(r.Context())

    // Pagination parameters
    page := getIntQueryParam(r, "page", 1)
    limit := getIntQueryParam(r, "limit", 10)

    transactions, total, err := h.walletService.ListExitTransactions(r.Context(), userID, page, limit)
    if err != nil {
        http.Error(w, "Failed to retrieve exit transactions", http.StatusInternalServerError)
        return
    }

    response := struct {
        Transactions []*ExitTransactionInfo `json:"transactions"`
        Total       int                    `json:"total"`
        Page        int                    `json:"page"`
        Limit       int                    `json:"limit"`
    }{
        Transactions: transactions,
        Total:       total,
        Page:        page,
        Limit:       limit,
    }

    respondJSON(w, http.StatusOK, response)
}

// HandleDownloadExitTransaction allows downloading a specific exit transaction
func (h *Handler) HandleDownloadExitTransaction(w http.ResponseWriter, r *http.Request) {
    txID := chi.URLParam(r, "txId")
    parsedTxID, err := uuid.Parse(txID)
    if err != nil {
        http.Error(w, "Invalid transaction ID", http.StatusBadRequest)
        return
    }

    userID := getUserIDFromContext(r.Context())

    // Retrieve and download transaction file
    txFile, filename, err := h.walletService.DownloadExitTransaction(r.Context(), userID, parsedTxID)
    if err != nil {
        http.Error(w, "Failed to download transaction", http.StatusInternalServerError)
        return
    }

    // Set headers for file download
    w.Header().Set("Content-Type", "application/octet-stream")
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
    w.WriteHeader(http.StatusOK)
    w.Write(txFile)
}

// HandleBroadcastExitTransaction broadcasts a signed exit transaction
func (h *Handler) HandleBroadcastExitTransaction(w http.ResponseWriter, r *http.Request) {
    txID := chi.URLParam(r, "txId")
    parsedTxID, err := uuid.Parse(txID)
    if err != nil {
        http.Error(w, "Invalid transaction ID", http.StatusBadRequest)
        return
    }

    userID := getUserIDFromContext(r.Context())

    // Broadcast the transaction
    broadcastResult, err := h.walletService.BroadcastExitTransaction(r.Context(), userID, parsedTxID)
    if err != nil {
        http.Error(w, "Failed to broadcast transaction", http.StatusInternalServerError)
        return
    }

    respondJSON(w, http.StatusOK, broadcastResult)
}

// Router configuration
func (s *Server) setupWalletRoutes() {
    s.router.Route("/api/v1/wallet", func(r chi.Router) {
        r.Get("/exit-info", h.HandleGetExitInfo)
        r.Post("/emergency-exit", h.HandleCreateEmergencyExit)
        r.Get("/exit-transactions", h.HandleListExitTransactions)
        r.Get("/exit-transactions/{txId}/download", h.HandleDownloadExitTransaction)
        r.Post("/exit-transactions/{txId}/broadcast", h.HandleBroadcastExitTransaction)
    })
}
