// src/components/dashboard/WalletCard.tsx
import React from 'react';
import {
  Box,
  Heading,
  useColorMode,
  Button,
  VStack,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import WalletConnect from '../wallet/WalletConnect';
import { useAppSelector } from '../../hooks/redux-hooks';

const WalletCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const { isConnected } = useAppSelector((state) => state.arkWallet);
  
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
        <WalletConnect />
        
        {isConnected && (
          <VStack mt={4} align="stretch">
            <Button
              as={RouterLink}
              to="/wallet"
              colorScheme="blue"
              variant="outline"
            >
              View Wallet Details
            </Button>
          </VStack>
        )}
      </Box>
    </Box>
  );
};

export default WalletCard;
