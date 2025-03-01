import React, { useEffect } from 'react';
import { Box, Heading, useColorMode } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchRecentTrades } from '../../store/order-slice';
import RecentTradesTable from './RecentTradesTable';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

interface TradeHistoryCardProps {
  limit?: number;
}

const TradeHistoryCard: React.FC<TradeHistoryCardProps> = ({ limit = 10 }) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { trades, loading, error } = useAppSelector((state) => state.orders);

  useEffect(() => {
    dispatch(fetchRecentTrades(limit));
  }, [dispatch, limit]);

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Box px={4} py={3} borderBottomWidth="1px">
        <Heading size="md">Recent Trades</Heading>
      </Box>
      <Box p={4}>
        {loading && trades.length === 0 ? (
          <LoadingSpinner message="Loading trades..." />
        ) : error ? (
          <ErrorDisplay 
            message={error} 
            onRetry={() => dispatch(fetchRecentTrades(limit))} 
          />
        ) : (
          <RecentTradesTable trades={trades} maxHeight="300px" />
        )}
      </Box>
    </Box>
  );
};

export default TradeHistoryCard;
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.start_block_height?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.end_block_height} isRequired>
              <FormLabel>End Block Height</FormLabel>
              <Controller
                control={control}
                name="end_block_height"
                rules={{
                  required: 'End block height is required',
                  validate: (value, { start_block_height }) =>
                    value > start_block_height || 'End block must be greater than start block',
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={(valueString) => field.onChange(parseInt(valueString, 10))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.end_block_height?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading size="sm" mb={3}>Order Details</Heading>
          <Stack spacing={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isInvalid={!!errors.price} isRequired>
              <FormLabel>Price (sats)</FormLabel>
              <Controller
                control={control}
                name="price"
                rules={{
                  required: 'Price is required',
                  min: {
                    value: 1,
                    message: 'Price must be at least 1 sat',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={100}
                    value={field.value}
                    onChange={(valueString) => field.onChange(parseFloat(valueString))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.quantity} isRequired>
              <FormLabel>Quantity</FormLabel>
              <Controller
                control={control}
                name="quantity"
                rules={{
                  required: 'Quantity is required',
                  min: {
                    value: 1,
                    message: 'Quantity must be at least 1',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={(valueString) => field.onChange(parseInt(valueString, 10))}
import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Badge,
  Button,
  Flex,
  HStack,
  IconButton,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { Order, OrderSide } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { cancelOrder } from '../../store/order-slice';

interface OrderTableProps {
  orders: Order[];
  side: OrderSide;
  currentUserOrders?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
  onOrderSelect?: (order: Order) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  side,
  currentUserOrders = false,
  emptyMessage = 'No orders',
  maxHeight,
  onOrderSelect,
}) => {
  const dispatch = useAppDispatch();
  const toast = useToast();

  const handleCancelOrder = async (orderId: string) => {
    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      toast({
        title: 'Order cancelled',
        description: 'Your order has been cancelled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    } else {
      return `${sats.toLocaleString()} sats`;
    }
  };

  // Sort orders appropriately based on side
  const sortedOrders = [...orders].sort((a, b) => 
    side === OrderSide.BUY ? b.price - a.price : a.price - b.price
  );

  return (
    <TableContainer maxHeight={maxHeight} overflowY={maxHeight ? 'auto' : 'visible'}>
      <Table variant="simple" size="sm">
        <Thead position="sticky" top={0} bg={side === OrderSide.BUY ? 'green.50' : 'red.50'} zIndex={1}>
          <Tr>
            <Th>Price (sats)</Th>
            <Th isNumeric>Quantity</Th>
            <Th isNumeric>Total</Th>
            {currentUserOrders && (
              <>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </>
            )}
          </Tr>
        </Thead>
        <Tbody>
          {sortedOrders.length === 0 ? (
            <Tr>
              <Td colSpan={currentUserOrders ? 6 : 3} textAlign="center">
                <Text color="gray.500">{emptyMessage}</Text>
              </Td>
            </Tr>
          ) : (
            sortedOrders.map((order) => (
              <Tr 
                key={order.id} 
                _hover={{ bg: side === OrderSide.BUY ? 'green.50' : 'red.50' }}
                cursor={onOrderSelect ? 'pointer' : 'default'}
                onClick={() => onOrderSelect && onOrderSelect(order)}
              >
                <Td fontWeight="medium" color={side === OrderSide.BUY ? 'green.600' : 'red.600'}>
                  {formatSats(order.price)}
                </Td>
                <Td isNumeric>{order.remaining_quantity}</Td>
                <Td isNumeric>{formatSats(order.price * order.remaining_quantity)}</Td>
                {currentUserOrders && (
                  <>
                    <Td>
                      <Badge colorScheme={order.contract_type === 'CALL' ? 'teal' : 'purple'}>
                        {order.contract_type}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          order.status === 'OPEN'
                            ? 'green'
                            : order.status === 'PARTIAL'
                            ? 'orange'
                            : order.status === 'FILLED'
                            ? 'blue'
                            : 'gray'
                        }
                      >
                        {order.status}
                      </Badge>
                    </Td>
                    <Td>
                      {(order.status === 'OPEN' || order.status === 'PARTIAL') && (
                        <Tooltip label="Cancel order">
                          <IconButton
                            aria-label="Cancel order"
                            icon={<DeleteIcon />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                          />
                        </Tooltip>
                      )}
                    </Td>
                  </>
                )}
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default OrderTable;

