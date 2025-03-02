// pkg/bitcoin/utils.go
package bitcoin

import (
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
)

// BroadcastTransactionWithRetry broadcasts a raw transaction to the network with retry logic
func (c *Client) BroadcastTransactionWithRetry(ctx context.Context, txHex string) (string, error) {
	// Decode the transaction hex
	txBytes, err := hex.DecodeString(txHex)
	if err != nil {
		return "", fmt.Errorf("failed to decode transaction hex: %w", err)
	}

	// Deserialize the transaction
	var tx wire.MsgTx
	if err := tx.Deserialize(hex.NewDecoder(txBytes)); err != nil {
		return "", fmt.Errorf("failed to deserialize transaction: %w", err)
	}

	// Get transaction ID
	txHash := tx.TxHash()
	txid := txHash.String()

	// Check if the transaction is already in the mempool or blockchain
	_, err = c.GetRawTransactionVerbose(ctx, &txHash)
	if err == nil {
		// Transaction already exists
		return txid, nil
	}

	// Define retry parameters
	maxRetries := 3
	retryDelay := 1 * time.Second

	var lastErr error
	for i := 0; i < maxRetries; i++ {
		// Attempt to broadcast
		txHash, err := c.SendRawTransaction(ctx, &tx, false)
		if err == nil {
			return txHash.String(), nil
		}

		// Check if it's already in the mempool
		if isAlreadyInMempoolError(err) {
			return txid, nil
		}
		
		// If there's a different error, retry after delay
		lastErr = err
		time.Sleep(retryDelay)
		retryDelay *= 2 // Exponential backoff
	}

	return "", fmt.Errorf("failed to broadcast transaction after %d attempts: %w", maxRetries, lastErr)
}

// isAlreadyInMempoolError checks if the error indicates the transaction is already in the mempool
func isAlreadyInMempoolError(err error) bool {
	if err == nil {
		return false
	}
	
	errMsg := err.Error()
	return errors.Is(err, btcutil.ErrDuplicateTx) || 
		errors.Is(err, txscript.ErrUnsupportedScriptType) ||
		errors.Is(err, chaincfg.ErrDuplicateNet) ||
		(len(errMsg) > 6 && errMsg[:6] == "txn-already-in-mempool")
}

// CreateMultisigAddress creates an n-of-m multisig address
func CreateMultisigAddress(requiredSigs int, publicKeys []string, chainParams *chaincfg.Params) (string, []byte, error) {
	if requiredSigs <= 0 || len(publicKeys) < requiredSigs {
		return "", nil, fmt.Errorf("invalid multisig parameters: %d keys, %d required", len(publicKeys), requiredSigs)
	}

	// Parse public keys
	pubKeysBytes := make([][]byte, len(publicKeys))
	for i, hexKey := range publicKeys {
		pkBytes, err := hex.DecodeString(hexKey)
		if err != nil {
			return "", nil, fmt.Errorf("failed to decode public key %d: %w", i, err)
		}
		pubKeysBytes[i] = pkBytes
	}

	// Create redeem script
	builder := txscript.NewScriptBuilder()
	
	// Add OP_N for required signatures
	builder.AddOp(byte(txscript.OP_1 - 1 + requiredSigs))
	
	// Add public keys
	for _, pkBytes := range pubKeysBytes {
		builder.AddData(pkBytes)
	}
	
	// Add OP_N for total keys
	builder.AddOp(byte(txscript.OP_1 - 1 + len(publicKeys)))
	
	// Add OP_CHECKMULTISIG
	builder.AddOp(txscript.OP_CHECKMULTISIG)
	
	// Get script
	redeemScript, err := builder.Script()
	if err != nil {
		return "", nil, fmt.Errorf("failed to build multisig script: %w", err)
	}

	// Create P2SH address
	scriptHash := btcutil.Hash160(redeemScript)
	addr, err := btcutil.NewAddressScriptHashFromHash(scriptHash, chainParams)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create P2SH address: %w", err)
	}

	return addr.String(), redeemScript, nil
}

// VerifyTransactionSignatures verifies the signatures in a transaction
func VerifyTransactionSignatures(tx *wire.MsgTx, prevOutputs []*wire.TxOut) (bool, error) {
	if len(tx.TxIn) != len(prevOutputs) {
		return false, fmt.Errorf("number of inputs (%d) does not match number of prev outputs (%d)", 
			len(tx.TxIn), len(prevOutputs))
	}

	// Verify each input
	for i, txIn := range tx.TxIn {
		prevOut := prevOutputs[i]
		
		// Skip if no signature script or witness
		if len(txIn.SignatureScript) == 0 && len(txIn.Witness) == 0 {
			continue
		}
		
		// Try using witness first (for segwit)
		if len(txIn.Witness) > 0 {
			valid, err := txscript.VerifyWitness(
				prevOut.PkScript,
				tx,
				i,
				prevOut.Value,
				txscript.StandardVerifyFlags,
			)
			if err != nil || !valid {
				return false, fmt.Errorf("witness verification failed for input %d: %w", i, err)
			}
		} else {
			// Legacy verification
			vm, err := txscript.NewEngine(
				prevOut.PkScript,
				tx,
				i,
				txscript.StandardVerifyFlags,
				nil,
				nil,
				prevOut.Value,
			)
			if err != nil {
				return false, fmt.Errorf("failed to create script engine for input %d: %w", i, err)
			}
			
			if err := vm.Execute(); err != nil {
				return false, fmt.Errorf("script verification failed for input %d: %w", i, err)
			}
		}
	}
	
	return true, nil
}

// GetBlockConfirmations returns the number of confirmations for a block
func (c *Client) GetBlockConfirmations(ctx context.Context, blockHash *chainhash.Hash) (int64, error) {
	blockHeader, err := c.GetBlockHeaderVerbose(ctx, blockHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get block header: %w", err)
	}

	bestHeight, err := c.GetBlockCount(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get best block height: %w", err)
	}

	return bestHeight - blockHeader.Height + 1, nil
}

// GetTransactionConfirmations returns the number of confirmations for a transaction
func (c *Client) GetTransactionConfirmations(ctx context.Context, txHash *chainhash.Hash) (int64, error) {
	txInfo, err := c.GetRawTransactionVerbose(ctx, txHash)
	if err != nil {
		return 0, fmt.Errorf("failed to get transaction info: %w", err)
	}

	if txInfo.BlockHash == "" {
		// Transaction is in mempool
		return 0, nil
	}

	blockHash, err := chainhash.NewHashFromStr(txInfo.BlockHash)
	if err != nil {
		return 0, fmt.Errorf("invalid block hash: %w", err)
	}

	return c.GetBlockConfirmations(ctx, blockHash)
}
