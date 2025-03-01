// src/utils/bitcoinUtils.ts

/**
 * Format a Bitcoin amount in satoshis to a human-readable string
 * @param sats Amount in satoshis
 * @param includeBTC Whether to show BTC for large amounts
 * @returns Formatted string
 */
export const formatSats = (sats: number, includeBTC: boolean = true): string => {
  if (includeBTC && sats >= 100000000) {
    return `${(sats / 100000000).toFixed(8)} BTC`;
  } else {
    return `${sats.toLocaleString()} sats`;
  }
};

/**
 * Return a placeholder value for the current Bitcoin block height
 * In a real implementation, this would fetch from an API or blockchain source
 */
export const getBestBlockHeight = (): number => {
  // Placeholder for current block height, would be fetched from API in production
  return 800500;
};

/**
 * Format a timestamp string to a human-readable date format
 * @param timestamp ISO timestamp string
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: string, includeTime: boolean = true): string => {
  const date = new Date(timestamp);
  if (includeTime) {
    return date.toLocaleString();
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Return a CSS color based on contract type
 * @param type Contract type ('CALL' or 'PUT')
 * @returns Color string
 */
export const getContractTypeColor = (type: string): string => {
  return type === 'CALL' ? 'teal' : 'purple';
};

/**
 * Return a CSS color based on contract status
 * @param status Contract status
 * @returns Color string
 */
export const getContractStatusColor = (status: string): string => {
  switch (status) {
    case 'CREATED':
      return 'yellow';
    case 'ACTIVE':
      return 'green';
    case 'SETTLED':
      return 'blue';
    case 'EXPIRED':
      return 'orange';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
};

/**
 * Calculate time remaining until a target date
 * @param targetDate Target date as ISO string
 * @returns Formatted time remaining string
 */
export const getTimeRemaining = (targetDate: string): string => {
  const target = new Date(targetDate).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

// src/utils/validationUtils.ts

/**
 * Validate a Bitcoin public key
 * @param pubKey Public key in hex format
 * @returns Whether the key is valid
 */
export const isValidPublicKey = (pubKey: string): boolean => {
  // Simple validation - in reality, would check more thoroughly
  const hexRegex = /^[0-9a-fA-F]{64,66}$/;
  return hexRegex.test(pubKey);
};

/**
 * Validate Bitcoin transaction hex
 * @param txHex Transaction hex string
 * @returns Whether the transaction is valid
 */
export const isValidTransactionHex = (txHex: string): boolean => {
  // Simple validation - in reality, would check more thoroughly
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(txHex) && txHex.length > 20;
};

/**
 * Validate a Bitcoin block height
 * @param height Block height
 * @returns Whether the height is valid
 */
export const isValidBlockHeight = (height: number): boolean => {
  return Number.isInteger(height) && height >= 0;
};

/**
 * Validate a hash rate value
 * @param hashRate Hash rate in EH/s
 * @returns Whether the hash rate is valid
 */
export const isValidHashRate = (hashRate: number): boolean => {
  return !isNaN(hashRate) && hashRate > 0;
};

// src/utils/webSocketUtils.ts

/**
 * Create a WebSocket connection for live data updates
 * @param endpoint WebSocket endpoint
 * @param onMessage Message handler function
 * @returns WebSocket instance and cleanup function
 */
export const createWebSocketConnection = (
  endpoint: string,
  onMessage: (data: any) => void
): { socket: WebSocket; cleanup: () => void } => {
  const socket = new WebSocket(endpoint);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  const cleanup = () => {
    if (socket.readyState === 1) {
      socket.close();
    }
  };

  return { socket, cleanup };
};

/**
 * Subscribe to specific WebSocket channels
 * @param socket WebSocket instance
 * @param channels Array of channel names
 */
export const subscribeToChannels = (socket: WebSocket, channels: string[]): void => {
  if (socket.readyState === 1) {
    const message = {
      type: 'subscribe',
      channels,
    };
    socket.send(JSON.stringify(message));
  }
};

// src/utils/mockData.ts

import { Contract, ContractStatus, ContractType, Order, OrderSide, OrderStatus, Trade } from '../types';

// Generate a random UUID
export const mockUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Generate mock contracts
export const generateMockContracts = (count: number = 10): Contract[] => {
  const contracts: Contract[] = [];
  const statuses = Object.values(ContractStatus);
  const types = Object.values(ContractType);
  
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14); // 14 days from now
    
    const expiryDate = new Date(targetDate);
    expiryDate.setDate(expiryDate.getDate() + 1); // 1 day after target
    
    contracts.push({
      id: mockUUID(),
      contract_type: types[Math.floor(Math.random() * types.length)],
      strike_hash_rate: 300 + Math.random() * 100, // 300-400 EH/s
      start_block_height: 800000 + Math.floor(Math.random() * 1000),
      end_block_height: 802016 + Math.floor(Math.random() * 1000),
      target_timestamp: targetDate.toISOString(),
      contract_size: Math.floor(10000 + Math.random() * 990000), // 10k-1M sats
      premium: Math.floor(1000 + Math.random() * 9000), // 1k-10k sats
      buyer_pub_key: 'ab' + '0'.repeat(62), // Mock public key
      seller_pub_key: 'cd' + '0'.repeat(62), // Mock public key
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiryDate.toISOString(),
      setup_tx_id: Math.random() > 0.5 ? '1234abcd'.repeat(8) : undefined,
      final_tx_id: Math.random() > 0.7 ? '5678efgh'.repeat(8) : undefined,
      settlement_tx_id: Math.random() > 0.9 ? '90abijkl'.repeat(8) : undefined,
    });
  }
  
  return contracts;
};

// Generate mock orders
export const generateMockOrders = (count: number = 20): Order[] => {
  const orders: Order[] = [];
  const sides = Object.values(OrderSide);
  const statuses = Object.values(OrderStatus);
  const types = Object.values(ContractType);
  
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + Math.floor(Math.random() * 48)); // 0-48 hours
    
    const quantity = 1 + Math.floor(Math.random() * 10); // 1-10
    const remainingQuantity = Math.floor(Math.random() * (quantity + 1)); // 0 to quantity
    
    orders.push({
      id: mockUUID(),
      user_id: mockUUID(),
      side: sides[Math.floor(Math.random() * sides.length)],
      contract_type: types[Math.floor(Math.random() * types.length)],
      strike_hash_rate: 300 + Math.random() * 100, // 300-400 EH/s
      start_block_height: 800000 + Math.floor(Math.random() * 1000),
      end_block_height: 802016 + Math.floor(Math.random() * 1000),
      price: Math.floor(5000 + Math.random() * 95000), // 5k-100k sats
      quantity: quantity,
      remaining_quantity: remainingQuantity,
      status: remainingQuantity === 0 ? OrderStatus.FILLED : 
              remainingQuantity === quantity ? OrderStatus.OPEN : OrderStatus.PARTIAL,
      pub_key: 'ef' + '0'.repeat(62), // Mock public key
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: Math.random() > 0.3 ? expiryDate.toISOString() : undefined,
    });
  }
  
  return orders;
};

// Generate mock trades
export const generateMockTrades = (count: number = 15): Trade[] => {
  const trades: Trade[] = [];
  
  for (let i = 0; i < count; i++) {
    const executedDate = new Date();
    executedDate.setHours(executedDate.getHours() - Math.floor(Math.random() * 72)); // 0-72 hours ago
    
    trades.push({
      id: mockUUID(),
      buy_order_id: mockUUID(),
      sell_order_id: mockUUID(),
      contract_id: mockUUID(),
      price: Math.floor(5000 + Math.random() * 95000), // 5k-100k sats
      quantity: 1 + Math.floor(Math.random() * 5), // 1-5
      executed_at: executedDate.toISOString(),
    });
  }
  
  return trades;
};

// Generate mock hash rate data
export const generateMockHashRateData = (days: number = 30): { timestamp: string; hash_rate: number }[] => {
  const data: { timestamp: string; hash_rate: number }[] = [];
  const now = new Date();
  const baseHashRate = 350; // Base hash rate in EH/s
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Add some randomness to the hash rate with a slight upward trend
    const randomFactor = Math.random() * 20 - 10; // -10 to +10
    const trendFactor = i / days * 20; // 0 to 20 (decreasing as we get closer to now)
    const hashRate = baseHashRate + randomFactor + trendFactor;
    
    data.push({
      timestamp: date.toISOString(),
      hash_rate: Math.max(hashRate, 1), // Ensure hash rate is positive
    });
  }
  
  return data;
};
