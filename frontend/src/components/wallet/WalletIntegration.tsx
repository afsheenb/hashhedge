// src/components/wallet/WalletIntegration.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Text,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Code,
  Link,
  Flex,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Heading,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { 
  CheckCircleIcon, 
  ExternalLinkIcon, 
  WarningIcon, 
  InfoIcon,
  DownloadIcon,
  LockIcon,
  UnlockIcon
} from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  initializeWallet,
  disconnectWallet,
  fetchWalletBalance,
  reconnectWallet,
  checkTransactionStatus,
  executeEmergencyExit,
  downloadExitTransactions,
} from '../../features/wallet/arkWalletSlice';

// Custom component to handle wallet connection, reconnection, and error recovery
const WalletIntegration: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    isConnected,
    loading,
    error,
    connectionStatus,
    pendingTransactions,
    reconnectAttempts,
    exitInfo,
  } = useAppSelector((state) => state.arkWallet);
  
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasConnectionDropped, setHasConnectionDropped] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [isEmergencyExiting, setIsEmergencyExiting] = useState(false);
  
  const toast = useToast();
  const { 
    isOpen: isErrorModalOpen, 
    onOpen: openErrorModal, 
    onClose: closeErrorModal 
  } = useDisclosure();
  
  const { 
    isOpen: isTransactionModalOpen, 
    onOpen: openTransactionModal, 
    onClose: closeTransactionModal 
  } = useDisclosure();
  
  const {
    isOpen: isEmergencyModalOpen,
    onOpen: openEmergencyModal,
    onClose: closeEmergencyModal
  } = useDisclosure();
  
  // Format date utility
  const formatDate = (timestamp: number | string | undefined) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Calculate if timelock is expired
  const isTimelockExpired = exitInfo?.timelockExpiry 
    ? new Date(exitInfo.timelockExpiry) <= new Date() 
    : false;
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial state
    setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Effect to handle network reconnection
  useEffect(() => {
    if (networkStatus === 'online' && hasConnectionDropped && isConnected) {
      setIsReconnecting(true);
      
      dispatch(reconnectWallet())
        .unwrap()
        .then(() => {
          toast({
            title: 'Wallet reconnected',
            description: 'Your wallet connection has been restored',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          
          // Refresh wallet data
          dispatch(fetchWalletBalance());
        })
        .catch((err) => {
          toast({
            title: 'Reconnection failed',
            description: 'Please try reconnecting your wallet manually',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          openErrorModal();
        })
        .finally(() => {
          setIsReconnecting(false);
          setHasConnectionDropped(false);
        });
    }
  }, [networkStatus, hasConnectionDropped, isConnected, dispatch, toast, openErrorModal]);
  
  // Effect to set connection drop flag
  useEffect(() => {
    if (networkStatus === 'offline' && isConnected) {
      setHasConnectionDropped(true);
      
      toast({
        title: 'Network connection lost',
        description: 'Reconnecting when network is available',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [networkStatus, isConnected, toast]);
  
  // Check pending transactions status periodically
  useEffect(() => {
    if (!isConnected || pendingTransactions.length === 0) return;
    
    const intervalId = setInterval(() => {
      pendingTransactions.forEach(txId => {
        dispatch(checkTransactionStatus(txId));
      });
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isConnected, pendingTransactions, dispatch]);
  
  // Handle manual wallet reconnection
  const handleReconnect = async () => {
    setIsReconnecting(true);
    
    try {
      await dispatch(reconnectWallet()).unwrap();
      
      toast({
        title: 'Wallet reconnected',
        description: 'Your wallet connection has been restored',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh wallet data
      dispatch(fetchWalletBalance());
      closeErrorModal();
    } catch (error) {
      toast({
        title: 'Reconnection failed',
        description: 'Please try disconnecting and connecting your wallet again',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsReconnecting(false);
    }
  };
  
  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await dispatch(disconnectWallet()).unwrap();
      
      toast({
        title: 'Wallet disconnected',
        description: 'Your wallet has been disconnected',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      closeErrorModal();
    } catch (error) {
      toast({
        title: 'Disconnect failed',
        description: 'There was an issue disconnecting your wallet',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Handle emergency exit
  const handleEmergencyExit = async () => {
    setIsEmergencyExiting(true);
    
    try {
      const txid = await dispatch(executeEmergencyExit({ 
        feeRate: 5, // Default to 5 sat/vB
      })).unwrap();
      
      toast({
        title: 'Emergency exit initiated',
        description: `Your funds are being withdrawn. Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      closeEmergencyModal();
    } catch (err) {
      toast({
        title: 'Emergency exit failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsEmergencyExiting(false);
    }
  };
  
  // Handle downloading exit transactions
  const handleDownloadExitTx = async () => {
    try {
      await dispatch(downloadExitTransactions()).unwrap();
      
      toast({
        title: 'Exit transactions downloaded',
        description: 'Save these files in a secure location for emergency use',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Check pending transactions
  const handleCheckPendingTransactions = () => {
    if (pendingTransactions.length > 0) {
      openTransactionModal();
    } else {
      toast({
        title: 'No pending transactions',
        description: 'All your transactions have been processed',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Render wallet connection status
  const renderConnectionStatus = () => {
    if (!isConnected) {
      return (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>
              Connect your wallet to use the platform's full functionality
            </AlertDescription>
          </Box>
        </Alert>
      );
    }
    
    if (hasConnectionDropped) {
      return (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Connection interrupted</AlertTitle>
            <AlertDescription>
              {networkStatus === 'offline' 
                ? 'Waiting for network connection to restore wallet' 
                : 'Attempting to reconnect your wallet'}
            </AlertDescription>
          </Box>
          {isReconnecting && <Spinner size="sm" />}
        </Alert>
      );
    }
    
    if (error) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Wallet error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
          <Button size="sm" onClick={openErrorModal}>Details</Button>
        </Alert>
      );
    }
    
    return (
      <Alert status="success" borderRadius="md">
        <AlertIcon as={CheckCircleIcon} />
        <Box flex="1">
          <AlertTitle>Wallet connected</AlertTitle>
          <AlertDescription>
            {pendingTransactions.length > 0 
              ? `You have ${pendingTransactions.length} pending transactions` 
              : 'Your wallet is ready to use'}
          </AlertDescription>
        </Box>
        {pendingTransactions.length > 0 && (
          <Button size="sm" onClick={handleCheckPendingTransactions}>
            Check Transactions
          </Button>
        )}
      </Alert>
    );
  };
  
  return (
    <Box>
      {renderConnectionStatus()}
      
      {/* Emergency Exit Panel */}
      {isConnected && exitInfo && (
        <Box mt={4} p={4} borderWidth="1px" borderRadius="lg" borderColor="orange.300">
          <Flex justify="space-between" align="center" mb={3}>
            <Heading size="sm">Exit Protection Status</Heading>
            <Badge 
              colorScheme={isTimelockExpired ? "green" : exitInfo.hasPreSignedExit ? "yellow" : "red"}
              fontSize="sm"
              px={2}
              py={1}
            >
              {isTimelockExpired 
                ? "Fully Unlocked" 
                : exitInfo.hasPreSignedExit 
                  ? "Protected" 
                  : "Limited"}
            </Badge>
          </Flex>
          
          <VStack align="stretch" spacing={3}>
            <HStack>
              <Icon 
                as={exitInfo.hasPreSignedExit ? CheckCircleIcon : WarningIcon} 
                color={exitInfo.hasPreSignedExit ? "green.500" : "orange.500"} 
              />
              <Text fontSize="sm">
                Pre-signed Exit Transaction: {exitInfo.hasPreSignedExit ? "Available" : "Not Available"}
              </Text>
            </HStack>
            
            <HStack>
              <Icon 
                as={isTimelockExpired ? UnlockIcon : LockIcon} 
                color={isTimelockExpired ? "green.500" : "yellow.500"} 
              />
              <Text fontSize="sm">
                Timelock Path: {isTimelockExpired ? "Unlocked" : "Locked until " + formatDate(exitInfo.timelockExpiry)}
              </Text>
            </HStack>
            
            <Flex justify="space-between" mt={2}>
              <Button 
                size="sm" 
                colorScheme="orange" 
                leftIcon={<WarningIcon />}
                onClick={openEmergencyModal}
                isDisabled={!exitInfo.hasPreSignedExit && !isTimelockExpired}
              >
                Emergency Exit
              </Button>
              
              <Button 
                size="sm" 
                leftIcon={<DownloadIcon />}
                onClick={handleDownloadExitTx}
                isDisabled={!exitInfo.hasPreSignedExit}
              >
                Download Exit Files
              </Button>
            </Flex>
          </VStack>
        </Box>
      )}
      
      {/* Security Explainer Accordion */}
      {isConnected && (
        <Accordion allowToggle mt={4}>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left" fontWeight="medium">
                  How Your Funds Are Protected
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={3}>
                <Text>
                  HashHedge uses cryptographic guarantees to ensure you always maintain control of your funds:
                </Text>
                <Box>
                  <Text fontWeight="bold">1. Pre-signed Exit Transactions</Text>
                  <Text>When you deposit, we create and sign an exit transaction you can broadcast any time.</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">2. Timelock Escape Paths</Text>
                  <Text>After the timelock expires, you can withdraw funds even without HashHedge's cooperation.</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">3. Automated Recovery</Text>
                  <Text>Our system monitors for expired contracts and automatically attempts recovery.</Text>
                </Box>
                <Link 
                  href="/security" 
                  color="blue.500"
                  display="inline-flex"
                  alignItems="center"
                >
                  Learn more about our security model <ExternalLinkIcon mx="2px" />
                </Link>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
      
      {/* Error Modal for recovery options */}
      <Modal isOpen={isErrorModalOpen} onClose={closeErrorModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Wallet Connection Issue</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="error" variant="left-accent">
                <AlertIcon />
                <Box>
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription>
                    {error || 'There was an issue with your wallet connection'}
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Text>
                This can happen due to network issues, wallet timeouts, or other technical problems.
                Please try the following recovery options:
              </Text>
              
              <Box>
                <Text fontWeight="bold" mb={2}>Reconnection Attempts: {reconnectAttempts}/3</Text>
                {reconnectAttempts < 3 ? (
                  <Button
                    colorScheme="blue"
                    onClick={handleReconnect}
                    isLoading={isReconnecting}
                    loadingText="Reconnecting"
                    width="full"
                    mb={3}
                  >
                    Reconnect Wallet
                  </Button>
                ) : (
                  <Alert status="warning" mb={3}>
                    <AlertIcon />
                    Maximum reconnection attempts reached. Please disconnect and connect again.
                  </Alert>
                )}
                
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={handleDisconnect}
                  width="full"
                >
                  Disconnect Wallet
                </Button>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeErrorModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Pending Transactions Modal */}
      <Modal isOpen={isTransactionModalOpen} onClose={closeTransactionModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Pending Transactions</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Text>
                The following transactions are currently pending confirmation:
              </Text>
              
              {pendingTransactions.map((txId, index) => (
                <Box 
                  key={txId} 
                  p={3} 
                  borderWidth="1px" 
                  borderRadius="md"
                  borderLeftWidth="4px"
                  borderLeftColor="orange.400"
                >
                  <Text fontWeight="bold">Transaction {index + 1}</Text>
                  <Text fontSize="sm" mb={1}>ID: {txId}</Text>
                  <Progress size="sm" isIndeterminate colorScheme="orange" mt={2} mb={2} />
                  <Text fontSize="sm" color="gray.500">
                    This transaction is waiting for confirmation. This process can take a few minutes.
                  </Text>
                  <Link href={`https://mempool.space/tx/${txId}`} isExternal fontSize="sm" mt={1} display="inline-flex" alignItems="center">
                    View on Mempool <ExternalLinkIcon mx="2px" />
                  </Link>
                </Box>
              ))}
              
              <Alert status="info">
                <AlertIcon />
                Transactions typically need 1-2 confirmations to be processed.
                You don't need to stay on this page - you'll be notified when they complete.
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeTransactionModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Emergency Exit Modal */}
      <Modal isOpen={isEmergencyModalOpen} onClose={closeEmergencyModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Emergency Exit Confirmation</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Alert status="warning" variant="solid">
                <AlertIcon />
                <Box>
                  <AlertTitle>Emergency Exit</AlertTitle>
                  <AlertDescription>
                    You are about to initiate an emergency withdrawal of your funds.
                    This should only be used in exceptional circumstances.
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Box p={4} borderWidth="1px" borderRadius="md" borderColor="orange.300">
                <Heading size="sm" mb={3}>What Will Happen</Heading>
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Icon as={WarningIcon} color="orange.500" />
                    <Text>All your funds will be withdrawn to your on-chain address</Text>
                  </HStack>
                  <HStack>
                    <Icon as={WarningIcon} color="orange.500" />
                    <Text>Any active contracts will be terminated</Text>
                  </HStack>
                  <HStack>
                    <Icon as={WarningIcon} color="orange.500" />
                    <Text>This action cannot be reversed</Text>
                  </HStack>
                </VStack>
              </Box>
              
              <Text>
                HashHedge guarantees you can always withdraw your funds. We've implemented
                multiple exit paths to ensure you maintain control at all times:
              </Text>
              
              <Box>
                {exitInfo?.hasPreSignedExit && (
                  <Alert status="success" mb={2}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Pre-signed Exit Transaction</AlertTitle>
                      <AlertDescription>
                        A transaction was created and pre-signed during onboarding to guarantee
                        you can exit anytime.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
                
                {isTimelockExpired ? (
                  <Alert status="success">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Timelock Path Active</AlertTitle>
                      <AlertDescription>
                        Your timelock has expired. You can unilaterally withdraw your funds
                        using just your key.
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : (
                  <Alert status="info">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Timelock Path</AlertTitle>
                      <AlertDescription>
                        After {formatDate(exitInfo?.timelockExpiry)}, you will be able to
                        unilaterally withdraw your funds even without HashHedge's cooperation.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeEmergencyModal}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={handleEmergencyExit}
              isLoading={isEmergencyExiting}
              loadingText="Processing"
              isDisabled={!exitInfo?.hasPreSignedExit && !isTimelockExpired}
            >
              Confirm Emergency Exit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default WalletIntegration;
