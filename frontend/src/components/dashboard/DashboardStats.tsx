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
  
