// src/components/dashboard/StatCard.tsx
import React from 'react';
import {
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  helpText?: string;
  change?: number;
  icon?: IconType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helpText,
  change,
  icon,
  color = 'blue',
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Flex alignItems="center" mb={2}>
        {icon && (
          <Icon
            as={icon}
            boxSize={8}
            color={`${color}.500`}
            mr={3}
            bg={`${color}.50`}
            p={1}
            borderRadius="md"
          />
        )}
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium">
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}
          </StatNumber>
          {(helpText || change !== undefined) && (
            <StatHelpText mb={0}>
              {change !== undefined && (
                <>
                  <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(change).toFixed(2)}%
                </>
              )}
              {helpText && (change !== undefined ? ` ${helpText}` : helpText)}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Box>
  );
};

export default StatCard;

// src/components/dashboard/DashboardStats.tsx
import React, { useEffect } from 'react';
import { SimpleGrid, Button, Box, useDisclosure } from '@chakra-ui/react';
import { 
  FiBriefcase, 
  FiTrendingUp, 
  FiDollarSign, 
  FiBarChart2,
  FiEdit 
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchCurrentHashRate, fetchHashRateSummary } from '../../store/hash-rate-slice';
import { fetchUserOrders, fetchUserTrades } from '../../store/order-slice';
import { fetchActiveContracts } from '../../store/contract-slice';
import StatCard from './StatCard';
import PlaceOrderModal from '../orderbook/PlaceOrderModal';

const DashboardStats: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentHashRate, loading: loadingHashRate } = useAppSelector((state) => state.hashRate);
  const { orders, trades } = useAppSelector((state) => state.orders);
  const { contracts } = useAppSelector((state) => state.contracts);
  const { user } = useAppSelector((state) => state.auth);

  const { 
    isOpen: isPlaceOrderModalOpen, 
    onOpen: onOpenPlaceOrderModal, 
    onClose: onClosePlaceOrderModal 
  } = useDisclosure();

  useEffect(() => {
    dispatch(fetchCurrentHashRate());
    dispatch(fetchHashRateSummary());
    
    if (user) {
      dispatch(fetchUserOrders({ userId: user.id }));
      dispatch(fetchUserTrades({ userId: user.id }));
      dispatch(fetchActiveContracts());
    }
  }, [dispatch, user]);

  // Calculate user stats
  const activeOrders = orders.filter(
    order => order.status === 'OPEN' || order.status === 'PARTIAL'
  ).length;
  
  const activeContracts = contracts.filter(
    contract => contract.status === 'ACTIVE'
  ).length;

  // Calculate simple PnL from trades (very simplified)
  let pnl = 0;
  let completedTrades = trades.length;

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <StatCard
          title="Current Hash Rate"
          value={`${currentHashRate.toFixed(2)} EH/s`}
          helpText="Network hash rate"
          icon={FiBarChart2}
          color="blue"
        />
        <StatCard
          title="Active Contracts"
          value={activeContracts}
          helpText="Currently active"
          icon={FiBriefcase}
          color="teal"
        />
        <StatCard
          title="Open Orders"
          value={activeOrders}
          helpText="Waiting to be filled"
          icon={FiEdit}
          color="purple"
        />
        <StatCard
          title="Completed Trades"
          value={completedTrades}
          helpText="Total executed"
          icon={FiTrendingUp}
          color="orange"
        />
      </SimpleGrid>

      <Button
        leftIcon={<FiEdit />}
        colorScheme="blue"
        size="lg"
        onClick={onOpenPlaceOrderModal}
        mb={8}
      >
        Place New Order
      </Button>

      {/* Place Order Modal */}
      <PlaceOrderModal
        isOpen={isPlaceOrderModalOpen}
        onClose={onClosePlaceOrderModal}
      />
    </Box>
  );
};

export default DashboardStats;

// src/components/orderbook/PlaceOrderModal.tsx
import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
} from '@chakra-ui/react';
import PlaceOrderForm from './PlaceOrderForm';

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Place New Order</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <PlaceOrderForm onSuccess={onClose} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PlaceOrderModal;

// src/components/dashboard/ActiveOrdersCard.tsx
import React, { useEffect } from 'react';
import { Box, Heading, Button, useColorMode } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchUserOrders } from '../../store/order-slice';
import OrderTable from '../orderbook/OrderTable';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';
import { OrderSide } from '../../types';

const ActiveOrdersCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { orders, loading, error } = useAppSelector((state) => state.orders);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      dispatch(fetchUserOrders({ userId: user.id }));
    }
  }, [dispatch, user]);

  // Filter active orders
  const activeOrders = orders.filter(
    order => order.status === 'OPEN' || order.status === 'PARTIAL'
  );

  // Separate buy and sell orders
  const buyOrders = activeOrders.filter(order => order.side === OrderSide.BUY);
  const sellOrders = activeOrders.filter(order => order.side === OrderSide.SELL);

  const handleRefresh = () => {
    if (user) {
      dispatch(fetchUserOrders({ userId: user.id }));
    }
  };

  if (loading && orders.length === 0) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  if (activeOrders.length === 0) {
    return (
      <EmptyState
        title="No Active Orders"
        description="You don't have any active orders. Place an order to start trading."
        actionText="Place Order"
        onAction={() => {/* Open place order modal */}}
      />
    );
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Box px={4} py={3} borderBottomWidth="1px">
        <Heading size="md">Your Active Orders</Heading>
      </Box>
      <Box>
        {buyOrders.length > 0 && (
          <Box>
            <Box bg="green.50" px={4} py={2}>
              <Heading size="sm" color="green.700">
                Buy Orders
              </Heading>
            </Box>
            <OrderTable
              orders={buyOrders}
              side={OrderSide.BUY}
              currentUserOrders={true}
              emptyMessage="No active buy orders"
            />
          </Box>
        )}

        {sellOrders.length > 0 && (
          <Box>
            <Box bg="red.50" px={4} py={2}>
              <Heading size="sm" color="red.700">
                Sell Orders
              </Heading>
            </Box>
            <OrderTable
              orders={sellOrders}
              side={OrderSide.SELL}
              currentUserOrders={true}
              emptyMessage="No active sell orders"
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ActiveOrdersCard;

// src/components/dashboard/ActiveContractsCard.tsx
import React, { useEffect } from 'react';
import { Box, Heading, SimpleGrid, Button, Flex, useColorMode } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchActiveContracts } from '../../store/contract-slice';
import ContractCard from '../contracts/ContractCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';

const ActiveContractsCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);

  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);

  // Filter active and created contracts
  const activeContracts = contracts.filter(
    contract => contract.status === 'ACTIVE' || contract.status === 'CREATED'
  );

  const handleRefresh = () => {
    dispatch(fetchActiveContracts());
  };

  if (loading && contracts.length === 0) {
    return <LoadingSpinner message="Loading contracts..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  if (activeContracts.length === 0) {
    return (
      <EmptyState
        title="No Active Contracts"
        description="You don't have any active contracts. Create a contract or place an order to get started."
        actionText="Create Contract"
        onAction={() => {/* Navigate to create contract */}}
      />
    );
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Flex px={4} py={3} borderBottomWidth="1px" justifyContent="space-between" alignItems="center">
        <Heading size="md">Your Active Contracts</Heading>
        <Button size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </Flex>
      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {activeContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default ActiveContractsCard;

// src/components/hashrate/HashRateChart.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Heading,
  Select,
  Flex,
  Button,
  useColorMode,
} from '@chakra-ui/react';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchHistoricalHashRate } from '../../store/hash-rate-slice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import { format, parseISO } from 'date-fns';

const HashRateChart: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { historicalData, loading, error } = useAppSelector((state) => state.hashRate);
  const [timeRange, setTimeRange] = React.useState<number>(30); // Default to 30 days

  useEffect(() => {
    dispatch(fetchHistoricalHashRate(timeRange));
  }, [dispatch, timeRange]);

  const handleRefresh = () => {
    dispatch(fetchHistoricalHashRate(timeRange));
  };

  const handleTimeRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(parseInt(event.target.value, 10));
  };

  if (loading && historicalData.length === 0) {
    return <LoadingSpinner message="Loading hash rate data..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  // Format data for the chart
  const chartData = historicalData.map(item => ({
    date: format(parseISO(item.timestamp), 'MMM dd'),
    hashRate: item.hash_rate,
    timestamp: item.timestamp,
  }));

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Flex px={4} py={3} borderBottomWidth="1px" justifyContent="space-between" alignItems="center">
        <Heading size="md">Bitcoin Network Hash Rate</Heading>
        <Flex alignItems="center">
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            size="sm"
            width="auto"
            mr={2}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </Select>
          <Button size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
        </Flex>
      </Flex>
      <Box p={4} height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="hashRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3182CE" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3182CE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'light' ? '#E2E8F0' : '#2D3748'} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' }}
            />
            <YAxis 
              tick={{ fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' }}
              domain={['auto', 'auto']}
              label={{ 
                value: 'EH/s', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' } 
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: colorMode === 'light' ? 'white' : '#1A202C',
                borderColor: colorMode === 'light' ? '#E2E8F0' : '#2D3748',
                color: colorMode === 'light' ? '#1A202C' : '#E2E8F0'
              }}
              formatter={(value: number) => [`${value.toFixed(2)} EH/s`, 'Hash Rate']}
              labelFormatter={(value) => {
                const dataItem = chartData.find(item => item.date === value);
                return dataItem ? format(parseISO(dataItem.timestamp), 'PPP') : value;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="hashRate"
              stroke="#3182CE"
              fillOpacity={1}
              fill="url(#hashRateGradient)"
              name="Hash Rate (EH/s)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default HashRateChart;

// src/components/hashrate/HashRateStatsCard.tsx
import React, { useEffect } from 'react';
import { SimpleGrid, Box, Heading, useColorMode } from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiTrendingDown,
  FiActivity,
  FiClock
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchHashRateSummary } from '../../store/hash-rate-slice';
import StatCard from '../dashboard/StatCard';
import LoadingSpinner from '../common/LoadingSpinner';

const HashRateStatsCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { currentHashRate, loading } = useAppSelector((state) => state.hashRate);

  useEffect(() => {
    dispatch(fetchHashRateSummary());
  }, [dispatch]);

  if (loading && currentHashRate === 0) {
    return <LoadingSpinner message="Loading hash rate statistics..." />;
  }

  // Placeholder values for demonstration
  const dailyChange = 1.2;
  const weeklyChange = -2.5;
  const monthlyChange = 5.8;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      p={4}
    >
      <Heading size="md" mb={4}>Hash Rate Statistics</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <StatCard
          title="Current Hash Rate"
          value={`${currentHashRate.toFixed(2)} EH/s`}
          icon={FiActivity}
          color="blue"
        />
        <StatCard
          title="24-Hour Change"
          value={`${Math.abs(dailyChange).toFixed(2)}%`}
          change={dailyChange}
          icon={dailyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={dailyChange >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Weekly Change"
          value={`${Math.abs(weeklyChange).toFixed(2)}%`}
          change={weeklyChange}
          icon={weeklyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={weeklyChange >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Monthly Change"
          value={`${Math.abs(monthlyChange).toFixed(2)}%`}
          change={monthlyChange}
          icon={monthlyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={monthlyChange >= 0 ? "green" : "red"}
        />
      </SimpleGrid>
    </Box>
  );
};

export default HashRateStatsCard;

// src/components/hashrate/DifficultyAdjustmentCard.tsx
import React from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Flex,
  Badge,
  useColorMode,
} from '@chakra-ui/react';
import { format, addHours } from 'date-fns';

const DifficultyAdjustmentCard: React.FC = () => {
  const { colorMode } = useColorMode();

  // Placeholder data for demonstration
  const currentBlock = 800500;
  const nextAdjustmentBlock = 802368; // Approximately
  const blocksRemaining = nextAdjustmentBlock - currentBlock;
  const percentComplete = ((2016 - blocksRemaining) / 2016) * 100;
  
  // Estimate adjustment date (assuming 10 min per block)
  const minutesRemaining = blocksRemaining * 10;
  const estimatedDate = addHours(new Date(), minutesRemaining / 60);
  
  // Estimated adjustment percentage (placeholder)
  const estimatedAdjustment = 3.2;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      p={4}
    >
      <Heading size="md" mb={4}>Next Difficulty Adjustment</Heading>
      
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="medium">Progress:</Text>
        <Text>{Math.round(percentComplete)}% complete</Text>
      </Flex>
      
      <Progress 
        value={percentComplete} 
        colorScheme="blue" 
        size="md" 
        mb={4} 
        borderRadius="md"
      />
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Current Block:</Text>
        <Text fontWeight="medium">{currentBlock.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Adjustment Block:</Text>
        <Text fontWeight="medium">{nextAdjustmentBlock.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Blocks Remaining:</Text>
        <Text fontWeight="medium">{blocksRemaining.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Estimated Date:</Text>
        <Text fontWeight="medium">{format(estimatedDate, 'PPP p')}</Text>
      </Flex>
      
      <Flex justify="space-between" align="center" mt={4}>
        <Text color="gray.500">Estimated Adjustment:</Text>
        <Badge 
          colorScheme={estimatedAdjustment >= 0 ? "green" : "red"} 
          fontSize="md"
          px={2}
          py={1}
        >
          {estimatedAdjustment >= 0 ? '+' : ''}{estimatedAdjustment.toFixed(2)}%
        </Badge>
      </Flex>
    </Box>
  );
};

export default DifficultyAdjustmentCard;
import React from 'react';
import {
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  helpText?: string;
  change?: number;
  icon?: IconType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helpText,
  change,
  icon,
  color = 'blue',
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Flex alignItems="center" mb={2}>
        {icon && (
          <Icon
            as={icon}
            boxSize={8}
            color={`${color}.500`}
            mr={3}
            bg={`${color}.50`}
            p={1}
            borderRadius="md"
          />
        )}
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium">
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}
          </StatNumber>
          {(helpText || change !== undefined) && (
            <StatHelpText mb={0}>
              {change !== undefined && (
                <>
                  <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(change).toFixed(2)}%
                </>
              )}
              {helpText && (change !== undefined ? ` ${helpText}` : helpText)}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Box>
  );
};

export default StatCard;

import React from 'react';
import {
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  helpText?: string;
  change?: number;
  icon?: IconType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helpText,
  change,
  icon,
  color = 'blue',
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Flex alignItems="center" mb={2}>
        {icon && (
          <Icon
            as={icon}
            boxSize={8}
            color={`${color}.500`}
            mr={3}
            bg={`${color}.50`}
            p={1}
            borderRadius="md"
          />
        )}
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium">
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}
          </StatNumber>
          {(helpText || change !== undefined) && (
            <StatHelpText mb={0}>
              {change !== undefined && (
                <>
                  <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(change).toFixed(2)}%
                </>
              )}
              {helpText && (change !== undefined ? ` ${helpText}` : helpText)}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Box>
  );
};

export default StatCard;

