// src/pages/WalletPage.tsx
import React from 'react';
import {
  Box,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Link,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';

import WalletConnect from '../components/wallet/WalletConnect';
import WalletStatus from '../components/wallet/WalletStatus';
import DepositWithdraw from '../components/wallet/DepositWithdraw';
import TransactionMonitor from '../components/wallet/TransactionMonitor';
import WalletIntegration from '../components/wallet/WalletIntegration';
import EmergencyExitPanel from '../components/wallet/EmergencyExitPanel';
import SecurityExplainer from '../components/security/SecurityExplainer';

const Wallet: React.FC = () => {
  return (
    <Box p={5}>
      <Heading size="lg" mb={5}>Wallet</Heading>
      
      <Grid templateColumns={{ base: "1fr", lg: "3fr 1fr" }} gap={6}>
        <GridItem>
          <VStack spacing={6} align="stretch">
            {/* Wallet Connection Status */}
            <WalletIntegration />
            
            <WalletConnect />
            
            {/* Main wallet functions */}
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Deposit & Withdraw</Tab>
                <Tab>Transactions</Tab>
                <Tab>Emergency Exit</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel p={0}>
                  <DepositWithdraw />
                </TabPanel>
                <TabPanel p={0}>
                  <TransactionMonitor />
                </TabPanel>
                <TabPanel p={0}>
                  <EmergencyExitPanel />
                </TabPanel>
              </TabPanels>
            </Tabs>
            
            {/* Standalone link to offline tool */}
            <Link as={RouterLink} to="/offline-exit-tool" color="blue.500" display="inline-flex" alignItems="center">
              Open Offline Emergency Exit Tool <ExternalLinkIcon mx="2px" />
            </Link>
          </VStack>
        </GridItem>
        
        <GridItem>
          <VStack spacing={6} align="stretch">
            <WalletStatus />
            <SecurityExplainer />
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Wallet;
