import React, { useEffect } from 'react';
import { Box, Heading, SimpleGrid, Button, Flex, useColorMode } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchActiveContracts } from '../../store/contract-slice';
import ContractCard from '../contracts/ContractCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';

const ActiveContractsCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);

  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);

  // Filter active and created contracts
  const activeContracts = contracts.filter(
    contract => contract.status === 'ACTIVE' || contract.status === 'CREATED'
  );

  const handleRefresh = () => {
    dispatch(fetchActiveContracts());
  };

  if (loading && contracts.length === 0) {
    return <LoadingSpinner message="Loading contracts..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  if (activeContracts.length === 0) {
    return (
      <EmptyState
        title="No Active Contracts"
        description="You don't have any active contracts. Create a contract or place an order to get started."
        actionText="Create Contract"
        onAction={() => {/* Navigate to create contract */}}
      />
    );
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Flex px={4} py={3} borderBottomWidth="1px" justifyContent="space-between" alignItems="center">
        <Heading size="md">Your Active Contracts</Heading>
        <Button size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </Flex>
      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {activeContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default ActiveContractsCard;

import React, { useEffect } from 'react';
import { Box, Heading, SimpleGrid, Button, Flex, useColorMode } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchActiveContracts } from '../../store/contract-slice';
import ContractCard from '../contracts/ContractCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';

const ActiveContractsCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);

  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);

  // Filter active and created contracts
  const activeContracts = contracts.filter(
    contract => contract.status === 'ACTIVE' || contract.status === 'CREATED'
  );

  const handleRefresh = () => {
    dispatch(fetchActiveContracts());
  };

  if (loading && contracts.length === 0) {
    return <LoadingSpinner message="Loading contracts..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  if (activeContracts.length === 0) {
    return (
      <EmptyState
        title="No Active Contracts"
        description="You don't have any active contracts. Create a contract or place an order to get started."
        actionText="Create Contract"
        onAction={() => {/* Navigate to create contract */}}
      />
    );
  }

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Flex px={4} py={3} borderBottomWidth="1px" justifyContent="space-between" alignItems="center">
        <Heading size="md">Your Active Contracts</Heading>
        <Button size="sm" onClick={handleRefresh}>
          Refresh
        </Button>
      </Flex>
      <Box p={4}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {activeContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default ActiveContractsCard;

