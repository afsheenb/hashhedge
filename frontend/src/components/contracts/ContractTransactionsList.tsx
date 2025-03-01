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
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
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
    setSelectedTx(tx);
    onOpen();
  };

  const confirmBroadcast = async () => {
    if (!selectedTx) return;
    
    try {
      await dispatch(broadcastTx({
        contractId: selectedTx.contract_id,
        txId: selectedTx.id
      })).unwrap();
      
      toast({
        title: "Transaction broadcast",
        description: "Transaction successfully broadcast to the network",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Broadcast failed",
        description: error as string,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
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
                    {tx.transaction_id.substring(0, 10)}...
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
                    />
                    {!tx.confirmed && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleBroadcastTx(tx)}
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
                        {tx.tx_hex}
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

      {/* Broadcast confirmation modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Broadcast Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to broadcast this {selectedTx?.tx_type} transaction to the Bitcoin network?
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              This action cannot be undone. Once broadcast, the transaction will be permanently recorded on the blockchain.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={confirmBroadcast}>
              Broadcast
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractTransactionsList;
