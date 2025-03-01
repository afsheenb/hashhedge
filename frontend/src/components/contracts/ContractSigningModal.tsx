import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { Contract, ContractTransaction } from '../../types';
import { getWalletInstance } from '../../features/wallet/arkWalletSlice';

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
  const [isLoading, setIsLoading] = useState(false);
  const [signedTx, setSignedTx] = useState<string | null>(null);
  
  const toast = useToast();
  const { isConnected } = useAppSelector((state) => state.arkWallet);
  
  const handleSignTransaction = async () => {
    if (!transaction || !transaction.tx_hex) {
      toast({
        title: 'Error',
        description: 'No transaction data available to sign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, we would use the Ark wallet SDK to sign the transaction
      // This is a mock implementation
      const walletInstance = getWalletInstance();
      
      if (!walletInstance) {
        throw new Error('Wallet not initialized');
      }
      
      // Mock signing - in a real implementation, we'd use the wallet to sign the PSBT
      // const signedTransaction = await walletInstance.signPsbt(transaction.tx_hex);
      
      // Mock signed transaction for demo purposes
      const mockSignedTx = transaction.tx_hex + '_SIGNED';
      setSignedTx(mockSignedTx);
      
      toast({
        title: 'Transaction signed',
        description: 'The transaction has been successfully signed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Signing failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBroadcastTransaction = async () => {
    if (!signedTx) {
      toast({
        title: 'Error',
        description: 'No signed transaction to broadcast',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, we would use the Ark wallet SDK to broadcast the transaction
      // const txid = await walletInstance.broadcastTransaction(signedTx);
      
      // Mock broadcast for demo purposes
      const mockTxid = '9f5084fd61d511a7fc028fb8b4155a9b7d4d6ee9f74c7c8c1c34d76a49b60d4c';
      
      toast({
        title: 'Transaction broadcast',
        description: `Transaction ID: ${mockTxid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: 'Broadcast failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Sign Contract Transaction</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {!isConnected ? (
              <Alert status="warning">
                <AlertIcon />
                Please connect your wallet to sign this transaction.
              </Alert>
            ) : (
              <>
                <Text>
                  You're about to sign a {transaction?.tx_type} transaction for contract {contract.id}.
                </Text>
                
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontWeight="bold" mb={2}>Transaction Data:</Text>
                  <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto">
                    {transaction?.tx_hex ? transaction.tx_hex.substring(0, 100) + '...' : 'No transaction data available'}
                  </Code>
                </Box>
                
                {signedTx && (
                  <Box borderWidth="1px" borderRadius="md" p={3} bg="green.50">
                    <Text fontWeight="bold" mb={2}>Signed Transaction:</Text>
                    <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto">
                      {signedTx.substring(0, 100) + '...'}
                    </Code>
                  </Box>
                )}
                
                <Alert status="info">
                  <AlertIcon />
                  Make sure you understand the contract terms before signing this transaction.
                </Alert>
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          
          {!signedTx ? (
            <Button
              colorScheme="blue"
              onClick={handleSignTransaction}
              isLoading={isLoading}
              loadingText="Signing"
              isDisabled={!isConnected || !transaction?.tx_hex}
            >
              Sign Transaction
            </Button>
          ) : (
            <Button
              colorScheme="green"
              onClick={handleBroadcastTransaction}
              isLoading={isLoading}
              loadingText="Broadcasting"
              isDisabled={!isConnected}
            >
              Broadcast Transaction
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ContractSigningModal;


import React, { useState } from 'react';
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
} from '@chakra-ui/react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [signedTx, setSignedTx] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { isConnected } = useAppSelector((state) => state.arkWallet);
  
  const handleSignTransaction = async () => {
    if (!transaction || !transaction.tx_hex) {
      toast({
        title: 'Error',
        description: 'No transaction data available to sign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const signed = await dispatch(signTransaction({
        txHex: transaction.tx_hex,
        contractId: contract.id
      })).unwrap();
      
      setSignedTx(signed);
      
      toast({
        title: 'Transaction signed',
        description: 'The transaction has been successfully signed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Signing failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBroadcastTransaction = async () => {
    if (!signedTx || !transaction) {
      toast({
        title: 'Error',
        description: 'No signed transaction to broadcast',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First broadcast through the wallet system
      await dispatch(broadcastTransaction({
        txHex: signedTx
      })).unwrap();
      
      // Then notify the contract system of the broadcast
      const result = await dispatch(broadcastTx({
        contractId: contract.id,
        txId: transaction.id
      })).unwrap();
      
      setTxid(result.broadcast_tx_id);
      
      toast({
        title: 'Transaction broadcast',
        description: `Transaction successfully broadcast to the network`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Broadcast failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    // Reset state when modal is closed if transaction was broadcast
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
                Please connect your wallet to sign this transaction.
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
                
                <Divider />
                
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontWeight="bold" mb={2}>Transaction Data:</Text>
                  <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto" maxHeight="150px" overflowY="auto">
                    {transaction?.tx_hex ? transaction.tx_hex : 'No transaction data available'}
                  </Code>
                </Box>
                
                {signedTx && (
                  <Box borderWidth="1px" borderRadius="md" p={3} bg="green.50">
                    <Text fontWeight="bold" mb={2}>Signed Transaction:</Text>
                    <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto" maxHeight="150px" overflowY="auto">
                      {signedTx}
                    </Code>
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
                  Make sure you understand the contract terms before signing this transaction.
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
              isLoading={isLoading}
              loadingText="Signing"
              isDisabled={!isConnected || !transaction?.tx_hex}
            >
              Sign Transaction
            </Button>
          ) : signedTx && !txid ? (
            <Button
              colorScheme="green"
              onClick={handleBroadcastTransaction}
              isLoading={isLoading}
              loadingText="Broadcasting"
              isDisabled={!isConnected || !signedTx}
            >
              Broadcast Transaction
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};


import React, { useState } from 'react';
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
} from '@chakra-ui/react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [signedTx, setSignedTx] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { isConnected } = useAppSelector((state) => state.arkWallet);
  
  const handleSignTransaction = async () => {
    if (!transaction || !transaction.tx_hex) {
      toast({
        title: 'Error',
        description: 'No transaction data available to sign',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const signed = await dispatch(signTransaction({
        txHex: transaction.tx_hex,
        contractId: contract.id
      })).unwrap();
      
      setSignedTx(signed);
      
      toast({
        title: 'Transaction signed',
        description: 'The transaction has been successfully signed.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Signing failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBroadcastTransaction = async () => {
    if (!signedTx || !transaction) {
      toast({
        title: 'Error',
        description: 'No signed transaction to broadcast',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First broadcast through the wallet system
      await dispatch(broadcastTransaction({
        txHex: signedTx
      })).unwrap();
      
      // Then notify the contract system of the broadcast
      const result = await dispatch(broadcastTx({
        contractId: contract.id,
        txId: transaction.id
      })).unwrap();
      
      setTxid(result.broadcast_tx_id);
      
      toast({
        title: 'Transaction broadcast',
        description: `Transaction successfully broadcast to the network`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Broadcast failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClose = () => {
    // Reset state when modal is closed if transaction was broadcast
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
                Please connect your wallet to sign this transaction.
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
                
                <Divider />
                
                <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
                  <Text fontWeight="bold" mb={2}>Transaction Data:</Text>
                  <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto" maxHeight="150px" overflowY="auto">
                    {transaction?.tx_hex ? transaction.tx_hex : 'No transaction data available'}
                  </Code>
                </Box>
                
                {signedTx && (
                  <Box borderWidth="1px" borderRadius="md" p={3} bg="green.50">
                    <Text fontWeight="bold" mb={2}>Signed Transaction:</Text>
                    <Code p={2} borderRadius="md" fontSize="xs" whiteSpace="pre-wrap" overflowX="auto" maxHeight="150px" overflowY="auto">
                      {signedTx}
                    </Code>
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
                  Make sure you understand the contract terms before signing this transaction.
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
              isLoading={isLoading}
              loadingText="Signing"
              isDisabled={!isConnected || !transaction?.tx_hex}
            >
              Sign Transaction
            </Button>
          ) : signedTx && !txid ? (
            <Button
              colorScheme="green"
              onClick={handleBroadcastTransaction}
              isLoading={isLoading}
              loadingText="Broadcasting"
              isDisabled={!isConnected || !signedTx}
            >
              Broadcast Transaction
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

