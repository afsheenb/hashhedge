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
  Flex,
  Badge,
  Link,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { Trade } from '../../types';

interface RecentTradesTableProps {
  trades: Trade[];
  maxHeight?: string;
}

const RecentTradesTable: React.FC<RecentTradesTableProps> = ({ trades, maxHeight }) => {
  const { colorMode } = useColorMode();

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    } else {
      return `${sats.toLocaleString()} sats`;
    }
  };

  if (trades.length === 0) {
    return (
      <Flex justify="center" align="center" height="100px">
        <Text color="gray.500">No recent trades</Text>
      </Flex>
    );
  }

  // Sort trades by execution time, newest first
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
  );

  return (
    <TableContainer maxHeight={maxHeight} overflowY={maxHeight ? 'auto' : undefined}>
      <Table variant="simple" size="sm">
        <Thead
          position="sticky"
          top={0}
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          zIndex={1}
        >
          <Tr>
            <Th>Time</Th>
            <Th>Contract</Th>
            <Th isNumeric>Price</Th>
            <Th isNumeric>Quantity</Th>
            <Th isNumeric>Total</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedTrades.map((trade) => (
            <Tr 
              key={trade.id}
              _hover={{ bg: colorMode === 'light' ? 'gray.50' : 'gray.700' }}
            >
              <Td whiteSpace="nowrap">
                {format(new Date(trade.executed_at), 'MMM d, HH:mm:ss')}
              </Td>
              <Td>
                <Link 
                  as={RouterLink} 
                  to={`/contracts/${trade.contract_id}`}
                  color="blue.500"
                  fontWeight="medium"
                >
                  View Contract
                </Link>
              </Td>
              <Td isNumeric>{formatSats(trade.price)}</Td>
              <Td isNumeric>{trade.quantity}</Td>
              <Td isNumeric>{formatSats(trade.price * trade.quantity)}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default RecentTradesTable;

