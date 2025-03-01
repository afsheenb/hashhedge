import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  HStack,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
} from '@chakra-ui/react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import ContractList from '../components/contracts/ContractList';
import CreateContractForm from '../components/contracts/CreateContractForm';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchActiveContracts } from '../store/contract-slice';
import { ContractStatus, ContractType } from '../types';

const ContractsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { contracts, loading, error } = useAppSelector((state) => state.contracts);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { 
    isOpen: isCreateModalOpen, 
    onOpen: onOpenCreateModal, 
    onClose: onCloseCreateModal 
  } = useDisclosure();

  useEffect(() => {
    dispatch(fetchActiveContracts());
  }, [dispatch]);

  // Filter contracts based on criteria
  const filteredContracts = contracts.filter(contract => {
    // Filter by status
    if (statusFilter !== 'all' && contract.status !== statusFilter) {
      return false;
    }
    
    // Filter by type
    if (typeFilter !== 'all' && contract.contract_type !== typeFilter) {
      return false;
    }
    
    // Filter by search query
    if (searchQuery && !contract.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Hash Rate Contracts"
          description="View and manage your Bitcoin hash rate derivative contracts"
          action={{
            label: "Create Contract",
            onClick: onOpenCreateModal,
          }}
        />

        <Box mb={6}>
          <HStack spacing={4} flexWrap="wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              width={{ base: 'full', md: 'auto' }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="all">All Statuses</option>
              <option value={ContractStatus.CREATED}>Created</option>
              <option value={ContractStatus.ACTIVE}>Active</option>
              <option value={ContractStatus.SETTLED}>Settled</option>
              <option value={ContractStatus.EXPIRED}>Expired</option>
              <option value={ContractStatus.CANCELLED}>Cancelled</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              width={{ base: 'full', md: 'auto' }}
              mb={{ base: 2, md: 0 }}
            >
              <option value="all">All Types</option>
              <option value={ContractType.CALL}>Call</option>
              <option value={ContractType.PUT}>Put</option>
            </Select>
            <InputGroup width={{ base: 'full', md: '300px' }}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by contract ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </HStack>
        </Box>

        <ContractList
          contracts={filteredContracts}
          loading={loading}
          error={error}
          onCreateContract={onOpenCreateModal}
          emptyStateTitle={
            statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
              ? 'No Matching Contracts'
              : 'No Contracts Found'
          }
          emptyStateMessage={
            statusFilter !== 'all' || typeFilter !== 'all' || searchQuery
              ? 'Try adjusting your filters to see more contracts.'
              : 'Create a new contract or place an order to get started.'
          }
        />

        {/* Create Contract Modal */}
        <Modal 
          isOpen={isCreateModalOpen} 
          onClose={onCloseCreateModal}
          size="xl"
          scrollBehavior="inside"
        >
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Create New Contract</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <CreateContractForm />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={onCloseCreateModal}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </MainLayout>
  );
};

export default ContractsPage;

