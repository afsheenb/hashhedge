// pkg/taproot/script_builder.go
package taproot

import (
	"github.com/btcsuite/btcd/wire"
    "bytes"
    "encoding/hex"
    "fmt"
    "time"

    "github.com/btcsuite/btcd/btcec/v2/schnorr"
    "github.com/btcsuite/btcd/btcutil"
    "github.com/btcsuite/btcd/chaincfg"
    "github.com/btcsuite/btcd/txscript"
)

// ScriptBuilder creates Taproot scripts for hash rate contracts
type ScriptBuilder struct{}

// NewScriptBuilder creates a new ScriptBuilder
func NewScriptBuilder() *ScriptBuilder {
	return &ScriptBuilder{}
}


// BuildSetupScript creates the script for the setup transaction
func (b *ScriptBuilder) BuildSetupScript(
    buyerPubKey string,
    sellerPubKey string,
    startBlockHeight int64,
    endBlockHeight int64,
    targetTimestamp time.Time,
    isCall bool,
) (string, error) {
    // Decode the buyer's public key
    buyerPK, err := hex.DecodeString(buyerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid buyer public key: %w", err)
    }

    // Decode the seller's public key
    sellerPK, err := hex.DecodeString(sellerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid seller public key: %w", err)
    }

    // Create a cooperative spend path (key path)
    // This is a 2-of-2 multisig between buyer and seller
    cooperativeScript, err := txscript.NewScriptBuilder().
        AddOp(txscript.OP_2).                   // 2 signatures required
        AddData(buyerPK).                       // Buyer's public key
        AddData(sellerPK).                      // Seller's public key
        AddOp(txscript.OP_2).                   // 2 public keys total
        AddOp(txscript.OP_CHECKMULTISIG).       // Check the multisig
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build cooperative script: %w", err)
    }

    // Create the high hash rate path (if block height is reached first)
    highHashRateScript, err := txscript.NewScriptBuilder().
        AddInt64(endBlockHeight).               // Target block height
        AddOp(txscript.OP_CHECKLOCKTIMEVERIFY). // Lock until this height
        AddOp(txscript.OP_DROP).                // Remove height from stack
        AddData(buyerPK).                       // Buyer's public key (for CALL)
        AddOp(txscript.OP_CHECKSIG).            // Check signature
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build high hash rate script: %w", err)
    }

    // Create the low hash rate path (if timestamp is reached first)
    timestampUint := uint32(targetTimestamp.Unix())
    lowHashRateScript, err := txscript.NewScriptBuilder().
        AddInt64(int64(timestampUint)).         // Target timestamp
        AddOp(txscript.OP_CHECKLOCKTIMEVERIFY). // Lock until this time
        AddOp(txscript.OP_DROP).                // Remove timestamp from stack
        AddData(sellerPK).                      // Seller's public key (for CALL)
        AddOp(txscript.OP_CHECKSIG).            // Check signature
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build low hash rate script: %w", err)
    }

    // Create Taproot script tree with the different spend paths
    internalKey, err := txscript.NewTaprootInternalKey(buyerPK)
    if err != nil {
        return "", fmt.Errorf("failed to create taproot internal key: %w", err)
    }

    scriptTree := txscript.NewBaseTapscriptTree()
    scriptTree.AddLeaf(highHashRateScript)
    scriptTree.AddLeaf(lowHashRateScript)

    tapscript := scriptTree.ScriptTree

    // Calculate the taproot output key
    outputKey, err := txscript.ComputeTaprootOutputKey(internalKey, tapscript.RootNode.TapHash())
    if err != nil {
        return "", fmt.Errorf("failed to compute taproot output key: %w", err)
    }

    // Convert to a P2TR address
    address, err := btcutil.NewAddressTaproot(
        schnorr.SerializePubKey(outputKey),
        &chaincfg.MainNetParams,
    )
    if err != nil {
        return "", fmt.Errorf("failed to create taproot address: %w", err)
    }

    return address.String(), nil
}

// BuildFinalScript creates the script for the final transaction
func (b *ScriptBuilder) BuildFinalScript(
    buyerPubKey string,
    sellerPubKey string,
    endBlockHeight int64,
    targetTimestamp time.Time,
    isCall bool,
) (string, error) {
    // Decode the buyer's public key
    buyerPK, err := hex.DecodeString(buyerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid buyer public key: %w", err)
    }

    // Decode the seller's public key
    sellerPK, err := hex.DecodeString(sellerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid seller public key: %w", err)
    }

    // Determine the winner's public key for each outcome based on contract type
    var highHashRateWinnerPK, lowHashRateWinnerPK []byte
    if isCall {
        // For CALL: buyer wins if hash rate is high, seller wins if hash rate is low
        highHashRateWinnerPK = buyerPK
        lowHashRateWinnerPK = sellerPK
    } else {
        // For PUT: seller wins if hash rate is high, buyer wins if hash rate is low
        highHashRateWinnerPK = sellerPK
        lowHashRateWinnerPK = buyerPK
    }

    // Create the high hash rate path (if block height is reached first)
    highHashRateScript, err := txscript.NewScriptBuilder().
        AddInt64(endBlockHeight).               // Target block height
        AddOp(txscript.OP_CHECKLOCKTIMEVERIFY). // Lock until this height
        AddOp(txscript.OP_DROP).                // Remove height from stack
        AddData(highHashRateWinnerPK).          // Winner's public key
        AddOp(txscript.OP_CHECKSIG).            // Check signature
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build high hash rate script: %w", err)
    }

    // Create the low hash rate path (if timestamp is reached first)
    timestampUint := uint32(targetTimestamp.Unix())
    lowHashRateScript, err := txscript.NewScriptBuilder().
        AddInt64(int64(timestampUint)).         // Target timestamp
        AddOp(txscript.OP_CHECKLOCKTIMEVERIFY). // Lock until this time
        AddOp(txscript.OP_DROP).                // Remove timestamp from stack
        AddData(lowHashRateWinnerPK).           // Winner's public key
        AddOp(txscript.OP_CHECKSIG).            // Check signature
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build low hash rate script: %w", err)
    }

    // Create a dispute resolution path that requires 2-of-3 signatures
    // (buyer, seller, and ASP can resolve a dispute)
    // This is for cases where settlement is disputed
    aspPubKey := []byte{0x02, 0x00, 0x00, 0x00, 0x00} // Example ASP public key - in real implementation, use actual ASP key
    
    disputeScript, err := txscript.NewScriptBuilder().
        AddOp(txscript.OP_2).                   // 2 signatures required
        AddData(buyerPK).                       // Buyer's public key
        AddData(sellerPK).                      // Seller's public key
        AddData(aspPubKey).                     // ASP's public key
        AddOp(txscript.OP_3).                   // 3 public keys total
        AddOp(txscript.OP_CHECKMULTISIG).       // Check the multisig
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build dispute resolution script: %w", err)
    }

    // Create Taproot script tree with the different spend paths
    internalKey, err := txscript.NewTaprootInternalKey(buyerPK)
    if err != nil {
        return "", fmt.Errorf("failed to create taproot internal key: %w", err)
    }

    scriptTree := txscript.NewBaseTapscriptTree()
    scriptTree.AddLeaf(highHashRateScript)
    scriptTree.AddLeaf(lowHashRateScript)
    scriptTree.AddLeaf(disputeScript)

    tapscript := scriptTree.ScriptTree

    // Calculate the taproot output key
    outputKey, err := txscript.ComputeTaprootOutputKey(internalKey, tapscript.RootNode.TapHash())
    if err != nil {
        return "", fmt.Errorf("failed to compute taproot output key: %w", err)
    }

    // Convert to a P2TR address
    address, err := btcutil.NewAddressTaproot(
        schnorr.SerializePubKey(outputKey),
        &chaincfg.MainNetParams,
    )
    if err != nil {
        return "", fmt.Errorf("failed to create taproot address: %w", err)
    }

    return address.String(), nil
}

// BuildSettlementScript creates the script for the settlement transaction
func (b *ScriptBuilder) BuildSettlementScript(
    winnerPubKey string,
) (string, error) {
    // Decode the winner's public key
    winnerPK, err := hex.DecodeString(winnerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid winner public key: %w", err)
    }

    // Create a simple P2PKH script for the winner
    pkHash := btcutil.Hash160(winnerPK)
    
    settlementScript, err := txscript.NewScriptBuilder().
        AddOp(txscript.OP_DUP).
        AddOp(txscript.OP_HASH160).
        AddData(pkHash).
        AddOp(txscript.OP_EQUALVERIFY).
        AddOp(txscript.OP_CHECKSIG).
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build settlement script: %w", err)
    }

    // Convert to a P2PKH address
    address, err := btcutil.NewAddressPubKeyHash(pkHash, &chaincfg.MainNetParams)
    if err != nil {
        return "", fmt.Errorf("failed to create P2PKH address: %w", err)
    }

    return address.String(), nil
}

// BuildSwapScript creates a script for transferring a contract to a new participant
func (b *ScriptBuilder) BuildSwapScript(
    currentPubKey string,
    newPubKey string,
    aspPubKey string,
) (string, error) {
    // Decode the public keys
    currentPK, err := hex.DecodeString(currentPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid current public key: %w", err)
    }

    newPK, err := hex.DecodeString(newPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid new public key: %w", err)
    }

    aspPK, err := hex.DecodeString(aspPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid ASP public key: %w", err)
    }

    // Create a script that requires signatures from the current participant,
    // the new participant, and the ASP to authorize the swap
    swapScript, err := txscript.NewScriptBuilder().
        AddOp(txscript.OP_3).                   // 3 signatures required
        AddData(currentPK).                     // Current participant's public key
        AddData(newPK).                         // New participant's public key
        AddData(aspPK).                         // ASP's public key
        AddOp(txscript.OP_3).                   // 3 public keys total
        AddOp(txscript.OP_CHECKMULTISIG).       // Check the multisig
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build swap script: %w", err)
    }

    // Create a Taproot script with the swap path
    internalKey, err := txscript.NewTaprootInternalKey(currentPK)
    if err != nil {
        return "", fmt.Errorf("failed to create taproot internal key: %w", err)
    }

    scriptTree := txscript.NewBaseTapscriptTree()
    scriptTree.AddLeaf(swapScript)

    tapscript := scriptTree.ScriptTree

    // Calculate the taproot output key
    outputKey, err := txscript.ComputeTaprootOutputKey(internalKey, tapscript.RootNode.TapHash())
    if err != nil {
        return "", fmt.Errorf("failed to compute taproot output key: %w", err)
    }

    // Convert to a P2TR address
    address, err := btcutil.NewAddressTaproot(
        schnorr.SerializePubKey(outputKey),
        &chaincfg.MainNetParams,
    )
    if err != nil {
        return "", fmt.Errorf("failed to create taproot address: %w", err)
    }

    return address.String(), nil
}

// BuildExitPathScript creates a script for the emergency exit path
// This is used if the ASP becomes unavailable or the contract needs to be settled on-chain
func (b *ScriptBuilder) BuildExitPathScript(
    buyerPubKey string,
    sellerPubKey string,
    timeoutBlocks int64,
) (string, error) {
    // Decode the buyer's public key
    buyerPK, err := hex.DecodeString(buyerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid buyer public key: %w", err)
    }

    // Decode the seller's public key
    sellerPK, err := hex.DecodeString(sellerPubKey)
    if err != nil {
        return "", fmt.Errorf("invalid seller public key: %w", err)
    }

    // Create a timeout path that allows 2-of-2 multisig after timeout
    exitScript, err := txscript.NewScriptBuilder().
        AddInt64(timeoutBlocks).                // Timeout in blocks
        AddOp(txscript.OP_CHECKSEQUENCEVERIFY). // Check if enough time has elapsed
        AddOp(txscript.OP_DROP).                // Remove timeout from stack
        AddOp(txscript.OP_2).                   // 2 signatures required
        AddData(buyerPK).                       // Buyer's public key
        AddData(sellerPK).                      // Seller's public key
        AddOp(txscript.OP_2).                   // 2 public keys total
        AddOp(txscript.OP_CHECKMULTISIG).       // Check the multisig
        Script()
    if err != nil {
        return "", fmt.Errorf("failed to build exit path script: %w", err)
    }

    // Create a Taproot script with the exit path
    internalKey, err := txscript.NewTaprootInternalKey(buyerPK)
    if err != nil {
        return "", fmt.Errorf("failed to create taproot internal key: %w", err)
    }

    scriptTree := txscript.NewBaseTapscriptTree()
    scriptTree.AddLeaf(exitScript)

    tapscript := scriptTree.ScriptTree

    // Calculate the taproot output key
    outputKey, err := txscript.ComputeTaprootOutputKey(internalKey, tapscript.RootNode.TapHash())
    if err != nil {
        return "", fmt.Errorf("failed to compute taproot output key: %w", err)
    }

    // Convert to a P2TR address
    address, err := btcutil.NewAddressTaproot(
        schnorr.SerializePubKey(outputKey),
        &chaincfg.MainNetParams,
    )
    if err != nil {
        return "", fmt.Errorf("failed to create taproot address: %w", err)
    }

    return address.String(), nil
}
