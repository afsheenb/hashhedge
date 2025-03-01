import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrderState, Order, OrderBook, Trade, PlaceOrderForm } from '../types';
import { orderService } from '../api';

// Initial state
const initialState: OrderState = {
  orders: [],
  orderBook: null,
  trades: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchOrderBook = createAsyncThunk(
  'orders/fetchOrderBook',
  async ({ contractType, strikeHashRate, limit }: { contractType: string; strikeHashRate: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getOrderBook(contractType, strikeHashRate, limit);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch order book');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching the order book';
      return rejectWithValue(message);
    }
  }
);

export const placeOrder = createAsyncThunk(
  'orders/place',
  async (orderData: PlaceOrderForm, { rejectWithValue }) => {
    try {
      const response = await orderService.placeOrder(orderData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to place order');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while placing the order';
      return rejectWithValue(message);
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await orderService.cancelOrder(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to cancel order');
      }
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while cancelling the order';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async ({ userId, limit, offset }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserOrders(userId, limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch user orders');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching user orders';
      return rejectWithValue(message);
    }
  }
);

export const fetchRecentTrades = createAsyncThunk(
  'orders/fetchRecentTrades',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await orderService.getRecentTrades(limit);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch recent trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching recent trades';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserTrades = createAsyncThunk(
  'orders/fetchUserTrades',
  async ({ userId, limit, offset }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserTrades(userId, limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch user trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching user trades';
      return rejectWithValue(message);
    }
  }
);

export const fetchContractTrades = createAsyncThunk(
  'orders/fetchContractTrades',
  async (contractId: string, { rejectWithValue }) => {
    try {
      const response = await orderService.getContractTrades(contractId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching contract trades';
      return rejectWithValue(message);
    }
  }
);

// Order slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch order book
    builder.addCase(fetchOrderBook.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchOrderBook.fulfilled, (state, action) => {
      state.loading = false;
      state.orderBook = action.payload;
    });
    builder.addCase(fetchOrderBook.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Place order
    builder.addCase(placeOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(placeOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.orders.push(action.payload);
      
      // Update order book if it exists and matches the criteria
      if (state.orderBook) {
        const newOrder = action.payload;
        if (newOrder.side === 'BUY') {
          state.orderBook.buys.push(newOrder);
          // Sort in descending order for buys (highest price first)
          state.orderBook.buys.sort((a, b) => b.price - a.price);
        } else {
          state.orderBook.sells.push(newOrder);
          // Sort in ascending order for sells (lowest price first)
          state.orderBook.sells.sort((a, b) => a.price - b.price);
        }
      }
    });
    builder.addCase(placeOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Cancel order
    builder.addCase(cancelOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelOrder.fulfilled, (state, action) => {
      state.loading = false;
      // Update order status to cancelled
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        state.orders[orderIndex].status = 'CANCELLED';
      }
      
      // Remove from order book if present
      if (state.orderBook) {
        state.orderBook.buys = state.orderBook.buys.filter(o => o.id !== orderId);
        state.orderBook.sells = state.orderBook.sells.filter(o => o.id !== orderId);
      }
    });
    builder.addCase(cancelOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch user orders
    builder.addCase(fetchUserOrders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserOrders.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = action.payload;
    });
    builder.addCase(fetchUserOrders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch recent trades
    builder.addCase(fetchRecentTrades.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecentTrades.fulfilled, (state, action) => {
      state.loading = false;
      state.trades = action.payload;
    });
    builder.addCase(fetchRecentTrades.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch user trades
    builder.addCase(fetchUserTrades.fulfilled, (state, action) => {
      state.trades = action.payload;
    });

    // Fetch contract trades
    builder.addCase(fetchContractTrades.fulfilled, (state, action) => {
      state.trades = action.payload;
    });
  },
});

export const { clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OrderState, Order, OrderBook, Trade, PlaceOrderForm } from '../types';
import { orderService } from '../api';

// Initial state
const initialState: OrderState = {
  orders: [],
  orderBook: null,
  trades: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchOrderBook = createAsyncThunk(
  'orders/fetchOrderBook',
  async ({ contractType, strikeHashRate, limit }: { contractType: string; strikeHashRate: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getOrderBook(contractType, strikeHashRate, limit);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch order book');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching the order book';
      return rejectWithValue(message);
    }
  }
);

export const placeOrder = createAsyncThunk(
  'orders/place',
  async (orderData: PlaceOrderForm, { rejectWithValue }) => {
    try {
      const response = await orderService.placeOrder(orderData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to place order');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while placing the order';
      return rejectWithValue(message);
    }
  }
);

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await orderService.cancelOrder(id);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to cancel order');
      }
      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while cancelling the order';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async ({ userId, limit, offset }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserOrders(userId, limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch user orders');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching user orders';
      return rejectWithValue(message);
    }
  }
);

export const fetchRecentTrades = createAsyncThunk(
  'orders/fetchRecentTrades',
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const response = await orderService.getRecentTrades(limit);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch recent trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching recent trades';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserTrades = createAsyncThunk(
  'orders/fetchUserTrades',
  async ({ userId, limit, offset }: { userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
    try {
      const response = await orderService.getUserTrades(userId, limit, offset);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch user trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching user trades';
      return rejectWithValue(message);
    }
  }
);

export const fetchContractTrades = createAsyncThunk(
  'orders/fetchContractTrades',
  async (contractId: string, { rejectWithValue }) => {
    try {
      const response = await orderService.getContractTrades(contractId);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch contract trades');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching contract trades';
      return rejectWithValue(message);
    }
  }
);

// Order slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch order book
    builder.addCase(fetchOrderBook.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchOrderBook.fulfilled, (state, action) => {
      state.loading = false;
      state.orderBook = action.payload;
    });
    builder.addCase(fetchOrderBook.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Place order
    builder.addCase(placeOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(placeOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.orders.push(action.payload);
      
      // Update order book if it exists and matches the criteria
      if (state.orderBook) {
        const newOrder = action.payload;
        if (newOrder.side === 'BUY') {
          state.orderBook.buys.push(newOrder);
          // Sort in descending order for buys (highest price first)
          state.orderBook.buys.sort((a, b) => b.price - a.price);
        } else {
          state.orderBook.sells.push(newOrder);
          // Sort in ascending order for sells (lowest price first)
          state.orderBook.sells.sort((a, b) => a.price - b.price);
        }
      }
    });
    builder.addCase(placeOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Cancel order
    builder.addCase(cancelOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(cancelOrder.fulfilled, (state, action) => {
      state.loading = false;
      // Update order status to cancelled
      const orderId = action.payload;
      const orderIndex = state.orders.findIndex(o => o.id === orderId);
      if (orderIndex !== -1) {
        state.orders[orderIndex].status = 'CANCELLED';
      }
      
      // Remove from order book if present
      if (state.orderBook) {
        state.orderBook.buys = state.orderBook.buys.filter(o => o.id !== orderId);
        state.orderBook.sells = state.orderBook.sells.filter(o => o.id !== orderId);
      }
    });
    builder.addCase(cancelOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch user orders
    builder.addCase(fetchUserOrders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserOrders.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = action.payload;
    });
    builder.addCase(fetchUserOrders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch recent trades
    builder.addCase(fetchRecentTrades.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecentTrades.fulfilled, (state, action) => {
      state.loading = false;
      state.trades = action.payload;
    });
    builder.addCase(fetchRecentTrades.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch user trades
    builder.addCase(fetchUserTrades.fulfilled, (state, action) => {
      state.trades = action.payload;
    });

    // Fetch contract trades
    builder.addCase(fetchContractTrades.fulfilled, (state, action) => {
      state.trades = action.payload;
    });
  },
});

export const { clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;

