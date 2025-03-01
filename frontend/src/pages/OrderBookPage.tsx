import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import OrderBookDisplay from '../components/orderbook/OrderBookDisplay';
import TradeHistoryCard from '../components/orderbook/TradeHistoryCard';
import HashRateStatsCard from '../components/hashrate/HashRateStatsCard';
import { ContractType } from '../types';

const OrderBookPage: React.FC = () => {
  const [selectedContractType, setSelectedContractType] = useState<ContractType>(ContractType.CALL);
  const [selectedStrikeHashRate, setSelectedStrikeHashRate] = useState<number>(350);

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Order Book"
          description="View and place orders for Bitcoin hash rate derivatives"
        />

        <Grid
          templateColumns={{ base: '1fr', lg: '1fr 320px' }}
          gap={6}
        >
          <GridItem>
            <OrderBookDisplay
              contractType={selectedContractType}
              strikeHashRate={selectedStrikeHashRate}
            />
          </GridItem>
          <GridItem>
            <VStack spacing={6}>
              <HashRateStatsCard />
              <TradeHistoryCard limit={10} />
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default OrderBookPage;

