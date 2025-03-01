import React from 'react';
import {
  Box,
  Badge,
  Text,
  Button,
  HStack,
  VStack,
  Grid,
  GridItem,
  Divider,
  Heading,
  Flex,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { Contract, ContractStatus, ContractType, ContractTransaction } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { cancelContract, settleContract, generateFinalTx } from '../../store/contract-slice';
import ContractTransactionsList from './ContractTransactionsList';

interface ContractDetailsProps {
  contract: Contract;
  transactions: ContractTransaction[];
  showTransactions?: boolean;
}

const ContractDetails: React.FC<ContractDetailsProps> = ({
  contract,
  transactions,
  showTransactions = true,
}) => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const {
    isOpen: isSettleModalOpen,
    onOpen: onOpenSettleModal,
    onClose: onCloseSettleModal,
  } = useDisclosure();

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case 'CREATED':
        return 'yellow';
      case 'ACTIVE':
        return 'green';
      case 'SETTLED':
        return 'blue';
      case 'EXPIRED':
        return 'orange';
      case 'CANCELLED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getTypeColor = (type: ContractType) => {
    return type === 'CALL' ? 'teal' : 'purple';
  };

  const handleCancelContract = async () => {
    try {
      await dispatch(cancelContract(contract.id)).unwrap();
      toast({
        title: 'Contract cancelled',
        description: 'The contract has been cancelled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGenerateFinalTx = async () => {
    try {
      await dispatch(generateFinalTx(contract.id)).unwrap();
      toast({
        title: 'Final transaction generated',
        description: 'The final transaction has been generated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSettleContract = async () => {
    try {
      await dispatch(settleContract(contract.id)).unwrap();
      toast({
        title: 'Contract settled',
        description: 'The contract has been settled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      onCloseSettleModal();
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BTC`;
    } else {
      return `${sats.toLocaleString()} sats`;
    }
  };

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading as="h2" size="lg">
          Contract Details
        </Heading>
        <HStack>
          <Badge colorScheme={getTypeColor(contract.contract_type)} fontSize="md" px={2} py={1}>
            {contract.contract_type}
          </Badge>
          <Badge colorScheme={getStatusColor(contract.status)} fontSize="md" px={2} py={1}>
            {contract.status}
          </Badge>
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
        <GridItem>
          <VStack align="stretch" spacing={4} p={5} borderWidth="1px" borderRadius="lg">
            <Heading size="md" mb={2}>Contract Terms</Heading>
            
            <Grid templateColumns="1fr 1fr" gap={4}>
              <Text fontWeight="bold">Strike Hash Rate:</Text>
              <Text>{contract.strike_hash_rate.toFixed(2)} EH/s</Text>
              
              <Text fontWeight="bold">Contract Size:</Text>
              <Text>{formatSats(contract.contract_size)}</Text>
              
              <Text fontWeight="bold">Premium:</Text>
              <Text>{formatSats(contract.premium)}</Text>
              
              <Text fontWeight="bold">Start Block:</Text>
              <Text>{contract.start_block_height}</Text>
              
              <Text fontWeight="bold">End Block:</Text>
              <Text>{contract.end_block_height}</Text>
              
              <Text fontWeight="bold">Target Time:</Text>
              <Text>{format(new Date(contract.target_timestamp), 'PPP p')}</Text>
              
              <Text fontWeight="bold">Created:</Text>
              <Text>{format(new Date(contract.created_at), 'PPP p')}</Text>
              
              <Text fontWeight="bold">Expires:</Text>
              <Text>{format(new Date(contract.expires_at), 'PPP p')}</Text>
            </Grid>
          </VStack>
        </GridItem>
        
        <GridItem>
          <VStack align="stretch" spacing={4} p={5} borderWidth="1px" borderRadius="lg">
            <Heading size="md" mb={2}>Participants</Heading>
            
            <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
              <Text fontWeight="bold" fontSize="sm">Buyer Public Key</Text>
              <Text fontSize="xs" overflowWrap="break-word">{contract.buyer_pub_key}</Text>
            </Box>
            
            <Box p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
              <Text fontWeight="bold" fontSize="sm">Seller Public Key</Text>
              <Text fontSize="xs" overflowWrap="break-word">{contract.seller_pub_key}</Text>
            </Box>
            
            <Divider />
            
            <Heading size="sm">Actions</Heading>
            
            <HStack spacing={4}>
              {contract.status === 'CREATED' && (
                <Button colorScheme="red" onClick={handleCancelContract}>
                  Cancel Contract
                </Button>
              )}
              
              {contract.status === 'ACTIVE' && !contract.final_tx_id && (
                <Button colorScheme="blue" onClick={handleGenerateFinalTx}>
                  Generate Final Transaction
                </Button>
              )}
              
              {contract.status === 'ACTIVE' && (
                <Button colorScheme="green" onClick={onOpenSettleModal}>
                  Settle Contract
                </Button>
              )}
            </HStack>
          </VStack>
        </GridItem>
      </Grid>

      {showTransactions && transactions.length > 0 && (
        <Box mt={8}>
          <Heading size="md" mb={4}>Contract Transactions</Heading>
          <ContractTransactionsList transactions={transactions} />
        </Box>
      )}

      {/* Settlement confirmation modal */}
      <Modal isOpen={isSettleModalOpen} onClose={onCloseSettleModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settle Contract</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to settle this contract? This action will execute the final
              transaction and determine the winner based on the current hash rate.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseSettleModal}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSettleContract}>
              Confirm Settlement
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractDetails;
