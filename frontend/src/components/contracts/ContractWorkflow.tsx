// src/components/contracts/ContractWorkflow.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Button,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast,
  Divider,
  Collapse,
  HStack,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Progress,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { 
  createContract, 
  setupContract,
  generateFinalTx,
  broadcastTx,
  settleContract,
  getContract,
} from '../../store/contract-slice';
import { fetchWalletBalance, sendOnchain } from '../../features/wallet/arkWalletSlice';
import CreateContractForm from './CreateContractForm';
import ContractDetails from './ContractDetails';
import ContractSigningModal from './ContractSigningModal';
import { Contract, CreateContractForm as CreateContractFormType, ContractTransaction } from '../../types';

const steps = [
  { title: 'Create Contract', description: 'Define contract parameters' },
  { title: 'Fund Contract', description: 'Send Bitcoin to activate' },
  { title: 'Setup Transaction', description: 'Sign setup transaction' },
  { title: 'Monitor Contract', description: 'Wait for settlement conditions' },
  { title: 'Settlement', description: 'Finalize contract' },
];

interface ContractWorkflowProps {
  onComplete?: (contract: Contract) => void;
  initialStep?: number;
  existingContractId?: string;
}

const ContractWorkflow: React.FC<ContractWorkflowProps> = ({ 
  onComplete,
  initialStep = 0,
  existingContractId,
}) => {
  const { activeStep, setActiveStep } = useSteps({
    index: initialStep,
    count: steps.length,
  });
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [txDetails, setTxDetails] = useState<ContractTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [stepProgress, setStepProgress] = useState<number>(0);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance } = useAppSelector((state) => state.arkWallet);
  const { user } = useAppSelector((state) => state.auth);
  
  const { 
    isOpen: isSigningModalOpen, 
    onOpen: openSigningModal, 
    onClose: closeSigningModal 
  } = useDisclosure();
  
  const { 
    isOpen: isErrorModalOpen, 
    onOpen: openErrorModal, 
    onClose: closeErrorModal 
  } = useDisclosure();
  
  // Load existing contract if provided
  useEffect(() => {
    if (existingContractId) {
      setIsProcessing(true);
      
      dispatch(getContract(existingContractId))
        .unwrap()
        .then(contract => {
          setContract(contract);
          
          // Determine the current step based on contract status
          if (contract.status === 'CREATED') {
            setActiveStep(1); // Funding step
          } else if (contract.status === 'ACTIVE') {
            setActiveStep(3); // Monitoring step
          } else if (contract.status === 'SETTLED') {
            setActiveStep(4); // Settlement complete
          }
        })
        .catch(err => {
          setError(`Failed to load contract: ${err.message || err}`);
          openErrorModal();
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }
  }, [existingContractId, dispatch, setActiveStep, openErrorModal]);
  
  // Step 1: Create Contract
  const handleCreateContract = async (formData: CreateContractFormType) => {
    setIsProcessing(true);
    setStepProgress(20);
    setError(null);
    
    try {
      // Add user ID if available
      const completeFormData = {
        ...formData,
        user_id: user?.id,
      };
      
      setStepProgress(50);
      
      const newContract = await dispatch(createContract(completeFormData)).unwrap();
      setContract(newContract);
      
      setStepProgress(100);
      
      toast({
        title: 'Contract created',
        description: 'Your contract has been created successfully. Now it needs to be funded.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Move to funding step
      setActiveStep(1);
    } catch (err) {
      setError(`Failed to create contract: ${err.message || err}`);
      openErrorModal();
    } finally {
      setIsProcessing(false);
      setStepProgress(0);
    }
  };
  
  // Step 2: Fund Contract
  const handleFundContract = async () => {
    if (!contract) {
      setError('No contract available to fund');
      openErrorModal();
      return;
    }
    
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to fund this contract',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    if (!balance || contract.contract_size > balance.confirmed) {
      toast({
        title: 'Insufficient balance',
        description: `You need at least ${contract.contract_size.toLocaleString()} sats to fund this contract`,
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsProcessing(true);
    setStepProgress(20);
    setError(null);
    
    try {
      // Step 1: Generate contract setup transaction
      const setupResponse = await dispatch(setupContract({
        id: contract.id,
        data: {
          amount: contract.contract_size,
        },
      })).unwrap();
      
      if (!setupResponse.transaction || !setupResponse.transaction.address) {
        throw new Error('Failed to get funding address from contract setup');
      }
      
      setStepProgress(50);
      
      // Step 2: Send funds to the contract address
      const contractAddress = setupResponse.transaction.address;
      const txid = await dispatch(sendOnchain({
        address: contractAddress,
        amount: contract.contract_size,
        feeRate: 5, // Use a reasonable fee rate
      })).unwrap();
      
      setStepProgress(80);
      
      // Step 3: Refresh contract data
      const updatedContract = await dispatch(getContract(contract.id)).unwrap();
      setContract(updatedContract);
      
      // Refresh wallet balance
      dispatch(fetchWalletBalance());
      
      setStepProgress(100);
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Move to setup transaction step
      setActiveStep(2);
      
      // Set transaction details for signing
      setTxDetails(setupResponse.transaction);
    } catch (err) {
      setError(`Failed to fund contract: ${err.message || err}`);
      openErrorModal();
    } finally {
      setIsProcessing(false);
      setStepProgress(0);
    }
  };
  
  // Step 3: Setup Transaction
  const handleSetupTransaction = async () => {
    if (!contract) {
      setError('No contract available');
      openErrorModal();
      return;
    }
    
    if (!txDetails) {
      // Need to fetch the latest transactions
      setIsProcessing(true);
      
      try {
        // Generate setup transaction
        const setupResponse = await dispatch(setupContract({
          id: contract.id,
          data: {
            amount: contract.contract_size,
          },
        })).unwrap();
        
        setTxDetails(setupResponse.transaction);
        openSigningModal();
      } catch (err) {
        setError(`Failed to generate setup transaction: ${err.message || err}`);
        openErrorModal();
      } finally {
        setIsProcessing(false);
      }
    } else {
      openSigningModal();
    }
  };
  
  // Handle transaction signing success
  const handleSigningSuccess = async () => {
    closeSigningModal();
    
    // Refresh contract data
    if (contract) {
      const updatedContract = await dispatch(getContract(contract.id)).unwrap();
      setContract(updatedContract);
      
      // Move to monitoring step if contract is active
      if (updatedContract.status === 'ACTIVE') {
        setActiveStep(3);
        
        toast({
          title: 'Contract activated',
          description: 'Your contract is now active and awaiting settlement conditions',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };
  
  // Step 4: Generate Final Transaction
  const handleGenerateFinalTx = async () => {
    if (!contract) {
      setError('No contract available');
      openErrorModal();
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await dispatch(generateFinalTx(contract.id)).unwrap();
      
      setTxDetails(response);
      openSigningModal();
      
      // Refresh contract data
      const updatedContract = await dispatch(getContract(contract.id)).unwrap();
      setContract(updatedContract);
    } catch (err) {
      setError(`Failed to generate final transaction: ${err.message || err}`);
      openErrorModal();
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Step 5: Settle Contract
  const handleSettleContract = async () => {
    if (!contract) {
      setError('No contract available');
      openErrorModal();
      return;
    }
    
    setIsProcessing(true);
    setStepProgress(20);
    
    try {
      // Step 1: Initiate settlement
      const response = await dispatch(settleContract(contract.id)).unwrap();
      
      setStepProgress(50);
      
      // Step 2: Set transaction for signing if available
      if (response.transaction) {
        setTxDetails(response.transaction);
        openSigningModal();
      }
      
      setStepProgress(80);
      
      // Step 3: Refresh contract data
      const updatedContract = await dispatch(getContract(contract.id)).unwrap();
      setContract(updatedContract);
      
      setStepProgress(100);
      
      // Update step if contract is settled
      if (updatedContract.status === 'SETTLED') {
        setActiveStep(4);
        
        toast({
          title: 'Contract settled',
          description: `Settlement complete. ${response.buyer_wins ? 'Buyer' : 'Seller'} wins.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
      
      // Refresh wallet balance
      dispatch(fetchWalletBalance());
      
      // Call completion callback if provided
      if (updatedContract.status === 'SETTLED' && onComplete) {
        onComplete(updatedContract);
      }
    } catch (err) {
      setError(`Failed to settle contract: ${err.message || err}`);
      openErrorModal();
    } finally {
      setIsProcessing(false);
      setStepProgress(0);
    }
  };
  
  // Render contract status indicator
  const renderContractStatus = () => {
    if (!contract) return null;
    
    const getStatusColor = () => {
      switch (contract.status) {
        case 'CREATED': return 'yellow';
        case 'ACTIVE': return 'green';
        case 'SETTLED': return 'blue';
        case 'EXPIRED': return 'orange';
        case 'CANCELLED': return 'red';
        default: return 'gray';
      }
    };
    
    return (
      <HStack spacing={2}>
        <Text>Contract Status:</Text>
        <Badge colorScheme={getStatusColor()} px={2} py={1} fontSize="sm">
          {contract.status}
        </Badge>
      </HStack>
    );
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Create Contract
        return (
          <Box>
            <Heading size="md" mb={4}>Create New Contract</Heading>
            <CreateContractForm onSubmit={handleCreateContract} />
          </Box>
        );
      
      case 1: // Fund Contract
        return (
          <Box>
            <Heading size="md" mb={4}>Fund Contract</Heading>
            {contract ? (
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <AlertDescription>
                    This contract requires {contract.contract_size.toLocaleString()} sats to be activated.
                    Funding the contract will make it active and visible in the order book.
                  </AlertDescription>
                </Alert>
                
                {renderContractStatus()}
                
                <Divider />
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={2}>Contract Details</Text>
                  <Text>Type: {contract.contract_type}</Text>
                  <Text>Strike Hash Rate: {contract.strike_hash_rate} EH/s</Text>
                  <Text>Contract Size: {contract.contract_size.toLocaleString()} sats</Text>
                  <Text>Premium: {contract.premium.toLocaleString()} sats</Text>
                </Box>
                
                {isProcessing && (
                  <Box>
                    <Text mb={2}>Processing funding...</Text>
                    <Progress 
                      value={stepProgress} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="md"
                      isAnimated
                    />
                  </Box>
                )}
                
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleFundContract}
                  isLoading={isProcessing}
                  loadingText="Processing"
                  isDisabled={
                    !isConnected || 
                    contract.status !== 'CREATED' ||
                    !balance || 
                    balance.confirmed < contract.contract_size
                  }
                >
                  Fund Contract
                </Button>
                
                {!isConnected && (
                  <Alert status="warning">
                    <AlertIcon />
                    Please connect your wallet to fund this contract.
                  </Alert>
                )}
                
                {isConnected && balance && balance.confirmed < contract.contract_size && (
                  <Alert status="warning">
                    <AlertIcon />
                    Insufficient balance. You need at least {contract.contract_size.toLocaleString()} sats.
                  </Alert>
                )}
              </VStack>
            ) : (
              <Alert status="error">
                <AlertIcon />
                No contract data available. Please create a contract first.
              </Alert>
            )}
          </Box>
        );
      
      case 2: // Setup Transaction
        return (
          <Box>
            <Heading size="md" mb={4}>Setup Transaction</Heading>
            {contract ? (
              <VStack spacing={4} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  <AlertDescription>
                    Now you need to sign the setup transaction to activate the contract.
                    This will generate the transaction script that will be used for settlement.
                  </AlertDescription>
                </Alert>
                
                {renderContractStatus()}
                
                <Divider />
                
                {contract.status === 'ACTIVE' ? (
                  <Alert status="success">
                    <AlertIcon />
                    This contract has been successfully set up and is now active.
                    You can proceed to the next step to monitor it.
                  </Alert>
                ) : (
                  <>
                    <Box p={4} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold" mb={2}>Setup Instructions</Text>
                      <Text mb={2}>The setup transaction establishes the contract parameters on the blockchain.</Text>
                      <Text>Click the button below to sign and broadcast the setup transaction.</Text>
                    </Box>
                    
                    <Button
                      colorScheme="blue"
                      size="lg"
                      onClick={handleSetupTransaction}
                      isLoading={isProcessing}
                      loadingText="Preparing Transaction"
                      isDisabled={!isConnected || contract.status !== 'CREATED'}
                    >
                      Sign Setup Transaction
                    </Button>
                  </>
                )}
                
                <Button
                  colorScheme="green"
                  variant={contract.status === 'ACTIVE' ? 'solid' : 'outline'}
                  onClick={() => setActiveStep(3)}
                  isDisabled={contract.status !== 'ACTIVE'}
                >
                  Continue to Monitoring
                </Button>
              </VStack>
            ) : (
              <Alert status="error">
                <AlertIcon />
                No contract data available. Please create and fund a contract first.
              </Alert>
            )}
          </Box>
        );
      
      case 3: // Monitor Contract
        return (
          <Box>
            <Heading size="md" mb={4}>Monitor Contract</Heading>
            {contract ? (
              <VStack spacing={4} align="stretch">
                <Alert status={contract.status === 'ACTIVE' ? 'info' : 'warning'}>
                  <AlertIcon />
                  <AlertDescription>
                    {contract.status === 'ACTIVE'
                      ? 'Your contract is active and waiting for settlement conditions to be met. You can generate the final transaction now or wait until settlement conditions are reached.'
                      : 'This contract is no longer active and cannot be monitored.'}
                  </AlertDescription>
                </Alert>
                
                {renderContractStatus()}
                
                <Divider />
                
                {contract.status === 'ACTIVE' && (
                  <>
                    <Box p={4} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold" mb={2}>Contract Details</Text>
                      <HStack justify="space-between" mb={1}>
                        <Text>Contract Type:</Text>
                        <Text fontWeight="medium">{contract.contract_type}</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>Strike Hash Rate:</Text>
                        <Text fontWeight="medium">{contract.strike_hash_rate} EH/s</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>Start Block:</Text>
                        <Text fontWeight="medium">{contract.start_block_height}</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>End Block:</Text>
                        <Text fontWeight="medium">{contract.end_block_height}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Target Date:</Text>
                        <Text fontWeight="medium">
                          {new Date(contract.target_timestamp).toLocaleString()}
                        </Text>
                      </HStack>
                    </Box>
                    
                    <Box p={4} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold" mb={2}>Settlement Conditions</Text>
                      <Text mb={3}>
                        For a {contract.contract_type} contract, the settlement occurs when:
                      </Text>
                      
                      {contract.contract_type === 'CALL' ? (
                        <Text>
                          The network hash rate exceeds {contract.strike_hash_rate} EH/s before the target date.
                          In this case, the buyer wins the contract.
                        </Text>
                      ) : (
                        <Text>
                          The network hash rate remains below {contract.strike_hash_rate} EH/s until the target date.
                          In this case, the buyer wins the contract.
                        </Text>
                      )}
                    </Box>
                    
                    <HStack spacing={4}>
                      <Button
                        colorScheme="blue"
                        flex="1"
                        onClick={handleGenerateFinalTx}
                        isLoading={isProcessing}
                        loadingText="Generating"
                      >
                        Generate Final Transaction
                      </Button>
                      
                      <Button
                        colorScheme="green"
                        flex="1"
                        onClick={handleSettleContract}
                        isLoading={isProcessing}
                        loadingText="Settling"
                      >
                        Settle Contract
                      </Button>
                    </HStack>
                  </>
                )}
                
                {contract.status === 'SETTLED' && (
                  <Button
                    colorScheme="green"
                    onClick={() => setActiveStep(4)}
                  >
                    View Settlement Results
                  </Button>
                )}
              </VStack>
            ) : (
              <Alert status="error">
                <AlertIcon />
                No contract data available. Please create and fund a contract first.
              </Alert>
            )}
          </Box>
        );
      
      case 4: // Settlement
        return (
          <Box>
            <Heading size="md" mb={4}>Settlement Results</Heading>
            {contract ? (
              <VStack spacing={4} align="stretch">
                {contract.status === 'SETTLED' ? (
                  <Alert status="success" variant="subtle">
                    <AlertIcon />
                    <Box>
                      <AlertDescription>
                        This contract has been successfully settled.
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : (
                  <Alert status="warning">
                    <AlertIcon />
                    <AlertDescription>
                      This contract has not been settled yet. Please complete the settlement process.
                    </AlertDescription>
                  </Alert>
                )}
                
                {renderContractStatus()}
                
                <Divider />
                
                {contract.status === 'SETTLED' ? (
                  <>
                    <Box p={4} borderWidth="1px" borderRadius="md" bg="green.50">
                      <Heading size="md" mb={3} color="green.600">Settlement Successful</Heading>
                      <Text mb={3}>
                        The contract has been settled based on the hash rate at the time of settlement.
                      </Text>
                      
                      <HStack justify="space-between" mb={1}>
                        <Text>Contract Type:</Text>
                        <Text fontWeight="medium">{contract.contract_type}</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>Strike Hash Rate:</Text>
                        <Text fontWeight="medium">{contract.strike_hash_rate} EH/s</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>Contract Size:</Text>
                        <Text fontWeight="medium">{contract.contract_size.toLocaleString()} sats</Text>
                      </HStack>
                      <HStack justify="space-between" mb={1}>
                        <Text>Settlement Time:</Text>
                        <Text fontWeight="medium">
                          {contract.settlement_time 
                            ? new Date(contract.settlement_time).toLocaleString() 
                            : 'Not available'}
                        </Text>
                      </HStack>
                    </Box>
                    
                    {onComplete && (
                      <Button
                        colorScheme="blue"
                        size="lg"
                        onClick={() => onComplete(contract)}
                      >
                        Complete Process
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={handleSettleContract}
                    isLoading={isProcessing}
                    loadingText="Settling Contract"
                    isDisabled={contract.status !== 'ACTIVE'}
                  >
                    Settle Contract Now
                  </Button>
                )}
              </VStack>
            ) : (
              <Alert status="error">
                <AlertIcon />
                No contract data available. Please create a contract first.
              </Alert>
            )}
          </Box>
        );
      
      default:
        return (
          <Alert status="error">
            <AlertIcon />
            Invalid step
          </Alert>
        );
    }
  };
  
  return (
    <Box>
      <Stepper index={activeStep} mb={8} size="sm">
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>
            
            <Box flexShrink="0">
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </Box>
            
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      
      {renderStepContent()}
      
      {/* Transaction Signing Modal */}
      <ContractSigningModal
        isOpen={isSigningModalOpen}
        onClose={closeSigningModal}
        contract={contract!}
        transaction={txDetails}
        onSuccess={handleSigningSuccess}
      />
      
      {/* Error Modal */}
      <Modal isOpen={isErrorModalOpen} onClose={closeErrorModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Error</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="error" variant="left-accent">
              <AlertIcon as={WarningIcon} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeErrorModal}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractWorkflow;
