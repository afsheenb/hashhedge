// src/features/wallet/arkWalletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';

// Define types for exit information
interface ExitInfo {
  hasPreSignedExit: boolean;
  timelockStart?: number;
  timelockExpiry?: number;
}

// Define type for exit transactions
interface ExitTransaction {
  id: string;
  amount: number;
  address: string;
  created: number;
}

// Define types for wallet state
interface WalletState {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  addresses: {
    onchain: string;
    offchain: string;
  } | null;
  balance: {
    total: number;
    available: number;
    confirmed: number;
    onchain: {
      confirmed: number;
      unconfirmed: number;
    };
    offchain: {
      settled: number;
      pending: number;
    };
  } | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  pendingTransactions: string[];
  failedTransactions: string[];
  transactionHistory: any[];
  reconnectAttempts: number;
  exitInfo: ExitInfo | null;
  exitTransactions: ExitTransaction[];
}

// Initial state
const initialState: WalletState = {
  isConnected: false,
  loading: false,
  error: null,
  addresses: null,
  balance: null,
  connectionStatus: 'disconnected',
  pendingTransactions: [],
  failedTransactions: [],
  transactionHistory: [],
  reconnectAttempts: 0,
  exitInfo: null,
  exitTransactions: [],
};

// Async thunks for wallet operations
export const initializeWallet = createAsyncThunk(
  'wallet/initializeWallet',
  async (privateKey: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/wallet/initialize', { privateKey });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initialize wallet');
    }
  }
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnectWallet',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/wallet/disconnect');
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to disconnect wallet');
    }
  }
);

export const reconnectWallet = createAsyncThunk(
  'wallet/reconnectWallet',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { arkWallet: WalletState };
      const { reconnectAttempts } = state.arkWallet;
      
      if (reconnectAttempts >= 3) {
        return rejectWithValue('Maximum reconnection attempts reached');
      }
      
      const response = await api.post('/wallet/reconnect');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reconnect wallet');
    }
  }
);

export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wallet/balance');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet balance');
    }
  }
);

export const sendBitcoin = createAsyncThunk(
  'wallet/sendBitcoin',
  async (params: { address: string; amount: number; feeRate: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/wallet/send', params);
      return response.data.txid;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send Bitcoin');
    }
  }
);

export const sendOnchain = createAsyncThunk(
  'wallet/sendOnchain',
  async (params: { address: string; amount: number; feeRate: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/wallet/send-onchain', params);
      return response.data.txid;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send on-chain');
    }
  }
);

export const sendOffchain = createAsyncThunk(
  'wallet/sendOffchain',
  async (params: { address: string; amount: number; feeRate: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/wallet/send-offchain', params);
      return response.data.txid;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send off-chain');
    }
  }
);

export const checkTransactionStatus = createAsyncThunk(
  'wallet/checkTransactionStatus',
  async (txId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/wallet/transaction/${txId}`);
      return { txId, status: response.data.status };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check transaction status');
    }
  }
);

export const retryTransaction = createAsyncThunk(
  'wallet/retryTransaction',
  async (txId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/wallet/transaction/${txId}/retry`);
      return { txId, newTxId: response.data.txid };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to retry transaction');
    }
  }
);

export const clearFailedTransaction = createAsyncThunk(
  'wallet/clearFailedTransaction',
  async (txId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/wallet/transaction/${txId}`);
      return txId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear transaction');
    }
  }
);

export const fetchTransactionHistory = createAsyncThunk(
  'wallet/fetchTransactionHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wallet/transactions');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transaction history');
    }
  }
);

// New thunks for emergency exit functionality
export const fetchExitInfo = createAsyncThunk(
  'wallet/fetchExitInfo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wallet/exit-info');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch exit information');
    }
  }
);

export const fetchExitTransactions = createAsyncThunk(
  'wallet/fetchExitTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wallet/exit-transactions');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch exit transactions');
    }
  }
);

export const executeEmergencyExit = createAsyncThunk(
  'wallet/executeEmergencyExit',
  async (params: { address?: string; feeRate?: number }, { rejectWithValue }) => {
    try {
      const response = await api.post('/wallet/emergency-exit', params);
      return response.data.txid;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to execute emergency exit');
    }
  }
);

export const downloadExitTransactions = createAsyncThunk(
  'wallet/downloadExitTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/wallet/exit-transactions/download', { responseType: 'blob' });
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'emergency-exit-transactions.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download exit transactions');
    }
  }
);

export const broadcastEmergencyTransaction = createAsyncThunk(
  'wallet/broadcastEmergencyTransaction',
  async (txId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/wallet/exit-transactions/${txId}/broadcast`);
      return response.data.txid;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to broadcast exit transaction');
    }
  }
);

// Create the wallet slice
const arkWalletSlice = createSlice({
  name: 'arkWallet',
  initialState,
  reducers: {
    // Any additional reducers if needed
  },
  extraReducers: (builder) => {
    // Initialize wallet
    builder.addCase(initializeWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeWallet.fulfilled, (state, action) => {
      state.loading = false;
      state.isConnected = true;
      state.connectionStatus = 'connected';
      state.addresses = action.payload.addresses;
      state.balance = action.payload.balance;
      state.exitInfo = action.payload.exitInfo;
      state.exitTransactions = action.payload.exitTransactions || [];
    });
    builder.addCase(initializeWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isConnected = false;
      state.connectionStatus = 'error';
    });

    // Disconnect wallet
    builder.addCase(disconnectWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(disconnectWallet.fulfilled, (state) => {
      state.loading = false;
      state.isConnected = false;
      state.connectionStatus = 'disconnected';
      state.addresses = null;
      state.balance = null;
      state.pendingTransactions = [];
      state.failedTransactions = [];
      state.transactionHistory = [];
      state.reconnectAttempts = 0;
      state.exitInfo = null;
      state.exitTransactions = [];
    });
    builder.addCase(disconnectWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Reconnect wallet
    builder.addCase(reconnectWallet.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.connectionStatus = 'reconnecting';
    });
    builder.addCase(reconnectWallet.fulfilled, (state, action) => {
      state.loading = false;
      state.isConnected = true;
      state.connectionStatus = 'connected';
      state.addresses = action.payload.addresses;
      state.balance = action.payload.balance;
      state.exitInfo = action.payload.exitInfo;
      state.exitTransactions = action.payload.exitTransactions || [];
      state.reconnectAttempts = 0; // Reset reconnect attempts on success
    });
    builder.addCase(reconnectWallet.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.connectionStatus = 'error';
      state.reconnectAttempts += 1;
    });

    // Fetch wallet balance
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

    // Send Bitcoin (generic)
    builder.addCase(sendBitcoin.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendBitcoin.fulfilled, (state, action) => {
      state.loading = false;
      state.pendingTransactions.push(action.payload);
    });
    builder.addCase(sendBitcoin.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send on-chain
    builder.addCase(sendOnchain.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendOnchain.fulfilled, (state, action) => {
      state.loading = false;
      state.pendingTransactions.push(action.payload);
    });
    builder.addCase(sendOnchain.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Send off-chain
    builder.addCase(sendOffchain.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(sendOffchain.fulfilled, (state, action) => {
      state.loading = false;
      state.pendingTransactions.push(action.payload);
    });
    builder.addCase(sendOffchain.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Check transaction status
    builder.addCase(checkTransactionStatus.fulfilled, (state, action) => {
      const { txId, status } = action.payload;
      if (status === 'confirmed') {
        state.pendingTransactions = state.pendingTransactions.filter(id => id !== txId);
      } else if (status === 'failed') {
        state.pendingTransactions = state.pendingTransactions.filter(id => id !== txId);
        if (!state.failedTransactions.includes(txId)) {
          state.failedTransactions.push(txId);
        }
      }
    });

    // Retry transaction
    builder.addCase(retryTransaction.fulfilled, (state, action) => {
      const { txId, newTxId } = action.payload;
      state.failedTransactions = state.failedTransactions.filter(id => id !== txId);
      state.pendingTransactions.push(newTxId);
    });

    // Clear failed transaction
    builder.addCase(clearFailedTransaction.fulfilled, (state, action) => {
      state.failedTransactions = state.failedTransactions.filter(id => id !== action.payload);
    });

    // Fetch transaction history
    builder.addCase(fetchTransactionHistory.fulfilled, (state, action) => {
      state.transactionHistory = action.payload;
    });

    // Fetch exit info
    builder.addCase(fetchExitInfo.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchExitInfo.fulfilled, (state, action) => {
      state.loading = false;
      state.exitInfo = action.payload;
    });
    builder.addCase(fetchExitInfo.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch exit transactions
    builder.addCase(fetchExitTransactions.fulfilled, (state, action) => {
      state.exitTransactions = action.payload;
    });

    // Execute emergency exit
    builder.addCase(executeEmergencyExit.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(executeEmergencyExit.fulfilled, (state, action) => {
      state.loading = false;
      state.pendingTransactions.push(action.payload);
      // Add to transaction history as a special emergency exit type
      state.transactionHistory.unshift({
        id: action.payload,
        type: 'emergency-exit',
        amount: state.balance?.available || 0,
        fee: 0, // Will be updated when transaction is confirmed
        status: 'pending',
        timestamp: new Date().toISOString(),
        confirmations: 0,
        address: '', // Will be filled in by the backend
        is_exit_tx: true,
      });
    });
    builder.addCase(executeEmergencyExit.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Broadcast emergency transaction
    builder.addCase(broadcastEmergencyTransaction.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(broadcastEmergencyTransaction.fulfilled, (state, action) => {
      state.loading = false;
      state.pendingTransactions.push(action.payload);
      // Filter out the exit transaction that was broadcast
      state.exitTransactions = state.exitTransactions.filter(tx => tx.id !== action.meta.arg);
      // Add to transaction history
      state.transactionHistory.unshift({
        id: action.payload,
        type: 'emergency-exit',
        amount: 0, // Will be filled in by the backend
        fee: 0, // Will be updated when transaction is confirmed
        status: 'pending',
        timestamp: new Date().toISOString(),
        confirmations: 0,
        address: '', // Will be filled in by the backend
        is_exit_tx: true,
      });
    });
    builder.addCase(broadcastEmergencyTransaction.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export default arkWalletSlice.reducer;
