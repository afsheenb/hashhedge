import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchActiveContracts } from '../store/contract-slice';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import ContractList from '../components/contracts/ContractList';
import CreateContractForm from '../components/contracts/CreateContractForm';
import { Contract, ContractStatus } from '../types';

const ContractsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);
  
  useEffect(() => {
    // Filter contracts based on active tab
    switch(activeTab) {
      case 0: // All contracts
        setFilteredContracts(contracts);
        break;
      case 1: // Active contracts
        setFilteredContracts(contracts.filter(c => 
          c.status === 'ACTIVE' || c.status === 'CREATED'
        ));
        break;
      case 2: // Settled contracts
        setFilteredContracts(contracts.filter(c => 
          c.status === 'SETTLED'
        ));
        break;
      default:
        setFilteredContracts(contracts);
    }
  }, [contracts, activeTab]);
  
  const handleTabChange = (index: number) => {
    setActiveTab(index);
  };
  
  const handleCreateContract = () => {
    onOpen();
  };
  
  const handleContractCreated = () => {
    onClose();
    dispatch(fetchActiveContracts());
    toast({
      title: "Contract created",
      description: "Your new contract has been created successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };
  
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Hash Rate Contracts"
          description="Create and manage your Bitcoin hash rate derivative contracts"
          action={{
            label: "Create Contract",
            onClick: handleCreateContract,
          }}
        />
        
        <Box mt={6}>
          <Tabs isLazy variant="enclosed" onChange={handleTabChange}>
            <TabList>
              <Tab>All Contracts</Tab>
              <Tab>Active</Tab>
              <Tab>Settled</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel px={0}>
                <ContractList
                  contracts={filteredContracts}
                  loading={loading}
                  error={error}
                  onCreateContract={handleCreateContract}
                  emptyStateTitle="No Contracts Found"
                  emptyStateMessage="You don't have any contracts yet. Create a new contract to get started."
                />
              </TabPanel>
              
              <TabPanel px={0}>
                <ContractList
                  contracts={filteredContracts}
                  loading={loading}
                  error={error}
                  onCreateContract={handleCreateContract}
                  emptyStateTitle="No Active Contracts"
                  emptyStateMessage="You don't have any active contracts. Create a new contract to get started."
                />
              </TabPanel>
              
              <TabPanel px={0}>
                <ContractList
                  contracts={filteredContracts}
                  loading={loading}
                  error={error}
                  onCreateContract={handleCreateContract}
                  emptyStateTitle="No Settled Contracts"
                  emptyStateMessage="You don't have any settled contracts yet."
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        
        {/* Create Contract Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Contract</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <CreateContractForm onSuccess={handleContractCreated} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Layout>
  );
};

export default ContractsPage;

// src/pages/ContractDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Grid,
  GridItem,
  Button,
  useDisclosure,
  useToast,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchContract, fetchContractTransactions } from '../store/contract-slice';
import Layout from '../components/layout/Layout';
import ContractDetails from '../components/contracts/ContractDetails';
import ContractTransactionsList from '../components/contracts/ContractTransactionsList';
import ContractFunding from '../components/contracts/ContractFunding';
import ContractSigningModal from '../components/contracts/ContractSigningModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import HashRateChart from '../components/hashrate/HashRateChart';
import PageHeader from '../components/common/PageHeader';

const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const { contract, transactions, loading, error } = useAppSelector((state) => state.contracts);
  
  useEffect(() => {
    if (id) {
      dispatch(fetchContract(id));
      dispatch(fetchContractTransactions(id));
    }
  }, [dispatch, id]);
  
  const handleBackToContracts = () => {
    navigate('/contracts');
  };
  
  const handleOpenSigningModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    onOpen();
  };
  
  const handleSigningSuccess = () => {
    toast({
      title: "Transaction signed",
      description: "The transaction has been signed successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // Refresh contract transactions
    if (id) {
      dispatch(fetchContractTransactions(id));
    }
  };
  
  if (loading && !contract) {
    return <LoadingSpinner message="Loading contract details..." />;
  }
  
  if (error) {
    return <ErrorDisplay message={error} />;
  }
  
  if (!contract) {
    return <ErrorDisplay message="Contract not found" />;
  }
  
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Contract Details"
          action={{
            label: "Back to Contracts",
            onClick: handleBackToContracts,
          }}
        />
        
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} mt={6}>
          <GridItem>
            <Box mb={6}>
              <ContractDetails 
                contract={contract} 
                transactions={transactions}
                showTransactions={false}
              />
            </Box>
            
            <Tabs isLazy variant="enclosed" mt={6}>
              <TabList>
                <Tab>Transactions</Tab>
                <Tab>Hash Rate Chart</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel px={0}>
                  <Box mt={4}>
                    <ContractTransactionsList 
                      transactions={transactions} 
                      onSignTransaction={handleOpenSigningModal}
                    />
                  </Box>
                </TabPanel>
                
                <TabPanel px={0}>
                  <Box mt={4}>
                    <HashRateChart 
                      height={400}
                      referenceValue={contract.strike_hash_rate}
                      referenceLabel={`Strike: ${contract.strike_hash_rate} EH/s`}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
          
          <GridItem>
            <ContractFunding 
              contract={contract}
              onSuccess={() => {
                if (id) {
                  dispatch(fetchContract(id));
                }
              }}
            />
          </GridItem>
        </Grid>
        
        {/* Contract Signing Modal */}
        <ContractSigningModal
          isOpen={isOpen}
          onClose={onClose}
          contract={contract}
          transaction={selectedTransaction}
          onSuccess={handleSigningSuccess}
        />
      </Container>
    </Layout>
  );
};

export default ContractDetailsPage;

// src/pages/WalletPage.tsx
import React, { useEffect } from 'react';
import {
  Container,
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { connectWallet, disconnectWallet, refreshBalance } from '../features/wallet/arkWalletSlice';
import Layout from '../components/layout/Layout';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';

const WalletPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const { isConnected, loading, error, balance, address, userKeys } = useAppSelector(
    (state) => state.arkWallet
  );
  
  useEffect(() => {
    // If there's an error, show it as a toast
    if (error) {
      toast({
        title: "Error",
        description: error,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, toast]);
  
  const handleConnectWallet = async () => {
    await dispatch(connectWallet());
  };
  
  const handleDisconnectWallet = async () => {
    await dispatch(disconnectWallet());
  };
  
  const handleRefreshBalance = async () => {
    if (isConnected) {
      await dispatch(refreshBalance());
    }
  };
  
  // Format satoshis to BTC
  const formatSatsToBTC = (sats: number) => {
    return (sats / 100000000).toFixed(8);
  };
  
  // Format public key for display
  const formatPublicKey = (key: string) => {
    if (key.length <= 16) return key;
    return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
  };
  
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Ark Wallet"
          description="Connect your Ark wallet to fund contracts and place orders"
        />
        
        <Box mt={6}>
          {!isConnected ? (
            <Card p={6}>
              <VStack spacing={6} align="center">
                <Heading size="md">Connect Your Ark Wallet</Heading>
                <Text>
                  You need to connect your Ark wallet to trade hash rate derivatives and manage contracts.
                </Text>
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleConnectWallet}
                  isLoading={loading}
                  loadingText="Connecting"
                >
                  Connect Wallet
                </Button>
              </VStack>
            </Card>
          ) : (
            <VStack spacing={6} align="stretch">
              <Card>
                <CardHeader>
                  <HStack justifyContent="space-between">
                    <Heading size="md">Wallet Overview</Heading>
                    <HStack>
                      <Button
                        size="sm"
                        onClick={handleRefreshBalance}
                        isLoading={loading}
                      >
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={handleDisconnectWallet}
                        isLoading={loading}
                      >
                        Disconnect
                      </Button>
                    </HStack>
                  </HStack>
                </CardHeader>
                <CardBody>
                  {loading && !balance ? (
                    <LoadingSpinner message="Loading wallet data..." />
                  ) : (
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      <Stat>
                        <StatLabel>Total Balance</StatLabel>
                        <StatNumber>{balance ? formatSatsToBTC(balance.total) : '0.00000000'} BTC</StatNumber>
                        <StatHelpText>{balance ? balance.total.toLocaleString() : '0'} sats</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Available Balance</StatLabel>
                        <StatNumber>{balance ? formatSatsToBTC(balance.available) : '0.00000000'} BTC</StatNumber>
                        <StatHelpText>{balance ? balance.available.toLocaleString() : '0'} sats</StatHelpText>
                      </Stat>
                      <Stat>
                        <StatLabel>Pending Balance</StatLabel>
                        <StatNumber>{balance ? formatSatsToBTC(balance.pending) : '0.00000000'} BTC</StatNumber>
                        <StatHelpText>{balance ? balance.pending.toLocaleString() : '0'} sats</StatHelpText>
                      </Stat>
                    </SimpleGrid>
                  )}
                </CardBody>
              </Card>
              
              <Card>
                <CardHeader>
                  <Heading size="md">Wallet Address</Heading>
                </CardHeader>
                <CardBody>
                  <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">
                    {address || 'No address available'}
                  </Text>
                </CardBody>
              </Card>
              
              <Card>
                <CardHeader>
                  <Heading size="md">Your Public Keys</Heading>
                </CardHeader>
                <CardBody>
                  {userKeys && userKeys.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                      {userKeys.map((key, index) => (
                        <Box 
                          key={index} 
                          p={3} 
                          borderWidth="1px" 
                          borderRadius="md" 
                          position="relative"
                        >
                          <Badge 
                            position="absolute" 
                            top={2} 
                            right={2}
                            colorScheme="blue"
                          >
                            Key {index + 1}
                          </Badge>
                          <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">
                            {key}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text>No public keys available</Text>
                  )}
                </CardBody>
              </Card>
              
              <Alert status="info">
                <AlertIcon />
                <Text>
                  Note: This is a simulated wallet interface for demonstration purposes.
                  In a production environment, this would integrate with the actual Ark protocol wallet.
                </Text>
              </Alert>
            </VStack>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default WalletPage;

// Add wallet reducer to the store
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth-slice';
import hashRateReducer from './hash-rate-slice';
import contractReducer from './contract-slice';
import orderReducer from './order-slice';
import arkWalletReducer from '../features/wallet/arkWalletSlice'; // Add this import

const store = configureStore({
  reducer: {
    auth: authReducer,
    hashRate: hashRateReducer,
    contracts: contractReducer,
    orders: orderReducer,
    arkWallet: arkWalletReducer, // Add this reducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
import {
  Box,
  Container,
  HStack,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import ContractList from '../components/contracts/ContractList';
import CreateContractForm from '../components/contracts/CreateContractForm';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchActiveContracts } from '../store/contract-slice';
import { ContractStatus, ContractType } from '../types';

const ContractsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { 
    isOpen: isCreateModalOpen, 
    onOpen: onOpenCreateModal, 
    onClose: onCloseCreateModal 
  } = useDisclosure();

  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);

  // Filter contracts based on criteria
  const filteredContracts = contracts.filter(contract => {
    // Filter by status
    if (statusFilter !== 'all' && contract.status !== statusFilter) {
      return false;
    }
    
    // Filter by type
    if (typeFilter !== 'all' && contract.contract_type !== typeFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !contract.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Hash Rate Contracts"
          description="View and manage your Bitcoin hash rate derivative contracts"
          action={{
            label: "Create Contract",
            onClick: onOpenCreateModal,
          }}
        />

        <Box mb={6}>
          <HStack spacing={4} flexWrap="wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              width={{ base: 'full', md: 'auto' }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="all">All Statuses</option>
              <option value={ContractStatus.CREATED}>Created</option>
              <option value={ContractStatus.ACTIVE}>Active</option>
              <option value={ContractStatus.SETTLED}>Settled</option>
              <option value={ContractStatus.EXPIRED}>Expired</option>
              <option value={ContractStatus.CANCELLED}>Cancelled</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              width={{ base: 'full', md: 'auto' }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="all">All Types</option>
              <option value={ContractType.CALL}>Call</option>
              <option value={ContractType.PUT}>Put</option>
            </Select>
            <InputGroup width={{ base: 'full', md: '300px' }}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by contract ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </HStack>
        </Box>

        <ContractList
          contracts={filteredContracts}
          loading={loading}
          error={error}
          onCreateContract={onOpenCreateModal}
          emptyStateTitle={
            statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
              ? 'No Matching Contracts'
              : 'No Contracts Found'
          }
          emptyStateMessage={
            statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
              ? 'Try adjusting your filters to see more contracts.'
              : 'Create a new contract or place an order to get started.'
          }
        />

        {/* Create Contract Modal */}
        <Modal 
          isOpen={isCreateModalOpen} 
          onClose={onCloseCreateModal}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Contract</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <CreateContractForm />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onCloseCreateModal}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </MainLayout>
  );
};

export default ContractsPage;

