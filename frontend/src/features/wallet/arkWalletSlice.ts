// src/features/wallet/arkWalletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InMemoryKey, Wallet } from '@arklabs/wallet-sdk';

interface ArkWalletState {
  isInitialized: boolean;
  isConnected: boolean;
  addresses: {
    onchain: string;
    offchain: string;
    bip21: string;
  } | null;
  balance: {
    total: number;
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
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: ArkWalletState = {
  isInitialized: false,
  isConnected: false,
  addresses: null,
  balance: null,
  loading: false,
  error: null,
};

// Wallet instance reference
let walletInstance: Wallet | null = null;

// Initialize wallet with private key
export const initializeWallet = createAsyncThunk(
  'arkWallet/initialize',
  async (privateKeyHex: string, { rejectWithValue }) => {
    try {
      // Create identity from private key
      const identity = InMemoryKey.fromHex(privateKeyHex);
      
      // Create new wallet instance
      walletInstance = new Wallet({
        network: 'mutinynet', // Use appropriate network (bitcoin, testnet, etc.)
        identity: identity,
        // Use environment variables for URLs
        esploraUrl: process.env.REACT_APP_ESPLORA_URL,
        arkServerUrl: process.env.REACT_APP_ARK_SERVER_URL,
        arkServerPublicKey: process.env.REACT_APP_ARK_SERVER_PUBLIC_KEY
      });

      // Get wallet addresses
      const addresses = walletInstance.getAddress();
      
      // Fetch initial balance
      const balance = await walletInstance.getBalance();
      
      return { addresses, balance };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize wallet');
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  }
);

// Send bitcoin (on-chain or off-chain depending on the address)
export const sendBitcoin = createAsyncThunk(
  'arkWallet/sendBitcoin',
  async (
    { address, amount, feeRate }: { address: string; amount: number; feeRate?: number },
    { rejectWithValue }
  ) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const txid = await walletInstance.sendBitcoin({
        address,
        amount,
        feeRate
      });
      
      return txid;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send bitcoin');
    }
  }
);

// Send bitcoin specifically via off-chain (Ark)
export const sendOffchain = createAsyncThunk(
  'arkWallet/sendOffchain',
  async (
    { address, amount, feeRate }: { address: string; amount: number; feeRate?: number },
    { rejectWithValue }
  ) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const txid = await walletInstance.sendOffchain({
        address,
        amount,
        feeRate
      });
      
      return txid;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send off-chain transaction');
    }
  }
);

// Get wallet coins (UTXOs)
export const getWalletCoins = createAsyncThunk(
  'arkWallet/getCoins',
  async (_, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const coins = await walletInstance.getCoins();
      return coins;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get coins');
    }
  }
);

// Get virtual coins (for Ark off-chain)
export const getVirtualCoins = createAsyncThunk(
  'arkWallet/getVirtualCoins',
  async (_, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const virtualCoins = await walletInstance.getVirtualCoins();
      return virtualCoins;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get virtual coins');
    }
  }
);

// Clear wallet state (disconnect)
export const disconnectWallet = createAsyncThunk(
  'arkWallet/disconnect',
  async (_, { dispatch }) => {
    walletInstance = null;
    return true;
  }
);

// Create slice
const arkWalletSlice = createSlice({
  name: 'arkWallet',
  initialState,
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize wallet
    builder.addCase(initializeWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeWallet.fulfilled, (state, action) => {
      state.loading = false;
      state.isInitialized = true;
      state.isConnected = true;
      state.addresses = action.payload.addresses;
      state.balance = action.payload.balance;
    });
    builder.addCase(initializeWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch balance
    builder.addCase(fetchWalletBalance.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWalletBalance.fulfilled, (state, action) => {
      state.loading = false;
      state.balance = action.payload;
    });
    builder.addCase(fetchWalletBalance.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send bitcoin (general case)
    builder.addCase(sendBitcoin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendBitcoin.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(sendBitcoin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Disconnect wallet
    builder.addCase(disconnectWallet.fulfilled, (state) => {
      state.isInitialized = false;
      state.isConnected = false;
      state.addresses = null;
      state.balance = null;
    });
  },
});

export const { clearWalletError } = arkWalletSlice.actions;
export default arkWalletSlice.reducer;

// Utility functions for working with wallet
export const getWalletInstance = (): Wallet | null => walletInstance;
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InMemoryKey, Wallet } from '@arklabs/wallet-sdk';

interface ArkWalletState {
  isInitialized: boolean;
  isConnected: boolean;
  addresses: {
    onchain: string;
    offchain: string;
    bip21: string;
  } | null;
  balance: {
    total: number;
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
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: ArkWalletState = {
  isInitialized: false,
  isConnected: false,
  addresses: null,
  balance: null,
  loading: false,
  error: null,
};

// Wallet instance reference
let walletInstance: Wallet | null = null;

// Initialize wallet with private key
export const initializeWallet = createAsyncThunk(
  'arkWallet/initialize',
  async (privateKeyHex: string, { rejectWithValue }) => {
    try {
      // Create identity from private key
      const identity = InMemoryKey.fromHex(privateKeyHex);
      
      // Create new wallet instance
      walletInstance = new Wallet({
        network: 'mutinynet', // Use appropriate network (bitcoin, testnet, etc.)
        identity: identity,
        // Use environment variables for URLs
        esploraUrl: process.env.REACT_APP_ESPLORA_URL,
        arkServerUrl: process.env.REACT_APP_ARK_SERVER_URL,
        arkServerPublicKey: process.env.REACT_APP_ARK_SERVER_PUBLIC_KEY
      });

      // Get wallet addresses
      const addresses = walletInstance.getAddress();
      
      // Fetch initial balance
      const balance = await walletInstance.getBalance();
      
      return { addresses, balance };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize wallet');
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
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  }
);

// Send bitcoin (on-chain or off-chain depending on the address)
export const sendBitcoin = createAsyncThunk(
  'arkWallet/sendBitcoin',
  async (
    { address, amount, feeRate }: { address: string; amount: number; feeRate?: number },
    { rejectWithValue }
  ) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const txid = await walletInstance.sendBitcoin({
        address,
        amount,
        feeRate
      });
      
      return txid;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send bitcoin');
    }
  }
);

// Send bitcoin specifically via off-chain (Ark)
export const sendOffchain = createAsyncThunk(
  'arkWallet/sendOffchain',
  async (
    { address, amount, feeRate }: { address: string; amount: number; feeRate?: number },
    { rejectWithValue }
  ) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const txid = await walletInstance.sendOffchain({
        address,
        amount,
        feeRate
      });
      
      return txid;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to send off-chain transaction');
    }
  }
);

// Get wallet coins (UTXOs)
export const getWalletCoins = createAsyncThunk(
  'arkWallet/getCoins',
  async (_, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const coins = await walletInstance.getCoins();
      return coins;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get coins');
    }
  }
);

// Get virtual coins (for Ark off-chain)
export const getVirtualCoins = createAsyncThunk(
  'arkWallet/getVirtualCoins',
  async (_, { rejectWithValue }) => {
    try {
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      const virtualCoins = await walletInstance.getVirtualCoins();
      return virtualCoins;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to get virtual coins');
    }
  }
);

// Clear wallet state (disconnect)
export const disconnectWallet = createAsyncThunk(
  'arkWallet/disconnect',
  async (_, { dispatch }) => {
    walletInstance = null;
    return true;
  }
);

// Create slice
const arkWalletSlice = createSlice({
  name: 'arkWallet',
  initialState,
  reducers: {
    clearWalletError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize wallet
    builder.addCase(initializeWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeWallet.fulfilled, (state, action) => {
      state.loading = false;
      state.isInitialized = true;
      state.isConnected = true;
      state.addresses = action.payload.addresses;
      state.balance = action.payload.balance;
    });
    builder.addCase(initializeWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch balance
    builder.addCase(fetchWalletBalance.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchWalletBalance.fulfilled, (state, action) => {
      state.loading = false;
      state.balance = action.payload;
    });
    builder.addCase(fetchWalletBalance.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send bitcoin (general case)
    builder.addCase(sendBitcoin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendBitcoin.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(sendBitcoin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Disconnect wallet
    builder.addCase(disconnectWallet.fulfilled, (state) => {
      state.isInitialized = false;
      state.isConnected = false;
      state.addresses = null;
      state.balance = null;
    });
  },
});

export const { clearWalletError } = arkWalletSlice.actions;
export default arkWalletSlice.reducer;

// Utility functions for working with wallet
export const getWalletInstance = (): Wallet | null => walletInstance;
