// src/components/orderbook/OrderBookDisplay.tsx
import React, { useMemo, useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Divider,
  useColorMode,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  Heading,
  HStack,
  Badge,
  Button,
  Tooltip,
  Icon,
  Select,
  FormLabel,
  FormControl,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
} from '@chakra-ui/react';
import { InfoIcon, RepeatIcon } from '@chakra-ui/icons';
import { Order, OrderBook, OrderSide } from '../../types';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { getOrderBook } from '../../store/order-slice';

interface OrderBookDisplayProps {
  orderBook: OrderBook;
  contractType: 'CALL' | 'PUT';
  strikeHashRate: number;
  onOrderSelect?: (order: Order, side: OrderSide) => void;
  onRefresh?: () => void;
  currentHashRate?: number;
  depth?: number;
}

const OrderBookDisplay: React.FC<OrderBookDisplayProps> = ({
  orderBook,
  contractType,
  strikeHashRate,
  onOrderSelect,
  onRefresh,
  currentHashRate,
  depth = 10, // Default to showing 10 levels deep
}) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [orderDepth, setOrderDepth] = useState(depth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const buyOrders = orderBook.buys || [];
  const sellOrders = orderBook.sells || [];

  // Calculate total order volumes at each price level
  const aggregatedBuys = useMemo(() => {
    const grouped: Record<number, { total: number; orders: number }> = {};
    
    buyOrders.forEach(order => {
      if (!grouped[order.price]) {
        grouped[order.price] = { total: 0, orders: 0 };
      }
      grouped[order.price].total += order.remaining_quantity;
      grouped[order.price].orders += 1;
    });
    
    // Convert to array and sort by price (descending for buys)
    return Object.entries(grouped)
      .map(([price, data]) => ({
        price: parseInt(price),
        total: data.total,
        orders: data.orders,
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, orderDepth); // Limit depth
  }, [buyOrders, orderDepth]);

  const aggregatedSells = useMemo(() => {
    const grouped: Record<number, { total: number; orders: number }> = {};
    
    sellOrders.forEach(order => {
      if (!grouped[order.price]) {
        grouped[order.price] = { total: 0, orders: 0 };
      }
      grouped[order.price].total += order.remaining_quantity;
      grouped[order.price].orders += 1;
    });
    
    // Convert to array and sort by price (ascending for sells)
    return Object.entries(grouped)
      .map(([price, data]) => ({
        price: parseInt(price),
        total: data.total,
        orders: data.orders,
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, orderDepth); // Limit depth
  }, [sellOrders, orderDepth]);

  // Calculate spread
  const lowestAsk = aggregatedSells[0]?.price;
  const highestBid = aggregatedBuys[0]?.price;
  const spread = lowestAsk && highestBid ? lowestAsk - highestBid : null;
  const spreadPercentage = lowestAsk && highestBid ? ((lowestAsk - highestBid) / lowestAsk) * 100 : null;

  // Find the max volume for visualization
  const maxBuyVolume = Math.max(...aggregatedBuys.map(o => o.total), 0);
  const maxSellVolume = Math.max(...aggregatedSells.map(o => o.total), 0);
  const maxVolume = Math.max(maxBuyVolume, maxSellVolume, 1);

  const formatSats = (sats: number) => {
    return sats >= 100000 
      ? `${(sats / 100000).toFixed(2)}K`
      : sats.toString();
  };
  
  // Handle order book refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        onRefresh();
      } else {
        await dispatch(getOrderBook({
          contractType: contractType.toLowerCase(),
          strikeHashRate,
        })).unwrap();
      }
      toast({
        title: 'Order book refreshed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to refresh order book',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle clicking on an order
  const handleOrderClick = (level: { price: number; total: number; orders: number }, side: OrderSide) => {
    if (!onOrderSelect) return;
    
    // Find the first order at this price level
    const matchingOrders = side === OrderSide.BUY
      ? buyOrders.filter(o => o.price === level.price)
      : sellOrders.filter(o => o.price === level.price);
    
    if (matchingOrders.length > 0) {
      onOrderSelect(matchingOrders[0], side);
    }
  };
  
  // Calculate relation to current hash rate
  const hashRateRelation = currentHashRate && strikeHashRate
    ? ((strikeHashRate - currentHashRate) / currentHashRate) * 100
    : null;

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <HStack>
          <Heading size="md">Order Book</Heading>
          <Badge colorScheme={contractType === 'CALL' ? 'teal' : 'purple'} fontSize="md" px={2} py={0.5}>
            {contractType}
          </Badge>
          <Tooltip 
            label={hashRateRelation !== null 
              ? `${Math.abs(hashRateRelation).toFixed(2)}% ${hashRateRelation >= 0 ? 'above' : 'below'} current hash rate` 
              : 'Target hash rate'
            }
          >
            <Badge colorScheme="blue" fontSize="md" px={2} py={0.5}>
              {strikeHashRate.toFixed(2)} EH/s
            </Badge>
          </Tooltip>
        </HStack>
        
        <HStack>
          {spread !== null && (
            <Stat size="sm">
              <StatLabel fontSize="xs">Spread</StatLabel>
              <StatNumber fontSize="md">{formatSats(spread)} sats</StatNumber>
              <StatHelpText fontSize="xs" mb={0}>({spreadPercentage?.toFixed(2)}%)</StatHelpText>
            </Stat>
          )}
          
          <FormControl w="120px">
            <Select 
              size="sm"
              value={orderDepth}
              onChange={(e) => setOrderDepth(parseInt(e.target.value))}
            >
              <option value={5}>Depth: 5</option>
              <option value={10}>Depth: 10</option>
              <option value={20}>Depth: 20</option>
              <option value={50}>Depth: 50</option>
            </Select>
          </FormControl>
          
          <Button 
            size="sm" 
            leftIcon={<RepeatIcon />} 
            onClick={handleRefresh}
            isLoading={isRefreshing}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      <Flex justifyContent="space-between" mb={6}>
        {/* Sells (Asks) Table */}
        <Box width="48%">
          <Text fontWeight="bold" mb={2} color="red.500">
            Sell Orders (Asks)
          </Text>
          <Table size="sm" variant="simple">
            <Thead bg={colorMode === 'light' ? 'red.50' : 'red.900'}>
              <Tr>
                <Th>Price (sats)</Th>
                <Th isNumeric>Quantity</Th>
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {aggregatedSells.length === 0 ? (
                <Tr>
                  <Td colSpan={3} textAlign="center">No sell orders</Td>
                </Tr>
              ) : (
                aggregatedSells.map((order, index) => (
                  <Tr 
                    key={`sell-${order.price}-${index}`}
                    cursor={onOrderSelect ? 'pointer' : 'default'}
                    _hover={{ bg: colorMode === 'light' ? 'red.50' : 'red.900' }}
                    onClick={() => handleOrderClick(order, OrderSide.SELL)}
                  >
                    <Td color="red.500" fontWeight="medium">
                      {order.price.toLocaleString()}
                    </Td>
                    <Td isNumeric>{order.total}</Td>
                    <Td isNumeric position="relative">
                      {order.orders}
                      <Box
                        position="absolute"
                        right="0"
                        top="0"
                        bottom="0"
                        width={`${(order.total / maxVolume) * 100}%`}
                        bg={colorMode === 'light' ? "red.100" : "red.900"}
                        opacity="0.5"
                        zIndex="-1"
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>

        {/* Buys (Bids) Table */}
        <Box width="48%">
          <Text fontWeight="bold" mb={2} color="green.500">
            Buy Orders (Bids)
          </Text>
          <Table size="sm" variant="simple">
            <Thead bg={colorMode === 'light' ? 'green.50' : 'green.900'}>
              <Tr>
                <Th>Price (sats)</Th>
                <Th isNumeric>Quantity</Th>
                <Th isNumeric>Total</Th>
              </Tr>
            </Thead>
            <Tbody>
              {aggregatedBuys.length === 0 ? (
                <Tr>
                  <Td colSpan={3} textAlign="center">No buy orders</Td>
                </Tr>
              ) : (
                aggregatedBuys.map((order, index) => (
                  <Tr 
                    key={`buy-${order.price}-${index}`}
                    cursor={onOrderSelect ? 'pointer' : 'default'}
                    _hover={{ bg: colorMode === 'light' ? 'green.50' : 'green.900' }}
                    onClick={() => handleOrderClick(order, OrderSide.BUY)}
                  >
                    <Td color="green.500" fontWeight="medium">
                      {order.price.toLocaleString()}
                    </Td>
                    <Td isNumeric>{order.total}</Td>
                    <Td isNumeric position="relative">
                      {order.orders}
                      <Box
                        position="absolute"
                        left="0"
                        top="0"
                        bottom="0"
                        width={`${(order.total / maxVolume) * 100}%`}
                        bg={colorMode === 'light' ? "green.100" : "green.900"}
                        opacity="0.5"
                        zIndex="-1"
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
      </Flex>

      {/* Market Depth Chart */}
      <Box mt={6}>
        <Text fontWeight="bold" mb={2}>
          Market Depth
        </Text>
        <Box
          height="150px"
          position="relative"
          borderWidth="1px"
          borderRadius="md"
          p={2}
          bg={colorMode === 'light' ? 'gray.50' : 'gray.800'}
        >
          {/* Price labels */}
          <Flex 
            position="absolute" 
            top="-25px" 
            left="0" 
            right="0" 
            justifyContent="space-between"
            px={4}
            fontSize="xs"
          >
            <Text>Lower Price</Text>
            <Text fontWeight="bold">Current Price</Text>
            <Text>Higher Price</Text>
          </Flex>
          
          {/* Center line (mid price) */}
          <Box
            position="absolute"
            left="50%"
            top="0"
            bottom="0"
            width="1px"
            bg={colorMode === 'light' ? 'gray.400' : 'gray.500'}
          />
          
          {/* Strike hash rate indicator */}
          {currentHashRate && (
            <Box
              position="absolute"
              left={`${strikeHashRate >= currentHashRate ? 55 : 45}%`}
              top="0"
              bottom="0"
              width="1px"
              borderStyle="dashed"
              borderWidth="1px"
              borderColor={contractType === 'CALL' ? 'teal.400' : 'purple.400'}
            />
          )}

          {/* Buy side depth */}
          {aggregatedBuys.map((order, index) => {
            const position = 50 - ((highestBid - order.price) / (highestBid || 1)) * 25;
            return (
              <Box
                key={`depth-buy-${index}`}
                position="absolute"
                left={`${Math.max(0, Math.min(50, position))}%`}
                bottom="0"
                height={`${(order.total / maxVolume) * 90}%`}
                width="1%"
                bg="green.400"
                opacity="0.7"
              />
            );
          })}

          {/* Sell side depth */}
          {aggregatedSells.map((order, index) => {
            const position = 50 + ((order.price - lowestAsk) / (lowestAsk || 1)) * 25;
            return (
              <Box
                key={`depth-sell-${index}`}
                position="absolute"
                left={`${Math.max(50, Math.min(100, position))}%`}
                bottom="0"
                height={`${(order.total / maxVolume) * 90}%`}
                width="1%"
                bg="red.400"
                opacity="0.7"
              />
            );
          })}
        </Box>
      </Box>

      <Box mt={6}>
        <Text fontWeight="bold" mb={2}>
          Order Book Summary
        </Text>
        <Flex 
          justifyContent="space-between" 
          wrap="wrap" 
          bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
          p={3}
          borderRadius="md"
        >
          <VStack align="start" spacing={1} minW="120px" mb={2}>
            <Text fontSize="sm" color="gray.500">Total Buy Orders:</Text>
            <Text fontWeight="bold">{buyOrders.length}</Text>
          </VStack>
          <VStack align="start" spacing={1} minW="120px" mb={2}>
            <Text fontSize="sm" color="gray.500">Total Sell Orders:</Text>
            <Text fontWeight="bold">{sellOrders.length}</Text>
          </VStack>
          <VStack align="start" spacing={1} minW="150px" mb={2}>
            <Text fontSize="sm" color="gray.500">Total Buy Volume:</Text>
            <Text fontWeight="bold">{buyOrders.reduce((sum, order) => sum + order.remaining_quantity, 0).toLocaleString()}</Text>
          </VStack>
          <VStack align="start" spacing={1} minW="150px" mb={2}>
            <Text fontSize="sm" color="gray.500">Total Sell Volume:</Text>
            <Text fontWeight="bold">{sellOrders.reduce((sum, order) => sum + order.remaining_quantity, 0).toLocaleString()}</Text>
          </VStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default OrderBookDisplay;
