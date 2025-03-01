import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HashRateState, HashRateData, HashRateSummary } from '../types';
import { bitcoinService } from '../api';

// Initial state
const initialState: HashRateState = {
  currentHashRate: 0,
  historicalData: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentHashRate = createAsyncThunk(
  'hashRate/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getCurrentHashRate();
      if (!response.success || response.data === undefined) {
        return rejectWithValue(response.error || 'Failed to fetch current hash rate');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate';
      return rejectWithValue(message);
    }
  }
);

export const fetchHashRateSummary = createAsyncThunk(
  'hashRate/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHashRateSummary();
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch hash rate summary');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate summary';
      return rejectWithValue(message);
    }
  }
);

export const fetchHistoricalHashRate = createAsyncThunk(
  'hashRate/fetchHistorical',
  async (days: number = 30, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHistoricalHashRate(days);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch historical hash rate');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching historical hash rate';
      return rejectWithValue(message);
    }
  }
);

export const fetchHashRateAtHeight = createAsyncThunk(
  'hashRate/fetchAtHeight',
  async (height: number, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHashRateAtHeight(height);
      if (!response.success || response.data === undefined) {
        return rejectWithValue(response.error || 'Failed to fetch hash rate at height');
      }
      return { height, hashRate: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate at height';
      return rejectWithValue(message);
    }
  }
);

// Hash rate slice
const hashRateSlice = createSlice({
  name: 'hashRate',
  initialState,
  reducers: {
    clearHashRateError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch current hash rate
    builder.addCase(fetchCurrentHashRate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCurrentHashRate.fulfilled, (state, action) => {
      state.loading = false;
      state.currentHashRate = action.payload;
    });
    builder.addCase(fetchCurrentHashRate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch hash rate summary
    builder.addCase(fetchHashRateSummary.fulfilled, (state, action) => {
      state.currentHashRate = action.payload.current;
    });

    // Fetch historical hash rate
    builder.addCase(fetchHistoricalHashRate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchHistoricalHashRate.fulfilled, (state, action) => {
      state.loading = false;
      state.historicalData = action.payload;
    });
    builder.addCase(fetchHistoricalHashRate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearHashRateError } = hashRateSlice.actions;
export default hashRateSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HashRateState, HashRateData, HashRateSummary } from '../types';
import { bitcoinService } from '../api';

// Initial state
const initialState: HashRateState = {
  currentHashRate: 0,
  historicalData: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchCurrentHashRate = createAsyncThunk(
  'hashRate/fetchCurrent',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getCurrentHashRate();
      if (!response.success || response.data === undefined) {
        return rejectWithValue(response.error || 'Failed to fetch current hash rate');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate';
      return rejectWithValue(message);
    }
  }
);

export const fetchHashRateSummary = createAsyncThunk(
  'hashRate/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHashRateSummary();
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch hash rate summary');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate summary';
      return rejectWithValue(message);
    }
  }
);

export const fetchHistoricalHashRate = createAsyncThunk(
  'hashRate/fetchHistorical',
  async (days: number = 30, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHistoricalHashRate(days);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to fetch historical hash rate');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching historical hash rate';
      return rejectWithValue(message);
    }
  }
);

export const fetchHashRateAtHeight = createAsyncThunk(
  'hashRate/fetchAtHeight',
  async (height: number, { rejectWithValue }) => {
    try {
      const response = await bitcoinService.getHashRateAtHeight(height);
      if (!response.success || response.data === undefined) {
        return rejectWithValue(response.error || 'Failed to fetch hash rate at height');
      }
      return { height, hashRate: response.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while fetching hash rate at height';
      return rejectWithValue(message);
    }
  }
);

// Hash rate slice
const hashRateSlice = createSlice({
  name: 'hashRate',
  initialState,
  reducers: {
    clearHashRateError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch current hash rate
    builder.addCase(fetchCurrentHashRate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchCurrentHashRate.fulfilled, (state, action) => {
      state.loading = false;
      state.currentHashRate = action.payload;
    });
    builder.addCase(fetchCurrentHashRate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Fetch hash rate summary
    builder.addCase(fetchHashRateSummary.fulfilled, (state, action) => {
      state.currentHashRate = action.payload.current;
    });

    // Fetch historical hash rate
    builder.addCase(fetchHistoricalHashRate.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchHistoricalHashRate.fulfilled, (state, action) => {
      state.loading = false;
      state.historicalData = action.payload;
    });
    builder.addCase(fetchHistoricalHashRate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearHashRateError } = hashRateSlice.actions;
export default hashRateSlice.reducer;

