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
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { Contract, ContractTransaction } from '../../types';
import { signTransaction, broadcastTransaction } from '../../features/wallet/arkWalletSlice';
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
  const [signedTx, setSignedTx] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [signingStep, setSigningStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { colorMode } = useColorMode();
  const { isConnected, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  // Reset state when modal is opened with a new transaction
  useEffect(() => {
    if (isOpen) {
      setSignedTx(null);
      setTxid(null);
      setSigningStep(0);
      setError(null);
    }
  }, [isOpen, transaction]);
  
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
        contractId: contract.id
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
      // First broadcast through the wallet
      const broadcastResult = await dispatch(broadcastTransaction({
        txHex: signedTx
      })).unwrap();
      
      if (!broadcastResult) {
        throw new Error("Broadcasting returned empty result");
      }
      
      // Then notify the contract system of the broadcast
      const contractResult = await dispatch(broadcastTx({
        contractId: contract.id,
        txId: transaction.id
      })).unwrap();
      
      if (!contractResult) {
        // Non-critical error as the transaction is already broadcast
        console.warn("Contract system notification failed but transaction was broadcast");
      }
      
      setTxid(broadcastResult);
      setSigningStep(4); // Broadcast completed
      
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
  
  const handleClose = () => {
    // If transaction was successfully broadcast and there's a success callback, call it
    if (txid && onSuccess) {
      onSuccess();
    }
    onClose();
  };
  
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
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Sign Contract Transaction
          {transaction && (
            <Badge ml={2} colorScheme={getTxTypeColor()}>
              {getTxTypeDisplay()}
            </Badge>
          )}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {!isConnected ? (
              <Alert status="warning">
                <AlertIcon />
                <Text>Please connect your wallet to sign this transaction.</Text>
              </Alert>
            ) : (
              <>
                <Text>
                  You're about to sign a {getTxTypeDisplay()} transaction for contract {contract.id}.
                </Text>
                
                {contract.contract_type && (
                  <Alert status="info" variant="subtle">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">Contract Type: {contract.contract_type}</Text>
                      <Text>Strike Hash Rate: {contract.strike_hash_rate} EH/s</Text>
                    </Box>
                  </Alert>
                )}
                
                {error && (
                  <Alert status="error">
                    <AlertIcon />
                    <Text>{error}</Text>
                  </Alert>
                )}
                
                {renderStepIndicator()}
                
                <Divider />
                
                <Box>
                  <Text fontWeight="bold" mb={2}>Transaction Data:</Text>
                  <Box 
                    p={3} 
                    borderWidth="1px" 
                    borderRadius="md" 
                    bg={colorMode === 'light' ? "gray.50" : "gray.700"} 
                    maxHeight="150px" 
                    overflowY="auto"
                  >
                    {transaction?.tx_hex ? (
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
                    ) : (
                      <Text color="gray.500">No transaction data available</Text>
                    )}
                  </Box>
                </Box>
                
                {signedTx && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Signed Transaction:</Text>
                    <Box 
                      p={3} 
                      borderWidth="1px" 
                      borderRadius="md" 
                      bg={colorMode === 'light' ? "green.50" : "green.900"} 
                      maxHeight="150px" 
                      overflowY="auto"
                    >
                      <Code 
                        p={2} 
                        borderRadius="md" 
                        fontSize="xs" 
                        whiteSpace="pre-wrap" 
                        overflowX="auto" 
                        bg="transparent"
                      >
                        {signedTx}
                      </Code>
                    </Box>
                  </Box>
                )}
                
                {txid && (
                  <Alert status="success">
                    <AlertIcon />
                    <Box>
                      <Text fontWeight="bold">Transaction successfully broadcast!</Text>
                      <Text>Transaction ID: {txid}</Text>
                    </Box>
                  </Alert>
                )}
                
                <Alert status="info">
                  <AlertIcon />
                  <Text>
                    Make sure you understand the contract terms before signing this transaction.
                    Signing and broadcasting will commit these terms to the Bitcoin blockchain.
                  </Text>
                </Alert>
              </>
            )}
          </VStack>
        </ModalBody>
        
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            {txid ? 'Close' : 'Cancel'}
          </Button>
          
          {!signedTx && !txid ? (
            <Button
              colorScheme="blue"
              onClick={handleSignTransaction}
              isLoading={signingStep === 1 || walletLoading}
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
              isLoading={signingStep === 3 || walletLoading}
              loadingText="Broadcasting"
              isDisabled={!isConnected || !signedTx || signingStep === 3 || !!error}
            >
              Broadcast Transaction
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ContractSigningModal;
