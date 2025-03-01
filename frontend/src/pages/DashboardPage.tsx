// src/pages/DashboardPage.tsx
import React from 'react';
import { Container, SimpleGrid, VStack, Box } from '@chakra-ui/react';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import DashboardStats from '../components/dashboard/DashboardStats';
import ActiveContractsCard from '../components/dashboard/ActiveContractsCard';
import ActiveOrdersCard from '../components/dashboard/ActiveOrdersCard';
import HashRateChart from '../components/hashrate/HashRateChart';
import WalletCard from '../components/dashboard/WalletCard';
import TradeHistoryCard from '../components/orderbook/TradeHistoryCard';

const DashboardPage: React.FC = () => {
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Dashboard"
          description="Monitor contracts, orders, and Bitcoin hash rate"
        />
        
        <DashboardStats />
        
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mt={6}>
          <Box>
            <VStack spacing={6} align="stretch">
              <ActiveContractsCard />
              <TradeHistoryCard limit={5} />
            </VStack>
          </Box>
          
          <Box>
            <VStack spacing={6} align="stretch">
              <WalletCard />
              <ActiveOrdersCard />
            </VStack>
          </Box>
        </SimpleGrid>
        
        <Box mt={6}>
          <HashRateChart height={400} />
        </Box>
      </Container>
    </Layout>
  );
};

export default DashboardPage;
