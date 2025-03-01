import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { useAppSelector } from '../../hooks/redux-hooks';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';
import PlaceOrderForm from './PlaceOrderForm';
import { getWalletInstance } from '../../features/wallet/arkWalletSlice';

interface PlaceOrderWithWalletProps {
  onOrderPlaced?: () => void;
}

const PlaceOrderWithWallet: React.FC<PlaceOrderWithWalletProps> = ({ onOrderPlaced }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, balance, userKeys } = useAppSelector((state) => state.arkWallet);
  const toast = useToast();
  
  // Get user's public key from wallet if available
  useEffect(() => {
    // In a real implementation, this would get the user's public key from the wallet
  }, [isConnected]);
  
  const handlePlaceOrder = async (orderData: PlaceOrderFormType) => {
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet before placing an order',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const walletInstance = getWalletInstance();
      
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // In a real implementation, we would:
      // 1. Sign the order with the wallet
      // 2. Submit the signed order to the server
      // 3. If required, send funds to the contract address
      
      // Mock delay to simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Order placed',
        description: 'Your order has been placed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (error) {
      toast({
        title: 'Order failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Box>
      {!isConnected ? (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>
              Connect your wallet to place orders using Ark protocol.
            </AlertDescription>
          </VStack>
        </Alert>
      ) : (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Wallet connected</AlertTitle>
            <AlertDescription>
              You have {balance?.total || 0} sats available to trade.
            </AlertDescription>
          </VStack>
        </Alert>
      )}
      
      <PlaceOrderForm 
        onSubmit={handlePlaceOrder} 
        isProcessing={isProcessing}
        isWalletConnected={isConnected}
        availableBalance={balance?.total || 0}
      />
    </Box>
  );
};

export default PlaceOrderWithWallet;

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess
import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { sendOffchain } from '../../features/wallet/arkWalletSlice';
import { Contract } from '../../types';

interface ContractFundingProps {
  contract: Contract;
  onSuccess?: () => void;
}

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess }) => {
  const [fundingAmount, setFundingAmount] = useState(contract.contract_size);
  const [amountError, setAmountError] = useState('');
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance, loading } = useAppSelector((state) => state.arkWallet);
  
  const handleFundContract = async () => {
    // Reset error
    setAmountError('');
    
    // Validate amount
    if (fundingAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return;
    }
    
    if (!balance || fundingAmount > balance.total) {
      setAmountError('Insufficient balance');
      return;
    }
    
    try {
      // In a real implementation, this would use a specific contract funding address
      // Here we're sending to the contract's setup address, which would be an Ark protocol address
      const arkAddress = contract.seller_pub_key; // This is a simplification - real implementation would generate the proper Ark address
      
      const txid = await dispatch(sendOffchain({
        address: arkAddress,
        amount: fundingAmount,
        feeRate: 1
      })).unwrap();
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: 'Funding failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  if (!isConnected) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <AlertTitle>Wallet not connected</AlertTitle>
        <AlertDescription>Connect your wallet to fund this contract.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="bold" fontSize="lg">
          Fund Contract
        </Text>
        
        <Text>
          This will fund the contract using your Ark wallet. The contract requires {contract.contract_size} sats.
        </Text>
        
        <FormControl isInvalid={!!amountError}>
          <FormLabel>Funding Amount (sats)</FormLabel>
          <NumberInput
            min={0}
            max={balance?.total || 0}
            value={fundingAmount}
            onChange={(_, value) => {
              setFundingAmount(value);
              setAmountError('');
            }}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          {amountError && <FormErrorMessage>{amountError}</FormErrorMessage>}
          <Text fontSize="sm" mt={1}>
            Available: {balance?.total || 0} sats
          </Text>
        </FormControl>
        
        <Button
          colorScheme="blue"
          onClick={handleFundContract}
          isLoading={loading}
          loadingText="Processing"
          isDisabled={!isConnected || fundingAmount <= 0 || !balance || fundingAmount > balance.total}
        >
          Fund Contract
        </Button>
      </VStack>
    </Box>
  );
};

export default ContractFunding;

