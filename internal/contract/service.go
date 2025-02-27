// internal/contract/service.go
package contract

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"hashhedge/internal/contract/hashrate"
	"hashhedge/internal/db"
	"hashhedge/internal/models"
	"hashhedge/pkg/bitcoin"
	"hashhedge/pkg/taproot"
)

// Service provides methods for managing contracts
type Service struct {
	contractRepo      *db.ContractRepository
	hashRateCalculator *hashrate.HashRateCalculator
	bitcoinClient     *bitcoin.Client
	taprootScriptBuilder *taproot.ScriptBuilder
}

// NewService creates a new contract service
func NewService(
	contractRepo *db.ContractRepository,
	hashRateCalculator *hashrate.HashRateCalculator,
	bitcoinClient *bitcoin.Client,
	taprootScriptBuilder *taproot.ScriptBuilder,
) *Service {
	return &Service{
		contractRepo:      contractRepo,
		hashRateCalculator: hashRateCalculator,
		bitcoinClient:     bitcoinClient,
		taprootScriptBuilder: taprootScriptBuilder,
	}
}

// CreateContract creates a new contract
func (s *Service) CreateContract(
	ctx context.Context,
	contractType models.ContractType,
	strikeHashRate float64,
	startBlockHeight int64,
	endBlockHeight int64,
	targetTimestamp time.Time,
	contractSize int64,
	premium int64,
	buyerPubKey string,
	sellerPubKey string,
) (*models.Contract, error) {
	contract := &models.Contract{
		ID:               uuid.New(),
		ContractType:     contractType,
		StrikeHashRate:   strikeHashRate,
		StartBlockHeight: startBlockHeight,
		EndBlockHeight:   endBlockHeight,
		TargetTimestamp:  targetTimestamp,
		ContractSize:     contractSize,
		Premium:          premium,
		BuyerPubKey:      buyerPubKey,
		SellerPubKey:     sellerPubKey,
		Status:           models.ContractStatusCreated,
		CreatedAt:        time.Now().UTC(),
		UpdatedAt:        time.Now().UTC(),
		ExpiresAt:        targetTimestamp.Add(24 * time.Hour), // Expire 24 hours after target timestamp
	}

	err := s.contractRepo.Create(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to create contract: %w", err)
	}

	return contract, nil
}

// GetContract retrieves a contract by ID
func (s *Service) GetContract(ctx context.Context, id uuid.UUID) (*models.Contract, error) {
	contract, err := s.contractRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}

	return contract, nil
}

// GenerateSetupTransaction creates the setup transaction for a contract
func (s *Service) GenerateSetupTransaction(
	ctx context.Context,
	contractID uuid.UUID,
	buyerInputs []string, // Transaction inputs from buyer
	sellerInputs []string, // Transaction inputs from seller
) (*models.ContractTransaction, error) {
	// Get the contract
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}

	// Validate contract state
	if contract.Status != models.ContractStatusCreated {
		return nil, fmt.Errorf("contract is not in CREATED state")
	}

	// Create taproot script for the contract
	setupScript, err := s.taprootScriptBuilder.BuildSetupScript(
		contract.BuyerPubKey,
		contract.SellerPubKey,
		contract.StartBlockHeight,
		contract.EndBlockHeight,
		contract.TargetTimestamp,
		contract.ContractType == models.ContractTypeCall,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build setup script: %w", err)
	}

	// TODO: Implement actual transaction building
	// For now, this is a placeholder to show the structure
	txHex := "01000000..." // This would be the actual transaction hex

	tx := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: "placeholder-txid", // This would be the actual txid
		TxType:        "setup",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Update contract status and set setup tx ID
	contract.Status = models.ContractStatusActive
	contract.SetupTxID = &tx.TransactionID
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to update contract status: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, tx)
	if err != nil {
		return nil, fmt.Errorf("failed to add transaction: %w", err)
	}

	return tx, nil
}

// GenerateFinalTransaction creates the final transaction for a contract
func (s *Service) GenerateFinalTransaction(
	ctx context.Context,
	contractID uuid.UUID,
) (*models.ContractTransaction, error) {
	// Get the contract
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}

	// Validate contract state
	if contract.Status != models.ContractStatusActive || contract.SetupTxID == nil {
		return nil, fmt.Errorf("contract is not active or setup transaction is missing")
	}

	// Create taproot script for the final transaction
	finalScript, err := s.taprootScriptBuilder.BuildFinalScript(
		contract.BuyerPubKey,
		contract.SellerPubKey,
		contract.EndBlockHeight,
		contract.TargetTimestamp,
		contract.ContractType == models.ContractTypeCall,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build final script: %w", err)
	}

	// TODO: Implement actual transaction building
	// For now, this is a placeholder to show the structure
	txHex := "01000000..." // This would be the actual transaction hex

	tx := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: "placeholder-txid", // This would be the actual txid
		TxType:        "final",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Update contract and set final tx ID
	contract.FinalTxID = &tx.TransactionID
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to update contract: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, tx)
	if err != nil {
		return nil, fmt.Errorf("failed to add transaction: %w", err)
	}

	return tx, nil
}

// SettleContract settles the contract based on the actual hash rate
func (s *Service) SettleContract(
	ctx context.Context,
	contractID uuid.UUID,
) (*models.ContractTransaction, bool, error) {
	// Get the contract
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get contract: %w", err)
	}

	// Validate contract state
	if contract.Status != models.ContractStatusActive {
		return nil, false, fmt.Errorf("contract is not active")
	}

	// Check if we've reached the end block height or target timestamp
	bestBlockHash, err := s.bitcoinClient.GetBestBlockHash(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := s.bitcoinClient.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get best block: %w", err)
	}

	// If we haven't reached the end block height and the target time hasn't passed, we can't settle yet
	if bestBlock.Height < contract.EndBlockHeight && time.Now().Before(contract.TargetTimestamp) {
		return nil, false, fmt.Errorf("contract conditions not met for settlement")
	}

	// Determine the winner based on the contract type and actual conditions
	var buyerWins bool
	if bestBlock.Height >= contract.EndBlockHeight {
		// The end block height was reached before the target time
		buyerWins = contract.ContractType == models.ContractTypeCall
	} else {
		// The target time was reached before the end block height
		buyerWins = contract.ContractType == models.ContractTypePut
	}

	// Create settlement transaction
	// TODO: Implement actual transaction building
	// For now, this is a placeholder to show the structure
	txHex := "01000000..." // This would be the actual transaction hex

	tx := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: "placeholder-txid", // This would be the actual txid
		TxType:        "settlement",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Update contract status and set settlement tx ID
	contract.Status = models.ContractStatusSettled
	contract.SettlementTxID = &tx.TransactionID
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, false, fmt.Errorf("failed to update contract status: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, tx)
	if err != nil {
		return nil, false, fmt.Errorf("failed to add transaction: %w", err)
	}

	return tx, buyerWins, nil
}

// ListActiveContracts retrieves all active contracts
func (s *Service) ListActiveContracts(ctx context.Context, limit, offset int) ([]*models.Contract, error) {
	contracts, err := s.contractRepo.ListByStatus(ctx, models.ContractStatusActive, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list active contracts: %w", err)
	}

	return contracts, nil
}

// ListExpiredContracts retrieves all contracts that have expired but not been settled
func (s *Service) ListExpiredContracts(ctx context.Context) ([]*models.Contract, error) {
	contracts, err := s.contractRepo.ListByStatus(ctx, models.ContractStatusActive, 1000, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to list active contracts: %w", err)
	}

	now := time.Now()
	var expiredContracts []*models.Contract

	for _, contract := range contracts {
		if contract.ExpiresAt.Before(now) {
			expiredContracts = append(expiredContracts, contract)
		}
	}

	return expiredContracts, nil
}

// CancelContract cancels a contract that hasn't been activated yet
func (s *Service) CancelContract(ctx context.Context, contractID uuid.UUID) error {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return fmt.Errorf("failed to get contract: %w", err)
	}

	if contract.Status != models.ContractStatusCreated {
		return fmt.Errorf("only contracts in CREATED state can be cancelled")
	}

	err = s.contractRepo.UpdateStatus(ctx, contractID, models.ContractStatusCancelled)
	if err != nil {
		return fmt.Errorf("failed to update contract status: %w", err)
	}

	return nil
}

// CheckSettlementConditions checks if a contract can be settled
func (s *Service) CheckSettlementConditions(ctx context.Context, contractID uuid.UUID) (bool, string, error) {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return false, "", fmt.Errorf("failed to get contract: %w", err)
	}

	if contract.Status != models.ContractStatusActive {
		return false, "Contract is not active", nil
	}

	// Check if we've reached the end block height or target timestamp
	bestBlockHash, err := s.bitcoinClient.GetBestBlockHash(ctx)
	if err != nil {
		return false, "", fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := s.bitcoinClient.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return false, "", fmt.Errorf("failed to get best block: %w", err)
	}

	if bestBlock.Height >= contract.EndBlockHeight {
		return true, "End block height reached", nil
	}

	if time.Now().After(contract.TargetTimestamp) {
		return true, "Target timestamp reached", nil
	}

	return false, "Settlement conditions not yet met", nil
}
