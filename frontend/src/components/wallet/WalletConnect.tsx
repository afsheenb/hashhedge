// src/components/wallet/WalletConnect.tsx
import React, { useState } from 'react';
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
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { initializeWallet, disconnectWallet } from '../../features/wallet/arkWalletSlice';

const WalletConnect: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [inputError, setInputError] = useState('');
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, loading, error } = useAppSelector((state) => state.arkWallet);

  const handleConnect = async () => {
    // Basic validation
    if (!privateKey || privateKey.trim() === '') {
      setInputError('Private key is required');
      return;
    }

    if (!privateKey.match(/^[0-9a-fA-F]{64}$/)) {
      setInputError('Invalid private key format. Must be 64 hex characters.');
      return;
    }

    try {
      await dispatch(initializeWallet(privateKey)).unwrap();
      toast({
        title: 'Wallet connected',
        description: 'Your wallet has been successfully connected.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setPrivateKey('');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
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

  return (
    <>
      {isConnected ? (
        <Button 
          colorScheme="red" 
          variant="outline" 
          onClick={handleDisconnect}
          isLoading={loading}
          loadingText="Disconnecting"
        >
          Disconnect Wallet
        </Button>
      ) : (
        <Button 
          colorScheme="green" 
          onClick={onOpen}
          isLoading={loading}
          loadingText="Connecting"
        >
          Connect Wallet
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Ark Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                Enter your private key to connect your wallet. This key will be used to interact with the Ark protocol.
              </Text>
              <Text fontSize="sm" color="red.500">
                Warning: Never share your private key with anyone. This implementation is for demonstration purposes only.
              </Text>
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
              </FormControl>
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

// src/components/wallet/WalletStatus.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  Spinner,
  Flex,
  Tooltip,
  IconButton,
  useClipboard,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

const WalletStatus: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, addresses, balance, loading, error } = useAppSelector((state) => state.arkWallet);
  
  const { hasCopied: hasOnchainCopied, onCopy: onCopyOnchain } = useClipboard(addresses?.onchain || '');
  const { hasCopied: hasOffchainCopied, onCopy: onCopyOffchain } = useClipboard(addresses?.offchain || '');
  
  useEffect(() => {
    if (isConnected) {
      dispatch(fetchWalletBalance());
    }
  }, [dispatch, isConnected]);
  
  const handleRefreshBalance = () => {
    dispatch(fetchWalletBalance())
      .unwrap()
      .then(() => {
        toast({
          title: 'Balance refreshed',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: 'Failed to refresh balance',
          description: err,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };
  
  if (!isConnected) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Text>Wallet not connected. Connect your wallet to view balance and addresses.</Text>
      </Box>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch" spacing={4}>
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold" fontSize="lg">Wallet Status</Text>
          <HStack>
            <Badge colorScheme="green">Connected</Badge>
            <Tooltip label="Refresh balance">
              <IconButton
                aria-label="Refresh balance"
                icon={<RepeatIcon />}
                size="sm"
                onClick={handleRefreshBalance}
                isLoading={loading}
              />
            </Tooltip>
          </HStack>
        </Flex>
        
        <Box>
          <Text fontWeight="semibold" mb={2}>Bitcoin Addresses</Text>
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Text fontSize="sm" color="gray.500">On-chain:</Text>
              <Text fontSize="sm" fontFamily="mono" noOfLines={1} maxW="60%">
                {addresses?.onchain}
              </Text>
              <Tooltip label={hasOnchainCopied ? "Copied!" : "Copy address"}>
                <IconButton
                  aria-label="Copy on-chain address"
                  icon={hasOnchainCopied ? <CheckIcon /> : <CopyIcon />}
                  size="xs"
                  onClick={onCopyOnchain}
                />
              </Tooltip>
            </HStack>
            <HStack>
              <Text fontSize="sm" color="gray.500">Off-chain (Ark):</Text>
              <Text fontSize="sm" fontFamily="mono" noOfLines={1} maxW="60%">
                {addresses?.offchain}
              </Text>
              <Tooltip label={hasOffchainCopied ? "Copied!" : "Copy address"}>
                <IconButton
                  aria-label="Copy off-chain address"
                  icon={hasOffchainCopied ? <CheckIcon /> : <CopyIcon />}
                  size="xs"
                  onClick={onCopyOffchain}
                />
              </Tooltip>
            </HStack>
          </VStack>
        </Box>
        
        {loading ? (
          <Flex justify="center" py={4}>
            <Spinner />
          </Flex>
        ) : (
          <Box>
            <Text fontWeight="semibold" mb={2}>Balance</Text>
            <HStack justify="space-between">
              <Text color="gray.500">Total:</Text>
              <Text fontWeight="bold">{balance ? formatSats(balance.total) : '0'} sats</Text>
            </HStack>
            
            <Box mt={3}>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>On-chain</Text>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Confirmed:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.onchain.confirmed) : '0'} sats</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Unconfirmed:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.onchain.unconfirmed) : '0'} sats</Text>
              </HStack>
            </Box>
            
            <Box mt={3}>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>Off-chain (Ark)</Text>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Settled:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.offchain.settled) : '0'} sats</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Pending:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.offchain.pending) : '0'} sats</Text>
              </HStack>
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

// Helper function to format satoshis
const formatSats = (sats: number): string => {
  return sats.toLocaleString();
};

export default WalletStatus;

// src/components/wallet/DepositWithdraw.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Flex,
  RadioGroup,
  Radio,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  sendBitcoin,
  sendOffchain,
  fetchWalletBalance,
} from '../../features/wallet/arkWalletSlice';

const DepositWithdraw: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [txMethod, setTxMethod] = useState<'auto' | 'onchain' | 'offchain'>('auto');
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, addresses, balance, loading } = useAppSelector((state) => state.arkWallet);
  
  // Handle withdrawal
  const handleWithdraw = async () => {
    // Reset errors
    setAddressError('');
    setAmountError('');
    
    // Validate address
    if (!withdrawAddress || withdrawAddress.trim() === '') {
      setAddressError('Address is required');
      return;
    }
    
    // Validate address format (basic check)
    if (!withdrawAddress.startsWith('tb1') && !withdrawAddress.startsWith('bc1') && !withdrawAddress.startsWith('ark1') && !withdrawAddress.startsWith('tark1')) {
      setAddressError('Invalid address format');
      return;
    }
    
    // Validate amount
    if (withdrawAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return;
    }
    
    if (!balance || withdrawAmount > balance.total) {
      setAmountError('Insufficient balance');
      return;
    }
    
    try {
      let txid;
      
      if (txMethod === 'auto') {
        txid = await dispatch(sendBitcoin({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: 1 // Default fee rate, could be made configurable
        })).unwrap();
      } else if (txMethod === 'onchain') {
        // In a real implementation, we'd use the wallet.sendOnchain method
        txid = await dispatch(sendBitcoin({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: 1
        })).unwrap();
      } else if (txMethod === 'offchain') {
        txid = await dispatch(sendOffchain({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: 1
        })).unwrap();
      }
      
      toast({
        title: 'Withdrawal successful',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setWithdrawAddress('');
      setWithdrawAmount(0);
      
      // Refresh balance
      dispatch(fetchWalletBalance());
    } catch (err) {
      toast({
        title: 'Withdrawal failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  if (!isConnected) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Text>Connect your wallet to deposit or withdraw funds.</Text>
      </Box>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="blue">
        <TabList>
          <Tab>Deposit</Tab>
          <Tab>Withdraw</Tab>
        </TabList>
        <TabPanels>
          {/* Deposit Panel */}
          <TabPanel px={0}>
            <VStack align="stretch" spacing={4}>
              <Text>
                Send Bitcoin to either of these addresses to fund your wallet:
              </Text>
              
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontWeight="semibold" mb={2}>Bitcoin On-chain Address</Text>
                <Text fontFamily="mono" wordBreak="break-all">
                  {addresses?.onchain}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Regular Bitcoin transactions. More secure but higher fees.
                </Text>
              </Box>
              
              <Box p={4} borderWidth="1px" borderRadius="md">
                <Text fontWeight="semibold" mb={2}>Ark Off-chain Address</Text>
                <Text fontFamily="mono" wordBreak="break-all">
                  {addresses?.offchain}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Layer 2 transactions. Faster and cheaper for trading.
                </Text>
              </Box>
              
              <Alert status="info">
                <AlertIcon />
                After sending funds, they will appear in your balance once confirmed.
              </Alert>
            </VStack>
          </TabPanel>
          
          {/* Withdraw Panel */}
          <TabPanel px={0}>
            <VStack align="stretch" spacing={4}>
              <FormControl isInvalid={!!addressError}>
                <FormLabel>Recipient Address</FormLabel>
                <Input
                  placeholder="Bitcoin or Ark address"
                  value={withdrawAddress}
                  onChange={(e) => {
                    setWithdrawAddress(e.target.value);
                    setAddressError('');
                  }}
                />
                {addressError && <FormErrorMessage>{addressError}</FormErrorMessage>}
              </FormControl>
              
              <FormControl isInvalid={!!amountError}>
                <FormLabel>Amount (sats)</FormLabel>
                <NumberInput
                  min={0}
                  max={balance?.total || 0}
                  value={withdrawAmount}
                  onChange={(_, value) => {
                    setWithdrawAmount(value);
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
              
              <FormControl>
                <FormLabel>Transaction Method</FormLabel>
                <RadioGroup value={txMethod} onChange={(value: 'auto' | 'onchain' | 'offchain') => setTxMethod(value)}>
                  <VStack align="start" spacing={2}>
                    <Radio value="auto">Automatic (based on address)</Radio>
                    <Radio value="onchain">On-chain (higher fees, more secure)</Radio>
                    <Radio value="offchain">Off-chain (lower fees, faster)</Radio>
                  </VStack>
                </RadioGroup>
              </FormControl>
              
              <Flex justify="flex-end">
                <Button
                  colorScheme="blue"
                  onClick={handleWithdraw}
                  isLoading={loading}
                  loadingText="Processing"
                  isDisabled={!withdrawAddress || withdrawAmount <= 0 || !balance || withdrawAmount > balance.total}
                >
                  Withdraw
                </Button>
              </Flex>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DepositWithdraw;
import React, { useState } from 'react';
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
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { initializeWallet, disconnectWallet } from '../../features/wallet/arkWalletSlice';

const WalletConnect: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [privateKey, setPrivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [inputError, setInputError] = useState('');
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, loading, error } = useAppSelector((state) => state.arkWallet);

  const handleConnect = async () => {
    // Basic validation
    if (!privateKey || privateKey.trim() === '') {
      setInputError('Private key is required');
      return;
    }

    if (!privateKey.match(/^[0-9a-fA-F]{64}$/)) {
      setInputError('Invalid private key format. Must be 64 hex characters.');
      return;
    }

    try {
      await dispatch(initializeWallet(privateKey)).unwrap();
      toast({
        title: 'Wallet connected',
        description: 'Your wallet has been successfully connected.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setPrivateKey('');
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
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

  return (
    <>
      {isConnected ? (
        <Button 
          colorScheme="red" 
          variant="outline" 
          onClick={handleDisconnect}
          isLoading={loading}
          loadingText="Disconnecting"
        >
          Disconnect Wallet
        </Button>
      ) : (
        <Button 
          colorScheme="green" 
          onClick={onOpen}
          isLoading={loading}
          loadingText="Connecting"
        >
          Connect Wallet
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Ark Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                Enter your private key to connect your wallet. This key will be used to interact with the Ark protocol.
              </Text>
              <Text fontSize="sm" color="red.500">
                Warning: Never share your private key with anyone. This implementation is for demonstration purposes only.
              </Text>
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
              </FormControl>
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

