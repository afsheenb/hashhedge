import { configureStore } from '@reduxjs/toolkit';
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
        // Ignore these action types
        ignoredActions: [
          'contracts/fetchContract/fulfilled',
          'contracts/fetchActiveContracts/fulfilled',
          'contracts/createContract/fulfilled',
          'arkWallet/initialize/fulfilled',
          'arkWallet/fetchBalance/fulfilled',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: [
          'contracts.contracts',
          'contracts.selectedContract',
          'auth.user',
          'orders.orderBook',
          'arkWallet.balance',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

