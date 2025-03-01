// src/pages/ContractDetailsPage.tsx (updated)
import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Box, 
  useToast, 
  Button, 
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ContractDetails from '../components/contracts/ContractDetails';
import ContractFunding from '../components/contracts/ContractFunding'; // Added
import ContractSigningModal from '../components/contracts/ContractSigningModal'; // Added
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchContract, fetchContractTransactions, generateFinalTx, settleContract } from '../store/contract-slice';

const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  // For contract signing modal
  const { isOpen: isSigningModalOpen, onOpen: onOpenSigningModal, onClose: onCloseSigningModal } = useDisclosure();
  const [selectedTx, setSelectedTx] = useState<string | null>(null);
  
  const { selectedContract, transactions, loading, error } = useAppSelector(
    (state) => state.contracts
  );
  
  const { isConnected } = useAppSelector(
    (state) => state.arkWallet
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchContract(id));
      dispatch(fetchContractTransactions(id));
    }
  }, [dispatch, id]);

  // Handle generating a final transaction
  const handleGenerateFinalTx = async () => {
    if (!id) return;
    
    try {
      const result = await dispatch(generateFinalTx(id)).unwrap();
      toast({
        title: 'Final transaction generated',
        description: 'The final transaction has been successfully generated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Open signing modal with the new transaction
      setSelectedTx('final');
      onOpenSigningModal();
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

  // Handle settling a contract
  const handleSettleContract = async () => {
    if (!id) return;
    
    try {
      const result = await dispatch(settleContract(id)).unwrap();
      toast({
        title: 'Contract settled',
        description: 'The contract has been successfully settled.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Open signing modal with the settlement transaction
      setSelectedTx('settlement');
      onOpenSigningModal();
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

  if (loading && !selectedContract) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <LoadingSpinner message="Loading contract details..." />
        </Container>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <ErrorDisplay 
            message={error} 
            onRetry={() => {
              if (id) {
                dispatch(fetchContract(id));
                dispatch(fetchContractTransactions(id));
              }
            }} 
          />
        </Container>
      </MainLayout>
    );
  }

  if (!selectedContract) {
    return (
      <MainLayout>
        <Container maxW="container.xl" py={8}>
          <Box textAlign="center">
            Contract not found. The contract ID may be invalid.
          </Box>
        </Container>
      </MainLayout>
    );
  }

  // Get the appropriate transaction based on the selected type
  const getSelectedTransaction = () => {
    if (!selectedTx || !transactions.length) return null;
    
    return transactions.find(tx => tx.tx_type === selectedTx);
  };

  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        {!isConnected && (
          <Alert status="warning" mb={6}>
            <AlertIcon />
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>
              Connect your wallet to interact with this contract.
            </AlertDescription>
          </Alert>
        )}
        
        <ContractDetails
          contract={selectedContract}
          transactions={transactions}
        />
        
        {/* Wallet integration for contract */}
        {isConnected && selectedContract.status === 'CREATED' && (
          <Box mt={6}>
            <ContractFunding 
              contract={selectedContract} 
              onSuccess={() => {
                if (id) {
                  dispatch(fetchContract(id));
                }
              }}
            />
          </Box>
        )}
        
        {/* Action buttons for contract lifecycle */}
        {isConnected && (
          <HStack mt={6} spacing={4} justifyContent="flex-end">
            {selectedContract.status === 'ACTIVE' && selectedContract.setup_tx_id && !selectedContract.final_tx_id && (
              <Button 
                colorScheme="blue" 
                onClick={handleGenerateFinalTx}
                isLoading={loading}
              >
                Generate Final Transaction
              </Button>
            )}
            
            {selectedContract.status === 'ACTIVE' && selectedContract.final_tx_id && (
              <Button 
                colorScheme="green" 
                onClick={handleSettleContract}
                isLoading={loading}
              >
                Settle Contract
              </Button>
            )}
          </HStack>
        )}
        
        {/* Contract signing modal */}
        <ContractSigningModal
          isOpen={isSigningModalOpen}
          onClose={onCloseSigningModal}
          contract={selectedContract}
          transaction={getSelectedTransaction()}
          onSuccess={() => {
            onCloseSigningModal();
            if (id) {
              dispatch(fetchContract(id));
              dispatch(fetchContractTransactions(id));
            }
          }}
        />
      </Container>
    </MainLayout>
  );
};

export default ContractDetailsPage;
