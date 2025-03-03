import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  Heading,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  useColorMode,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronDownIcon, ExternalLinkIcon, WarningIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  connectWallet,
  disconnectWallet,
  fetchWalletBalance,
  reconnectWallet
} from '../../features/wallet/arkWalletSlice';

/**
 * WalletConnect component provides wallet connection functionality
 * and status display for the ARK protocol wallet integration.
 */
const WalletConnect: React.FC = () => {
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [checkingASP, setCheckingASP] = useState(false);
  const [aspStatus, setAspStatus] = useState<boolean | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { colorMode } = useColorMode();
  
  const dispatch = useAppDispatch();
  const { isConnected, balance, loading, walletType, error, walletAddress } = 
    useAppSelector((state) => state.arkWallet);
  
  // Check ASP status when component mounts and periodically
  useEffect(() => {
    const checkASPStatus = async () => {
      setCheckingASP(true);
      try {
        // Replace with actual API call to check ASP status
        const response = await fetch('/api/v1/status/asp');
        const data = await response.json();
        setAspStatus(data.isAvailable);
      } catch (error) {
        console.error('Failed to check ASP status:', error);
        setAspStatus(false);
      } finally {
        setCheckingASP(false);
      }
    };
    
    // Check initially
    checkASPStatus();
    
    // Set up interval for periodic checks
    const intervalId = setInterval(checkASPStatus, 60000); // Check every minute
    
    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Auto-reconnect wallet if previously connected
  useEffect(() => {
    const attemptReconnect = async () => {
      if (!isConnected && localStorage.getItem('walletConnected') === 'true') {
        try {
          await dispatch(reconnectWallet()).unwrap();
        } catch (error) {
          // Silent failure is acceptable for auto-reconnect
          localStorage.removeItem('walletConnected');
        }
      }
    };
    
    attemptReconnect();
  }, [dispatch, isConnected]);
  
  // Refresh balance periodically when connected
  useEffect(() => {
    if (isConnected) {
      const intervalId = setInterval(() => {
        dispatch(fetchWalletBalance());
      }, 30000); // Update every 30 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [dispatch, isConnected]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    try {
      await dispatch(connectWallet()).unwrap();
      localStorage.setItem('walletConnected', 'true');
      toast({
        title: 'Wallet connected',
        description: 'Your wallet has been successfully connected',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      let errorMessage = 'Failed to connect wallet';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast({
        title: 'Connection failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setConnectingWallet(false);
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = async () => {
    try {
      await dispatch(disconnectWallet()).unwrap();
      localStorage.removeItem('walletConnected');
      toast({
        title: 'Wallet disconnected',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle wallet balance refresh
  const handleRefreshBalance = useCallback(() => {
    dispatch(fetchWalletBalance());
    toast({
      title: 'Refreshing balance',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [dispatch, toast]);

  // Render wallet status modal
  const renderWalletStatusModal = () => (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Wallet Status</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}>
              <Heading size="sm" mb={3}>Connection</Heading>
              <HStack justify="space-between">
                <Text>Status:</Text>
                <Badge colorScheme={isConnected ? 'green' : 'red'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </HStack>
              <HStack justify="space-between" mt={2}>
                <Text>Wallet Type:</Text>
                <Text>{walletType || 'None'}</Text>
              </HStack>
              {walletAddress && (
                <HStack justify="space-between" mt={2}>
                  <Text>Address:</Text>
                  <Text fontSize="sm" fontFamily="monospace">{walletAddress}</Text>
                </HStack>
              )}
            </Box>
            
            <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}>
              <Heading size="sm" mb={3}>ARK Service Provider</Heading>
              <HStack justify="space-between">
                <Text>Status:</Text>
                {checkingASP ? (
                  <Spinner size="sm" />
                ) : (
                  <Badge colorScheme={aspStatus ? 'green' : 'red'}>
                    {aspStatus ? 'Available' : 'Unavailable'}
                  </Badge>
                )}
              </HStack>
              {!aspStatus && (
                <Alert status="warning" mt={2} size="sm">
                  <AlertIcon />
                  <Text fontSize="sm">
                    ARK Service Provider is currently unavailable. Emergency exit options are available.
                  </Text>
                </Alert>
              )}
            </Box>
            
            {isConnected && (
              <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === 'light' ? 'gray.50' : 'gray.700'}>
                <Heading size="sm" mb={3}>Balance</Heading>
                {loading ? (
                  <Spinner />
                ) : (
                  <>
                    <HStack justify="space-between">
                      <Text>Total:</Text>
                      <Text fontWeight="bold">{balance?.total?.toLocaleString() || 0} sats</Text>
                    </HStack>
                    <HStack justify="space-between" mt={2}>
                      <Text>Available:</Text>
                      <Text>{balance?.available?.toLocaleString() || 0} sats</Text>
                    </HStack>
                    <HStack justify="space-between" mt={2}>
                      <Text>Locked:</Text>
                      <Text>{balance?.locked?.toLocaleString() || 0} sats</Text>
                    </HStack>
                    <HStack justify="space-between" mt={2}>
                      <Text>Pending:</Text>
                      <Text>{balance?.pending?.toLocaleString() || 0} sats</Text>
                    </HStack>
                    <Button size="sm" mt={4} onClick={handleRefreshBalance} isLoading={loading}>
                      Refresh Balance
                    </Button>
                  </>
                )}
              </Box>
            )}
            
            {error && (
              <Alert status="error">
                <AlertIcon />
                <Text>{error}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          {isConnected ? (
            <Button colorScheme="red" onClick={handleDisconnectWallet}>
              Disconnect Wallet
            </Button>
          ) : (
            <Button colorScheme="blue" onClick={handleConnectWallet} isLoading={connectingWallet}>
              Connect Wallet
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  // Main button component
  return (
    <>
      {isConnected ? (
        <Menu>
          <MenuButton 
            as={Button} 
            rightIcon={<ChevronDownIcon />}
            leftIcon={<CheckCircleIcon color="green.500" />}
            variant="outline"
            colorScheme="blue"
          >
            {balance?.available?.toLocaleString() || 0} sats
          </MenuButton>
          <MenuList>
            <MenuItem onClick={onOpen}>Wallet Status</MenuItem>
            <MenuItem onClick={handleRefreshBalance} isDisabled={loading}>
              Refresh Balance
            </MenuItem>
            <MenuItem as="a" href="/wallet" icon={<ExternalLinkIcon />}>
              Manage Wallet
            </MenuItem>
            {!aspStatus && (
              <MenuItem as="a" href="/emergency-exit" icon={<WarningIcon color="red.500" />}>
                Emergency Exit
              </MenuItem>
            )}
            <Divider my={2} />
            <MenuItem onClick={handleDisconnectWallet} color="red.500">
              Disconnect
            </MenuItem>
          </MenuList>
        </Menu>
      ) : (
        <Tooltip hasArrow label={connectingWallet ? 'Connecting...' : 'Connect your wallet to use the platform'}>
          <Button
            colorScheme="blue"
            onClick={handleConnectWallet}
            isLoading={connectingWallet}
            loadingText="Connecting"
          >
            Connect Wallet
          </Button>
        </Tooltip>
      )}
      
      {renderWalletStatusModal()}
    </>
  );
};

export default WalletConnect;
