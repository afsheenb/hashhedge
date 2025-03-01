import React, { useMemo } from 'react';
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
} from '@chakra-ui/react';
import { Order, OrderBook } from '../../types';

interface OrderBookDisplayProps {
  orderBook: OrderBook;
  contractType: 'CALL' | 'PUT';
  strikeHashRate: number;
}

const OrderBookDisplay: React.FC<OrderBookDisplayProps> = ({
  orderBook,
  contractType,
  strikeHashRate,
}) => {
  const { colorMode } = useColorMode();
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
      .sort((a, b) => b.price - a.price);
  }, [buyOrders]);

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
      .sort((a, b) => a.price - b.price);
  }, [sellOrders]);

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

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <HStack>
          <Heading size="md">Order Book</Heading>
          <Badge colorScheme={contractType === 'CALL' ? 'teal' : 'purple'}>
            {contractType}
          </Badge>
          <Text>
            {strikeHashRate.toFixed(2)} EH/s
          </Text>
        </HStack>
        
        {spread !== null && (
          <HStack>
            <Text fontWeight="medium">Spread:</Text>
            <Text>{formatSats(spread)} sats ({spreadPercentage?.toFixed(2)}%)</Text>
          </HStack>
        )}
      </Flex>

      <Flex justifyContent="space-between">
        {/* Sells (Asks) Table */}
        <Box width="48%">
          <Text fontWeight="bold" mb={2} color="red.500">
            Sell Orders
          </Text>
          <Table size="sm" variant="simple">
            <Thead>
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
                  <Tr key={`sell-${order.price}-${index}`}>
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
                        bg="red.100"
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
            Buy Orders
          </Text>
          <Table size="sm" variant="simple">
            <Thead>
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
                  <Tr key={`buy-${order.price}-${index}`}>
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
                        bg="green.100"
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

      {/* Market Depth */}
      <Box mt={6}>
        <Text fontWeight="bold" mb={2}>
          Market Depth
        </Text>
        <Box
          height="100px"
          position="relative"
          borderWidth="1px"
          borderRadius="md"
          p={2}
        >
          {/* Center line (current price) */}
          <Box
            position="absolute"
            left="50%"
            top="0"
            bottom="0"
            width="1px"
            bg={colorMode === 'light' ? 'gray.300' : 'gray.600'}
          />

          {/* Buy side depth */}
          {aggregatedBuys.map((order, index) => {
            const position = 50 - ((highestBid - order.price) / (highestBid || 1)) * 25;
            return (
              <Box
                key={`depth-buy-${index}`}
                position="absolute"
                left={`${Math.max(0, position)}%`}
                bottom="0"
                height={`${(order.total / maxVolume) * 80}%`}
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
                left={`${Math.min(100, position)}%`}
                bottom="0"
                height={`${(order.total / maxVolume) * 80}%`}
                width="1%"
                bg="red.400"
                opacity="0.7"
              />
            );
          })}
        </Box>
        <Flex justifyContent="space-between" mt={1}>
          <Text fontSize="sm">Lower price</Text>
          <Text fontSize="sm">Higher price</Text>
        </Flex>
      </Box>

      <Box mt={6}>
        <Text fontWeight="bold" mb={2}>
          Order Book Summary
        </Text>
        <HStack spacing={8} mt={2}>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Buy Orders:</Text>
            <Text fontWeight="bold">{buyOrders.length}</Text>
          </VStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Sell Orders:</Text>
            <Text fontWeight="bold">{sellOrders.length}</Text>
          </VStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Buy Volume:</Text>
            <Text fontWeight="bold">{buyOrders.reduce((sum, order) => sum + order.remaining_quantity, 0)}</Text>
          </VStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Sell Volume:</Text>
            <Text fontWeight="bold">{sellOrders.reduce((sum, order) => sum + order.remaining_quantity, 0)}</Text>
          </VStack>
        </HStack>
      </Box>
    </Box>
  );
};

export default OrderBookDisplay;
