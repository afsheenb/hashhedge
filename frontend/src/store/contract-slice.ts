import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ContractState, Contract, ContractTransaction, CreateContractForm, SetupContractForm, SwapContractParticipantForm } from '../types';
import { contractService } from '../api';

// Initial state
const initialState: ContractState = {
  contracts: [],
  selectedContract: null,
  transactions: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchActiveContracts = createAsyncThunk(
  'contracts/fetchActive',
  async ({ limit, offset }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await contractService.listActiveContracts(limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contracts');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching contracts';
      return rejectWithValue(message);
    }
  }
);

export const fetchContract = createAsyncThunk(
  'contracts/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.getContract(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching the contract';
      return rejectWithValue(message);
    }
  }
);

export const createContract = createAsyncThunk(
  'contracts/create',
  async (contractData: CreateContractForm, { rejectWithValue }) => {
    try {
      const response = await contractService.createContract(contractData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to create contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while creating the contract';
      return rejectWithValue(message);
    }
  }
);

export const cancelContract = createAsyncThunk(
  'contracts/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.cancelContract(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to cancel contract');
      }
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while cancelling the contract';
      return rejectWithValue(message);
    }
  }
);

export const setupContract = createAsyncThunk(
  'contracts/setup',
  async ({ id, data }: { id: string; data: SetupContractForm }, { rejectWithValue }) => {
    try {
      const response = await contractService.setupContract(id, data);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to setup contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during contract setup';
      return rejectWithValue(message);
    }
  }
);

export const generateFinalTx = createAsyncThunk(
  'contracts/generateFinal',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.generateFinalTx(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to generate final transaction');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while generating final transaction';
      return rejectWithValue(message);
    }
  }
);

export const settleContract = createAsyncThunk(
  'contracts/settle',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.settleContract(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to settle contract');
      }
      return {
        transaction: response.data.transaction,
        contractId: id,
        buyerWins: response.data.buyer_wins
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while settling the contract';
      return rejectWithValue(message);
    }
  }
);

export const broadcastTransaction = createAsyncThunk(
  'contracts/broadcast',
  async ({ contractId, txId }: { contractId: string; txId: string }, { rejectWithValue }) => {
    try {
      const response = await contractService.broadcastTx(contractId, txId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to broadcast transaction');
      }
      return {
        contractId,
        txId,
        broadcastTxId: response.data.broadcast_tx_id
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while broadcasting the transaction';
      return rejectWithValue(message);
    }
  }
);

export const swapContractParticipant = createAsyncThunk(
  'contracts/swap',
  async ({ id, data }: { id: string; data: SwapContractParticipantForm }, { rejectWithValue }) => {
    try {
      const response = await contractService.swapContractParticipant(id, data);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to swap contract participant');
      }
      return {
        contractId: id,
        transaction: response.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during participant swap';
      return rejectWithValue(message);
    }
  }
);

export const fetchContractTransactions = createAsyncThunk(
  'contracts/fetchTransactions',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.getContractTransactions(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract transactions');
      }
      return {
        contractId: id,
        transactions: response.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching transactions';
      return rejectWithValue(message);
    }
  }
);

// Contract slice
const contractSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    setSelectedContract: (state, action: PayloadAction<Contract | null>) => {
      state.selectedContract = action.payload;
    },
    clearContractError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch active contracts
    builder.addCase(fetchActiveContracts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchActiveContracts.fulfilled, (state, action) => {
      state.loading = false;
      state.contracts = action.payload;
    });
    builder.addCase(fetchActiveContracts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch single contract
    builder.addCase(fetchContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchContract.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedContract = action.payload;
      
      // Update in the contracts array if it exists
      const index = state.contracts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.contracts[index] = action.payload;
      } else {
        state.contracts.push(action.payload);
      }
    });
    builder.addCase(fetchContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create contract
    builder.addCase(createContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createContract.fulfilled, (state, action) => {
      state.loading = false;
      state.contracts.push(action.payload);
      state.selectedContract = action.payload;
    });
    builder.addCase(createContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Cancel contract
    builder.addCase(cancelContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelContract.fulfilled, (state, action) => {
      state.loading = false;
      // Update contract status to cancelled
      const contractId = action.payload;
      const contractIndex = state.contracts.findIndex(c => c.id === contractId);
      if (contractIndex !== -1) {
        state.contracts[contractIndex].status = 'CANCELLED';
      }
      if (state.selectedContract && state.selectedContract.id === contractId) {
        state.selectedContract = { ...state.selectedContract, status: 'CANCELLED' };
      }
    });
    builder.addCase(cancelContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Setup contract
    builder.addCase(setupContract.fulfilled, (state, action) => {
      state.transactions.push(action.payload);
      // Update contract with setup transaction ID
      if (state.selectedContract) {
        state.selectedContract = {
          ...state.selectedContract,
          setup_tx_id: action.payload.transaction_id,
          status: 'ACTIVE'
        };
        // Also update in contracts array
        const index = state.contracts.findIndex(c => c.id === state.selectedContract?.id);
        if (index !== -1) {
          state.contracts[index] = state.selectedContract;
        }
      }
    });

    // Generate final transaction
    builder.addCase(generateFinalTx.fulfilled, (state, action) => {
      state.transactions.push(action.payload);
      // Update contract with final transaction ID
      if (state.selectedContract) {
        state.selectedContract = {
          ...state.selectedContract,
          final_tx_id: action.payload.transaction_id
        };
        // Also update in contracts array
        const index = state.contracts.findIndex(c => c.id === state.selectedContract?.id);
        if (index !== -1) {
          state.contracts[index] = state.selectedContract;
        }
      }
    });

    // Settle contract
    builder.addCase(settleContract.fulfilled, (state, action) => {
      state.transactions.push(action.payload.transaction);
      // Update contract status to settled
      const contractId = action.payload.contractId;
      const contractIndex = state.contracts.findIndex(c => c.id === contractId);
      if (contractIndex !== -1) {
        state.contracts[contractIndex].status = 'SETTLED';
        state.contracts[contractIndex].settlement_tx_id = action.payload.transaction.transaction_id;
      }
      if (state.selectedContract && state.selectedContract.id === contractId) {
        state.selectedContract = {
          ...state.selectedContract,
          status: 'SETTLED',
          settlement_tx_id: action.payload.transaction.transaction_id
        };
      }
    });

    // Broadcast transaction
    builder.addCase(broadcastTransaction.fulfilled, (state, action) => {
      // Mark transaction as confirmed
      const txIndex = state.transactions.findIndex(tx => tx.transaction_id === action.payload.txId);
      if (txIndex !== -1) {
        state.transactions[txIndex].confirmed = true;
        state.transactions[txIndex].confirmed_at = new Date().toISOString();
      }
    });

    // Swap contract participant
    builder.addCase(swapContractParticipant.fulfilled, (state, action) => {
      state.transactions.push(action.payload.transaction);
      // We need to fetch the contract again to get updated participant info
      // This will happen in a separate action typically
    });

    // Fetch contract transactions
    builder.addCase(fetchContractTransactions.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchContractTransactions.fulfilled, (state, action) => {
      state.loading = false;
      state.transactions = action.payload.transactions;
    });
    builder.addCase(fetchContractTransactions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setSelectedContract, clearContractError } = contractSlice.actions;
export default contractSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ContractState, Contract, ContractTransaction, CreateContractForm, SetupContractForm, SwapContractParticipantForm } from '../types';
import { contractService } from '../api';

// Initial state
const initialState: ContractState = {
  contracts: [],
  selectedContract: null,
  transactions: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchActiveContracts = createAsyncThunk(
  'contracts/fetchActive',
  async ({ limit, offset }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await contractService.listActiveContracts(limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contracts');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching contracts';
      return rejectWithValue(message);
    }
  }
);

export const fetchContract = createAsyncThunk(
  'contracts/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.getContract(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching the contract';
      return rejectWithValue(message);
    }
  }
);

export const createContract = createAsyncThunk(
  'contracts/create',
  async (contractData: CreateContractForm, { rejectWithValue }) => {
    try {
      const response = await contractService.createContract(contractData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to create contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while creating the contract';
      return rejectWithValue(message);
    }
  }
);

export const cancelContract = createAsyncThunk(
  'contracts/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.cancelContract(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to cancel contract');
      }
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while cancelling the contract';
      return rejectWithValue(message);
    }
  }
);

export const setupContract = createAsyncThunk(
  'contracts/setup',
  async ({ id, data }: { id: string; data: SetupContractForm }, { rejectWithValue }) => {
    try {
      const response = await contractService.setupContract(id, data);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to setup contract');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during contract setup';
      return rejectWithValue(message);
    }
  }
);

export const generateFinalTx = createAsyncThunk(
  'contracts/generateFinal',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.generateFinalTx(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to generate final transaction');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while generating final transaction';
      return rejectWithValue(message);
    }
  }
);

export const settleContract = createAsyncThunk(
  'contracts/settle',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.settleContract(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to settle contract');
      }
      return {
        transaction: response.data.transaction,
        contractId: id,
        buyerWins: response.data.buyer_wins
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while settling the contract';
      return rejectWithValue(message);
    }
  }
);

export const broadcastTransaction = createAsyncThunk(
  'contracts/broadcast',
  async ({ contractId, txId }: { contractId: string; txId: string }, { rejectWithValue }) => {
    try {
      const response = await contractService.broadcastTx(contractId, txId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to broadcast transaction');
      }
      return {
        contractId,
        txId,
        broadcastTxId: response.data.broadcast_tx_id
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while broadcasting the transaction';
      return rejectWithValue(message);
    }
  }
);

export const swapContractParticipant = createAsyncThunk(
  'contracts/swap',
  async ({ id, data }: { id: string; data: SwapContractParticipantForm }, { rejectWithValue }) => {
    try {
      const response = await contractService.swapContractParticipant(id, data);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to swap contract participant');
      }
      return {
        contractId: id,
        transaction: response.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during participant swap';
      return rejectWithValue(message);
    }
  }
);

export const fetchContractTransactions = createAsyncThunk(
  'contracts/fetchTransactions',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await contractService.getContractTransactions(id);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract transactions');
      }
      return {
        contractId: id,
        transactions: response.data
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching transactions';
      return rejectWithValue(message);
    }
  }
);

// Contract slice
const contractSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    setSelectedContract: (state, action: PayloadAction<Contract | null>) => {
      state.selectedContract = action.payload;
    },
    clearContractError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch active contracts
    builder.addCase(fetchActiveContracts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchActiveContracts.fulfilled, (state, action) => {
      state.loading = false;
      state.contracts = action.payload;
    });
    builder.addCase(fetchActiveContracts.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch single contract
    builder.addCase(fetchContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchContract.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedContract = action.payload;
      
      // Update in the contracts array if it exists
      const index = state.contracts.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.contracts[index] = action.payload;
      } else {
        state.contracts.push(action.payload);
      }
    });
    builder.addCase(fetchContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create contract
    builder.addCase(createContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createContract.fulfilled, (state, action) => {
      state.loading = false;
      state.contracts.push(action.payload);
      state.selectedContract = action.payload;
    });
    builder.addCase(createContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Cancel contract
    builder.addCase(cancelContract.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelContract.fulfilled, (state, action) => {
      state.loading = false;
      // Update contract status to cancelled
      const contractId = action.payload;
      const contractIndex = state.contracts.findIndex(c => c.id === contractId);
      if (contractIndex !== -1) {
        state.contracts[contractIndex].status = 'CANCELLED';
      }
      if (state.selectedContract && state.selectedContract.id === contractId) {
        state.selectedContract = { ...state.selectedContract, status: 'CANCELLED' };
      }
    });
    builder.addCase(cancelContract.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Setup contract
    builder.addCase(setupContract.fulfilled, (state, action) => {
      state.transactions.push(action.payload);
      // Update contract with setup transaction ID
      if (state.selectedContract) {
        state.selectedContract = {
          ...state.selectedContract,
          setup_tx_id: action.payload.transaction_id,
          status: 'ACTIVE'
        };
        // Also update in contracts array
        const index = state.contracts.findIndex(c => c.id === state.selectedContract?.id);
        if (index !== -1) {
          state.contracts[index] = state.selectedContract;
        }
      }
    });

    // Generate final transaction
    builder.addCase(generateFinalTx.fulfilled, (state, action) => {
      state.transactions.push(action.payload);
      // Update contract with final transaction ID
      if (state.selectedContract) {
        state.selectedContract = {
          ...state.selectedContract,
          final_tx_id: action.payload.transaction_id
        };
        // Also update in contracts array
        const index = state.contracts.findIndex(c => c.id === state.selectedContract?.id);
        if (index !== -1) {
          state.contracts[index] = state.selectedContract;
        }
      }
    });

    // Settle contract
    builder.addCase(settleContract.fulfilled, (state, action) => {
      state.transactions.push(action.payload.transaction);
      // Update contract status to settled
      const contractId = action.payload.contractId;
      const contractIndex = state.contracts.findIndex(c => c.id === contractId);
      if (contractIndex !== -1) {
        state.contracts[contractIndex].status = 'SETTLED';
        state.contracts[contractIndex].settlement_tx_id = action.payload.transaction.transaction_id;
      }
      if (state.selectedContract && state.selectedContract.id === contractId) {
        state.selectedContract = {
          ...state.selectedContract,
          status: 'SETTLED',
          settlement_tx_id: action.payload.transaction.transaction_id
        };
      }
    });

    // Broadcast transaction
    builder.addCase(broadcastTransaction.fulfilled, (state, action) => {
      // Mark transaction as confirmed
      const txIndex = state.transactions.findIndex(tx => tx.transaction_id === action.payload.txId);
      if (txIndex !== -1) {
        state.transactions[txIndex].confirmed = true;
        state.transactions[txIndex].confirmed_at = new Date().toISOString();
      }
    });

    // Swap contract participant
    builder.addCase(swapContractParticipant.fulfilled, (state, action) => {
      state.transactions.push(action.payload.transaction);
      // We need to fetch the contract again to get updated participant info
      // This will happen in a separate action typically
    });

    // Fetch contract transactions
    builder.addCase(fetchContractTransactions.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchContractTransactions.fulfilled, (state, action) => {
      state.loading = false;
      state.transactions = action.payload.transactions;
    });
    builder.addCase(fetchContractTransactions.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { setSelectedContract, clearContractError } = contractSlice.actions;
export default contractSlice.reducer;

