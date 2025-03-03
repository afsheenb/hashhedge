import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Text,
  VStack,
  Box,
  Alert,
  AlertIcon,
  Code,
  useToast,
  Divider,
  Badge,
  Progress,
  HStack,
  Spinner,
  Flex,
  useColorMode,
  Tooltip,
  Stack,
  Heading,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { Contract, ContractTransaction } from '../../types';
import { 
  signTransaction, 
  broadcastTransaction,
  checkTransactionStatus
} from '../../features/wallet/arkWalletSlice';
import { broadcastTx } from '../../store/contract-slice';

interface ContractSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  transaction?: ContractTransaction;
  onSuccess?: () => void;
}

const ContractSigningModal: React.FC<ContractSigningModalProps> = ({
  isOpen,
  onClose,
  contract,
  transaction,
  onSuccess,
}) => {
  // State for transaction signing and broadcasting
  const [signedTx, setSignedTx] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [signingStep, setSigningStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [useEmergencyPath, setUseEmergencyPath] = useState<boolean>(false);
  const [aspStatus, setAspStatus] = useState<boolean | null>(null);
  const [checkingASP, setCheckingASP] = useState<boolean>(false);
  
  // UI state
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { colorMode } = useColorMode();
  
  // Get wallet state from Redux
  const { isConnected, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  // Reset state when modal is opened with a new transaction
  useEffect(() => {
    if (isOpen) {
      setSignedTx(null);
      setTxid(null);
      setSigningStep(0);
      setError(null);
      setUseEmergencyPath(false);
      checkASPStatus();
    }
  }, [isOpen, transaction]);
  
  // Check ASP status
  const checkASPStatus = async () => {
    setCheckingASP(true);
    try {
      // Replace with actual API call to check ASP status
      const response = await fetch('/api/v1/status/asp');
      const data = await response.json();
      setAspStatus(data.isAvailable);
      
      // If ASP is unavailable, show the emergency path option
      if (!data.isAvailable) {
        setUseEmergencyPath(true);
      }
    } catch (error) {
      console.error('Failed to check ASP status:', error);
      setAspStatus(false);
      setUseEmergencyPath(true);
    } finally {
      setCheckingASP(false);
    }
  };
  
  // Validate transaction before signing
  const validateTransaction = (): boolean => {
    if (!transaction) {
      setError("No transaction data available");
      return false;
    }
    
    if (!transaction.tx_hex || transaction.tx_hex.trim() === '') {
      setError("Transaction data is missing or empty");
      return false;
    }
    
    if (!transaction.id || !transaction.contract_id) {
      setError("Transaction ID or contract ID is missing");
      return false;
    }
    
    return true;
  };
  
  // Handle transaction signing
  const handleSignTransaction = async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate the transaction
    if (!validateTransaction()) {
      return;
    }
    
    setSigningStep(1); // Starting signing process
    
    try {
      // Sign the transaction using the wallet
      const signed = await dispatch(signTransaction({
        txHex: transaction!.tx_hex,
        contractId: contract.id,
        useEmergencyPath: useEmergencyPath
      })).unwrap();
      
      if (!signed) {
        throw new Error("Signing returned empty result");
      }
      
      setSignedTx(signed);
      setSigningStep(2); // Signing completed
      
      toast({
        title: 'Transaction signed',
        description: 'The transaction has been successfully signed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      setSigningStep(0);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Signing failed: ${errorMessage}`);
      
      toast({
        title: 'Signing failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle transaction broadcast
  const handleBroadcastTransaction = async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate signed transaction
    if (!signedTx || !transaction) {
      setError("No signed transaction to broadcast");
      return;
    }
    
    setSigningStep(3); // Starting broadcast
    
    try {
      let broadcastResult;
      
      if (useEmergencyPath) {
        // Use on-chain broadcasting
        broadcastResult = await dispatch(broadcastTransaction({
          txHex: signedTx,
          useEmergencyPath: true
        })).unwrap();
      } else {
        // Use ARK for off-chain transactions
        broadcastResult = await dispatch(broadcastTransaction({
          txHex: signedTx,
          useEmergencyPath: false
        })).unwrap();
        
        // Then notify the contract system of the broadcast
        await dispatch(broadcastTx({
          contractId: contract.id,
          txId: transaction.id
        })).unwrap();
      }
      
      if (!broadcastResult) {
        throw new Error("Broadcasting returned empty result");
      }
      
      setTxid(broadcastResult);
      setSigningStep(4); // Broadcast completed
      
      // Start polling for transaction status
      startTransactionStatusCheck(broadcastResult);
      
      toast({
        title: 'Transaction broadcast',
        description: `Transaction successfully broadcast with ID: ${broadcastResult.substring(0, 8)}...`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      setSigningStep(2); // Revert to signed state
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Broadcast failed: ${errorMessage}`);
      
      toast({
        title: 'Broadcast failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Poll for transaction status updates
  const startTransactionStatusCheck = (transactionId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        const status = await dispatch(checkTransactionStatus(transactionId)).unwrap();
        if (status.confirmed) {
          clearInterval(checkInterval);
          toast({
            title: 'Transaction confirmed',
            description: `Transaction has been confirmed with ${status.confirmations} confirmations`,
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          
          // Call success callback if provided
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        console.error('Failed to check transaction status:', error);
        // Don't clear interval, just continue trying
      }
    }, 10000); // Check every 10 seconds
    
    // Clear interval after 10 minutes (60 * 10 seconds)
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 600000);
  };
  
  // Handle modal close
  const handleClose = () => {
    // If transaction was successfully broadcast and there's a success callback, call it
    if (txid && onSuccess) {
      onSuccess();
    }
    onClose();
  };
  
  // Get transaction type display
  const getTxTypeDisplay = () => {
    if (!transaction) return "Unknown";
    
    switch (transaction.tx_type.toLowerCase()) {
      case 'setup':
        return "Setup";
      case 'final':
        return "Final";
      case 'settlement':
        return "Settlement";
      case 'swap':
        return "Swap Participant";
      default:
        return transaction.tx_type;
    }
  };
  
  // Get transaction type color
  const getTxTypeColor = () => {
    if (!transaction) return "gray";
    
    switch (transaction.tx_type.toLowerCase()) {
      case 'setup':
        return "blue";
      case 'final':
        return "purple";
      case 'settlement':
        return "green";
      case 'swap':
        return "orange";
      default:
        return "gray";
    }
  };
  
  // Render step indicator
  const renderStepIndicator = () => {
    if (signingStep === 0) return null;
    
    const steps = [
      { label: "Preparing", value: 1 },
      { label: "Signed", value: 2 },
      { label: "Broadcasting", value: 3 },
      { label: "Completed", value: 4 }
    ];
    
    return (
      <Box mt={4}>
        <Progress 
          value={(signingStep / 4) * 100}
          size="sm"
          colorScheme={signingStep === 4 ? "green" : "blue"}
          hasStripe={signingStep < 4}
          isAnimated={signingStep < 4}
          borderRadius="md"
          mb={2}
        />
        
        <Flex justify="space-between">
          {steps.map((step) => (
            <Box key={step.value} textAlign="center" opacity={signingStep >= step.value ? 1 : 0.5}>
              <Box 
                borderRadius="full" 
                border="2px solid" 
                borderColor={signingStep >= step.value ? (signingStep === 4 && step.value === 4 ? "green.500" : "blue.500") : "gray.300"}
                bg={signingStep >= step.value ? (signingStep === 4 && step.value === 4 ? "green.500" : "blue.500") : "white"}
                w="24px" 
                h="24px" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                mx="auto"
                mb={1}
              >
                {signingStep === 4 && step.value === 4 ? (
                  <CheckIcon color="white" boxSize={3} />
                ) : signingStep === step.value ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <Text fontSize="xs" fontWeight="bold" color={signingStep >= step.value ? "white" : "gray.500"}>
                    {step.value}
                  </Text>
                )}
              </Box>
              <Text fontSize="xs" color={signingStep >= step.value ? "gray.700" : "gray.500"}>
                {step.label}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>
    );
  };
  
  // Render ASP status alert
  const renderASPAlert = () => {
    if (checkingASP) {
      return (
        <Alert status="info" mb={4}>
          <AlertIcon />
          <Flex align="center">
            <Text mr={2}>Checking ARK Service Provider status</Text>
            <Spinner size="sm" />
          </Flex>
        </Alert>
      );
    }
    
    if (aspStatus === false) {
      return (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>ARK Service Provider Unavailable</AlertTitle>
            <AlertDescription>
              The transaction will be processed using the on-chain emergency path.
              This may take longer and incur higher fees.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }
    
    return null;
  };
return (
  <Modal isOpen={isOpen} onClose={handleClose} size="xl">
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>
        <HStack>
          <Heading size="md">
            Sign {getTxTypeDisplay()} Transaction
          </Heading>
          {transaction && (
            <Badge colorScheme={getTxTypeColor()}>
              {getTxTypeDisplay()}
            </Badge>
          )}
        </HStack>
      </ModalHeader>
      <ModalCloseButton />
      
      <ModalBody>
        {/* ASP Status Alert */}
        {renderASPAlert()}
        
        {/* Emergency Path Option */}
        {aspStatus === false && (
          <Box mb={4}>
            <HStack>
              <Tooltip label="When the Ark Service Provider is unavailable, we'll use an on-chain emergency path">
                <InfoIcon color="blue.500" />
              </Tooltip>
              <Text fontSize="sm">
                Emergency On-Chain Transaction Path Activated
              </Text>
            </HStack>
          </Box>
        )}
        
        {/* Transaction Details */}
        <VStack spacing={4} align="stretch">
          {transaction && (
            <Box 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}
            >
              <Text fontWeight="bold" mb={2}>Transaction Details</Text>
              <Code 
                p={2} 
                borderRadius="md" 
                fontSize="xs" 
                whiteSpace="pre-wrap" 
                overflowX="auto" 
                bg="transparent"
              >
                {transaction.tx_hex}
              </Code>
            </Box>
          )}
          
          {/* Signing Progress Indicator */}
          {renderStepIndicator()}
          
          {/* Error Display */}
          {error && (
            <Alert status="error" variant="left-accent">
              <AlertIcon as={WarningIcon} />
              <Box>
                <AlertTitle>Transaction Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Box>
            </Alert>
          )}
        </VStack>
      </ModalBody>
      
      <ModalFooter>
        <HStack spacing={3}>
          <Button 
            variant="ghost" 
            onClick={handleClose}
            isDisabled={signingStep === 3 || signingStep === 4}
          >
            {signingStep === 4 ? 'Close' : 'Cancel'}
          </Button>
          
          {!signedTx && !txid ? (
            <Button
              colorScheme="blue"
              onClick={handleSignTransaction}
              isLoading={signingStep === 1}
              loadingText="Signing"
              isDisabled={!isConnected || !transaction?.tx_hex || signingStep === 1 || !!error}
              leftIcon={<CheckIcon />}
            >
              Sign Transaction
            </Button>
          ) : signedTx && !txid ? (
            <Button
              colorScheme="green"
              onClick={handleBroadcastTransaction}
              isLoading={signingStep === 3}
              loadingText="Broadcasting"
              isDisabled={!isConnected || !signedTx || signingStep === 3 || !!error}
            >
              Broadcast Transaction
            </Button>
          ) : null}
        </HStack>
      </ModalFooter>
    </ModalContent>
  </Modal>
);
