// src/components/dashboard/WalletCard.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Heading,
  useColorMode,
  Button,
  VStack,
  HStack,
  Text,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import WalletConnect from '../wallet/WalletConnect';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

const WalletCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { isConnected, balance, loading } = useAppSelector((state) => state.arkWallet);
  
  useEffect(() => {
    if (isConnected) {
      dispatch(fetchWalletBalance());
    }
  }, [dispatch, isConnected]);
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Box px={4} py={3} borderBottomWidth="1px">
        <Heading size="md">Your Wallet</Heading>
      </Box>
      
      <Box p={4}>
        {!isConnected ? (
          <VStack spacing={4} align="stretch">
            <Text>Connect your wallet to view your balance and make transactions.</Text>
            <WalletConnect />
          </VStack>
        ) : loading ? (
          <Flex justify="center" align="center" height="100px">
            <Spinner size="xl" color="blue.500" />
          </Flex>
        ) : (
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="center">
              <Text fontWeight="bold">Wallet Status:</Text>
              <Badge colorScheme="green" px={2} py={1}>Connected</Badge>
            </HStack>
            
            <Divider />
            
            <Stat>
              <StatLabel>Total Balance</StatLabel>
              <StatNumber>{balance?.total?.toLocaleString() || 0} sats</StatNumber>
              <StatHelpText>
                <HStack>
                  <Text>≈ ${(((balance?.total || 0) / 100000000) * 50000).toFixed(2)}</Text>
                  <Text color="gray.500">(Estimated at $50,000/BTC)</Text>
                </HStack>
              </StatHelpText>
            </Stat>
            
            <Flex justify="space-between">
              <Box>
                <Text fontWeight="bold">Available:</Text>
                <Text>{balance?.available?.toLocaleString() || 0} sats</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Pending:</Text>
                <Text>{balance?.pending?.toLocaleString() || 0} sats</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Locked:</Text>
                <Text>{balance?.locked?.toLocaleString() || 0} sats</Text>
              </Box>
            </Flex>
            
            <Divider />
            
            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to="/wallet"
                colorScheme="blue"
                width="full"
              >
                Manage Wallet
              </Button>
              
              <WalletConnect />
            </HStack>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default WalletCard;
