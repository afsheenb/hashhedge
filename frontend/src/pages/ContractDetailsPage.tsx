import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Grid,
  GridItem,
  Button,
  useDisclosure,
  useToast,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { fetchContract, fetchContractTransactions } from '../store/contract-slice';
import Layout from '../components/layout/Layout';
import ContractDetails from '../components/contracts/ContractDetails';
import ContractTransactionsList from '../components/contracts/ContractTransactionsList';
import ContractFunding from '../components/contracts/ContractFunding';
import ContractSigningModal from '../components/contracts/ContractSigningModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import HashRateChart from '../components/hashrate/HashRateChart';
import PageHeader from '../components/common/PageHeader';

const ContractDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const { contract, transactions, loading, error } = useAppSelector((state) => state.contracts);
  
  useEffect(() => {
    if (id) {
      dispatch(fetchContract(id));
      dispatch(fetchContractTransactions(id));
    }
  }, [dispatch, id]);
  
  const handleBackToContracts = () => {
    navigate('/contracts');
  };
  
  const handleOpenSigningModal = (transaction: any) => {
    setSelectedTransaction(transaction);
    onOpen();
  };
  
  const handleSigningSuccess = () => {
    toast({
      title: "Transaction signed",
      description: "The transaction has been signed successfully",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    // Refresh contract transactions
    if (id) {
      dispatch(fetchContractTransactions(id));
    }
  };
  
  if (loading && !contract) {
    return <LoadingSpinner message="Loading contract details..." />;
  }
  
  if (error) {
    return <ErrorDisplay message={error} />;
  }
  
  if (!contract) {
    return <ErrorDisplay message="Contract not found" />;
  }
  
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Contract Details"
          action={{
            label: "Back to Contracts",
            onClick: handleBackToContracts,
          }}
        />
        
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6} mt={6}>
          <GridItem>
            <Box mb={6}>
              <ContractDetails 
                contract={contract} 
                transactions={transactions}
                showTransactions={false}
              />
            </Box>
            
            <Tabs isLazy variant="enclosed" mt={6}>
              <TabList>
                <Tab>Transactions</Tab>
                <Tab>Hash Rate Chart</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel px={0}>
                  <Box mt={4}>
                    <ContractTransactionsList 
                      transactions={transactions} 
                      onSignTransaction={handleOpenSigningModal}
                    />
                  </Box>
                </TabPanel>
                
                <TabPanel px={0}>
                  <Box mt={4}>
                    <HashRateChart 
                      height={400}
                      referenceValue={contract.strike_hash_rate}
                      referenceLabel={`Strike: ${contract.strike_hash_rate} EH/s`}
                    />
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </GridItem>
          
          <GridItem>
            <ContractFunding 
              contract={contract}
              onSuccess={() => {
                if (id) {
                  dispatch(fetchContract(id));
                }
              }}
            />
          </GridItem>
        </Grid>
        
        {/* Contract Signing Modal */}
        <ContractSigningModal
          isOpen={isOpen}
          onClose={onClose}
          contract={contract}
          transaction={selectedTransaction}
          onSuccess={handleSigningSuccess}
        />
      </Container>
    </Layout>
  );
};

export default ContractDetailsPage;

