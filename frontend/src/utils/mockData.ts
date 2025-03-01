
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
