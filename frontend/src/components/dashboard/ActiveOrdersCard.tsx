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

