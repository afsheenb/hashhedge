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

