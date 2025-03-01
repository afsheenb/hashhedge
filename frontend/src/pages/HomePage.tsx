// src/pages/HomePage.tsx
import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
  SimpleGrid,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiLock, FiTrendingUp, FiZap, FiActivity } from 'react-icons/fi';
import { useAppSelector } from '../hooks/redux-hooks';
import MainLayout from '../components/layout/MainLayout';

const HomePage: React.FC = () => {
  const { colorMode } = useColorMode();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const features = [
    {
      icon: FiTrendingUp,
      title: 'Hash Rate Derivatives',
      description: 'Speculate on Bitcoin network hash rate changes with binary options',
    },
    {
      icon: FiLock,
      title: 'Layer 2 Security',
      description: 'Transactions secured by Bitcoin\'s layer 2 Ark protocol',
    },
    {
      icon: FiZap,
      title: 'Fast Settlement',
      description: 'Quick and efficient off-chain transactions with on-chain security',
    },
    {
      icon: FiActivity,
      title: 'Real-time Market Data',
      description: 'Stay updated with current hash rate and market trends',
    },
  ];

  return (
    <MainLayout>
      <Box pt={{ base: 10, md: 20 }} pb={{ base: 10, md: 24 }}>
        {/* Hero Section */}
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align="center"
            justify="space-between"
            gap={{ base: 10, md: 0 }}
          >
            <Stack spacing={6} maxW={{ base: 'full', md: '50%' }}>
              <Heading
                as="h1"
                size="2xl"
                fontWeight="bold"
                lineHeight="1.2"
                color={colorMode === 'light' ? 'blue.600' : 'blue.300'}
              >
                Bitcoin Hash Rate Derivatives on Layer 2
              </Heading>
              <Text fontSize="xl" color="gray.500">
                HashHedge enables miners and investors to hedge against hash rate volatility with 
                secure, on-chain settlement and efficient off-chain execution.
              </Text>
              <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                <Button
                  as={RouterLink}
                  to={isAuthenticated ? '/dashboard' : '/register'}
                  size="lg"
                  colorScheme="blue"
                  px={8}
                >
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                </Button>
                <Button
                  as={RouterLink}
                  to="/orderbook"
                  size="lg"
                  variant="outline"
                  colorScheme="blue"
                  px={8}
                >
                  View Order Book
                </Button>
              </Stack>
            </Stack>
            <Box
              width={{ base: 'full', md: '45%' }}
              height={{ base: '300px', md: '400px' }}
              position="relative"
              overflow="hidden"
              borderRadius="xl"
              boxShadow="xl"
              bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
            >
              {/* Placeholder for hero image */}
              <Flex
                position="absolute"
                inset="0"
                justifyContent="center"
                alignItems="center"
              >
                <Text fontSize="xl" fontWeight="bold" color="gray.500">
                  Hash Rate Chart Visualization
                </Text>
              </Flex>
            </Box>
          </Flex>
        </Container>

        {/* Features Section */}
        <Container maxW="container.xl" mt={{ base: 16, md: 24 }}>
          <Stack spacing={4} as={Box} textAlign="center" mb={10}>
            <Heading as="h2" size="xl">
              Key Features
            </Heading>
            <Text color="gray.500" maxW="2xl" mx="auto">
              HashHedge provides a suite of tools for managing Bitcoin hash rate risk
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={10}>
            {features.map((feature, index) => (
              <Box
                key={index}
                p={6}
                borderRadius="lg"
                boxShadow="md"
                bg={colorMode === 'light' ? 'white' : 'gray.800'}
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
              >
                <Flex
                  w={14}
                  h={14}
                  align="center"
                  justify="center"
                  color="white"
                  rounded="full"
                  bg="blue.500"
                  mb={4}
                >
                  <Icon as={feature.icon} fontSize="2xl" />
                </Flex>
                <Heading as="h3" size="md" mb={2}>
                  {feature.title}
                </Heading>
                <Text color="gray.500">{feature.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>

        {/* CTA Section */}
        <Container maxW="container.xl" mt={{ base: 16, md: 24 }}>
          <Box
            py={10}
            px={8}
            borderRadius="xl"
            bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
            textAlign="center"
          >
            <Heading as="h2" size="xl" mb={4}>
              Ready to Get Started?
            </Heading>
            <Text fontSize="lg" maxW="2xl" mx="auto" mb={6} color="gray.500">
              Join HashHedge today and take control of your Bitcoin mining risk with our innovative hash rate derivatives platform.
            </Text>
            <Button
              as={RouterLink}
              to={isAuthenticated ? '/dashboard' : '/register'}
              size="lg"
              colorScheme="blue"
              px={8}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Create Your Account'}
            </Button>
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
};

export default HomePage;

// src/pages/LoginPage.tsx
import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Link,
  Image,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <MainLayout>
      <Container maxW="container.xl" py={12}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="center"
          gap={12}
        >
          <Box flex="1" display={{ base: 'none', md: 'block' }}>
            <Image
              alt="Login image"
              src="/login-illustration.svg"
              fallback={
                <Box
                  height="400px"
                  width="full"
                  bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="medium" color="gray.500">
                    Secure Login Illustration
                  </Text>
                </Box>
              }
            />
          </Box>

          <Box
            flex="1"
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            bg={colorMode === 'light' ? 'white' : 'gray.800'}
          >
            <Stack spacing={6} mb={8}>
              <Heading as="h1" size="xl" textAlign="center">
                Welcome Back
              </Heading>
              <Text color="gray.500" textAlign="center">
                Sign in to access your Bitcoin hash rate derivatives
              </Text>
            </Stack>

            <LoginForm />

            <Text mt={8} textAlign="center">
              Don't have an account?{' '}
              <Link as={RouterLink} to="/register" color="blue.500" fontWeight="medium">
                Register now
              </Link>
            </Text>
          </Box>
        </Flex>
      </Container>
    </MainLayout>
  );
};

export default LoginPage;

// src/pages/RegisterPage.tsx
import React from 'react';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Link,
  Image,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <MainLayout>
      <Container maxW="container.xl" py={12}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="center"
          gap={12}
        >
          <Box
            flex="1"
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            bg={colorMode === 'light' ? 'white' : 'gray.800'}
          >
            <Stack spacing={6} mb={8}>
              <Heading as="h1" size="xl" textAlign="center">
                Create Your Account
              </Heading>
              <Text color="gray.500" textAlign="center">
                Join HashHedge and access Bitcoin hash rate derivatives
              </Text>
            </Stack>

            <RegisterForm />

            <Text mt={8} textAlign="center">
              Already have an account?{' '}
              <Link as={RouterLink} to="/login" color="blue.500" fontWeight="medium">
                Log in
              </Link>
            </Text>
          </Box>

          <Box flex="1" display={{ base: 'none', md: 'block' }}>
            <Image
              alt="Register image"
              src="/register-illustration.svg"
              fallback={
                <Box
                  height="400px"
                  width="full"
                  bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="medium" color="gray.500">
                    Account Creation Illustration
                  </Text>
                </Box>
              }
            />
          </Box>
        </Flex>
      </Container>
    </MainLayout>
  );
};

export default RegisterPage;

// src/pages/DashboardPage.tsx
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
} from '@chakra-ui/react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import DashboardStats from '../components/dashboard/DashboardStats';
import ActiveContractsCard from '../components/dashboard/ActiveContractsCard';
import ActiveOrdersCard from '../components/dashboard/ActiveOrdersCard';
import TradeHistoryCard from '../components/orderbook/TradeHistoryCard';
import HashRateChart from '../components/hashrate/HashRateChart';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { loadUser } from '../store/auth-slice';
import LoadingSpinner from '../components/common/LoadingSpinner';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

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
        <PageHeader 
          title={`Welcome, ${user?.username || 'Trader'}`}
          description="Your HashHedge dashboard overview"
        />

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

// src/pages/OrderBookPage.tsx
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

// src/pages/ContractsPage.tsx
import React, { useEffect, useState } from 'react';
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

// src/pages/ContractDetailsPage.tsx
import React, { useEffect } from 'react';
import { Container, Box, useToast } from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ContractDetails from '../components/contracts/ContractDetails';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchContract, fetchContractTransactions } from '../store/contract-slice';

const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const { selectedContract, transactions, loading, error } = useAppSelector(
    (state) => state.contracts
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchContract(id));
      dispatch(fetchContractTransactions(id));
    }
  }, [dispatch, id]);

  if (loading && !selectedContract) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <LoadingSpinner message="Loading contract details..." />
        </Container>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <ErrorDisplay 
            message={error} 
            onRetry={() => {
              if (id) {
                dispatch(fetchContract(id));
                dispatch(fetchContractTransactions(id));
              }
            }} 
          />
        </Container>
      </MainLayout>
    );
  }

  if (!selectedContract) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center">
            Contract not found. The contract ID may be invalid.
          </Box>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <ContractDetails
          contract={selectedContract}
          transactions={transactions}
        />
      </Container>
    </MainLayout>
  );
};

export default ContractDetailsPage;

// src/pages/HashRatePage.tsx
import React from 'react';
import {
  Container,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import HashRateChart from '../components/hashrate/HashRateChart';
import HashRateStatsCard from '../components/hashrate/HashRateStatsCard';
import DifficultyAdjustmentCard from '../components/hashrate/DifficultyAdjustmentCard';

const HashRatePage: React.FC = () => {
  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Bitcoin Hash Rate"
          description="Monitor and analyze Bitcoin network hash rate data"
        />

        <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap={6}>
          <GridItem>
            <HashRateChart />
          </GridItem>
          <GridItem>
            <VStack spacing={6}>
              <HashRateStatsCard />
              <DifficultyAdjustmentCard />
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default HashRatePage;

// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  SimpleGrid,
  Button,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import UserKeyItem from '../components/auth/UserKeyItem';
import AddKeyForm from '../components/auth/AddKeyForm';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { loadUser, loadUserKeys } from '../store/auth-slice';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, userKeys, loading, error } = useAppSelector((state) => state.auth);
  
  const { 
    isOpen: isAddKeyModalOpen, 
    onOpen: onOpenAddKeyModal, 
    onClose: onCloseAddKeyModal 
  } = useDisclosure();

  useEffect(() => {
    if (!user) {
      dispatch(loadUser());
    }
    dispatch(loadUserKeys());
  }, [dispatch, user]);

  if (loading && !user) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <LoadingSpinner message="Loading your profile..." />
        </Container>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <ErrorDisplay 
            message={error} 
            onRetry={() => {
              dispatch(loadUser());
              dispatch(loadUserKeys());
            }} 
          />
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Your Profile"
          description="Manage your account and public keys"
        />

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          <Box>
            <Box
              p={6}
              borderRadius="lg"
              boxShadow="md"
              bg="white"
            >
              <Heading size="md" mb={4}>Account Information</Heading>
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text color="gray.500" fontSize="sm">Username</Text>
                  <Text fontWeight="medium">{user?.username}</Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="sm">Email</Text>
                  <Text fontWeight="medium">{user?.email}</Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="sm">Member Since</Text>
                  <Text fontWeight="medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="sm">Last Login</Text>
                  <Text fontWeight="medium">
                    {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'N/A'}
                  </Text>
                </Box>
              </VStack>
            </Box>
          </Box>

          <Box>
            <Box
              p={6}
              borderRadius="lg"
              boxShadow="md"
              bg="white"
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Heading size="md">Your Public Keys</Heading>
                <Button
                  leftIcon={<FiPlus />}
                  colorScheme="blue"
                  size="sm"
                  onClick={onOpenAddKeyModal}
                >
                  Add Key
                </Button>
              </Flex>
              
              {loading ? (
                <Box py={4}>
                  <LoadingSpinner message="Loading your keys..." />
                </Box>
              ) : userKeys.length === 0 ? (
                <Box py={4} textAlign="center">
                  <Text color="gray.500">You haven't added any public keys yet.</Text>
                </Box>
              ) : (
                <VStack spacing={4} align="stretch">
                  {userKeys.map((key) => (
                    <UserKeyItem key={key.id} userKey={key} />
                  ))}
                </VStack>
              )}
            </Box>
          </Box>
        </SimpleGrid>

        {/* Add Key Modal */}
        <Modal isOpen={isAddKeyModalOpen} onClose={onCloseAddKeyModal}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Public Key</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <AddKeyForm onSuccess={onCloseAddKeyModal} />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onCloseAddKeyModal}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </MainLayout>
  );
};

export default ProfilePage
import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
  SimpleGrid,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiLock, FiTrendingUp, FiZap, FiActivity } from 'react-icons/fi';
import { useAppSelector } from '../hooks/redux-hooks';
import MainLayout from '../components/layout/MainLayout';

const HomePage: React.FC = () => {
  const { colorMode } = useColorMode();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const features = [
    {
      icon: FiTrendingUp,
      title: 'Hash Rate Derivatives',
      description: 'Speculate on Bitcoin network hash rate changes with binary options',
    },
    {
      icon: FiLock,
      title: 'Layer 2 Security',
      description: 'Transactions secured by Bitcoin\'s layer 2 Ark protocol',
    },
    {
      icon: FiZap,
      title: 'Fast Settlement',
      description: 'Quick and efficient off-chain transactions with on-chain security',
    },
    {
      icon: FiActivity,
      title: 'Real-time Market Data',
      description: 'Stay updated with current hash rate and market trends',
    },
  ];

  return (
    <MainLayout>
      <Box pt={{ base: 10, md: 20 }} pb={{ base: 10, md: 24 }}>
        {/* Hero Section */}
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align="center"
            justify="space-between"
            gap={{ base: 10, md: 0 }}
          >
            <Stack spacing={6} maxW={{ base: 'full', md: '50%' }}>
              <Heading
                as="h1"
                size="2xl"
                fontWeight="bold"
                lineHeight="1.2"
                color={colorMode === 'light' ? 'blue.600' : 'blue.300'}
              >
                Bitcoin Hash Rate Derivatives on Layer 2
              </Heading>
              <Text fontSize="xl" color="gray.500">
                HashHedge enables miners and investors to hedge against hash rate volatility with 
                secure, on-chain settlement and efficient off-chain execution.
              </Text>
              <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
                <Button
                  as={RouterLink}
                  to={isAuthenticated ? '/dashboard' : '/register'}
                  size="lg"
                  colorScheme="blue"
                  px={8}
                >
                  {isAuthenticated ? 'Dashboard' : 'Get Started'}
                </Button>
                <Button
                  as={RouterLink}
                  to="/orderbook"
                  size="lg"
                  variant="outline"
                  colorScheme="blue"
                  px={8}
                >
                  View Order Book
                </Button>
              </Stack>
            </Stack>
            <Box
              width={{ base: 'full', md: '45%' }}
              height={{ base: '300px', md: '400px' }}
              position="relative"
              overflow="hidden"
              borderRadius="xl"
              boxShadow="xl"
              bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
            >
              {/* Placeholder for hero image */}
              <Flex
                position="absolute"
                inset="0"
                justifyContent="center"
                alignItems="center"
              >
                <Text fontSize="xl" fontWeight="bold" color="gray.500">
                  Hash Rate Chart Visualization
                </Text>
              </Flex>
            </Box>
          </Flex>
        </Container>

        {/* Features Section */}
        <Container maxW="container.xl" mt={{ base: 16, md: 24 }}>
          <Stack spacing={4} as={Box} textAlign="center" mb={10}>
            <Heading as="h2" size="xl">
              Key Features
            </Heading>
            <Text color="gray.500" maxW="2xl" mx="auto">
              HashHedge provides a suite of tools for managing Bitcoin hash rate risk
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={10}>
            {features.map((feature, index) => (
              <Box
                key={index}
                p={6}
                borderRadius="lg"
                boxShadow="md"
                bg={colorMode === 'light' ? 'white' : 'gray.800'}
                transition="all 0.3s"
                _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
              >
                <Flex
                  w={14}
                  h={14}
                  align="center"
                  justify="center"
                  color="white"
                  rounded="full"
                  bg="blue.500"
                  mb={4}
                >
                  <Icon as={feature.icon} fontSize="2xl" />
                </Flex>
                <Heading as="h3" size="md" mb={2}>
                  {feature.title}
                </Heading>
                <Text color="gray.500">{feature.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>

        {/* CTA Section */}
        <Container maxW="container.xl" mt={{ base: 16, md: 24 }}>
          <Box
            py={10}
            px={8}
            borderRadius="xl"
            bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
            textAlign="center"
          >
            <Heading as="h2" size="xl" mb={4}>
              Ready to Get Started?
            </Heading>
            <Text fontSize="lg" maxW="2xl" mx="auto" mb={6} color="gray.500">
              Join HashHedge today and take control of your Bitcoin mining risk with our innovative hash rate derivatives platform.
            </Text>
            <Button
              as={RouterLink}
              to={isAuthenticated ? '/dashboard' : '/register'}
              size="lg"
              colorScheme="blue"
              px={8}
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Create Your Account'}
            </Button>
          </Box>
        </Container>
      </Box>
    </MainLayout>
  );
};

export default HomePage;

