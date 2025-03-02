// src/components/wallet/DepositWithdraw.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Text,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Flex,
  RadioGroup,
  Radio,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorMode,
  HStack,
  Code,
  Divider,
  Tooltip,
  Icon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Spinner,
  useClipboard,
  Button as ChakraButton,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  sendBitcoin,
  sendOnchain,
  sendOffchain,
  fetchWalletBalance,
} from '../../features/wallet/arkWalletSlice';
import QRCode from 'qrcode.react'; // You would need to install this package

interface FeeRate {
  value: number;
  label: string;
  description: string;
}

const feeRates: FeeRate[] = [
  { 
    value: 1, 
    label: 'Economic', 
    description: 'Might take several hours to confirm (~1 sat/vB)' 
  },
  { 
    value: 5, 
    label: 'Standard', 
    description: 'Usually confirms within an hour (~5 sat/vB)' 
  },
  { 
    value: 15, 
    label: 'Priority', 
    description: 'Aims to confirm in the next block (~15 sat/vB)' 
  },
];

const DepositWithdraw: React.FC = () => {
  const { colorMode } = useColorMode();
  const [tabIndex, setTabIndex] = useState(0);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [txMethod, setTxMethod] = useState<'auto' | 'onchain' | 'offchain'>('auto');
  const [selectedFeeRate, setSelectedFeeRate] = useState<number>(5); // Default to standard fee
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, addresses, balance, loading } = useAppSelector((state) => state.arkWallet);
  
  // QR code value
  const depositQrValue = addresses ? 
    (tabIndex === 0 ? `bitcoin:${addresses.onchain}` : `bitcoin:${addresses.offchain}`) : '';
  
  // Copy functionality for addresses
  const { hasCopied: hasOnchainCopied, onCopy: onCopyOnchain } = useClipboard(addresses?.onchain || '');
  const { hasCopied: hasOffchainCopied, onCopy: onCopyOffchain } = useClipboard(addresses?.offchain || '');
  
  // Fee calculations
  const calculateFee = (size: number = 225): number => { // Default to 225 bytes for a simple transaction
    return Math.ceil(size * selectedFeeRate);
  };
  
  const calculatedFee = calculateFee();
  const totalWithdrawAmount = withdrawAmount + calculatedFee;
  
  // Validate withdrawal address based on selected method
  const validateAddress = (address: string, method: 'auto' | 'onchain' | 'offchain'): boolean => {
    if (!address || address.trim() === '') {
      setAddressError('Address is required');
      return false;
    }
    
    // Validation based on method
    if (method === 'auto') {
      // For auto, either onchain or offchain address is acceptable
      if (!address.startsWith('tb1') && !address.startsWith('bc1') && 
          !address.startsWith('tark1') && !address.startsWith('ark1')) {
        setAddressError('Invalid Bitcoin or Ark address format');
        return false;
      }
    } else if (method === 'onchain') {
      // Only Bitcoin addresses for onchain
      if (!address.startsWith('tb1') && !address.startsWith('bc1')) {
        setAddressError('Invalid Bitcoin address format. On-chain addresses should start with tb1 or bc1');
        return false;
      }
    } else if (method === 'offchain') {
      // Only Ark addresses for offchain
      if (!address.startsWith('tark1') && !address.startsWith('ark1')) {
        setAddressError('Invalid Ark address format. Off-chain addresses should start with tark1 or ark1');
        return false;
      }
    }
    
    return true;
  };
  
  // Handle withdrawal
  const handleWithdraw = async () => {
    // Reset errors and state
    setAddressError('');
    setAmountError('');
    setTransactionId(null);
    
    // Validate address based on transaction method
    if (!validateAddress(withdrawAddress, txMethod)) {
      return;
    }
    
    // Validate amount
    if (withdrawAmount <= 0) {
      setAmountError('Amount must be greater than 0');
      return;
    }
    
    const totalNeeded = withdrawAmount + calculatedFee;
    
    if (!balance || totalNeeded > balance.available) {
      setAmountError(`Insufficient balance. Need ${totalNeeded} sats (including ${calculatedFee} sats fee)`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let txid;
      
      // Send transaction based on selected method
      if (txMethod === 'auto') {
        txid = await dispatch(sendBitcoin({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: selectedFeeRate
        })).unwrap();
      } else if (txMethod === 'onchain') {
        txid = await dispatch(sendOnchain({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: selectedFeeRate
        })).unwrap();
      } else if (txMethod === 'offchain') {
        txid = await dispatch(sendOffchain({
          address: withdrawAddress,
          amount: withdrawAmount,
          feeRate: selectedFeeRate
        })).unwrap();
      }
      
      // Set transaction ID for display
      setTransactionId(txid);
      
      toast({
        title: 'Withdrawal successful',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh balance
      dispatch(fetchWalletBalance());
    } catch (err) {
      toast({
        title: 'Withdrawal failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Reset withdrawal form
  const resetWithdrawalForm = () => {
    setWithdrawAddress('');
    setWithdrawAmount(0);
    setAddressError('');
    setAmountError('');
    setTransactionId(null);
    setTxMethod('auto');
    setSelectedFeeRate(5);
  };
  
  if (!isConnected) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>Connect your wallet to deposit or withdraw funds.</AlertDescription>
          </Box>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={0} borderWidth="1px" borderRadius="lg">
      <Tabs 
        index={tabIndex} 
        onChange={setTabIndex} 
        colorScheme="blue" 
        isFitted
        variant="enclosed"
      >
        <TabList>
          <Tab _selected={{ color: "blue.500", borderColor: "blue.500", borderBottomColor: "transparent" }}>
            On-chain Deposit
          </Tab>
          <Tab _selected={{ color: "blue.500", borderColor: "blue.500", borderBottomColor: "transparent" }}>
            Off-chain Deposit
          </Tab>
          <Tab _selected={{ color: "blue.500", borderColor: "blue.500", borderBottomColor: "transparent" }}>
            Withdraw
          </Tab>
        </TabList>
        <TabPanels>
          {/* On-chain Deposit Panel */}
          <TabPanel px={5} py={4}>
            <VStack align="stretch" spacing={4}>
              <Text>
                Send Bitcoin to this on-chain address to fund your wallet:
              </Text>
              
              <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                <VStack spacing={4}>
                  {addresses?.onchain ? (
                    <>
                      <Box 
                        bg="white" 
                        p={3} 
                        borderRadius="md" 
                        width="fit-content" 
                        mx="auto"
                      >
                        <QRCode 
                          value={`bitcoin:${addresses.onchain}`} 
                          size={180} 
                          renderAs="svg"
                          includeMargin={true}
                        />
                      </Box>
                      
                      <Box width="full">
                        <Text fontWeight="semibold" mb={2}>Bitcoin On-chain Address</Text>
                        <Flex>
                          <Code 
                            flex="1" 
                            p={2} 
                            borderRadius="md" 
                            fontSize="sm" 
                            wordBreak="break-all"
                          >
                            {addresses.onchain}
                          </Code>
                          <ChakraButton 
                            ml={2} 
                            onClick={onCopyOnchain} 
                            size="sm"
                            colorScheme={hasOnchainCopied ? "green" : "blue"}
                          >
                            {hasOnchainCopied ? <CheckIcon /> : <CopyIcon />}
                          </ChakraButton>
                        </Flex>
                      </Box>
                    </>
                  ) : (
                    <Spinner />
                  )}
                </VStack>
              </Box>
              
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>On-chain Deposits</AlertTitle>
                  <AlertDescription>
                    On-chain deposits are secured by the Bitcoin blockchain. They typically take 
                    1-6 confirmations (10-60 minutes) to be credited to your wallet.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </TabPanel>
          
          {/* Off-chain Deposit Panel */}
          <TabPanel px={5} py={4}>
            <VStack align="stretch" spacing={4}>
              <Text>
                Send Bitcoin to this Ark address for near-instant off-chain deposits:
              </Text>
              
              <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                <VStack spacing={4}>
                  {addresses?.offchain ? (
                    <>
                      <Box 
                        bg="white" 
                        p={3} 
                        borderRadius="md" 
                        width="fit-content" 
                        mx="auto"
                      >
                        <QRCode 
                          value={`bitcoin:${addresses.offchain}`} 
                          size={180} 
                          renderAs="svg"
                          includeMargin={true}
                        />
                      </Box>
                      
                      <Box width="full">
                        <Text fontWeight="semibold" mb={2}>Ark Off-chain Address</Text>
                        <Flex>
                          <Code 
                            flex="1" 
                            p={2} 
                            borderRadius="md" 
                            fontSize="sm" 
                            wordBreak="break-all"
                          >
                            {addresses.offchain}
                          </Code>
                          <ChakraButton 
                            ml={2} 
                            onClick={onCopyOffchain} 
                            size="sm"
                            colorScheme={hasOffchainCopied ? "green" : "blue"}
                          >
                            {hasOffchainCopied ? <CheckIcon /> : <CopyIcon />}
                          </ChakraButton>
                        </Flex>
                      </Box>
                    </>
                  ) : (
                    <Spinner />
                  )}
                </VStack>
              </Box>
              
              <Alert status="info">
                <AlertIcon />
                <Box>
                  <AlertTitle>Off-chain Deposits</AlertTitle>
                  <AlertDescription>
                    Off-chain deposits are processed via the Ark protocol. They're faster and cheaper 
                    than on-chain transactions, ideal for trading on HashHedge.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </TabPanel>
          
          {/* Withdraw Panel */}
          <TabPanel px={5} py={4}>
            <VStack align="stretch" spacing={4}>
              {transactionId ? (
                // Transaction success view
                <Box>
                  <Alert status="success" mb={4}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Withdrawal Successful!</AlertTitle>
                      <AlertDescription>
                        Your transaction has been submitted to the network.
                      </AlertDescription>
                    </Box>
                  </Alert>
                  
                  <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                    <Text fontWeight="semibold" mb={2}>Transaction ID:</Text>
                    <Code p={2} borderRadius="md" fontSize="sm" width="full" wordBreak="break-all">
                      {transactionId}
                    </Code>
                  </Box>
                  
                  <HStack justify="flex-end" mt={4}>
                    <Button 
                      colorScheme="blue" 
                      onClick={resetWithdrawalForm}
                    >
                      New Withdrawal
                    </Button>
                  </HStack>
                </Box>
              ) : (
                // Withdrawal form
                <>
                  <HStack>
                    <Box flex="1">
                      <Text fontWeight="semibold">Available Balance:</Text>
                      <Text fontSize="xl" fontWeight="bold">
                        {balance?.available.toLocaleString() || 0} sats
                      </Text>
                    </Box>
                    
                    {balance && balance.unconfirmed > 0 && (
                      <Box flex="1">
                        <Text fontWeight="semibold">Pending:</Text>
                        <Text fontSize="md" color="gray.500">
                          {balance.unconfirmed.toLocaleString()} sats
                        </Text>
                      </Box>
                    )}
                  </HStack>
                  
                  <Divider />
                  
                  <FormControl isInvalid={!!addressError}>
                    <FormLabel>Recipient Address</FormLabel>
                    <Input
                      placeholder="Bitcoin or Ark address"
                      value={withdrawAddress}
                      onChange={(e) => {
                        setWithdrawAddress(e.target.value);
                        setAddressError('');
                        
                        // Auto-detect transaction method based on address prefix
                        const address = e.target.value.trim();
                        if (address.startsWith('tb1') || address.startsWith('bc1')) {
                          setTxMethod('onchain');
                        } else if (address.startsWith('tark1') || address.startsWith('ark1')) {
                          setTxMethod('offchain');
                        } else {
                          setTxMethod('auto');
                        }
                      }}
                    />
                    {addressError ? (
                      <FormErrorMessage>{addressError}</FormErrorMessage>
                    ) : (
                      <FormHelperText>
                        Enter a Bitcoin address (on-chain) or Ark address (off-chain)
                      </FormHelperText>
                    )}
                  </FormControl>
                  
                  <FormControl isInvalid={!!amountError}>
                    <FormLabel>Amount (sats)</FormLabel>
                    <NumberInput
                      min={0}
                      max={balance?.available ? balance.available - calculatedFee : 0}
                      value={withdrawAmount}
                      onChange={(_, value) => {
                        setWithdrawAmount(value);
                        setAmountError('');
                      }}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    
                    {amountError ? (
                      <FormErrorMessage>{amountError}</FormErrorMessage>
                    ) : (
                      <FormHelperText>
                        Max: {balance ? (balance.available - calculatedFee).toLocaleString() : 0} sats (after fees)
                      </FormHelperText>
                    )}
                  </FormControl>
                  
                  <Box>
                    <FormLabel>Transaction Method</FormLabel>
                    <RadioGroup value={txMethod} onChange={(value: 'auto' | 'onchain' | 'offchain') => setTxMethod(value as any)}>
                      <VStack align="start" spacing={2}>
                        <Radio value="auto">Automatic (based on address)</Radio>
                        <Radio value="onchain">On-chain (higher fees, more secure)</Radio>
                        <Radio value="offchain">Off-chain (lower fees, faster)</Radio>
                      </VStack>
                    </RadioGroup>
                  </Box>
                  
                  <Box>
                    <FormLabel>
                      Fee Rate
                      <Tooltip label="Higher fees mean faster confirmation times">
                        <InfoIcon ml={1} fontSize="xs" />
                      </Tooltip>
                    </FormLabel>
                    
                    <VStack align="stretch" spacing={3}>
                      <RadioGroup 
                        value={selectedFeeRate.toString()} 
                        onChange={(value) => setSelectedFeeRate(parseInt(value))}
                      >
                        <HStack spacing={4} width="full" justifyContent="space-between">
                          {feeRates.map((rate) => (
                            <Box key={rate.value}>
                              <Radio value={rate.value.toString()}>
                                {rate.label}
                              </Radio>
                            </Box>
                          ))}
                        </HStack>
                      </RadioGroup>
                      
                      <Text fontSize="sm" color="gray.500">
                        {feeRates.find(r => r.value === selectedFeeRate)?.description}
                      </Text>
                      
                      <HStack justify="space-between">
                        <Text>Estimated Fee:</Text>
                        <Text fontWeight="medium">{calculatedFee} sats</Text>
                      </HStack>
                    </VStack>
                  </Box>
                  
                  <Alert status="info" variant="subtle">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Transaction Summary</AlertTitle>
                      <Flex justify="space-between" mt={1}>
                        <Text>Amount:</Text>
                        <Text>{withdrawAmount.toLocaleString()} sats</Text>
                      </Flex>
                      <Flex justify="space-between">
                        <Text>Fee:</Text>
                        <Text>{calculatedFee.toLocaleString()} sats</Text>
                      </Flex>
                      <Divider my={1} />
                      <Flex justify="space-between" fontWeight="bold">
                        <Text>Total:</Text>
                        <Text>{totalWithdrawAmount.toLocaleString()} sats</Text>
                      </Flex>
                    </Box>
                  </Alert>
                  
                  <Flex justify="flex-end">
                    <Button
                      colorScheme="blue"
                      onClick={handleWithdraw}
                      isLoading={isProcessing || loading}
                      loadingText="Processing"
                      isDisabled={
                        !withdrawAddress || 
                        withdrawAmount <= 0 || 
                        !balance || 
                        totalWithdrawAmount > balance.available
                      }
                    >
                      Withdraw
                    </Button>
                  </Flex>
                </>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DepositWithdraw;
