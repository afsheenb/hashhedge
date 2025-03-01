import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bitcoinService } from '../api';
import { HashRateData, HashRateSummary } from '../types';

interface HashRateState {
  currentHashRate: number | null;
  summary: HashRateSummary | null;
  historicalData: HashRateData[];
  loading: boolean;
  error: string | null;
}

const initialState: HashRateState = {
  currentHashRate: null,
  summary: null,
  historicalData: [],
  loading: false,
  error: null,
};

// Fetch current hash rate
export const fetchCurrentHashRate = createAsyncThunk<
  number,
  void,
  { rejectValue: string }
>('hashRate/fetchCurrent', async (_, { rejectWithValue }) => {
  try {
    const response = await bitcoinService.getCurrentHashRate();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch current hash rate');
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
  }
});

// Fetch hash rate summary
export const fetchHashRateSummary = createAsyncThunk<
  HashRateSummary,
  void,
  { rejectValue: string }
>('hashRate/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    const response = await bitcoinService.getHashRateSummary();
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch hash rate summary');
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
  }
});

// Fetch historical hash rate data
export const fetchHistoricalHashRate = createAsyncThunk<
  HashRateData[],
  number, // days parameter
  { rejectValue: string }
>('hashRate/fetchHistorical', async (days, { rejectWithValue }) => {
  try {
    const response = await bitcoinService.getHistoricalHashRate(days);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch historical hash rate');
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
  }
});

// Get hash rate at specific block height
export const getHashRateAtHeight = createAsyncThunk<
  number,
  number, // block height
  { rejectValue: string }
>('hashRate/getAtHeight', async (height, { rejectWithValue }) => {
  try {
    const response = await bitcoinService.getHashRateAtHeight(height);
    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to get hash rate at height');
    }
    return response.data;
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
  }
});

const hashRateSlice = createSlice({
  name: 'hashRate',
  initialState,
  reducers: {
    // Additional synchronous actions if needed
    clearHashRateError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Current hash rate
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
      state.error = action.payload || 'Failed to fetch current hash rate';
    });

    // Hash rate summary
    builder.addCase(fetchHashRateSummary.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchHashRateSummary.fulfilled, (state, action) => {
      state.loading = false;
      state.summary = action.payload;
    });
    builder.addCase(fetchHashRateSummary.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to fetch hash rate summary';
    });

    // Historical hash rate data
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
      state.error = action.payload || 'Failed to fetch historical hash rate';
    });

    // Hash rate at specific height
    builder.addCase(getHashRateAtHeight.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getHashRateAtHeight.fulfilled, (state, action) => {
      state.loading = false;
      // Not storing in state since this is typically used for one-off queries
    });
    builder.addCase(getHashRateAtHeight.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Failed to get hash rate at height';
    });
  },
});

export const { clearHashRateError } = hashRateSlice.actions;
export default hashRateSlice.reducer;
