// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import authReducer from './auth-slice';
import contractReducer from './contract-slice';
import orderReducer from './order-slice';
import hashRateReducer from './hash-rate-slice';
import arkWalletReducer from '../features/wallet/arkWalletSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    contracts: contractReducer,
    orders: orderReducer,
    hashRate: hashRateReducer,
    arkWallet: arkWalletReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types - wallet transactions might contain non-serializable data
        ignoredActions: ['arkWallet/signTransaction/fulfilled'],
        // Ignore these field paths in state and actions
        ignoredPaths: ['arkWallet.transactionData'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
