// src/pages/WalletPage.tsx
import React from 'react';
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  VStack,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Flex,
  Divider,
  useDisclosure,
} from '@chakra-ui/react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import WalletConnect from '../components/wallet/WalletConnect';
import WalletStatus from '../components/wallet/WalletStatus';
import DepositWithdraw from '../components/wallet/DepositWithdraw';
import { useAppSelector } from '../hooks/redux-hooks';
import Card from '../components/common/Card';

const WalletPage: React.FC = () => {
  const { isConnected } = useAppSelector((state) => state.arkWallet);

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <PageHeader 
            title="Bitcoin Wallet"
            description="Manage your Bitcoin and Ark wallet for hash rate derivatives"
          />
          <WalletConnect />
        </Flex>

        {isConnected ? (
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            <GridItem>
              <Tabs colorScheme="blue" variant="enclosed">
                <TabList>
                  <Tab>Deposit & Withdraw</Tab>
                  <Tab>Transaction History</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <DepositWithdraw />
                  </TabPanel>
                  <TabPanel px={0}>
                    <Card title="Transaction History">
                      <Text color="gray.500">
                        Transaction history will appear here. This functionality would be implemented using the Ark Wallet SDK's transaction methods in a production environment.
                      </Text>
                    </Card>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </GridItem>
            <GridItem>
              <VStack spacing={6}>
                <WalletStatus />
                <Card title="Network Information">
                  <VStack align="stretch" spacing={3}>
                    <Flex justifyContent="space-between">
                      <Text color="gray.500">Network:</Text>
                      <Text fontWeight="medium">Mutinynet (Bitcoin Testnet)</Text>
                    </Flex>
                    <Flex justifyContent="space-between">
                      <Text color="gray.500">Ark Protocol:</Text>
                      <Text fontWeight="medium">Connected</Text>
                    </Flex>
                    <Flex justifyContent="space-between">
                      <Text color="gray.500">Layer 2 Status:</Text>
                      <Text fontWeight="medium">Operational</Text>
                    </Flex>
                    <Divider />
                    <Text fontSize="sm" color="gray.500">
                      The Ark protocol provides layer 2 scaling for Bitcoin, enabling fast and low-cost hash rate derivative transactions.
                    </Text>
                  </VStack>
                </Card>
              </VStack>
            </GridItem>
          </Grid>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            <Card>
              <VStack spacing={4} py={6}>
                <Heading size="md">Connect Your Wallet</Heading>
                <Text textAlign="center">
                  Connect your Ark wallet to deposit funds, trade contracts, and withdraw earnings.
                </Text>
                <WalletConnect />
              </VStack>
            </Card>
            <Card>
              <VStack spacing={4} py={6}>
                <Heading size="md">Layer 2 Technology</Heading>
                <Text textAlign="center">
                  HashHedge uses the Ark protocol, a Bitcoin layer 2 solution for fast and efficient transactions.
                </Text>
                <Button variant="outline" as="a" href="https://ark.network" target="_blank" rel="noopener noreferrer">
                  Learn About Ark
                </Button>
              </VStack>
            </Card>
            <Card>
              <VStack spacing={4} py={6}>
                <Heading size="md">Secure Trading</Heading>
                <Text textAlign="center">
                  Your private keys never leave your device, ensuring maximum security for your bitcoin.
                </Text>
                <Button variant="outline" colorScheme="blue" isDisabled>
                  Security Documentation
                </Button>
              </VStack>
            </Card>
          </SimpleGrid>
        )}

        {/* Educational section about Ark */}
        <Box mt={12} p={6} borderWidth="1px" borderRadius="lg" bg="blue.50">
          <Heading size="md" mb={4}>About the Ark Protocol</Heading>
          <Text mb={4}>
            The Ark protocol is a Bitcoin layer 2 solution that enables fast, low-cost transactions while maintaining the security of the Bitcoin blockchain. It powers HashHedge's hash rate derivatives platform.
          </Text>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
              <Heading size="sm" mb={2}>Virtual Transaction Outputs (VTXOs)</Heading>
              <Text fontSize="sm">
                VTXOs are off-chain claims to bitcoin that can be converted to on-chain UTXOs when needed, allowing efficient trading without constant on-chain transactions.
              </Text>
            </Box>
            <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
              <Heading size="sm" mb={2}>Ark Service Provider (ASP)</Heading>
              <Text fontSize="sm">
                The ASP facilitates off-chain transactions without taking custody of your funds, providing a secure escape path if the service goes offline.
              </Text>
            </Box>
            <Box bg="white" p={4} borderRadius="md" boxShadow="sm">
              <Heading size="sm" mb={2}>Taproot Security</Heading>
              <Text fontSize="sm">
                Ark leverages Bitcoin's Taproot capabilities for sophisticated contract execution, with multiple fallback mechanisms to ensure your funds remain safe.
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default WalletPage;
