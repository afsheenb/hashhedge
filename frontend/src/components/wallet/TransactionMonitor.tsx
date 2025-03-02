// src/components/wallet/TransactionMonitor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Progress,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  Code,
  Collapse,
  useDisclosure,
  Flex,
  Spacer,
  IconButton,
  Tooltip,
  useToast,
  useColorMode,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  RepeatIcon, 
  ExternalLinkIcon, 
  WarningIcon,
  CheckCircleIcon,
  TimeIcon,
} from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { 
  checkTransactionStatus, 
  retryTransaction, 
  clearFailedTransaction,
  fetchTransactionHistory,
} from '../../features/wallet/arkWalletSlice';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'contract';
  amount: number;
  fee: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  confirmations: number;
  address: string;
  recovery_attempts?: number;
  error_message?: string;
}

const TransactionMonitor: React.FC = () => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { colorMode } = useColorMode();
  
  const { 
    pendingTransactions, 
    failedTransactions, 
    transactionHistory 
  } = useAppSelector((state) => state.arkWallet);
  
  const { 
    isOpen: isRetryModalOpen, 
    onOpen: openRetryModal, 
    onClose: closeRetryModal 
  } = useDisclosure();
  
  // Fetch transaction history on component mount
  useEffect(() => {
    dispatch(fetchTransactionHistory());
  }, [dispatch]);
  
  // Periodically check pending transactions
  useEffect(() => {
    if (pendingTransactions.length === 0) return;
    
    const intervalId = setInterval(() => {
      pendingTransactions.forEach(txId => {
        dispatch(checkTransactionStatus(txId));
      });
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(intervalId);
  }, [pendingTransactions, dispatch]);
  
  // Toggle transaction details expansion
  const toggleTxDetails = (txId: string) => {
    if (expandedTxId === txId) {
      setExpandedTxId(null);
    } else {
      setExpandedTxId(txId);
    }
  };
  
  // Handle transaction retry
  const handleRetryTransaction = async () => {
    if (!selectedTx) return;
    
    setIsLoading(true);
    
    try {
      await dispatch(retryTransaction(selectedTx.id)).unwrap();
      
      toast({
        title: 'Transaction retry initiated',
        description: 'We will attempt to rebroadcast your transaction',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      closeRetryModal();
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err.message || 'Unable to retry transaction',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clearing a failed transaction
  const handleClearTransaction = async (txId: string) => {
    try {
      await dispatch(clearFailedTransaction(txId)).unwrap();
      
      toast({
        title: 'Transaction cleared',
        description: 'The failed transaction has been removed from your history',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      if (selectedTx?.id === txId) {
        closeRetryModal();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to clear transaction',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Prepare the retry modal for a specific transaction
  const prepareRetryModal = (tx: Transaction) => {
    setSelectedTx(tx);
    openRetryModal();
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };
  
  // Format sat amount
  const formatAmount = (amount: number) => {
    return amount >= 100000 
      ? `${(amount / 100000).toFixed(3)} mBTC` 
      : `${amount.toLocaleString()} sats`;
  };
  
  // Render transaction status indicators
  const renderTransactionStatus = () => {
    const pendingCount = pendingTransactions.length;
    const failedCount = failedTransactions.length;
    
    if (pendingCount === 0 && failedCount === 0) {
      return (
        <Alert status="success" variant="subtle" mb={4}>
          <AlertIcon as={CheckCircleIcon} />
          <Box>
            <AlertTitle>All Transactions Complete</AlertTitle>
            <AlertDescription>
              You have no pending or failed transactions to monitor.
            </AlertDescription>
          </Box>
        </Alert>
      );
    }
    
    return (
      <VStack spacing={3} align="stretch" mb={4}>
        {pendingCount > 0 && (
          <Alert status="info" variant="left-accent">
            <AlertIcon />
            <Box>
              <AlertTitle>{pendingCount} Pending Transaction{pendingCount !== 1 ? 's' : ''}</AlertTitle>
              <AlertDescription>
                These transactions are waiting for confirmation on the blockchain.
              </AlertDescription>
            </Box>
          </Alert>
        )}
        
        {failedCount > 0 && (
          <Alert status="error" variant="left-accent">
            <AlertIcon />
            <Box>
              <AlertTitle>{failedCount} Failed Transaction{failedCount !== 1 ? 's' : ''}</AlertTitle>
              <AlertDescription>
                These transactions failed to complete and may need to be retried or cleared.
              </AlertDescription>
            </Box>
          </Alert>
        )}
      </VStack>
    );
  };
  
  return (
    <Box>
      <Heading size="md" mb={4}>Transaction Monitor</Heading>
      
      {renderTransactionStatus()}
      
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Pending ({pendingTransactions.length})</Tab>
          <Tab>Failed ({failedTransactions.length})</Tab>
          <Tab>History</Tab>
        </TabList>
        
        <TabPanels>
          {/* Pending Transactions Tab */}
          <TabPanel px={0} py={4}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th></Th>
                  <Th>ID</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Time</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingTransactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center">No pending transactions</Td>
                  </Tr>
                ) : (
                  transactionHistory
                    .filter(tx => pendingTransactions.includes(tx.id))
                    .map((tx) => (
                      <React.Fragment key={tx.id}>
                        <Tr>
                          <Td width="40px">
                            <IconButton
                              aria-label="Toggle details"
                              icon={expandedTxId === tx.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => toggleTxDetails(tx.id)}
                            />
                          </Td>
                          <Td fontFamily="mono" fontSize="xs">{tx.id.substring(0, 10)}...</Td>
                          <Td>
                            <Badge>{tx.type}</Badge>
                          </Td>
                          <Td>{formatAmount(tx.amount)}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(tx.status)}>
                              {tx.status}
                              {tx.status === 'pending' && (
                                <Spinner size="xs" ml={1} />
                              )}
                            </Badge>
                          </Td>
                          <Td>{new Date(tx.timestamp).toLocaleString()}</Td>
                          <Td>
                            <Tooltip label="Check status">
                              <IconButton
                                aria-label="Check status"
                                icon={<RepeatIcon />}
                                size="xs"
                                onClick={() => dispatch(checkTransactionStatus(tx.id))}
                              />
                            </Tooltip>
                          </Td>
                        </Tr>
                        <Tr>
                          <Td colSpan={7} p={0}>
                            <Collapse in={expandedTxId === tx.id} animateOpacity>
                              <Box 
                                p={3} 
                                bg={colorMode === 'light' ? "gray.50" : "gray.700"}
                                borderBottomWidth="1px"
                              >
                                <Text fontWeight="bold" mb={1}>Transaction Details</Text>
                                <Text fontSize="sm" mb={1}>Address: {tx.address}</Text>
                                <Text fontSize="sm" mb={1}>Fee: {formatAmount(tx.fee)}</Text>
                                <Text fontSize="sm">Confirmations: {tx.confirmations}</Text>
                                <Flex mt={2}>
                                  <Link 
                                    href={`https://mempool.space/tx/${tx.id}`} 
                                    isExternal 
                                    fontSize="sm"
                                    color="blue.500"
                                  >
                                    View on Explorer <ExternalLinkIcon mx="2px" />
                                  </Link>
                                </Flex>
                              </Box>
                            </Collapse>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    ))
                )}
              </Tbody>
            </Table>
          </TabPanel>
          
          {/* Failed Transactions Tab */}
          <TabPanel px={0} py={4}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th></Th>
                  <Th>ID</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Error</Th>
                  <Th>Attempts</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {failedTransactions.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center">No failed transactions</Td>
                  </Tr>
                ) : (
                  transactionHistory
                    .filter(tx => failedTransactions.includes(tx.id))
                    .map((tx) => (
                      <React.Fragment key={tx.id}>
                        <Tr>
                          <Td width="40px">
                            <IconButton
                              aria-label="Toggle details"
                              icon={expandedTxId === tx.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => toggleTxDetails(tx.id)}
                            />
                          </Td>
                          <Td fontFamily="mono" fontSize="xs">{tx.id.substring(0, 10)}...</Td>
                          <Td>
                            <Badge>{tx.type}</Badge>
                          </Td>
                          <Td>{formatAmount(tx.amount)}</Td>
                          <Td>
                            <Text fontSize="xs" noOfLines={1} maxW="120px">
                              {tx.error_message || 'Unknown error'}
                            </Text>
                          </Td>
                          <Td>
                            <Badge colorScheme={tx.recovery_attempts >= 3 ? 'red' : 'yellow'}>
                              {tx.recovery_attempts || 0}/3
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <Tooltip label="Retry transaction">
                                <IconButton
                                  aria-label="Retry transaction"
                                  icon={<RepeatIcon />}
                                  size="xs"
                                  isDisabled={tx.recovery_attempts >= 3}
                                  onClick={() => prepareRetryModal(tx)}
                                />
                              </Tooltip>
                              <Tooltip label="Clear transaction">
                                <IconButton
                                  aria-label="Clear transaction"
                                  icon={<CloseIcon />}
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleClearTransaction(tx.id)}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                        <Tr>
                          <Td colSpan={7} p={0}>
                            <Collapse in={expandedTxId === tx.id} animateOpacity>
                              <Box 
                                p={3} 
                                bg={colorMode === 'light' ? "gray.50" : "gray.700"}
                                borderBottomWidth="1px"
                              >
                                <Text fontWeight="bold" mb={1}>Error Details</Text>
                                <Alert status="error" size="sm" mb={2}>
                                  <AlertIcon />
                                  {tx.error_message || 'Unknown error occurred during transaction processing'}
                                </Alert>
                                <Text fontSize="sm" mb={1}>Address: {tx.address}</Text>
                                <Text fontSize="sm" mb={1}>Fee: {formatAmount(tx.fee)}</Text>
                                <Text fontSize="sm" mb={1}>
                                  Time: {new Date(tx.timestamp).toLocaleString()}
                                </Text>
                                <Text fontSize="sm" mb={1}>
                                  Recovery Attempts: {tx.recovery_attempts || 0}/3
                                </Text>
                                {tx.recovery_attempts >= 3 && (
                                  <Text fontSize="sm" color="red.500">
                                    Maximum retry attempts reached. Please clear this transaction.
                                  </Text>
                                )}
                              </Box>
                            </Collapse>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    ))
                )}
              </Tbody>
            </Table>
          </TabPanel>
          
          {/* Transaction History Tab */}
          <TabPanel px={0} py={4}>
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th></Th>
                  <Th>ID</Th>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Time</Th>
                </Tr>
              </Thead>
              <Tbody>
                {transactionHistory.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center">No transaction history</Td>
                  </Tr>
                ) : (
                  transactionHistory
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10) // Show only the latest 10 transactions
                    .map((tx) => (
                      <React.Fragment key={tx.id}>
                        <Tr>
                          <Td width="40px">
                            <IconButton
                              aria-label="Toggle details"
                              icon={expandedTxId === tx.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => toggleTxDetails(tx.id)}
                            />
                          </Td>
                          <Td fontFamily="mono" fontSize="xs">{tx.id.substring(0, 10)}...</Td>
                          <Td>
                            <Badge>{tx.type}</Badge>
                          </Td>
                          <Td>{formatAmount(tx.amount)}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(tx.status)}>
                              {tx.status}
                            </Badge>
                          </Td>
                          <Td>{new Date(tx.timestamp).toLocaleString()}</Td>
                        </Tr>
                        <Tr>
                          <Td colSpan={6} p={0}>
                            <Collapse in={expandedTxId === tx.id} animateOpacity>
                              <Box 
                                p={3} 
                                bg={colorMode === 'light' ? "gray.50" : "gray.700"}
                                borderBottomWidth="1px"
                              >
                                <Flex justify="space-between" align="center" mb={2}>
                                  <Text fontWeight="bold">Transaction Details</Text>
                                  <Link 
                                    href={`https://mempool.space/tx/${tx.id}`} 
                                    isExternal 
                                    fontSize="sm"
                                    color="blue.500"
                                  >
                                    View on Explorer <ExternalLinkIcon mx="2px" />
                                  </Link>
                                </Flex>
                                <Text fontSize="sm" mb={1}>Address: {tx.address}</Text>
                                <Text fontSize="sm" mb={1}>Fee: {formatAmount(tx.fee)}</Text>
                                <Text fontSize="sm">Confirmations: {tx.confirmations}</Text>
                              </Box>
                            </Collapse>
                          </Td>
                        </Tr>
                      </React.Fragment>
                    ))
                )}
              </Tbody>
            </Table>
            {transactionHistory.length > 10 && (
              <Text fontSize="sm" textAlign="center" mt={2} color="gray.500">
                Showing 10 most recent transactions of {transactionHistory.length} total
              </Text>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Retry Transaction Modal */}
      <Modal isOpen={isRetryModalOpen} onClose={closeRetryModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Retry Failed Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedTx && (
              <VStack spacing={4} align="stretch">
                <Alert status="warning">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Transaction Recovery</AlertTitle>
                    <AlertDescription>
                      You are about to retry a failed transaction. This will attempt to rebroadcast
                      the transaction to the network.
                    </AlertDescription>
                  </Box>
                </Alert>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Transaction Details</Text>
                  <Text fontSize="sm" mb={1}>ID: {selectedTx.id}</Text>
                  <Text fontSize="sm" mb={1}>Type: {selectedTx.type}</Text>
                  <Text fontSize="sm" mb={1}>Amount: {formatAmount(selectedTx.amount)}</Text>
                  <Text fontSize="sm" mb={1}>Fee: {formatAmount(selectedTx.fee)}</Text>
                  <Text fontSize="sm" mb={1}>Address: {selectedTx.address}</Text>
                  <Text fontSize="sm" color="red.500">
                    Error: {selectedTx.error_message || 'Unknown error'}
                  </Text>
                </Box>
                
                <Alert status="info" size="sm">
                  <AlertIcon />
                  Recovery attempt {(selectedTx.recovery_attempts || 0) + 1} of 3
                </Alert>
                
                {selectedTx.recovery_attempts >= 3 && (
                  <Alert status="error">
                    <AlertIcon />
                    Maximum retry attempts reached. Consider creating a new transaction instead.
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeRetryModal}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleRetryTransaction}
              isLoading={isLoading}
              loadingText="Retrying"
              isDisabled={!selectedTx || selectedTx.recovery_attempts >= 3}
            >
              Retry Transaction
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TransactionMonitor;
