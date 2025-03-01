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
