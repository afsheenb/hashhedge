
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

