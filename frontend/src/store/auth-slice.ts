import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, UserKey, AuthForm, RegisterForm } from '../types';
import { userService } from '../api';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  userKeys: [],
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: AuthForm, { rejectWithValue }) => {
    try {
      const response = await userService.login(credentials);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Login failed');
      }
      // Save token and user to local storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during login';
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterForm, { rejectWithValue }) => {
    try {
      const response = await userService.register(userData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Registration failed');
      }
      // Save token and user to local storage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during registration';
      return rejectWithValue(message);
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      // Try to load user from local storage first
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser) as User;
      }
      
      // If not found, fetch from API
      const response = await userService.getCurrentUser();
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to load user');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while loading user';
      return rejectWithValue(message);
    }
  }
);

export const loadUserKeys = createAsyncThunk(
  'auth/loadUserKeys',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getUserKeys();
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to load user keys');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while loading user keys';
      return rejectWithValue(message);
    }
  }
);

export const addUserKey = createAsyncThunk(
  'auth/addUserKey',
  async (keyData: { pub_key: string; key_type: string; label: string }, { rejectWithValue }) => {
    try {
      const response = await userService.addKey(keyData);
      if (!response.success || !response.data) {
        return rejectWithValue(response.error || 'Failed to add key');
      }
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while adding a key';
      return rejectWithValue(message);
    }
  }
);

export const deleteUserKey = createAsyncThunk(
  'auth/deleteUserKey',
  async (keyId: string, { rejectWithValue }) => {
    try {
      const response = await userService.deleteKey(keyId);
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to delete key');
      }
      return keyId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while deleting a key';
      return rejectWithValue(message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      state.isAuthenticated = false;
      state.user = null;
      state.userKeys = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Load user
    builder.addCase(loadUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadUser.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
    });
    builder.addCase(loadUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Load user keys
    builder.addCase(loadUserKeys.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadUserKeys.fulfilled, (state, action) => {
      state.loading = false;
      state.userKeys = action.payload;
    });
    builder.addCase(loadUserKeys.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Add user key
    builder.addCase(addUserKey.fulfilled, (state, action) => {
      state.userKeys.push(action.payload);
    });

    // Delete user key
    builder.addCase(deleteUserKey.fulfilled, (state, action) => {
      state.userKeys = state.userKeys.filter(key => key.id !== action.payload);
    });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
