import { apiRequest } from './client';
import {
  ApiResponse,
  Contract,
  ContractTransaction,
  CreateContractForm,
  SetupContractForm,
  SwapContractParticipantForm,
} from '../types';

export const contractService = {
  // Get a specific contract by ID
  getContract: (id: string): Promise<ApiResponse<Contract>> => {
    return apiRequest<Contract>({
      method: 'GET',
      url: `/contracts/${id}`,
    });
  },

  // List all active contracts
  listActiveContracts: (limit: number = 50, offset: number = 0): Promise<ApiResponse<Contract[]>> => {
    return apiRequest<Contract[]>({
      method: 'GET',
      url: '/contracts',
      params: { limit, offset },
    });
  },

  // Create a new contract
  createContract: (contractData: CreateContractForm): Promise<ApiResponse<Contract>> => {
    return apiRequest<Contract>({
      method: 'POST',
      url: '/contracts',
      data: contractData,
    });
  },

  // Cancel a contract
  cancelContract: (id: string): Promise<ApiResponse<string>> => {
    return apiRequest<string>({
      method: 'POST',
      url: `/contracts/${id}/cancel`,
    });
  },

  // Generate setup transaction for a contract
  setupContract: (id: string, data: SetupContractForm): Promise<ApiResponse<ContractTransaction>> => {
    return apiRequest<ContractTransaction>({
      method: 'POST',
      url: `/contracts/${id}/setup`,
      data,
    });
  },

  // Generate final transaction for a contract
  generateFinalTx: (id: string): Promise<ApiResponse<ContractTransaction>> => {
    return apiRequest<ContractTransaction>({
      method: 'POST',
      url: `/contracts/${id}/final`,
    });
  },

  // Settle a contract
  settleContract: (id: string): Promise<ApiResponse<{ transaction: ContractTransaction; buyer_wins: boolean }>> => {
    return apiRequest<{ transaction: ContractTransaction; buyer_wins: boolean }>({
      method: 'POST',
      url: `/contracts/${id}/settle`,
    });
  },

  // Broadcast a transaction
  broadcastTx: (contractId: string, txId: string): Promise<ApiResponse<{ broadcast_tx_id: string }>> => {
    return apiRequest<{ broadcast_tx_id: string }>({
      method: 'POST',
      url: `/contracts/${contractId}/broadcast`,
      data: { tx_id: txId },
    });
  },

  // Swap contract participant
  swapContractParticipant: (id: string, data: SwapContractParticipantForm): Promise<ApiResponse<ContractTransaction>> => {
    return apiRequest<ContractTransaction>({
      method: 'POST',
      url: `/contracts/${id}/swap`,
      data,
    });
  },

  // Check settlement conditions
  checkSettlementConditions: (id: string): Promise<ApiResponse<{ can_settle: boolean; reason: string }>> => {
    return apiRequest<{ can_settle: boolean; reason: string }>({
      method: 'GET',
      url: `/contracts/${id}/settlement-conditions`,
    });
  },

  // Get contract transactions
  getContractTransactions: (id: string): Promise<ApiResponse<ContractTransaction[]>> => {
    return apiRequest<ContractTransaction[]>({
      method: 'GET',
      url: `/contracts/${id}/transactions`,
    });
  },
};

// src/api/orderService.ts
import { apiRequest } from './client';
import {
  ApiResponse,
  Order,
  OrderBook,
  PlaceOrderForm,
  Trade,
} from '../types';

export const orderService = {
  // Get order book for a specific contract type and strike hash rate
  getOrderBook: (
    contractType: string,
    strikeHashRate: number,
    limit: number = 50
  ): Promise<ApiResponse<OrderBook>> => {
    return apiRequest<OrderBook>({
      method: 'GET',
      url: '/orderbook',
      params: {
        type: contractType,
        strike_hash_rate: strikeHashRate,
        limit,
      },
    });
  },

  // Place a new order
  placeOrder: (orderData: PlaceOrderForm): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>({
      method: 'POST',
      url: '/orders',
      data: orderData,
    });
  },

  // Get a specific order by ID
  getOrder: (id: string): Promise<ApiResponse<Order>> => {
    return apiRequest<Order>({
      method: 'GET',
      url: `/orders/${id}`,
    });
  },

  // Cancel an order
  cancelOrder: (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>({
      method: 'DELETE',
      url: `/orders/${id}`,
    });
  },

  // Get orders for a specific user
  getUserOrders: (userId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<Order[]>> => {
    return apiRequest<Order[]>({
      method: 'GET',
      url: `/orders/user/${userId}`,
      params: { limit, offset },
    });
  },

  // Get recent trades
  getRecentTrades: (limit: number = 20): Promise<ApiResponse<Trade[]>> => {
    return apiRequest<Trade[]>({
      method: 'GET',
      url: '/trades/recent',
      params: { limit },
    });
  },

  // Get trades for a specific user
  getUserTrades: (userId: string, limit: number = 50, offset: number = 0): Promise<ApiResponse<Trade[]>> => {
    return apiRequest<Trade[]>({
      method: 'GET',
      url: `/trades/user/${userId}`,
      params: { limit, offset },
    });
  },

  // Get trades for a specific contract
  getContractTrades: (contractId: string): Promise<ApiResponse<Trade[]>> => {
    return apiRequest<Trade[]>({
      method: 'GET',
      url: `/trades/contract/${contractId}`,
    });
  },
};

// src/api/userService.ts
import { apiRequest } from './client';
import {
  AddKeyForm,
  ApiResponse,
  AuthForm,
  RegisterForm,
  User,
  UserKey,
  UserStats,
} from '../types';

export const userService = {
  // Register a new user
  register: (userData: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<{ user: User; token: string }>({
      method: 'POST',
      url: '/users/register',
      data: userData,
    });
  },

  // Login user
  login: (credentials: AuthForm): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<{ user: User; token: string }>({
      method: 'POST',
      url: '/users/login',
      data: credentials,
    });
  },

  // Get current user profile
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return apiRequest<User>({
      method: 'GET',
      url: '/users/me',
    });
  },

  // Update user profile
  updateProfile: (userData: Partial<User>): Promise<ApiResponse<User>> => {
    return apiRequest<User>({
      method: 'PUT',
      url: '/users/me',
      data: userData,
    });
  },

  // Add a new key for the user
  addKey: (keyData: AddKeyForm): Promise<ApiResponse<UserKey>> => {
    return apiRequest<UserKey>({
      method: 'POST',
      url: '/users/keys',
      data: keyData,
    });
  },

  // Get all keys for the current user
  getUserKeys: (): Promise<ApiResponse<UserKey[]>> => {
    return apiRequest<UserKey[]>({
      method: 'GET',
      url: '/users/keys',
    });
  },

  // Delete a user key
  deleteKey: (keyId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>({
      method: 'DELETE',
      url: `/users/keys/${keyId}`,
    });
  },

  // Get user statistics
  getUserStats: (): Promise<ApiResponse<UserStats>> => {
    return apiRequest<UserStats>({
      method: 'GET',
      url: '/users/stats',
    });
  },
};

// src/api/bitcoinService.ts
import { apiRequest } from './client';
import {
  ApiResponse,
  Block,
  HashRateData,
  HashRateSummary,
} from '../types';

export const bitcoinService = {
  // Get current Bitcoin network hash rate
  getCurrentHashRate: (): Promise<ApiResponse<number>> => {
    return apiRequest<number>({
      method: 'GET',
      url: '/bitcoin/hashrate/current',
    });
  },

  // Get hash rate summary with changes
  getHashRateSummary: (): Promise<ApiResponse<HashRateSummary>> => {
    return apiRequest<HashRateSummary>({
      method: 'GET',
      url: '/bitcoin/hashrate/summary',
    });
  },

  // Get historical hash rate data
  getHistoricalHashRate: (days: number = 30): Promise<ApiResponse<HashRateData[]>> => {
    return apiRequest<HashRateData[]>({
      method: 'GET',
      url: '/bitcoin/hashrate/historical',
      params: { days },
    });
  },

  // Get hash rate at a specific block height
  getHashRateAtHeight: (height: number): Promise<ApiResponse<number>> => {
    return apiRequest<number>({
      method: 'GET',
      url: `/bitcoin/hashrate/height/${height}`,
    });
  },

  // Get current best block
  getBestBlock: (): Promise<ApiResponse<Block>> => {
    return apiRequest<Block>({
      method: 'GET',
      url: '/bitcoin/block/best',
    });
  },

  // Get block by height
  getBlockByHeight: (height: number): Promise<ApiResponse<Block>> => {
    return apiRequest<Block>({
      method: 'GET',
      url: `/bitcoin/block/height/${height}`,
    });
  },
};
