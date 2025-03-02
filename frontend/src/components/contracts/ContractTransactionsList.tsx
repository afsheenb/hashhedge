import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  IconButton,
  Collapse,
  useClipboard,
  useToast,
  Button,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { ContractTransaction } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { broadcastTx } from '../../store/contract-slice';

interface ContractTransactionsListProps {
  transactions: ContractTransaction[];
}

const ContractTransactionsList: React.FC<ContractTransactionsListProps> = ({ 
  transactions 
}) => {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<ContractTransaction | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const { onCopy, hasCopied, setValue } = useClipboard("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const dispatch = useAppDispatch();

  const toggleExpand = (txId: string) => {
    if (expandedTx === txId) {
      setExpandedTx(null);
    } else {
      setExpandedTx(txId);
    }
  };

  const handleCopyTxHex = (txHex: string) => {
    setValue(txHex);
    onCopy();
    toast({
      title: "Copied",
      description: "Transaction hex copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleBroadcastTx = (tx: ContractTransaction) => {
    // Validate transaction before opening modal
    if (!tx.tx_hex || tx.tx_hex.trim() === '') {
      toast({
        title: "Invalid transaction",
        description: "Transaction data is missing or invalid",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setSelectedTx(tx);
    setBroadcastError(null);
    onOpen();
  };

  const validateTransaction = (tx: ContractTransaction): boolean => {
    // Basic validation
    if (!tx) return false;
    if (!tx.id || !tx.contract_id) return false;
    if (!tx.tx_hex || tx.tx_hex.trim() === '') return false;
    
    // Additional validation could check tx format, etc.
    return true;
  };

  const confirmBroadcast = async () => {
    if (!selectedTx) return;
    
    // Validate transaction
    if (!validateTransaction(selectedTx)) {
      setBroadcastError("Invalid transaction data");
      return;
    }
    
    setIsBroadcasting(true);
    setBroadcastError(null);
    
    try {
      const result = await dispatch(broadcastTx({
        contractId: selectedTx.contract_id,
        txId: selectedTx.id
      })).unwrap();
      
      if (!result) {
        throw new Error("Received empty response from broadcast");
      }
      
      toast({
        title: "Transaction broadcast",
        description: "Transaction successfully broadcast to the network",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Unknown error occurred';
      
      setBroadcastError(errorMessage);
      
      toast({
        title: "Broadcast failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const getTxTypeColor = (txType: string) => {
    switch (txType.toLowerCase()) {
      case 'setup':
        return 'blue';
      case 'final':
        return 'purple';
      case 'settlement':
        return 'green';
      case 'swap':
        return 'orange';
      default:
        return 'gray';
    }
  };

  // Validate transactions array
  if (!Array.isArray(transactions)) {
    return <Text>Invalid transaction data</Text>;
  }

  if (transactions.length === 0) {
    return <Text>No transactions found for this contract.</Text>;
  }

  return (
    <Box>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th></Th>
            <Th>Type</Th>
            <Th>Transaction ID</Th>
            <Th>Status</Th>
            <Th>Created At</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {transactions.map((tx) => (
            <React.Fragment key={tx.id}>
              <Tr>
                <Td>
                  <IconButton
                    aria-label={expandedTx === tx.id ? "Collapse" : "Expand"}
                    icon={expandedTx === tx.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpand(tx.id)}
                  />
                </Td>
                <Td>
                  <Badge colorScheme={getTxTypeColor(tx.tx_type)}>
                    {tx.tx_type.toUpperCase()}
                  </Badge>
                </Td>
                <Td>
                  <Text fontSize="sm" fontFamily="mono">
                    {tx.transaction_id ? tx.transaction_id.substring(0, 10) + "..." : "N/A"}
                  </Text>
                </Td>
                <Td>
                  <Badge colorScheme={tx.confirmed ? "green" : "yellow"}>
                    {tx.confirmed ? "Confirmed" : "Pending"}
                  </Badge>
                </Td>
                <Td>{format(new Date(tx.created_at), 'PPp')}</Td>
                <Td>
                  <HStack spacing={2}>
                    <IconButton
                      aria-label="Copy transaction hex"
                      icon={hasCopied && expandedTx === tx.id ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={() => handleCopyTxHex(tx.tx_hex)}
                      isDisabled={!tx.tx_hex}
                    />
                    {!tx.confirmed && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleBroadcastTx(tx)}
                        isDisabled={!tx.tx_hex}
                      >
                        Broadcast
                      </Button>
                    )}
                  </HStack>
                </Td>
              </Tr>
              <Tr>
                <Td colSpan={6} p={0}>
                  <Collapse in={expandedTx === tx.id} animateOpacity>
                    <Box p={4} bg="gray.50">
                      <Text fontWeight="bold" mb={2}>Transaction Hex:</Text>
                      <Box
                        p={2}
                        borderWidth="1px"
                        borderRadius="md"
                        bg="gray.100"
                        fontFamily="mono"
                        fontSize="xs"
                        whiteSpace="pre-wrap"
                        maxHeight="200px"
                        overflowY="auto"
                      >
                        {tx.tx_hex || "No transaction hex available"}
                      </Box>
                      {tx.confirmed && tx.confirmed_at && (
                        <Text mt={2} fontSize="sm">
                          Confirmed at: {format(new Date(tx.confirmed_at), 'PPp')}
                        </Text>
                      )}
                    </Box>
                  </Collapse>
                </Td>
              </Tr>
            </React.Fragment>
          ))}
        </Tbody>
      </Table>

      {/* Broadcast confirmation modal with improved error handling */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Broadcast Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {broadcastError ? (
              <Alert status="error" mb={4}>
                <AlertIcon as={WarningIcon} />
                <Box>
                  <AlertTitle>Broadcast Error</AlertTitle>
                  <AlertDescription>{broadcastError}</AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Text>
                Are you sure you want to broadcast this {selectedTx?.tx_type} transaction to the Bitcoin network?
              </Text>
            )}
            
            <Text mt={2} fontSize="sm" color="gray.600">
              This action cannot be undone. Once broadcast, the transaction will be permanently recorded on the blockchain.
            </Text>
            
            {isBroadcasting && (
              <Flex justify="center" mt={4}>
                <Spinner size="md" color="blue.500" mr={3} />
                <Text>Broadcasting transaction...</Text>
              </Flex>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={confirmBroadcast}
              isLoading={isBroadcasting}
              loadingText="Broadcasting"
              isDisabled={isBroadcasting}
            >
              Broadcast
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractTransactionsList;
