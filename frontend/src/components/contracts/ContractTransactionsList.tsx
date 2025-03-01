import React from 'react';
import { Box, VStack, Heading, Text, Badge, Flex, Icon, Divider } from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { ContractTransaction } from '../../types';

interface ContractTransactionsListProps {
  transactions: ContractTransaction[];
}

const ContractTransactionsList: React.FC<ContractTransactionsListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <Box textAlign="center" my={8}>
        <Text color="gray.500">No transactions available</Text>
      </Box>
    );
  }

  // Sort transactions by created_at, newest first
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'setup':
        return 'Setup';
      case 'final':
        return 'Final';
      case 'settlement':
        return 'Settlement';
      case 'swap':
        return 'Participant Swap';
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
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

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md" mb={2}>
        Transaction History
      </Heading>

      {sortedTransactions.map((tx, index) => (
        <Box
          key={tx.id}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          boxShadow="sm"
          position="relative"
        >
          <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Heading as="h2" size="xl">
            Contract Details
          </Heading>
          <HStack mt={2}>
            <Badge colorScheme={getTypeColor(contract.contract_type)} fontSize="md" px={2} py={1}>
              {contract.contract_type}
            </Badge>
            <Badge colorScheme={getStatusColor(contract.status)} fontSize="md" px={2} py={1}>
              {contract.status}
            </Badge>
          </HStack>
        </Box>
        <HStack>
          {contract.status === 'CREATED' && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleCancelContract}
            >
              Cancel Contract
            </Button>
          )}
          {contract.status === 'ACTIVE' && contract.setup_tx_id && !contract.final_tx_id && (
            <Button
              colorScheme="blue"
              onClick={handleGenerateFinalTx}
            >
              Generate Final Tx
            </Button>
          )}
          {contract.status === 'ACTIVE' && contract.final_tx_id && (
            <Button
              colorScheme="green"
              onClick={onOpenSettleModal}
            >
              Settle Contract
            </Button>
          )}
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <GridItem>
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={4}
            mb={6}
          >
            <Heading size="md" mb={4}>Contract Parameters</Heading>
            <VStack align="stretch" spacing={3}>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Contract ID:</Text>
                <Text fontFamily="mono" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.id}
                </Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Strike Hash Rate:</Text>
                <Text>{contract.strike_hash_rate.toFixed(2)} EH/s</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Start Block Height:</Text>
                <Text>{contract.start_block_height}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">End Block Height:</Text>
                <Text>{contract.end_block_height}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Target Timestamp:</Text>
                <Text>{format(new Date(contract.target_timestamp), 'PPP p')}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Contract Size:</Text>
                <Text>{formatSats(contract.contract_size)}</Text>
              </Flex>
              {contract.premium > 0 && (
                <Flex justifyContent="space-between">
                  <Text fontWeight="medium">Premium:</Text>
                  <Text>{formatSats(contract.premium)}</Text>
                </Flex>
              )}
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Created At:</Text>
                <Text>{format(new Date(contract.created_at), 'PPP p')}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Expires At:</Text>
                <Text>{format(new Date(contract.expires_at), 'PPP p')}</Text>
              </Flex>
            </VStack>
          </Box>

          <Box
            borderWidth="1px"
            borderRadius="md"
            p={4}
          >
            <Heading size="md" mb={4}>Participants</Heading>
            <VStack align="stretch" spacing={3}>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Buyer Public Key:</Text>
                <Text fontFamily="mono" fontSize="sm" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.buyer_pub_key}
                </Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Seller Public Key:</Text>
                <Text fontFamily="mono" fontSize="sm" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.seller_pub_key}
                </Text>
              </Flex>
            </VStack>
          </Box>
        </GridItem>

        <GridItem>
          {showTransactions && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={4}
              height="100%"
            >
              <ContractTransactionsList transactions={transactions} />
            </Box>
          )}
        </GridItem>
      </Grid>

      {/* Settlement Confirmation Modal */}
      <Modal isOpen={isSettleModalOpen} onClose={onCloseSettleModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settle Contract</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to settle this contract? This action will determine the winner
              based on the current blockchain state and cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseSettleModal}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSettleContract}>
              Confirm Settlement
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractDetails;={2}>
            <Badge colorScheme={getTransactionTypeColor(tx.tx_type)}>
              {getTransactionTypeLabel(tx.tx_type)}
            </Badge>

            <Flex alignItems="center">
              {tx.confirmed ? (
                <Badge colorScheme="green" variant="subtle" display="flex" alignItems="center">
                  <CheckCircleIcon mr={1} />
                  Confirmed
                </Badge>
              ) : (
                <Badge colorScheme="yellow" variant="subtle" display="flex" alignItems="center">
                  <WarningIcon mr={1} />
                  Pending
                </Badge>
              )}
            </Flex>
          </Flex>

          <Flex justifyContent="space-between" fontSize="sm" color="gray.500" my={1}>
            <Text>Transaction ID:</Text>
            <Text fontFamily="mono" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
              {tx.transaction_id}
            </Text>
          </Flex>

          <Divider my={2} />

          <Flex justifyContent="space-between" fontSize="xs" color="gray.500">
            <Text>Created:</Text>
            <Text>{format(new Date(tx.created_at), 'PPP p')}</Text>
          </Flex>

          {tx.confirmed && tx.confirmed_at && (
            <Flex justifyContent="space-between" fontSize="xs" color="gray.500">
              <Text>Confirmed:</Text>
              <Text>{format(new Date(tx.confirmed_at), 'PPP p')}</Text>
            </Flex>
          )}
        </Box>
      ))}
    </VStack>
  );
};

export default ContractTransactionsList;

import React from 'react';
import { Box, VStack, Heading, Text, Badge, Flex, Icon, Divider } from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { ContractTransaction } from '../../types';

interface ContractTransactionsListProps {
  transactions: ContractTransaction[];
}

const ContractTransactionsList: React.FC<ContractTransactionsListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <Box textAlign="center" my={8}>
        <Text color="gray.500">No transactions available</Text>
      </Box>
    );
  }

  // Sort transactions by created_at, newest first
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'setup':
        return 'Setup';
      case 'final':
        return 'Final';
      case 'settlement':
        return 'Settlement';
      case 'swap':
        return 'Participant Swap';
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
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

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md" mb={2}>
        Transaction History
      </Heading>

      {sortedTransactions.map((tx, index) => (
        <Box
          key={tx.id}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          boxShadow="sm"
          position="relative"
        >
          <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Heading as="h2" size="xl">
            Contract Details
          </Heading>
          <HStack mt={2}>
            <Badge colorScheme={getTypeColor(contract.contract_type)} fontSize="md" px={2} py={1}>
              {contract.contract_type}
            </Badge>
            <Badge colorScheme={getStatusColor(contract.status)} fontSize="md" px={2} py={1}>
              {contract.status}
            </Badge>
          </HStack>
        </Box>
        <HStack>
          {contract.status === 'CREATED' && (
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleCancelContract}
            >
              Cancel Contract
            </Button>
          )}
          {contract.status === 'ACTIVE' && contract.setup_tx_id && !contract.final_tx_id && (
            <Button
              colorScheme="blue"
              onClick={handleGenerateFinalTx}
            >
              Generate Final Tx
            </Button>
          )}
          {contract.status === 'ACTIVE' && contract.final_tx_id && (
            <Button
              colorScheme="green"
              onClick={onOpenSettleModal}
            >
              Settle Contract
            </Button>
          )}
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
        <GridItem>
          <Box
            borderWidth="1px"
            borderRadius="md"
            p={4}
            mb={6}
          >
            <Heading size="md" mb={4}>Contract Parameters</Heading>
            <VStack align="stretch" spacing={3}>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Contract ID:</Text>
                <Text fontFamily="mono" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.id}
                </Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Strike Hash Rate:</Text>
                <Text>{contract.strike_hash_rate.toFixed(2)} EH/s</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Start Block Height:</Text>
                <Text>{contract.start_block_height}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">End Block Height:</Text>
                <Text>{contract.end_block_height}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Target Timestamp:</Text>
                <Text>{format(new Date(contract.target_timestamp), 'PPP p')}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Contract Size:</Text>
                <Text>{formatSats(contract.contract_size)}</Text>
              </Flex>
              {contract.premium > 0 && (
                <Flex justifyContent="space-between">
                  <Text fontWeight="medium">Premium:</Text>
                  <Text>{formatSats(contract.premium)}</Text>
                </Flex>
              )}
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Created At:</Text>
                <Text>{format(new Date(contract.created_at), 'PPP p')}</Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Expires At:</Text>
                <Text>{format(new Date(contract.expires_at), 'PPP p')}</Text>
              </Flex>
            </VStack>
          </Box>

          <Box
            borderWidth="1px"
            borderRadius="md"
            p={4}
          >
            <Heading size="md" mb={4}>Participants</Heading>
            <VStack align="stretch" spacing={3}>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Buyer Public Key:</Text>
                <Text fontFamily="mono" fontSize="sm" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.buyer_pub_key}
                </Text>
              </Flex>
              <Flex justifyContent="space-between">
                <Text fontWeight="medium">Seller Public Key:</Text>
                <Text fontFamily="mono" fontSize="sm" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
                  {contract.seller_pub_key}
                </Text>
              </Flex>
            </VStack>
          </Box>
        </GridItem>

        <GridItem>
          {showTransactions && (
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={4}
              height="100%"
            >
              <ContractTransactionsList transactions={transactions} />
            </Box>
          )}
        </GridItem>
      </Grid>

      {/* Settlement Confirmation Modal */}
      <Modal isOpen={isSettleModalOpen} onClose={onCloseSettleModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settle Contract</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to settle this contract? This action will determine the winner
              based on the current blockchain state and cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCloseSettleModal}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSettleContract}>
              Confirm Settlement
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractDetails;={2}>
            <Badge colorScheme={getTransactionTypeColor(tx.tx_type)}>
              {getTransactionTypeLabel(tx.tx_type)}
            </Badge>

            <Flex alignItems="center">
              {tx.confirmed ? (
                <Badge colorScheme="green" variant="subtle" display="flex" alignItems="center">
                  <CheckCircleIcon mr={1} />
                  Confirmed
                </Badge>
              ) : (
                <Badge colorScheme="yellow" variant="subtle" display="flex" alignItems="center">
                  <WarningIcon mr={1} />
                  Pending
                </Badge>
              )}
            </Flex>
          </Flex>

          <Flex justifyContent="space-between" fontSize="sm" color="gray.500" my={1}>
            <Text>Transaction ID:</Text>
            <Text fontFamily="mono" maxWidth="200px" overflow="hidden" textOverflow="ellipsis">
              {tx.transaction_id}
            </Text>
          </Flex>

          <Divider my={2} />

          <Flex justifyContent="space-between" fontSize="xs" color="gray.500">
            <Text>Created:</Text>
            <Text>{format(new Date(tx.created_at), 'PPP p')}</Text>
          </Flex>

          {tx.confirmed && tx.confirmed_at && (
            <Flex justifyContent="space-between" fontSize="xs" color="gray.500">
              <Text>Confirmed:</Text>
              <Text>{format(new Date(tx.confirmed_at), 'PPP p')}</Text>
            </Flex>
          )}
        </Box>
      ))}
    </VStack>
  );
};

export default ContractTransactionsList;

