// src/pages/DashboardPage.tsx (updated)
import React, { useEffect } from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  VStack,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { FiExternalLink } from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import DashboardStats from '../components/dashboard/DashboardStats';
import ActiveContractsCard from '../components/dashboard/ActiveContractsCard';
import ActiveOrdersCard from '../components/dashboard/ActiveOrdersCard';
import TradeHistoryCard from '../components/orderbook/TradeHistoryCard';
import HashRateChart from '../components/hashrate/HashRateChart';
import WalletStatus from '../components/wallet/WalletStatus'; // Added
import WalletConnect from '../components/wallet/WalletConnect'; // Added
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { loadUser } from '../store/auth-slice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Card from '../components/common/Card';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);
  const { isConnected } = useAppSelector((state) => state.arkWallet);

  useEffect(() => {
    if (!user) {
      dispatch(loadUser());
    }
  }, [dispatch, user]);

  if (loading && !user) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <LoadingSpinner message="Loading your dashboard..." />
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <PageHeader 
            title={`Welcome, ${user?.username || 'Trader'}`}
            description="Your HashHedge dashboard overview"
          />
          <WalletConnect />
        </Flex>

        {/* Wallet Status Card */}
        {isConnected ? (
          <Box mb={6}>
            <WalletStatus />
          </Box>
        ) : (
          <Card mb={6}>
            <VStack align="start" spacing={3}>
              <Heading size="md">Connect Your Wallet</Heading>
              <Text>
                Connect your Ark wallet to deposit funds, trade contracts, and withdraw earnings from the HashHedge platform.
              </Text>
              <Button 
                as={RouterLink} 
                to="/wallet" 
                colorScheme="blue" 
                rightIcon={<FiExternalLink />}
              >
                Go to Wallet
              </Button>
            </VStack>
          </Card>
        )}

        <DashboardStats />

        <Tabs mt={8} colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>Active Contracts</Tab>
            <Tab>Open Orders</Tab>
            <Tab>Recent Trades</Tab>
            <Tab>Hash Rate</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <ActiveContractsCard />
            </TabPanel>
            <TabPanel px={0}>
              <ActiveOrdersCard />
            </TabPanel>
            <TabPanel px={0}>
              <TradeHistoryCard limit={15} />
            </TabPanel>
            <TabPanel px={0}>
              <HashRateChart />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </MainLayout>
  );
};

export default DashboardPage;
