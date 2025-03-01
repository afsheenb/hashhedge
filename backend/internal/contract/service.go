package contract

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
	"github.com/google/uuid"
	
	"hashhedge/internal/contract/hashrate"
	"hashhedge/internal/db"
	"hashhedge/internal/models"
	"hashhedge/pkg/bitcoin"
	"hashhedge/pkg/taproot"
)

// Service provides methods for managing contracts
type Service struct {
	contractRepo        *db.ContractRepository
	hashRateCalculator  *hashrate.HashRateCalculator
	bitcoinClient       *bitcoin.Client
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
		contractRepo:        contractRepo,
		hashRateCalculator:  hashRateCalculator,
		bitcoinClient:       bitcoinClient,
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
	// Create a new contract
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

	// Validate the contract
	if err := contract.Validate(); err != nil {
		return nil, fmt.Errorf("invalid contract: %w", err)
	}

	// Save the contract to the database
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

// parseTransactionInput parses and validates a transaction input
func (s *Service) parseTransactionInput(ctx context.Context, txHex string) (*wire.MsgTx, error) {
	// Decode transaction hex
	txBytes, err := hex.DecodeString(txHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode transaction hex: %w", err)
	}

	// Parse the transaction
	var tx wire.MsgTx
	if err := tx.Deserialize(bytes.NewReader(txBytes)); err != nil {
		return nil, fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	// Basic validation
	if len(tx.TxOut) == 0 {
		return nil, errors.New("transaction has no outputs")
	}

	return &tx, nil
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

	// Validate inputs
	if len(buyerInputs) == 0 || len(sellerInputs) == 0 {
		return nil, errors.New("both buyer and seller must provide inputs")
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

	// Create a new Bitcoin transaction
	tx := wire.NewMsgTx(2) // Version 2 transaction
	
	// Track total input amount
	var totalInputAmount int64
	
	// Parse and add buyer inputs
	for i, inputTx := range buyerInputs {
		// Parse the transaction
		msgTx, err := s.parseTransactionInput(ctx, inputTx)
		if err != nil {
			return nil, fmt.Errorf("invalid buyer input %d: %w", i, err)
		}
		
		// Add the first output as an input (simplified - in reality would need to select proper UTXO)
		outPoint := wire.NewOutPoint(&msgTx.TxHash(), 0)
		txIn := wire.NewTxIn(outPoint, nil, nil)
		tx.AddTxIn(txIn)
		
		// Track input amount
		totalInputAmount += msgTx.TxOut[0].Value
	}
	
	// Parse and add seller inputs
	for i, inputTx := range sellerInputs {
		// Parse the transaction
		msgTx, err := s.parseTransactionInput(ctx, inputTx)
		if err != nil {
			return nil, fmt.Errorf("invalid seller input %d: %w", i, err)
		}
		
		// Add the first output as an input
		outPoint := wire.NewOutPoint(&msgTx.TxHash(), 0)
		txIn := wire.NewTxIn(outPoint, nil, nil)
		tx.AddTxIn(txIn)
		
		// Track input amount
		totalInputAmount += msgTx.TxOut[0].Value
	}
	
	// Validate input amount
	if totalInputAmount < contract.ContractSize {
		return nil, fmt.Errorf("insufficient inputs for contract size: got %d, need %d", totalInputAmount, contract.ContractSize)
	}
	
	// Add contract output
	contractAddr, err := btcutil.DecodeAddress(setupScript, &chaincfg.MainNetParams)
	if err != nil {
		return nil, fmt.Errorf("failed to decode contract address: %w", err)
	}
	
	contractScript, err := txscript.PayToAddrScript(contractAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to create contract output script: %w", err)
	}
	
	// Create the contract output
	contractOutput := wire.NewTxOut(contract.ContractSize, contractScript)
	tx.AddTxOut(contractOutput)
	
	// Calculate change amount (simplified)
	changeAmount := totalInputAmount - contract.ContractSize - 1000 // 1000 satoshis for fees
	
	// Add change output for buyer (if needed)
	if changeAmount > 0 {
		// Decode buyer's public key
		buyerPKBytes, err := hex.DecodeString(contract.BuyerPubKey)
		if err != nil {
			return nil, fmt.Errorf("invalid buyer public key: %w", err)
		}
		
		// Create a P2PKH address for buyer's change
		buyerPKHash := btcutil.Hash160(buyerPKBytes)
		buyerChangeScript, err := txscript.NewScriptBuilder().
			AddOp(txscript.OP_DUP).
			AddOp(txscript.OP_HASH160).
			AddData(buyerPKHash).
			AddOp(txscript.OP_EQUALVERIFY).
			AddOp(txscript.OP_CHECKSIG).
			Script()
		if err != nil {
			return nil, fmt.Errorf("failed to create buyer change script: %w", err)
		}
		
		// Add buyer change output
		changeOutput := wire.NewTxOut(changeAmount/2, buyerChangeScript)
		tx.AddTxOut(changeOutput)
		
		// Add seller change output
		sellerPKBytes, err := hex.DecodeString(contract.SellerPubKey)
		if err != nil {
			return nil, fmt.Errorf("invalid seller public key: %w", err)
		}
		
		sellerPKHash := btcutil.Hash160(sellerPKBytes)
		sellerChangeScript, err := txscript.NewScriptBuilder().
			AddOp(txscript.OP_DUP).
			AddOp(txscript.OP_HASH160).
			AddData(sellerPKHash).
			AddOp(txscript.OP_EQUALVERIFY).
			AddOp(txscript.OP_CHECKSIG).
			Script()
		if err != nil {
			return nil, fmt.Errorf("failed to create seller change script: %w", err)
		}
		
		sellerChangeOutput := wire.NewTxOut(changeAmount/2, sellerChangeScript)
		tx.AddTxOut(sellerChangeOutput)
	}
	
	// Serialize the transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Create and return transaction record
	txRecord := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: txid,
		TxType:        "setup",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Validate the transaction record
	if err := txRecord.Validate(); err != nil {
		return nil, fmt.Errorf("invalid transaction record: %w", err)
	}

	// Update contract status and set setup tx ID
	contract.Status = models.ContractStatusActive
	contract.SetupTxID = &txRecord.TransactionID
	contract.UpdatedAt = time.Now().UTC()
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to update contract status: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, txRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to add transaction: %w", err)
	}

	return txRecord, nil
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

	// Get the setup transaction
	setupTxs, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract transactions: %w", err)
	}
	
	var setupTx *models.ContractTransaction
	for _, tx := range setupTxs {
		if tx.TxType == "setup" {
			setupTx = tx
			break
		}
	}
	
	if setupTx == nil {
		return nil, errors.New("setup transaction not found")
	}

	// Parse the setup transaction
	setupTxBytes, err := hex.DecodeString(setupTx.TxHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode setup transaction: %w", err)
	}
	
	var setupMsgTx wire.MsgTx
	if err := setupMsgTx.Deserialize(bytes.NewReader(setupTxBytes)); err != nil {
		return nil, fmt.Errorf("failed to deserialize setup transaction: %w", err)
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

	// Create a new transaction
	tx := wire.NewMsgTx(2) // Version 2 transaction
	
	// Add input from setup transaction
	outPoint := wire.NewOutPoint(&setupMsgTx.TxHash(), 0) // Assuming contract output is first
	txIn := wire.NewTxIn(outPoint, nil, nil)
	tx.AddTxIn(txIn)
	
	// Add output for final transaction
	finalAddr, err := btcutil.DecodeAddress(finalScript, &chaincfg.MainNetParams)
	if err != nil {
		return nil, fmt.Errorf("failed to decode final script address: %w", err)
	}
	
	finalScriptPubKey, err := txscript.PayToAddrScript(finalAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to create final output script: %w", err)
	}
	
	// The output value is slightly less than input to account for fees
	finalOutput := wire.NewTxOut(contract.ContractSize - 500, finalScriptPubKey)
	tx.AddTxOut(finalOutput)
	
	// Serialize the final transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Create transaction record
	txRecord := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: txid,
		TxType:        "final",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Validate the transaction record
	if err := txRecord.Validate(); err != nil {
		return nil, fmt.Errorf("invalid transaction record: %w", err)
	}

	// Update contract and set final tx ID
	contract.FinalTxID = &txRecord.TransactionID
	contract.UpdatedAt = time.Now().UTC()
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to update contract: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, txRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to add transaction: %w", err)
	}

	return txRecord, nil
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

	// Check if settlement conditions are met
	canSettle := false
	
	if bestBlock.Height >= contract.EndBlockHeight {
		canSettle = true
	} else if time.Now().After(contract.TargetTimestamp) {
		canSettle = true
	} else {
		return nil, false, fmt.Errorf("contract conditions not met for settlement")
	}
	
	if !canSettle {
		return nil, false, fmt.Errorf("contract cannot be settled yet")
	}

	// Determine the winner based on the contract type and actual conditions
	buyerWins := false
	if bestBlock.Height >= contract.EndBlockHeight {
		// The end block height was reached before the target time
		buyerWins = contract.ContractType == models.ContractTypeCall
	} else {
		// The target time was reached before the end block height
		buyerWins = contract.ContractType == models.ContractTypePut
	}

	// Get the final transaction
	finalTxs, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get contract transactions: %w", err)
	}
	
	var finalTx *models.ContractTransaction
	for _, tx := range finalTxs {
		if tx.TxType == "final" {
			finalTx = tx
			break
		}
	}
	
	if finalTx == nil {
		return nil, false, errors.New("final transaction not found")
	}

	// Parse the final transaction
	finalTxBytes, err := hex.DecodeString(finalTx.TxHex)
	if err != nil {
		return nil, false, fmt.Errorf("failed to decode final transaction: %w", err)
	}
	
	var finalMsgTx wire.MsgTx
	if err := finalMsgTx.Deserialize(bytes.NewReader(finalTxBytes)); err != nil {
		return nil, false, fmt.Errorf("failed to deserialize final transaction: %w", err)
	}

	// Determine winner's public key
	var winnerPubKey string
	if buyerWins {
		winnerPubKey = contract.BuyerPubKey
	} else {
		winnerPubKey = contract.SellerPubKey
	}

// Create settlement script
	settlementScript, err := s.taprootScriptBuilder.BuildSettlementScript(
		winnerPubKey,
	)
	if err != nil {
		return nil, false, fmt.Errorf("failed to build settlement script: %w", err)
	}

	// Create a new transaction
	tx := wire.NewMsgTx(2) // Version 2 transaction
	
	// Add input from final transaction
	outPoint := wire.NewOutPoint(&finalMsgTx.TxHash(), 0) // Assuming contract output is first
	txIn := wire.NewTxIn(outPoint, nil, nil)
	tx.AddTxIn(txIn)
	
	// Add output to winner
	settlementAddr, err := btcutil.DecodeAddress(settlementScript, &chaincfg.MainNetParams)
	if err != nil {
		return nil, false, fmt.Errorf("failed to decode settlement address: %w", err)
	}
	
	settlementScriptPubKey, err := txscript.PayToAddrScript(settlementAddr)
	if err != nil {
		return nil, false, fmt.Errorf("failed to create settlement output script: %w", err)
	}
	
	// The output value is slightly less than input to account for fees
	inputValue := finalMsgTx.TxOut[0].Value
	settlementOutput := wire.NewTxOut(inputValue - 500, settlementScriptPubKey)
	tx.AddTxOut(settlementOutput)
	
	// Serialize the settlement transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, false, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Create transaction record
	txRecord := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: txid,
		TxType:        "settlement",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Validate the transaction record
	if err := txRecord.Validate(); err != nil {
		return nil, false, fmt.Errorf("invalid transaction record: %w", err)
	}

	// Update contract status and set settlement tx ID
	contract.Status = models.ContractStatusSettled
	contract.SettlementTxID = &txRecord.TransactionID
	contract.UpdatedAt = time.Now().UTC()
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, false, fmt.Errorf("failed to update contract status: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, txRecord)
	if err != nil {
		return nil, false, fmt.Errorf("failed to add transaction: %w", err)
	}

	return txRecord, buyerWins, nil
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

	if !contract.CanBeCancelled() {
		return errors.New("contract cannot be cancelled")
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

// BroadcastTransaction broadcasts a transaction to the Bitcoin network
func (s *Service) BroadcastTransaction(ctx context.Context, txID uuid.UUID) (string, error) {
	// Get the transaction from the database
	txs, err := s.contractRepo.GetTransactionsByContractID(ctx, uuid.UUID{})
	if err != nil {
		return "", fmt.Errorf("failed to get transactions: %w", err)
	}
	
	var transaction *models.ContractTransaction
	for _, tx := range txs {
		if tx.ID == txID {
			transaction = tx
			break
		}
	}
	
	if transaction == nil {
		return "", errors.New("transaction not found")
	}
	
	// Broadcast the transaction
	txHash, err := s.bitcoinClient.BroadcastTransaction(ctx, transaction.TxHex)
	if err != nil {
		return "", fmt.Errorf("failed to broadcast transaction: %w", err)
	}
	
	// Update the transaction ID if it was changed by the network
	if txHash != transaction.TransactionID {
		transaction.TransactionID = txHash
		// Update the transaction in the database
		// This would require adding a new method to the repository
	}
	
	return txHash, nil
}

// SwapContractParticipant swaps one of the participants in a contract
func (s *Service) SwapContractParticipant(
	ctx context.Context, 
	contractID uuid.UUID, 
	currentPubKey string, 
	newPubKey string,
	newParticipantInput string,
) (*models.ContractTransaction, error) {
	// Get the contract
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}

	// Validate contract state
	if contract.Status != models.ContractStatusActive {
		return nil, errors.New("contract is not active")
	}
	
	// Check which participant is being swapped
	isBuyer := contract.BuyerPubKey == currentPubKey
	isSeller := contract.SellerPubKey == currentPubKey
	
	if !isBuyer && !isSeller {
		return nil, errors.New("current public key does not match any participant")
	}
	
	// Get ASP public key (would come from configuration in real implementation)
	aspPubKey := "0250929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0" // Example
	
	// Build swap script
	swapScript, err := s.taprootScriptBuilder.BuildSwapScript(
		currentPubKey,
		newPubKey,
		aspPubKey,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build swap script: %w", err)
	}
	
	// Get the latest contract transaction
	txs, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contract transactions: %w", err)
	}
	
	var latestTx *models.ContractTransaction
	for _, tx := range txs {
		if latestTx == nil || tx.CreatedAt.After(latestTx.CreatedAt) {
			latestTx = tx
		}
	}
	
	if latestTx == nil {
		return nil, errors.New("no transactions found for contract")
	}
	
	// Parse the latest transaction
	latestTxBytes, err := hex.DecodeString(latestTx.TxHex)
	if err != nil {
		return nil, fmt.Errorf("failed to decode latest transaction: %w", err)
	}
	
	var latestMsgTx wire.MsgTx
	if err := latestMsgTx.Deserialize(bytes.NewReader(latestTxBytes)); err != nil {
		return nil, fmt.Errorf("failed to deserialize latest transaction: %w", err)
	}
	
	// Parse the new participant's input
	msgTx, err := s.parseTransactionInput(ctx, newParticipantInput)
	if err != nil {
		return nil, fmt.Errorf("invalid new participant input: %w", err)
	}
	
	// Create a new transaction
	tx := wire.NewMsgTx(2) // Version 2 transaction
	
	// Add input from latest contract transaction
	outPoint := wire.NewOutPoint(&latestMsgTx.TxHash(), 0) // Assuming contract output is first
	txIn := wire.NewTxIn(outPoint, nil, nil)
	tx.AddTxIn(txIn)
	
	// Add input from new participant
	newParticipantOutPoint := wire.NewOutPoint(&msgTx.TxHash(), 0)
	newParticipantTxIn := wire.NewTxIn(newParticipantOutPoint, nil, nil)
	tx.AddTxIn(newParticipantTxIn)
	
	// Add output for the new contract state
	swapAddr, err := btcutil.DecodeAddress(swapScript, &chaincfg.MainNetParams)
	if err != nil {
		return nil, fmt.Errorf("failed to decode swap address: %w", err)
	}
	
	swapScriptPubKey, err := txscript.PayToAddrScript(swapAddr)
	if err != nil {
		return nil, fmt.Errorf("failed to create swap output script: %w", err)
	}
	
	// The contract output remains the same size
	swapOutput := wire.NewTxOut(contract.ContractSize, swapScriptPubKey)
	tx.AddTxOut(swapOutput)
	
	// Add change output for the exiting participant
	exitingPKBytes, err := hex.DecodeString(currentPubKey)
	if err != nil {
		return nil, fmt.Errorf("invalid exiting participant public key: %w", err)
	}
	
	exitingPKHash := btcutil.Hash160(exitingPKBytes)
	exitingChangeScript, err := txscript.NewScriptBuilder().
		AddOp(txscript.OP_DUP).
		AddOp(txscript.OP_HASH160).
		AddData(exitingPKHash).
		AddOp(txscript.OP_EQUALVERIFY).
		AddOp(txscript.OP_CHECKSIG).
		Script()
	if err != nil {
		return nil, fmt.Errorf("failed to create exiting participant change script: %w", err)
	}
	
	// Calculate change amount (simplified)
	inputValue := msgTx.TxOut[0].Value
	changeAmount := inputValue - 1000 // 1000 satoshis for fees
	
	if changeAmount > 0 {
		changeOutput := wire.NewTxOut(changeAmount, exitingChangeScript)
		tx.AddTxOut(changeOutput)
	}
	
	// Serialize the swap transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Create transaction record
	txRecord := &models.ContractTransaction{
		ID:            uuid.New(),
		ContractID:    contractID,
		TransactionID: txid,
		TxType:        "swap",
		TxHex:         txHex,
		Confirmed:     false,
		CreatedAt:     time.Now().UTC(),
	}

	// Validate the transaction record
	if err := txRecord.Validate(); err != nil {
		return nil, fmt.Errorf("invalid transaction record: %w", err)
	}

	// Update contract with new participant
	if isBuyer {
		contract.BuyerPubKey = newPubKey
	} else {
		contract.SellerPubKey = newPubKey
	}
	
	contract.UpdatedAt = time.Now().UTC()
	err = s.contractRepo.Update(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to update contract: %w", err)
	}

	// Save the transaction
	err = s.contractRepo.AddTransaction(ctx, txRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to add transaction: %w", err)
	}

	return txRecord, nil
}

// ExpireContract marks a contract as expired if it's past its expiration time
func (s *Service) ExpireContract(ctx context.Context, contractID uuid.UUID) error {
	contract, err := s.contractRepo.GetByID(ctx, contractID)
	if err != nil {
		return fmt.Errorf("failed to get contract: %w", err)
	}

	if contract.Status != models.ContractStatusActive {
		return errors.New("contract is not active")
	}

	if !contract.IsExpired() {
		return errors.New("contract is not expired")
	}

	err = s.contractRepo.UpdateStatus(ctx, contractID, models.ContractStatusExpired)
	if err != nil {
		return fmt.Errorf("failed to update contract status: %w", err)
	}

	return nil
}

// GetHashRateAtHeight calculates the Bitcoin network hash rate at a specific block height
func (s *Service) GetHashRateAtHeight(ctx context.Context, height int64) (float64, error) {
	// Get block at the specified height
	blockHash, err := s.bitcoinClient.GetBlockHash(ctx, height)
	if err != nil {
		return 0, fmt.Errorf("failed to get block hash at height %d: %w", height, err)
	}

	block, err := s.bitcoinClient.GetBlock(ctx, blockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get block at height %d: %w", height, err)
	}

	// Get previous block to calculate time difference
	prevBlock, err := s.bitcoinClient.GetBlock(ctx, block.PreviousBlockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get previous block: %w", err)
	}

	// Calculate time difference in seconds
	timeDiff := block.Time.Sub(prevBlock.Time).Seconds()
	if timeDiff <= 0 {
		return 0, fmt.Errorf("invalid time difference between blocks: %v", timeDiff)
	}

	// Calculate hash rate: (difficulty * 2^32) / (time * 10^12)
	// This converts to exahashes per second (EH/s)
	hashRate := (float64(block.Difficulty) * math.Pow(2, 32)) / (timeDiff * 1e12)

	return hashRate, nil
}
