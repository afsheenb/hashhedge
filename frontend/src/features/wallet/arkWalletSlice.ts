// src/features/wallet/arkWalletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../store';

// Import the Ark Wallet SDK
import { InMemoryKey, Wallet, NetworkName } from '@arklabs/wallet-sdk';

// Define types based on Ark Wallet SDK documentation
interface ArkWalletBalance {
  total: number;
  confirmed: number;
  unconfirmed: number;
  available: number;
  onchain: {
    total: number;
    confirmed: number;
    unconfirmed: number;
  };
  offchain: {
    total: number;
    settled: number;
    pending: number;
    swept: number;
  };
}

interface ArkAddresses {
  onchain: string;
  offchain: string;
  bip21: string;
}

interface SendBitcoinParams {
  address: string;
  amount: number;
  feeRate?: number;
}

interface SignTransactionParams {
  txHex: string;
  contractId: string;
}

interface BroadcastTransactionParams {
  txHex: string;
}

// Wallet SDK instance - will be initialized when user connects
let walletInstance: Wallet | null = null;

// Network configuration - could be made configurable via .env files
const NETWORK: NetworkName = 'mutinynet';
const ESPLORA_URL = 'https://mutinynet.com/api';
const ARK_SERVER_URL = 'https://master.mutinynet.arklabs.to';
const ARK_SERVER_PUBLIC_KEY = 'd45fc69d4ff1f45cbba36ab1037261863c3a49c4910bc183ae975247358920b6';

// Function to get the wallet instance for other components to use
export const getWalletInstance = (): Wallet | null => {
  return walletInstance;
};

// Initialize the wallet with a private key
export const initializeWallet = createAsyncThunk(
  'arkWallet/initialize',
  async (privateKeyHex: string, { rejectWithValue }) => {
    try {
      // Validate private key format
      if (!privateKeyHex.match(/^[0-9a-fA-F]{64}$/)) {
        throw new Error('Invalid private key format. Must be 64 hex characters.');
      }

      // Create the identity from the provided private key
      const identity = InMemoryKey.fromHex(privateKeyHex);

      // Initialize the wallet with network, identity, and Ark configuration
      const wallet = new Wallet({
        network: NETWORK,
        identity: identity,
        esploraUrl: ESPLORA_URL,
        arkServerUrl: ARK_SERVER_URL,
        arkServerPublicKey: ARK_SERVER_PUBLIC_KEY
      });

      // Store the wallet instance for later use
      walletInstance = wallet;

      // Get addresses for the wallet
      const addresses = wallet.getAddress();

      // Get initial balance
      const balance = await wallet.getBalance();

      return {
        addresses,
        balance
      };
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize wallet');
    }
  }
);

// Disconnect the wallet and clean up
export const disconnectWallet = createAsyncThunk(
  'arkWallet/disconnect',
  async (_, { rejectWithValue }) => {
    try {
      walletInstance = null;
      return true;
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disconnect wallet');
    }
  }
);

// Fetch wallet balance
export const fetchWalletBalance = createAsyncThunk(
  'arkWallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const balance = await walletInstance.getBalance();
      return balance;
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch wallet balance');
    }
  }
);

// Send Bitcoin (auto-select on-chain or off-chain based on address)
export const sendBitcoin = createAsyncThunk(
  'arkWallet/sendBitcoin',
  async (params: SendBitcoinParams, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // Validate address and amount
      if (!params.address) {
        throw new Error('Address is required');
      }
      
      if (params.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Send the transaction
      const txid = await walletInstance.sendBitcoin(params);
      return txid;
    } catch (error) {
      console.error('Failed to send Bitcoin:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send Bitcoin');
    }
  }
);

// Send Bitcoin on-chain
export const sendOnchain = createAsyncThunk(
  'arkWallet/sendOnchain',
  async (params: SendBitcoinParams, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // Validate address and amount
      if (!params.address) {
        throw new Error('Address is required');
      }
      
      if (params.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Send the on-chain transaction
      const txid = await walletInstance.sendOnchain(params);
      return txid;
    } catch (error) {
      console.error('Failed to send on-chain transaction:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send on-chain transaction');
    }
  }
);

// Send Bitcoin off-chain
export const sendOffchain = createAsyncThunk(
  'arkWallet/sendOffchain',
  async (params: SendBitcoinParams, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // Validate address and amount
      if (!params.address) {
        throw new Error('Address is required');
      }
      
      if (params.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Send the off-chain transaction
      const txid = await walletInstance.sendOffchain(params);
      return txid;
    } catch (error) {
      console.error('Failed to send off-chain transaction:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send off-chain transaction');
    }
  }
);

// Sign a transaction
export const signTransaction = createAsyncThunk(
  'arkWallet/signTransaction',
  async (params: SignTransactionParams, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }

      // Parse the transaction hex
      const tx = await walletInstance.parsePsbt(params.txHex);
      
      // Sign the transaction
      const signedTx = await walletInstance.signPsbt(tx);
      
      // Finalize the transaction
      const finalizedTx = await walletInstance.finalizePsbt(signedTx);
      
      // Extract the finalized transaction hex
      const finalTxHex = walletInstance.extractPsbt(finalizedTx);
      
      return finalTxHex;
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to sign transaction');
    }
  }
);

// Broadcast a transaction
export const broadcastTransaction = createAsyncThunk(
  'arkWallet/broadcastTransaction',
  async (params: BroadcastTransactionParams, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // Broadcast the transaction
      const txid = await walletInstance.broadcastTransaction(params.txHex);
      return txid;
    } catch (error) {
      console.error('Failed to broadcast transaction:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to broadcast transaction');
    }
  }
);

// Define the initial state
interface ArkWalletState {
  isConnected: boolean;
  addresses: ArkAddresses | null;
  balance: ArkWalletBalance | null;
  userKeys: string[];
  loading: boolean;
  error: string | null;
}

const initialState: ArkWalletState = {
  isConnected: false,
  addresses: null,
  balance: null,
  userKeys: [],
  loading: false,
  error: null,
};

// Create the slice
const arkWalletSlice = createSlice({
  name: 'arkWallet',
  initialState,
  reducers: {
    // Add keys to the wallet
    addUserKey: (state, action: PayloadAction<string>) => {
      state.userKeys.push(action.payload);
    },
    // Remove keys from the wallet
    removeUserKey: (state, action: PayloadAction<string>) => {
      state.userKeys = state.userKeys.filter(key => key !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // Initialize wallet
    builder.addCase(initializeWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeWallet.fulfilled, (state, action) => {
      state.isConnected = true;
      state.addresses = action.payload.addresses;
      state.balance = action.payload.balance;
      state.loading = false;
    });
    builder.addCase(initializeWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Disconnect wallet
    builder.addCase(disconnectWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(disconnectWallet.fulfilled, (state) => {
      state.isConnected = false;
      state.addresses = null;
      state.balance = null;
      state.loading = false;
    });
    builder.addCase(disconnectWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Fetch wallet balance
    builder.addCase(fetchWalletBalance.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWalletBalance.fulfilled, (state, action) => {
      state.balance = action.payload;
      state.loading = false;
    });
    builder.addCase(fetchWalletBalance.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Common handlers for transaction actions
    const handleTransactionPending = (state: ArkWalletState) => {
      state.loading = true;
      state.error = null;
    };
    
    const handleTransactionFulfilled = (state: ArkWalletState) => {
      state.loading = false;
    };
    
    const handleTransactionRejected = (state: ArkWalletState, action: PayloadAction<unknown>) => {
      state.loading = false;
      state.error = action.payload as string;
    };
    
    // Send Bitcoin (auto)
    builder.addCase(sendBitcoin.pending, handleTransactionPending);
    builder.addCase(sendBitcoin.fulfilled, handleTransactionFulfilled);
    builder.addCase(sendBitcoin.rejected, handleTransactionRejected);
    
    // Send Bitcoin on-chain
    builder.addCase(sendOnchain.pending, handleTransactionPending);
    builder.addCase(sendOnchain.fulfilled, handleTransactionFulfilled);
    builder.addCase(sendOnchain.rejected, handleTransactionRejected);
    
    // Send Bitcoin off-chain
    builder.addCase(sendOffchain.pending, handleTransactionPending);
    builder.addCase(sendOffchain.fulfilled, handleTransactionFulfilled);
    builder.addCase(sendOffchain.rejected, handleTransactionRejected);
    
    // Sign transaction
    builder.addCase(signTransaction.pending, handleTransactionPending);
    builder.addCase(signTransaction.fulfilled, handleTransactionFulfilled);
    builder.addCase(signTransaction.rejected, handleTransactionRejected);
    
    // Broadcast transaction
    builder.addCase(broadcastTransaction.pending, handleTransactionPending);
    builder.addCase(broadcastTransaction.fulfilled, handleTransactionFulfilled);
    builder.addCase(broadcastTransaction.rejected, handleTransactionRejected);
  },
});

// Export actions and reducer
export const { addUserKey, removeUserKey } = arkWalletSlice.actions;
export default arkWalletSlice.reducer;
