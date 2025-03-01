// Contract types
export enum ContractType {
  CALL = 'CALL',
  PUT = 'PUT'
}

export enum ContractStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  SETTLED = 'SETTLED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface Contract {
  id: string;
  contract_type: ContractType;
  strike_hash_rate: number;
  start_block_height: number;
  end_block_height: number;
  target_timestamp: string;
  contract_size: number;
  premium: number;
  buyer_pub_key: string;
  seller_pub_key: string;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  setup_tx_id?: string;
  final_tx_id?: string;
  settlement_tx_id?: string;
}

// Order types
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface Order {
  id: string;
  user_id: string;
  side: OrderSide;
  contract_type: ContractType;
  strike_hash_rate: number;
  start_block_height: number;
  end_block_height: number;
  price: number;
  quantity: number;
  remaining_quantity: number;
  status: OrderStatus;
  pub_key: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

// Trade types
export interface Trade {
  id: string;
  buy_order_id: string;
  sell_order_id: string;
  contract_id: string;
  price: number;
  quantity: number;
  executed_at: string;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserKey {
  id: string;
  user_id: string;
  pub_key: string;
  key_type: string;
  label: string;
  created_at: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Order book types
export interface OrderBook {
  buys: Order[];
  sells: Order[];
}

// Bitcoin types
export interface Block {
  hash: string;
  height: number;
  time: string;
  difficulty: number;
  previous_block_hash: string;
}

// Hash rate data
export interface HashRateData {
  timestamp: string;
  hash_rate: number;
}

// Contract transaction types
export interface ContractTransaction {
  id: string;
  contract_id: string;
  transaction_id: string;
  tx_type: 'setup' | 'final' | 'settlement' | 'swap';
  tx_hex: string;
  confirmed: boolean;
  created_at: string;
  confirmed_at?: string;
}

// Form types
export interface CreateContractForm {
  contract_type: ContractType;
  strike_hash_rate: number;
  start_block_height: number;
  end_block_height: number;
  target_timestamp: string;
  contract_size: number;
  premium: number;
  buyer_pub_key: string;
  seller_pub_key: string;
}

export interface PlaceOrderForm {
  side: OrderSide;
  contract_type: ContractType;
  strike_hash_rate: number;
  start_block_height: number;
  end_block_height: number;
  price: number;
  quantity: number;
  pub_key: string;
  expires_in?: number;
}

export interface SetupContractForm {
  buyer_inputs: string[];
  seller_inputs: string[];
}

export interface SwapContractParticipantForm {
  old_pub_key: string;
  new_pub_key: string;
  new_participant_input: string;
}

export interface AuthForm {
  username: string;
  password: string;
}

export interface RegisterForm extends AuthForm {
  email: string;
  confirm_password: string;
}

export interface AddKeyForm {
  pub_key: string;
  key_type: string;
  label: string;
}

// Dashboard and stats types
export interface HashRateSummary {
  current: number;
  daily_change: number;
  weekly_change: number;
  monthly_change: number;
}

export interface UserStats {
  active_contracts: number;
  open_orders: number;
  completed_trades: number;
  profit_loss: number;
}

// Redux state types
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  userKeys: UserKey[];
  loading: boolean;
  error: string | null;
}

export interface ContractState {
  contracts: Contract[];
  selectedContract: Contract | null;
  transactions: ContractTransaction[];
  loading: boolean;
  error: string | null;
}

export interface OrderState {
  orders: Order[];
  orderBook: OrderBook | null;
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

export interface HashRateState {
  currentHashRate: number;
  historicalData: HashRateData[];
  loading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  contracts: ContractState;
  orders: OrderState;
  hashRate: HashRateState;
}
