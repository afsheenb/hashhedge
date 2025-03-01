import React from 'react';
import { SimpleGrid, Text, Box } from '@chakra-ui/react';
import { Contract } from '../../types';
import ContractCard from './ContractCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';

interface ContractListProps {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  onCreateContract?: () => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
}

const ContractList: React.FC<ContractListProps> = ({
  contracts,
  loading,
  error,
  onCreateContract,
  emptyStateTitle = 'No Contracts Found',
  emptyStateMessage = 'There are no contracts to display.',
}) => {
  if (loading) {
    return <LoadingSpinner message="Loading contracts..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        title={emptyStateTitle}
        description={emptyStateMessage}
        actionText={onCreateContract ? 'Create Contract' : undefined}
        onAction={onCreateContract}
      />
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      {contracts.map((contract) => (
        <ContractCard key={contract.id} contract={contract} />
      ))}
    </SimpleGrid>
  );
};

export default ContractList;

import React from 'react';
import { SimpleGrid, Text, Box } from '@chakra-ui/react';
import { Contract } from '../../types';
import ContractCard from './ContractCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import EmptyState from '../common/EmptyState';

interface ContractListProps {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  onCreateContract?: () => void;
  emptyStateTitle?: string;
  emptyStateMessage?: string;
}

const ContractList: React.FC<ContractListProps> = ({
  contracts,
  loading,
  error,
  onCreateContract,
  emptyStateTitle = 'No Contracts Found',
  emptyStateMessage = 'There are no contracts to display.',
}) => {
  if (loading) {
    return <LoadingSpinner message="Loading contracts..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        title={emptyStateTitle}
        description={emptyStateMessage}
        actionText={onCreateContract ? 'Create Contract' : undefined}
        onAction={onCreateContract}
      />
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
      {contracts.map((contract) => (
        <ContractCard key={contract.id} contract={contract} />
      ))}
    </SimpleGrid>
  );
};

export default ContractList;

