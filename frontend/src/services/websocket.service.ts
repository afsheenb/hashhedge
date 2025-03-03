// src/services/websocket.service.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TradeEvent } from '../types';

// WebSocket service configuration
const WS_URL = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080/ws';

interface WebSocketState {
  isConnected: boolean;
  trades: TradeEvent[];
  error: string | null;
}

const initialState: WebSocketState = {
  isConnected: false,
  trades: [],
  error: null,
};

// WebSocket connection management
export const connectWebSocket = createAsyncThunk(
  'websocket/connect',
  async (_, { dispatch }) => {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        dispatch(webSocketSlice.actions.setConnected(true));
        
        // Subscribe to default channels
        socket.send(JSON.stringify({
          type: 'subscribe',
          channels: ['trades', 'contracts']
        }));

        resolve();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'trade':
              dispatch(webSocketSlice.actions.addTrade(data.payload));
              break;
            // Add more event type handlers as needed
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      socket.onerror = (error) => {
        dispatch(webSocketSlice.actions.setError(error.toString()));
        reject(error);
      };

      socket.onclose = () => {
        dispatch(webSocketSlice.actions.setConnected(false));
      };

      // Store socket for potential manual reconnection or disconnection
      (window as any).webSocket = socket;
    });
  }
);

// Manually disconnect WebSocket
export const disconnectWebSocket = createAsyncThunk(
  'websocket/disconnect',
  async (_, { dispatch }) => {
    const socket = (window as any).webSocket;
    if (socket) {
      socket.close();
      dispatch(webSocketSlice.actions.setConnected(false));
    }
  }
);

// Subscribe to specific channels
export const subscribeToChannels = createAsyncThunk(
  'websocket/subscribe',
  async (channels: string[], { dispatch }) => {
    const socket = (window as any).webSocket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'subscribe',
        channels
      }));
    } else {
      throw new Error('WebSocket not connected');
    }
  }
);

// WebSocket slice
const webSocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    addTrade: (state, action: PayloadAction<TradeEvent>) => {
      state.trades.unshift(action.payload);
      
      // Keep only the last 50 trades
      if (state.trades.length > 50) {
        state.trades = state.trades.slice(0, 50);
      }
    },
    clearTrades: (state) => {
      state.trades = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectWebSocket.rejected, (state, action) => {
        state.isConnected = false;
        state.error = action.error.message || 'Connection failed';
      });
  }
});

export const { 
  setConnected, 
  setError, 
  addTrade, 
  clearTrades 
} = webSocketSlice.actions;

export default webSocketSlice.reducer;
