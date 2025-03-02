// src/components/contracts/ContractFunding.tsx
import React, { useState, useEffect } from 'react';
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
  FormHelperText,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Flex,
  Spacer,
  HStack,
  Badge,
  Divider,
  useColorMode,
  Code,
  Collapse,
  IconButton,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { sendOnchain } from '../../features/wallet/arkWalletSlice';
import { Contract } from '../../types';
import { setupContract } from '../../store/contract-slice';

interface ContractFundingProps {
  contract: Contract;
  onSuccess?: () => void;
}

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess }) => {
  const [fundingAmount, setFundingAmount] = useState(contract.contract_size);
  const [amountError, setAmountError] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStep, setFundingStep] = useState(0);
  const [txDetails, setTxDetails] = useState<{address?: string; txid?: string} | null>(null);
  const [showTxDetails, setShowTxDetails] = useState(false);
  const { colorMode } = useColorMode();
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  // Reset funding amount if contract size changes
  useEffect(() => {
    setFundingAmount(contract.contract_size);
  }, [contract.contract_size]);
  
  const handleFundContract = async () => {
    // Reset error and state
    setAmountError('');
    setIsFunding(true);
    setFundingStep(1);
    setTxDetails(null);
    
    // Validate amount
    if (fundingAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      setIsFunding(false);
      setFundingStep(0);
      return;
    }
    
    if (!balance || fundingAmount > balance.confirmed) {
      setAmountError('Insufficient confirmed balance');
      setIsFunding(false);
      setFundingStep(0);
      return;
    }
    
    try {
      // Step 1: Generate contract address from contract setup endpoint
      const setupResponse = await dispatch(setupContract({
        id: contract.id,
        data: {
          amount: fundingAmount,
        }
      })).unwrap();
      
      if (!setupResponse.transaction || !setupResponse.transaction.address) {
        throw new Error('Failed to get funding address from contract setup');
      }
      
      const contractAddress = setupResponse.transaction.address;
      setTxDetails(prev => ({ ...prev, address: contractAddress }));
      setFundingStep(2);
      
      // Step 2: Send funds to the contract address
      const txid = await dispatch(sendOnchain({
        address: contractAddress,
        amount: fundingAmount,
        feeRate: 5 // Use a reasonable fee rate for contract funding
      })).unwrap();
      
      setTxDetails(prev => ({ ...prev, txid }));
      setFundingStep(3);
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Step 3: Call the success callback to refresh contract data
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
      setFundingStep(0);
    } finally {
      setIsFunding(false);
    }
  };
  
  const getFundingStepText = () => {
    switch (fundingStep) {
      case 1:
        return "Preparing contract setup...";
      case 2:
        return "Sending funds to contract...";
      case 3:
        return "Funding complete!";
      default:
        return "";
    }
  };

  if (!isConnected) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>Connect your wallet to fund this contract.</AlertDescription>
        </Box>
      </Alert>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg={colorMode === 'light' ? 'white' : 'gray.800'}>
      <VStack align="stretch" spacing={4}>
        <Flex alignItems="center">
          <Text fontWeight="bold" fontSize="lg">Fund Contract</Text>
          <Spacer />
          {contract.status === 'ACTIVE' && (
            <Badge colorScheme="green">Funded</Badge>
          )}
        </Flex>
        
        <Text>
          This contract requires {contract.contract_size.toLocaleString()} sats to be active.
          {contract.status !== 'ACTIVE' && " Once funded, the contract will be activated and available for trading."}
        </Text>
        
        {contract.status !== 'ACTIVE' ? (
          <>
            <FormControl isInvalid={!!amountError}>
              <FormLabel>Funding Amount (sats)</FormLabel>
              <NumberInput
                min={contract.contract_size}
                max={balance?.confirmed || 0}
                value={fundingAmount}
                onChange={(_, value) => {
                  setFundingAmount(value);
                  setAmountError('');
                }}
                isDisabled={isFunding}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {amountError ? (
                <FormErrorMessage>{amountError}</FormErrorMessage>
              ) : (
                <FormHelperText>
                  Minimum funding amount: {contract.contract_size.toLocaleString()} sats
                </FormHelperText>
              )}
            </FormControl>
            
            <HStack justify="space-between" fontSize="sm" color="gray.500">
              <Text>Available Balance:</Text>
              <Text>{balance?.confirmed.toLocaleString() || 0} sats</Text>
            </HStack>
            
            {isFunding && (
              <Box>
                <Text mb={2}>{getFundingStepText()}</Text>
                <Progress 
                  value={(fundingStep / 3) * 100} 
                  size="sm" 
                  colorScheme="blue" 
                  borderRadius="md"
                  isAnimated
                />
              </Box>
            )}
            
            {txDetails && txDetails.txid && (
              <>
                <Flex alignItems="center">
                  <Text fontWeight="medium">Transaction Details</Text>
                  <Spacer />
                  <IconButton
                    aria-label={showTxDetails ? "Hide details" : "Show details"}
                    icon={showTxDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTxDetails(!showTxDetails)}
                  />
                </Flex>
                
                <Collapse in={showTxDetails} animateOpacity>
                  <Box p={3} borderWidth="1px" borderRadius="md" bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}>
                    <Text fontWeight="semibold" mb={1}>Contract Address:</Text>
                    <Code 
                      p={2} 
                      borderRadius="md" 
                      fontSize="xs" 
                      wordBreak="break-all" 
                      width="full"
                      mb={2}
                    >
                      {txDetails.address}
                    </Code>
                    
                    <Text fontWeight="semibold" mb={1}>Transaction ID:</Text>
                    <Code 
                      p={2} 
                      borderRadius="md" 
                      fontSize="xs" 
                      wordBreak="break-all" 
                      width="full"
                    >
                      {txDetails.txid}
                    </Code>
                  </Box>
                </Collapse>
              </>
            )}
            
            <Divider />
            
            <Button
              colorScheme="blue"
              onClick={handleFundContract}
              isLoading={isFunding || walletLoading}
              loadingText="Processing"
              isDisabled={
                !isConnected || 
                fundingAmount < contract.contract_size || 
                !balance || 
                fundingAmount > balance.confirmed
              }
            >
              Fund Contract
            </Button>
          </>
        ) : (
          <Alert status="success" variant="subtle">
            <AlertIcon />
            This contract is fully funded and active.
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

export default ContractFunding;
