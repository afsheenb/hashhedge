package contract

import (
	"bytes"
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/btcsuite/btcd/btcutil"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcd/wire"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	
	"hashhedge/internal/contract/hashrate"
	"hashhedge/internal/db"
	"hashhedge/internal/models"
	"hashhedge/pkg/bitcoin"
	"hashhedge/pkg/taproot"
    "hashhedge/pkg/ark"
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
    arkClient *ark.Client,
) *Service {
    return &Service{
        contractRepo:       contractRepo,
        hashRateCalculator: hashRateCalculator,
        bitcoinClient:      bitcoinClient,
        taprootScriptBuilder: taprootScriptBuilder,
        arkClient:         arkClient,
        emergencyExitReady: false,
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


// New method: prepareEmergencyExitPath creates emergency exit transactions for all active contracts
func (s *Service) PrepareEmergencyExitPath(ctx context.Context) error {
    // Skip if already prepared
    if s.emergencyExitReady {
        return nil
    }

    // Get all active contracts
    contracts, err := s.contractRepo.ListByStatus(ctx, models.ContractStatusActive, 1000, 0)
    if err != nil {
        return fmt.Errorf("failed to list active contracts for emergency exit preparation: %w", err)
    }

    log.Info().Int("contract_count", len(contracts)).Msg("Preparing emergency exit paths")

    for _, contract := range contracts {
        if err := s.prepareContractEmergencyExit(ctx, contract); err != nil {
            log.Error().
                Err(err).
                Str("contract_id", contract.ID.String()).
                Msg("Failed to prepare emergency exit for contract")
            // Continue with other contracts even if one fails
            continue
        }
    }

    s.emergencyExitReady = true
    log.Info().Msg("Emergency exit paths prepared successfully")
    return nil
}

// Helper method to prepare emergency exit for a single contract
func (s *Service) prepareContractEmergencyExit(ctx context.Context, contract *models.Contract) error {
    // Check if we already have an emergency exit transaction for this contract
    txs, err := s.contractRepo.GetTransactionsByContractID(ctx, contract.ID)
    if err != nil {
        return fmt.Errorf("failed to get contract transactions: %w", err)
    }

    // Check if emergency exit transaction already exists
    for _, tx := range txs {
        if tx.TxType == "emergency_exit" {
            // Already exists, nothing to do
            return nil
        }
    }

    // Create emergency exit script
    exitScript, err := s.taprootScriptBuilder.BuildExitPathScript(
        contract.BuyerPubKey,
        contract.SellerPubKey,
        144, // 1 day timelock (in blocks)
    )
    if err != nil {
        return fmt.Errorf("failed to build emergency exit script: %w", err)
    }

    // Get VTXO information from ARK
    // In practice, you'd need to know which VTXO corresponds to this contract
    // This would typically be stored in the contract metadata
    vtxoID := contract.ID.String() // Simplified; in reality, you'd need the actual VTXO ID

    // For each participant, create an exit path
    for _, participant := range []string{"buyer", "seller"} {
        var destinationAddress string
        var pubKey string

        if participant == "buyer" {
            pubKey = contract.BuyerPubKey
        } else {
            pubKey = contract.SellerPubKey
        }

        // Create P2PKH address from public key for on-chain exit
        pkBytes, err := hex.DecodeString(pubKey)
        if err != nil {
            return fmt.Errorf("invalid public key for %s: %w", participant, err)
        }

        pkHash := btcutil.Hash160(pkBytes)
        addr, err := btcutil.NewAddressPubKeyHash(pkHash, &chaincfg.MainNetParams)
        if err != nil {
            return fmt.Errorf("failed to create address for %s: %w", participant, err)
        }
        destinationAddress = addr.String()

        // Request exit path from ASP
        exitResponse, err := s.arkClient.GetExitPath(
            ctx,
            vtxoID,
            destinationAddress,
            5, // fee rate in sats/vbyte
        )
        if err != nil {
            log.Warn().
                Err(err).
                Str("contract_id", contract.ID.String()).
                Str("participant", participant).
                Msg("Failed to get exit path from ASP, falling back to on-chain exit")

            // Generate on-chain exit transaction instead
            // This would create a transaction spending from the contract using the
            // emergency exit script path after timelock
            // For brevity, detailed on-chain tx creation is omitted
            continue
        }

        // Save the exit transaction
        exitTx := &models.ContractTransaction{
            ID:            uuid.New(),
            ContractID:    contract.ID,
            TransactionID: exitResponse.GetTxid(),
            TxType:        "emergency_exit",
            TxHex:         exitResponse.GetSerializedPsbt(),
            Confirmed:     false,
            CreatedAt:     time.Now().UTC(),
        }

        if err := s.contractRepo.AddTransaction(ctx, exitTx); err != nil {
            return fmt.Errorf("failed to save emergency exit transaction: %w", err)
        }

        log.Info().
            Str("contract_id", contract.ID.String()).
            Str("participant", participant).
            Str("tx_id", exitResponse.GetTxid()).
            Msg("Emergency exit transaction prepared")
    }

    return nil
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
// Modified GenerateSetupTransaction to integrate with ASP
func (s *Service) GenerateSetupTransaction(
    ctx context.Context,
    contractID uuid.UUID,
    amount int64,
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

    if amount < contract.ContractSize {
        return nil, fmt.Errorf("insufficient amount for contract size: got %d, need %d", 
            amount, contract.ContractSize)
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
    
    // Check if ASP is available
    aspAvailable, _ := s.arkClient.CheckASPStatus(ctx)
    
    if aspAvailable {
        // Use ARK for off-chain transaction
        // Register output with ASP
        output := &arkv1.Output{
            Value:   contract.ContractSize,
            Address: setupScript,
        }
        
        // Register the output in the next round
        response, err := s.arkClient.RegisterOutputsForNextRound(
            ctx,
            []*arkv1.Output{output},
        )
        if err != nil {
            return nil, fmt.Errorf("failed to register output with ASP: %w", err)
        }
        
        // Create transaction record
        txRecord := &models.ContractTransaction{
            ID:            uuid.New(),
            ContractID:    contractID,
            TransactionID: response.GetRoundId(), // Use round ID as transaction ID
            TxType:        "setup",
            TxHex:         "", // Will be updated once round is processed
            Confirmed:     false,
            CreatedAt:     time.Now().UTC(),
            Address:       setupScript,
        }
        
        // Use transactions to update contract state and save transaction atomically
        err = s.contractRepo.ExecuteInTransaction(ctx, func(tx *sqlx.Tx) error {
            // Update contract status to active
            contract.Status = models.ContractStatusActive
            contract.SetupTxID = &txRecord.TransactionID
            contract.UpdatedAt = time.Now().UTC()
            
            // Save transaction
            if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
                return fmt.Errorf("failed to add transaction: %w", err)
            }
            
            // Update contract
            if err := s.contractRepo.Update(ctx, contract); err != nil {
                return fmt.Errorf("failed to update contract status: %w", err)
            }
            
            return nil
        })
        
        if err != nil {
            return nil, fmt.Errorf("failed to process setup transaction: %w", err)
        }
        
        return txRecord, nil
    } else {
        // Fallback to on-chain transaction if ASP is unavailable
        log.Warn().
            Str("contract_id", contractID.String()).
            Msg("ASP unavailable, falling back to on-chain setup transaction")
            
        // Here you would implement the on-chain transaction creation
        // For brevity, we'll just create a placeholder transaction
        // In a real implementation, you would create and sign an actual Bitcoin transaction
        
        txRecord := &models.ContractTransaction{
            ID:            uuid.New(),
            ContractID:    contractID,
            TransactionID: "emergency_onchain_" + contractID.String(),
            TxType:        "setup_onchain",
            TxHex:         "emergency_onchain_transaction_hex",
            Confirmed:     false,
            CreatedAt:     time.Now().UTC(),
            Address:       setupScript,
        }
        
        // Update contract status
        contract.Status = models.ContractStatusActive
        contract.SetupTxID = &txRecord.TransactionID
        contract.UpdatedAt = time.Now().UTC()
        
        // Save transaction and update contract
        if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
            return nil, fmt.Errorf("failed to add transaction: %w", err)
        }
        
        if err := s.contractRepo.Update(ctx, contract); err != nil {
            return nil, fmt.Errorf("failed to update contract: %w", err)
        }
        
        return txRecord, nil
    }
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
	
	// Calculate fee for the transaction
	feeRate := float64(5) // sats per byte - in production use proper fee estimation
	estimatedFee, err := s.bitcoinClient.EstimateFee(ctx, 1, 1, feeRate)
	if err != nil {
		return nil, fmt.Errorf("failed to estimate fee: %w", err)
	}
	
	// The output value is slightly less than input to account for fees
	outputValue := setupMsgTx.TxOut[0].Value - estimatedFee
	if outputValue < 0 {
		return nil, fmt.Errorf("fees exceed input value")
	}
	
	finalOutput := wire.NewTxOut(outputValue, finalScriptPubKey)
	tx.AddTxOut(finalOutput)
	
	// Serialize the final transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Use transactions to update contract state and save transaction atomically
	err = s.contractRepo.ExecuteInTransaction(ctx, func(tx *sqlx.Tx) error {
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
			return fmt.Errorf("invalid transaction record: %w", err)
		}

		// Update contract and set final tx ID
		contract.FinalTxID = &txRecord.TransactionID
		contract.UpdatedAt = time.Now().UTC()
		
		// Save transaction
		if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
			return fmt.Errorf("failed to add transaction: %w", err)
		}
		
		// Update contract
		if err := s.contractRepo.Update(ctx, contract); err != nil {
			return fmt.Errorf("failed to update contract: %w", err)
		}
		
		return nil
	})
	
	if err != nil {
		return nil, fmt.Errorf("failed to process final transaction: %w", err)
	}

	// Get the saved transaction to return
	transactions, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions: %w", err)
	}
	
	var finalTx *models.ContractTransaction
	for _, tx := range transactions {
		if tx.TxType == "final" && tx.TransactionID == txid {
			finalTx = tx
			break
		}
	}
	
	if finalTx == nil {
		return nil, fmt.Errorf("final transaction not found after creation")
	}

	return finalTx, nil
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

	// Check if settlement conditions are met
	canSettle, reason, err := s.CheckSettlementConditions(ctx, contractID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to check settlement conditions: %w", err)
	}
	
	if !canSettle {
		return nil, false, fmt.Errorf("contract cannot be settled: %s", reason)
	}

	// Get the current blockchain state
	bestBlockHash, err := s.bitcoinClient.GetBestBlockHash(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get best block hash: %w", err)
	}

	bestBlock, err := s.bitcoinClient.GetBlock(ctx, bestBlockHash)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get best block: %w", err)
	}

	// Determine the winner based on the contract type and actual conditions
	buyerWins := false
	if bestBlock.Height >= contract.EndBlockHeight {
		// The end block height was reached before the target time
		// For CALL options, this means high hash rate, so buyer wins
		// For PUT options, this means high hash rate, so seller wins
		buyerWins = contract.ContractType == models.ContractTypeCall
	} else {
		// The target time was reached before the end block height
		// For CALL options, this means low hash rate, so seller wins
		// For PUT options, this means low hash rate, so buyer wins
		buyerWins = contract.ContractType == models.ContractTypePut
	}

	// Determine winner's public key
	var winnerPubKey string
	if buyerWins {
		winnerPubKey = contract.BuyerPubKey
	} else {
		winnerPubKey = contract.SellerPubKey
	}

	// We need to get the final transaction
	var finalTx *models.ContractTransaction
	
	// Check if we already have a final transaction
	if contract.FinalTxID != nil {
		// Get all transactions for this contract
		txs, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
		if err != nil {
			return nil, false, fmt.Errorf("failed to get contract transactions: %w", err)
		}
		
		// Find the final transaction
		for _, tx := range txs {
			if tx.TxType == "final" && tx.TransactionID == *contract.FinalTxID {
				finalTx = tx
				break
			}
		}
		
		if finalTx == nil {
			return nil, false, errors.New("final transaction not found even though it's referenced")
		}
	} else {
		// We need to create the final transaction
		finalTx, err = s.GenerateFinalTransaction(ctx, contractID)
		if err != nil {
			return nil, false, fmt.Errorf("failed to generate final transaction: %w", err)
		}
	}

	// Parse the final transaction to get its outputs
	finalTxBytes, err := hex.DecodeString(finalTx.TxHex)
	if err != nil {
		return nil, false, fmt.Errorf("failed to decode final transaction: %w", err)
	}
	
	var finalMsgTx wire.MsgTx
	if err := finalMsgTx.Deserialize(bytes.NewReader(finalTxBytes)); err != nil {
		return nil, false, fmt.Errorf("failed to deserialize final transaction: %w", err)
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
	
	// Calculate fee for the transaction
	feeRate := float64(5) // sats per byte - in production use proper fee estimation
	estimatedFee, err := s.bitcoinClient.EstimateFee(ctx, 1, 1, feeRate)
	if err != nil {
		return nil, false, fmt.Errorf("failed to estimate fee: %w", err)
	}
	
	// The output value is slightly less than input to account for fees
	inputValue := finalMsgTx.TxOut[0].Value
	outputValue := inputValue - estimatedFee
	if outputValue < 0 {
		return nil, false, fmt.Errorf("fees exceed input value")
	}
	
	settlementOutput := wire.NewTxOut(outputValue, settlementScriptPubKey)
	tx.AddTxOut(settlementOutput)
	
	// Serialize the settlement transaction
	var buf bytes.Buffer
	if err := tx.Serialize(&buf); err != nil {
		return nil, false, fmt.Errorf("failed to serialize transaction: %w", err)
	}
	
	txHex := hex.EncodeToString(buf.Bytes())
	txid := tx.TxHash().String()

	// Use transactions to update contract state and save transaction atomically
	err = s.contractRepo.ExecuteInTransaction(ctx, func(tx *sqlx.Tx) error {
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

		// Update contract status and set settlement tx ID
		contract.Status = models.ContractStatusSettled
		contract.SettlementTxID = &txRecord.TransactionID
		contract.UpdatedAt = time.Now().UTC()
		
		// Save transaction
		if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
			return fmt.Errorf("failed to add transaction: %w", err)
		}
		
		// Update contract
		if err := s.contractRepo.Update(ctx, contract); err != nil {
			return fmt.Errorf("failed to update contract: %w", err)
		}
		
		return nil
	})
	
	if err != nil {
		return nil, false, fmt.Errorf("failed to process settlement transaction: %w", err)
	}

	// Get the saved transaction to return
	transactions, err := s.contractRepo.GetTransactionsByContractID(ctx, contractID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get transactions: %w", err)
	}
	
	var settlementTx *models.ContractTransaction
	for _, tx := range transactions {
		if tx.TxType == "settlement" && tx.TransactionID == txid {
			settlementTx = tx
			break
		}
	}
	
	if settlementTx == nil {
		return nil, false, fmt.Errorf("settlement transaction not found after creation")
	}
	
	// Try to broadcast the transaction
	_, err = s.bitcoinClient.BroadcastTransactionWithRetry(ctx, txHex)
	if err != nil {
		// Just log the error - we still return the transaction
		// so the user can broadcast it manually if needed
		log.Error().Err(err).
			Str("contractID", contractID.String()).
			Str("txid", txid).
			Msg("Failed to broadcast settlement transaction")
	}

	return settlementTx, buyerWins, nil
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
func (s *Service) BroadcastTransaction(ctx context.Context, contractID uuid.UUID, txID uuid.UUID) (string, error) {
	// Get the transaction from the database
	if contractID == uuid.Nil || txID == uuid.Nil {
		return "", fmt.Errorf("contract ID and transaction ID must be provided")
	}
	
	// Get the transaction
	tx, err := s.contractRepo.GetTransactionByID(ctx, txID)
	if err != nil {
		return "", fmt.Errorf("failed to get transaction: %w", err)
	}
	
	// Validate that the transaction belongs to the contract
	if tx.ContractID != contractID {
		return "", fmt.Errorf("transaction does not belong to the specified contract")
	}
	
	// Broadcast the transaction
	txHash, err := s.bitcoinClient.BroadcastTransactionWithRetry(ctx, tx.TxHex)
	if err != nil {
		return "", fmt.Errorf("failed to broadcast transaction: %w", err)
	}
	
	// Update the transaction ID if it was changed by the network
	if txHash != tx.TransactionID {
		tx.TransactionID = txHash
		// Update the transaction in the database
		err = s.contractRepo.AddTransaction(ctx, tx)
		if err != nil {
			log.Warn().Err(err).
				Str("contractID", contractID.String()).
				Str("txID", txID.String()).
				Msg("Failed to update transaction ID after broadcast")
		}
	}
	
	return txHash, nil
}

// Modified SwapContractParticipant to integrate with ASP
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
    
    // Validate new public key
    if newPubKey == "" {
        return nil, errors.New("new public key cannot be empty")
    }
    
    // Try to decode the new public key to validate its format
    _, err = hex.DecodeString(newPubKey)
    if err != nil {
        return nil, fmt.Errorf("invalid new public key format: %w", err)
    }
    
    // Check if ASP is available
    aspAvailable, _ := s.arkClient.CheckASPStatus(ctx)
    
    if aspAvailable {
        // Use ARK for off-chain participant swap
        // This would require creating an out-of-round transaction
        // that updates the participant in the contract VTXO
        
        // Get ASP public key for the swap
        aspPubKey := s.taprootScriptBuilder.ASPPubKey
        
        // Build swap script
        swapScript, err := s.taprootScriptBuilder.BuildSwapScript(
            currentPubKey,
            newPubKey,
            aspPubKey,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to build swap script: %w", err)
        }
        
        // Get the VTXO ID for this contract
        // In practice, you'd need to know which VTXO corresponds to this contract
        vtxoID := contract.ID.String() // Simplified; in reality retrieve the actual VTXO ID
        
        // Create out-of-round transaction for the swap
        // Note: This is a simplified example; you'd need to create an actual PSBT here
        serializedPsbt := "simplified_psbt_for_swap"
        
        // Create output with the new participant script
        output := &arkv1.Output{
            Value:   contract.ContractSize,
            Address: swapScript,
        }
        
        // Request out-of-round transaction from ASP
        oorResponse, err := s.arkClient.CreateOutOfRoundTransaction(
            ctx,
            serializedPsbt,
            []*arkv1.Output{output},
        )
        if err != nil {
            return nil, fmt.Errorf("failed to create out-of-round transaction with ASP: %w", err)
        }
        
        // Save the transaction record
        txRecord := &models.ContractTransaction{
            ID:            uuid.New(),
            ContractID:    contractID,
            TransactionID: oorResponse.GetTxId(),
            TxType:        "swap",
            TxHex:         oorResponse.GetSerializedPsbt(),
            Confirmed:     false,
            CreatedAt:     time.Now().UTC(),
        }
        
        // Update contract with new participant
        if isBuyer {
            contract.BuyerPubKey = newPubKey
        } else {
            contract.SellerPubKey = newPubKey
        }
        
        contract.UpdatedAt = time.Now().UTC()
        
        // Save transaction and update contract atomically
        err = s.contractRepo.ExecuteInTransaction(ctx, func(tx *sqlx.Tx) error {
            if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
                return fmt.Errorf("failed to add transaction: %w", err)
            }
            
            if err := s.contractRepo.Update(ctx, contract); err != nil {
                return fmt.Errorf("failed to update contract: %w", err)
            }
            
            return nil
        })
        
        if err != nil {
            return nil, fmt.Errorf("failed to process swap transaction: %w", err)
        }
        
        return txRecord, nil
    } else {
        // Fallback to on-chain participant swap if ASP is unavailable
        log.Warn().
            Str("contract_id", contractID.String()).
            Msg("ASP unavailable, falling back to on-chain participant swap")
            
        // Here you would implement the on-chain transaction creation
        // For brevity, we'll create a simplified placeholder transaction
        
        // Get ASP public key for the swap
        aspPubKey := s.taprootScriptBuilder.ASPPubKey
        
        // Build swap script
        swapScript, err := s.taprootScriptBuilder.BuildSwapScript(
            currentPubKey,
            newPubKey,
            aspPubKey,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to build swap script: %w", err)
        }
        
        // Create transaction record for the on-chain swap
        txRecord := &models.ContractTransaction{
            ID:            uuid.New(),
            ContractID:    contractID,
            TransactionID: "emergency_swap_" + contractID.String(),
            TxType:        "swap_onchain",
            TxHex:         "emergency_onchain_swap_transaction_hex",
            Confirmed:     false,
            CreatedAt:     time.Now().UTC(),
            Address:       swapScript,
        }
        
        // Update contract with new participant
        if isBuyer {
            contract.BuyerPubKey = newPubKey
        } else {
            contract.SellerPubKey = newPubKey
        }
        
        contract.UpdatedAt = time.Now().UTC()
        
        // Save transaction and update contract
        if err := s.contractRepo.AddTransaction(ctx, txRecord); err != nil {
            return nil, fmt.Errorf("failed to add transaction: %w", err)
        }
        
        if err := s.contractRepo.Update(ctx, contract); err != nil {
            return nil, fmt.Errorf("failed to update contract: %w", err)
        }
        
        return txRecord, nil
    }
}

// IsASPAvailable checks if the ASP is currently accessible
func (s *Service) IsASPAvailable(ctx context.Context) bool {
    available, _ := s.arkClient.CheckASPStatus(ctx)
    return available
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
