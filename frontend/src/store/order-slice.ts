// Update the order-slice.ts to handle place order actions
// src/store/order-slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { orderService } from '../api';
import { Order, OrderBook, Trade, OrderSide, PlaceOrderForm } from '../types';

interface OrderState {
  orders: Order[];
  orderBook: OrderBook | null;
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  orderBook: null,
  trades: [],
  loading: false,
  error: null,
};

// Get order book data
export const getOrderBook = createAsyncThunk(
  'orders/getOrderBook',
  async ({ contractType, strikeHashRate }: { contractType: string; strikeHashRate: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getOrderBook(contractType, strikeHashRate);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch order book');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Get recent trades
export const getRecentTrades = createAsyncThunk(
  'orders/getRecentTrades',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await orderService.getRecentTrades(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recent trades');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Get user orders
export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async ({ userId, limit = 50, offset = 0 }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserOrders(userId, limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user orders');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Get user trades
export const fetchUserTrades = createAsyncThunk(
  'orders/fetchUserTrades',
  async ({ userId, limit = 50, offset = 0 }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserTrades(userId, limit, offset);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user trades');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Cancel order
export const cancelOrder = createAsyncThunk(
  'orders/cancelOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await orderService.cancelOrder(orderId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel order');
      }
      return orderId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Place order
export const placeOrder = createAsyncThunk(
  'orders/placeOrder',
  async (orderData: PlaceOrderForm, { rejectWithValue }) => {
    try {
      const response = await orderService.placeOrder(orderData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to place order');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Fetch recent trades (for dashboard and order book)
export const fetchRecentTrades = createAsyncThunk(
  'orders/fetchRecentTrades',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await orderService.getRecentTrades(limit);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch recent trades');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Get order book
    builder
      .addCase(getOrderBook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getOrderBook.fulfilled, (state, action) => {
        state.loading = false;
        state.orderBook = action.payload;
      })
      .addCase(getOrderBook.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Get recent trades
    builder
      .addCase(getRecentTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecentTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload;
      })
      .addCase(getRecentTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch user orders
    builder
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch user trades
    builder
      .addCase(fetchUserTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload;
      })
      .addCase(fetchUserTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Cancel order
    builder
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = state.orders.filter(order => order.id !== action.payload);
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Place order
    builder
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = [action.payload, ...state.orders];
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch recent trades
    builder
      .addCase(fetchRecentTrades.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentTrades.fulfilled, (state, action) => {
        state.loading = false;
        state.trades = action.payload;
      })
      .addCase(fetchRecentTrades.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearOrderError } = orderSlice.actions;

export default orderSlice.reducer;

// Update contract-slice.ts to handle contract swaps
// Partial update to existing contract-slice.ts
/*
// Add this function to the existing contract-slice.ts

// Swap contract participant
export const swapContractParticipant = createAsyncThunk(
  'contracts/swapContractParticipant',
  async ({ contractId, swapData }: { contractId: string; swapData: SwapContractParticipantForm }, { rejectWithValue }) => {
    try {
      const response = await contractService.swapContractParticipant(contractId, swapData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to swap participant');
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
);

// Add the following to the extraReducers section
// Swap contract participant
builder
  .addCase(swapContractParticipant.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(swapContractParticipant.fulfilled, (state, action) => {
    state.loading = false;
    // Add the transaction to the contract's transactions list
    if (state.transactions) {
      state.transactions = [...state.transactions, action.payload];
    }
  })
  .addCase(swapContractParticipant.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload as string;
  });
*/
