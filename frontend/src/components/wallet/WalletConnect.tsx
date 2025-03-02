
// src/components/wallet/WalletConnect.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  useToast,
  FormErrorMessage,
  VStack,
  Text,
  IconButton,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Code,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, LockIcon, UnlockIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { initializeWallet, disconnectWallet, fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

const WalletConnect: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [inputError, setInputError] = useState('');
  const [connectionStep, setConnectionStep] = useState(0);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, addresses, balance, loading, error } = useAppSelector((state) => state.arkWallet);

  // Set up interval to refresh balance periodically if connected
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isConnected) {
      // Initial balance fetch
      dispatch(fetchWalletBalance());
      
      // Set up interval to refresh balance every 30 seconds
      intervalId = setInterval(() => {
        dispatch(fetchWalletBalance());
      }, 30000);
    }
    
    // Clean up interval on unmount or when disconnected
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isConnected, dispatch]);

  const handleConnect = async () => {
    // Reset errors and steps
    setInputError('');
    setConnectionStep(1);
    
    // Basic validation
    if (!privateKey || privateKey.trim() === '') {
      setInputError('Private key is required');
      setConnectionStep(0);
      return;
    }

    try {
      // Initialize the wallet with the provided private key
      setConnectionStep(2);
      await dispatch(initializeWallet(privateKey)).unwrap();
      
      // Success!
      setConnectionStep(3);
      toast({
        title: 'Wallet connected',
        description: 'Your wallet has been successfully connected. You can now send and receive Bitcoin.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Clear private key from state for security
      setPrivateKey('');
      
      // Close the modal
      onClose();
    } catch (err) {
      setConnectionStep(0);
      const errorMessage = typeof err === 'string' ? err : 'Failed to connect wallet';
      toast({
        title: 'Connection failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWallet()).unwrap();
      toast({
        title: 'Wallet disconnected',
        description: 'Your wallet has been disconnected.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect wallet. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const renderConnectionStep = () => {
    switch (connectionStep) {
      case 0:
        return null;
      case 1:
        return <Text>Validating private key...</Text>;
      case 2:
        return <Text>Initializing wallet...</Text>;
      case 3:
        return <Text>Wallet connected successfully!</Text>;
      default:
        return null;
    }
  };

  // Define the connected wallet display
  const ConnectedWalletInfo = () => (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={3} align="stretch">
        <HStack>
          <LockIcon color="green.500" />
          <Text fontWeight="bold" color="green.500">Wallet Connected</Text>
        </HStack>
        
        {addresses && (
          <>
            <Text fontWeight="medium">Bitcoin Address:</Text>
            <Code p={2} borderRadius="md" fontSize="sm" overflowX="auto">
              {addresses.onchain}
            </Code>
            
            <Text fontWeight="medium">Ark Address:</Text>
            <Code p={2} borderRadius="md" fontSize="sm" overflowX="auto">
              {addresses.offchain}
            </Code>
          </>
        )}
        
        {balance && (
          <Box mt={2}>
            <Text fontWeight="medium">Balance:</Text>
            <HStack spacing={4} mt={1}>
              <Box p={2} borderWidth="1px" borderRadius="md" flex="1">
                <Text fontSize="sm" color="gray.500">Total</Text>
                <Text fontWeight="bold">{balance.total.toLocaleString()} sats</Text>
              </Box>
              <Box p={2} borderWidth="1px" borderRadius="md" flex="1">
                <Text fontSize="sm" color="gray.500">Confirmed</Text>
                <Text fontWeight="bold">{balance.confirmed.toLocaleString()} sats</Text>
              </Box>
            </HStack>
          </Box>
        )}
        
        <Button 
          colorScheme="red" 
          variant="outline" 
          leftIcon={<UnlockIcon />}
          onClick={handleDisconnect}
          isLoading={loading}
          loadingText="Disconnecting"
          mt={2}
        >
          Disconnect Wallet
        </Button>
      </VStack>
    </Box>
  );

  return (
    <>
      {isConnected ? (
        <ConnectedWalletInfo />
      ) : (
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg"
          display="flex"
          flexDirection="column"
          alignItems="center"
        >
          <Text mb={4}>Connect your wallet to access Bitcoin transactions.</Text>
          <Button 
            colorScheme="green" 
            leftIcon={<LockIcon />}
            onClick={onOpen}
            isLoading={loading}
            loadingText="Connecting"
          >
            Connect Wallet
          </Button>
        </Box>
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={() => {
          setConnectionStep(0);
          onClose();
        }}
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Ark Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Secure Connection</AlertTitle>
                  <AlertDescription>
                    Your private key never leaves your browser and is never stored permanently.
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl isInvalid={!!inputError}>
                <FormLabel>Private Key (hex format)</FormLabel>
                <InputGroup>
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder="Enter your private key"
                    value={privateKey}
                    onChange={(e) => {
                      setPrivateKey(e.target.value);
                      setInputError('');
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showKey ? 'Hide private key' : 'Show private key'}
                      icon={showKey ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      onClick={() => setShowKey(!showKey)}
                      size="sm"
                    />
                  </InputRightElement>
                </InputGroup>
                {inputError && <FormErrorMessage>{inputError}</FormErrorMessage>}
                <Text fontSize="xs" mt={1}>Format: 64 character hex string</Text>
              </FormControl>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Security Warning</AlertTitle>
                  <AlertDescription>
                    Never share your private key with anyone. This key controls all your funds.
                  </AlertDescription>
                </Box>
              </Alert>

              {connectionStep > 0 && (
                <Box w="100%">
                  <Progress 
                    value={(connectionStep / 3) * 100} 
                    size="sm" 
                    colorScheme="green" 
                    borderRadius="md"
                    mb={2}
                    isAnimated
                  />
                  {renderConnectionStep()}
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleConnect}
              isLoading={loading}
              loadingText="Connecting"
              isDisabled={connectionStep > 0}
            >
              Connect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default WalletConnect;
