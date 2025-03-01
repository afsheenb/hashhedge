
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Alert,
  AlertIcon,
  Text,
  Select,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { Contract, SwapContractParticipantForm } from '../../types';
import { swapContractParticipant } from '../../store/contract-slice';

interface SwapContractParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess?: (txHex: string) => void;
}

const SwapContractParticipantModal: React.FC<SwapContractParticipantModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SwapContractParticipantForm>();
  
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { userKeys } = useAppSelector((state) => state.auth);
  const { isConnected } = useAppSelector((state) => state.arkWallet);

  // Determine if the current user is buyer or seller
  const isBuyer = userKeys.some(key => key === contract.buyer_pub_key);
  const isSeller = userKeys.some(key => key === contract.seller_pub_key);
  const userRole = isBuyer ? 'buyer' : (isSeller ? 'seller' : null);
  
  const onSubmit = async (data: SwapContractParticipantForm) => {
    if (!userRole) {
      toast({
        title: 'Error',
        description: 'You must be either the buyer or seller of this contract to swap participants',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the API request
      const swapData: SwapContractParticipantForm = {
        participant_type: userRole,
        new_pub_key: data.new_pub_key,
      };
      
      const result = await dispatch(swapContractParticipant({
        id: contract.id,
        data: swapData,
      })).unwrap();
      
      toast({
        title: 'Swap transaction created',
        description: 'The contract participant swap transaction has been created. Please sign and broadcast it.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      reset();
      onClose();
      
      if (onSuccess && result.tx_hex) {
        onSuccess(result.tx_hex);
      }
    } catch (error) {
      toast({
        title: 'Swap failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleModalClose = () => {
    reset();
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Transfer Contract Participation</ModalHeader>
        <ModalCloseButton />
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {!isConnected ? (
                <Alert status="warning">
                  <AlertIcon />
                  Please connect your wallet to transfer contract participation.
                </Alert>
              ) : !userRole ? (
                <Alert status="error">
                  <AlertIcon />
                  You must be either the buyer or seller of this contract to transfer participation.
                </Alert>
              ) : (
                <>
                  <Alert status="info">
                    <AlertIcon />
                    <Text>
                      You are currently the <strong>{userRole}</strong> of this contract. 
                      You can transfer your participation to another public key.
                    </Text>
                  </Alert>
                  
                  <FormControl isRequired isInvalid={!!errors.participant_type}>
                    <FormLabel>Your Role</FormLabel>
                    <Select
                      {...register('participant_type', { required: 'Role is required' })}
                      defaultValue={userRole}
                      isDisabled
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </Select>
                    <FormErrorMessage>{errors.participant_type?.message}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.new_pub_key}>
                    <FormLabel>New Public Key</FormLabel>
                    <Input
                      {...register('new_pub_key', {
                        required: 'New public key is required',
                        pattern: {
                          value: /^[0-9a-fA-F]{64,66}$/,
                          message: 'Please enter a valid public key (hex format)',
                        },
                      })}
                      placeholder="Enter the new public key"
                    />
                    <FormErrorMessage>{errors.new_pub_key?.message}</FormErrorMessage>
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting}
              loadingText="Processing"
              isDisabled={!isConnected || !userRole}
            >
              Create Swap Transaction
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
  
  const getFundingStepText = () => {
    switch (fundingStep) {
      case 1:
        return "Preparing contract setup...";
      case 2:
        return "Sending funds to contract...";
      case 3:
        return "Funding complete!";
      default:
        return "";
    }
  };

  if (!isConnected) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>Connect your wallet to fund this contract.</AlertDescription>
        </Box>
      </Alert>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch" spacing={4}>
        <Flex alignItems="center">
          <Text fontWeight="bold" fontSize="lg">Fund Contract</Text>
          <Spacer />
          {contract.status === 'ACTIVE' && (
            <Badge colorScheme="green">Funded</Badge>
          )}
        </Flex>
        
        <Text>
          This contract requires {contract.contract_size.toLocaleString()} sats to be active.
          {contract.status !== 'ACTIVE' && " Once funded, the contract will be activated and available for trading."}
        </Text>
        
        {contract.status !== 'ACTIVE' && (
          <>
            <FormControl isInvalid={!!amountError}>
              <FormLabel>Funding Amount (sats)</FormLabel>
              <NumberInput
                min={contract.contract_size}
                max={balance?.confirmed || 0}
                value={fundingAmount}
                onChange={(_, value) => {
                  setFundingAmount(value);
                  setAmountError('');
                }}
                isDisabled={isFunding}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {amountError && <FormErrorMessage>{amountError}</FormErrorMessage>}
              <HStack mt={1} fontSize="sm">
                <Text>Available:</Text>
                <Text>{balance?.confirmed.toLocaleString() || 0} sats</Text>
                <Spacer />
                <Text>Required:</Text>
                <Text>{contract.contract_size.toLocaleString()} sats</Text>
              </HStack>
            </FormControl>
            
            {isFunding && (
              <Box>
                <Text mb={2}>{getFundingStepText()}</Text>
                <Progress 
                  value={(fundingStep / 3) * 100} 
                  size="sm" 
                  colorScheme="blue" 
                  borderRadius="md"
                  isAnimated
                />
              </Box>
            )}
            
            <Button
              colorScheme="blue"
              onClick={handleFundContract}
              isLoading={isFunding || walletLoading}
              loadingText="Processing"
              isDisabled={
                !isConnected || 
                fundingAmount < contract.contract_size || 
                !balance || 
                fundingAmount > balance.confirmed
              }
            >
              Fund Contract
            </Button>
          </>
        )}
        
        {contract.status === 'ACTIVE' && (
          <Alert status="success" variant="subtle">
            <AlertIcon />
            This contract is fully funded and active.
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Flex,
  Spacer,
  HStack,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { sendOffchain } from '../../features/wallet/arkWalletSlice';
import { Contract } from '../../types';
import { setupContract } from '../../store/contract-slice';

interface ContractFundingProps {
  contract: Contract;
  onSuccess?: () => void;
}

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess }) => {
  const [fundingAmount, setFundingAmount] = useState(contract.contract_size);
  const [amountError, setAmountError] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStep, setFundingStep] = useState(0);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  const handleFundContract = async () => {
    // Reset error
    setAmountError('');
    setIsFunding(true);
    setFundingStep(1);
    
    // Validate amount
    if (fundingAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      setIsFunding(false);
      return;
    }
    
    if (!balance || fundingAmount > balance.confirmed) {
      setAmountError('Insufficient confirmed balance');
      setIsFunding(false);
      return;
    }
    
    try {
      // Generate contract address from contract setup endpoint
      const setupResponse = await dispatch(setupContract({
        id: contract.id,
        data: {
          amount: fundingAmount,
        }
      })).unwrap();
      
      if (!setupResponse.transaction || !setupResponse.transaction.address) {
        throw new Error('Failed to get funding address from contract setup');
      }
      
      setFundingStep(2);
      
      // Send funds to the contract address
      const txid = await dispatch(sendOffchain({
        address: setupResponse.transaction.address,
        amount: fundingAmount,
        feeRate: 1
      })).unwrap();
      
      setFundingStep(3);
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: 'Funding failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFunding(false);
    }
  };


import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Alert,
  AlertIcon,
  Text,
  Select,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { Contract, SwapContractParticipantForm } from '../../types';
import { swapContractParticipant } from '../../store/contract-slice';

interface SwapContractParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  onSuccess?: (txHex: string) => void;
}

const SwapContractParticipantModal: React.FC<SwapContractParticipantModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SwapContractParticipantForm>();
  
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { userKeys } = useAppSelector((state) => state.auth);
  const { isConnected } = useAppSelector((state) => state.arkWallet);

  // Determine if the current user is buyer or seller
  const isBuyer = userKeys.some(key => key === contract.buyer_pub_key);
  const isSeller = userKeys.some(key => key === contract.seller_pub_key);
  const userRole = isBuyer ? 'buyer' : (isSeller ? 'seller' : null);
  
  const onSubmit = async (data: SwapContractParticipantForm) => {
    if (!userRole) {
      toast({
        title: 'Error',
        description: 'You must be either the buyer or seller of this contract to swap participants',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the API request
      const swapData: SwapContractParticipantForm = {
        participant_type: userRole,
        new_pub_key: data.new_pub_key,
      };
      
      const result = await dispatch(swapContractParticipant({
        id: contract.id,
        data: swapData,
      })).unwrap();
      
      toast({
        title: 'Swap transaction created',
        description: 'The contract participant swap transaction has been created. Please sign and broadcast it.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      reset();
      onClose();
      
      if (onSuccess && result.tx_hex) {
        onSuccess(result.tx_hex);
      }
    } catch (error) {
      toast({
        title: 'Swap failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleModalClose = () => {
    reset();
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Transfer Contract Participation</ModalHeader>
        <ModalCloseButton />
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {!isConnected ? (
                <Alert status="warning">
                  <AlertIcon />
                  Please connect your wallet to transfer contract participation.
                </Alert>
              ) : !userRole ? (
                <Alert status="error">
                  <AlertIcon />
                  You must be either the buyer or seller of this contract to transfer participation.
                </Alert>
              ) : (
                <>
                  <Alert status="info">
                    <AlertIcon />
                    <Text>
                      You are currently the <strong>{userRole}</strong> of this contract. 
                      You can transfer your participation to another public key.
                    </Text>
                  </Alert>
                  
                  <FormControl isRequired isInvalid={!!errors.participant_type}>
                    <FormLabel>Your Role</FormLabel>
                    <Select
                      {...register('participant_type', { required: 'Role is required' })}
                      defaultValue={userRole}
                      isDisabled
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                    </Select>
                    <FormErrorMessage>{errors.participant_type?.message}</FormErrorMessage>
                  </FormControl>
                  
                  <FormControl isRequired isInvalid={!!errors.new_pub_key}>
                    <FormLabel>New Public Key</FormLabel>
                    <Input
                      {...register('new_pub_key', {
                        required: 'New public key is required',
                        pattern: {
                          value: /^[0-9a-fA-F]{64,66}$/,
                          message: 'Please enter a valid public key (hex format)',
                        },
                      })}
                      placeholder="Enter the new public key"
                    />
                    <FormErrorMessage>{errors.new_pub_key?.message}</FormErrorMessage>
                  </FormControl>
                </>
              )}
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleModalClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting}
              loadingText="Processing"
              isDisabled={!isConnected || !userRole}
            >
              Create Swap Transaction
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
  
  const getFundingStepText = () => {
    switch (fundingStep) {
      case 1:
        return "Preparing contract setup...";
      case 2:
        return "Sending funds to contract...";
      case 3:
        return "Funding complete!";
      default:
        return "";
    }
  };

  if (!isConnected) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Box>
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>Connect your wallet to fund this contract.</AlertDescription>
        </Box>
      </Alert>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch" spacing={4}>
        <Flex alignItems="center">
          <Text fontWeight="bold" fontSize="lg">Fund Contract</Text>
          <Spacer />
          {contract.status === 'ACTIVE' && (
            <Badge colorScheme="green">Funded</Badge>
          )}
        </Flex>
        
        <Text>
          This contract requires {contract.contract_size.toLocaleString()} sats to be active.
          {contract.status !== 'ACTIVE' && " Once funded, the contract will be activated and available for trading."}
        </Text>
        
        {contract.status !== 'ACTIVE' && (
          <>
            <FormControl isInvalid={!!amountError}>
              <FormLabel>Funding Amount (sats)</FormLabel>
              <NumberInput
                min={contract.contract_size}
                max={balance?.confirmed || 0}
                value={fundingAmount}
                onChange={(_, value) => {
                  setFundingAmount(value);
                  setAmountError('');
                }}
                isDisabled={isFunding}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {amountError && <FormErrorMessage>{amountError}</FormErrorMessage>}
              <HStack mt={1} fontSize="sm">
                <Text>Available:</Text>
                <Text>{balance?.confirmed.toLocaleString() || 0} sats</Text>
                <Spacer />
                <Text>Required:</Text>
                <Text>{contract.contract_size.toLocaleString()} sats</Text>
              </HStack>
            </FormControl>
            
            {isFunding && (
              <Box>
                <Text mb={2}>{getFundingStepText()}</Text>
                <Progress 
                  value={(fundingStep / 3) * 100} 
                  size="sm" 
                  colorScheme="blue" 
                  borderRadius="md"
                  isAnimated
                />
              </Box>
            )}
            
            <Button
              colorScheme="blue"
              onClick={handleFundContract}
              isLoading={isFunding || walletLoading}
              loadingText="Processing"
              isDisabled={
                !isConnected || 
                fundingAmount < contract.contract_size || 
                !balance || 
                fundingAmount > balance.confirmed
              }
            >
              Fund Contract
            </Button>
          </>
        )}
        
        {contract.status === 'ACTIVE' && (
          <Alert status="success" variant="subtle">
            <AlertIcon />
            This contract is fully funded and active.
          </Alert>
        )}
      </VStack>
    </Box>
  );
};

import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Flex,
  Spacer,
  HStack,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { sendOffchain } from '../../features/wallet/arkWalletSlice';
import { Contract } from '../../types';
import { setupContract } from '../../store/contract-slice';

interface ContractFundingProps {
  contract: Contract;
  onSuccess?: () => void;
}

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess }) => {
  const [fundingAmount, setFundingAmount] = useState(contract.contract_size);
  const [amountError, setAmountError] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStep, setFundingStep] = useState(0);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  const handleFundContract = async () => {
    // Reset error
    setAmountError('');
    setIsFunding(true);
    setFundingStep(1);
    
    // Validate amount
    if (fundingAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      setIsFunding(false);
      return;
    }
    
    if (!balance || fundingAmount > balance.confirmed) {
      setAmountError('Insufficient confirmed balance');
      setIsFunding(false);
      return;
    }
    
    try {
      // Generate contract address from contract setup endpoint
      const setupResponse = await dispatch(setupContract({
        id: contract.id,
        data: {
          amount: fundingAmount,
        }
      })).unwrap();
      
      if (!setupResponse.transaction || !setupResponse.transaction.address) {
        throw new Error('Failed to get funding address from contract setup');
      }
      
      setFundingStep(2);
      
      // Send funds to the contract address
      const txid = await dispatch(sendOffchain({
        address: setupResponse.transaction.address,
        amount: fundingAmount,
        feeRate: 1
      })).unwrap();
      
      setFundingStep(3);
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: 'Funding failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFunding(false);
    }
  };


import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Flex,
  Spacer,
  HStack,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { sendOffchain } from '../../features/wallet/arkWalletSlice';
import { Contract } from '../../types';
import { setupContract } from '../../store/contract-slice';

interface ContractFundingProps {
  contract: Contract;
  onSuccess?: () => void;
}

const ContractFunding: React.FC<ContractFundingProps> = ({ contract, onSuccess }) => {
  const [fundingAmount, setFundingAmount] = useState(contract.contract_size);
  const [amountError, setAmountError] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [fundingStep, setFundingStep] = useState(0);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, balance, loading: walletLoading } = useAppSelector((state) => state.arkWallet);
  
  const handleFundContract = async () => {
    // Reset error
    setAmountError('');
    setIsFunding(true);
    setFundingStep(1);
    
    // Validate amount
    if (fundingAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      setIsFunding(false);
      return;
    }
    
    if (!balance || fundingAmount > balance.confirmed) {
      setAmountError('Insufficient confirmed balance');
      setIsFunding(false);
      return;
    }
    
    try {
      // Generate contract address from contract setup endpoint
      const setupResponse = await dispatch(setupContract({
        id: contract.id,
        data: {
          amount: fundingAmount,
        }
      })).unwrap();
      
      if (!setupResponse.transaction || !setupResponse.transaction.address) {
        throw new Error('Failed to get funding address from contract setup');
      }
      
      setFundingStep(2);
      
      // Send funds to the contract address
      const txid = await dispatch(sendOffchain({
        address: setupResponse.transaction.address,
        amount: fundingAmount,
        feeRate: 1
      })).unwrap();
      
      setFundingStep(3);
      
      toast({
        title: 'Contract funded',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      toast({
        title: 'Funding failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFunding(false);
    }
  };

