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
  const { currentHashRate, summary, loading: loadingHashRate } = useAppSelector((state) => state.hashRate);
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

  // Simple calculation of profit/loss from trades
  trades.forEach(trade => {
    // For buy orders that were filled, we count potential profit/loss
    // This is a simplified calculation for demo purposes
    if (trade.side === 'BUY') {
      pnl -= trade.price * trade.quantity; // Cost of buying
    } else if (trade.side === 'SELL') {
      pnl += trade.price * trade.quantity; // Revenue from selling
    }
  });

  // Calculate PnL percentage if there were trades
  const pnlPercentage = completedTrades > 0 ? (pnl / (completedTrades * 1000)) * 100 : 0;

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <StatCard
          title="Current Hash Rate"
          value={`${currentHashRate.toFixed(2)} EH/s`}
          helpText="Network hash rate"
          icon={FiBarChart2}
          color="blue"
          change={summary ? summary.change_24h : undefined}
        />
        <StatCard
          title="Active Contracts"
          value={activeContracts}
          helpText="Currently active"
          icon={FiBriefcase}
          color="purple"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          helpText="Open & partial"
          icon={FiTrendingUp}
          color="orange"
        />
        <StatCard
          title="Profit/Loss"
          value={`${Math.abs(pnl).toLocaleString()} sats`}
          helpText={`${completedTrades} trades`}
          icon={FiDollarSign}
          color={pnl >= 0 ? "green" : "red"}
          change={pnlPercentage}
        />
      </SimpleGrid>

      <Box textAlign="right" mb={8}>
        <Button
          leftIcon={<FiEdit />}
          colorScheme="blue"
          onClick={onOpenPlaceOrderModal}
        >
          Place New Order
        </Button>
      </Box>

      {/* Place Order Modal */}
      <PlaceOrderModal 
        isOpen={isPlaceOrderModalOpen} 
        onClose={onClosePlaceOrderModal} 
      />
    </Box>
  );
};

export default DashboardStats;
