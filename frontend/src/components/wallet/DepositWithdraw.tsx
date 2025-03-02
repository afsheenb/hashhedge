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
  IconButton,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  sendBitcoin,
  sendOnchain,
  sendOffchain,
  fetchWalletBalance,
} from '../../features/wallet/arkWalletSlice';
import QRCode from 'qrcode.react';

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
  
  // Refresh balance when tab changes
  useEffect(() => {
    if (isConnected) {
      dispatch(fetchWalletBalance());
    }
  }, [dispatch, isConnected, tabIndex]);
  
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
                          <IconButton 
                            ml={2} 
                            onClick={onCopyOnchain} 
                            icon={hasOnchainCopied ? <CheckIcon /> : <CopyIcon />}
                            aria-label="Copy on-chain address" 
                            size="sm"
                            colorScheme={hasOnchainCopied ? "green" : "blue"}
                          />
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
                <VStack align="start" spacing={1}>
                  <AlertTitle>On-chain Deposit Information</AlertTitle>
                  <AlertDescription>
                    On-chain deposits typically require 1-3 confirmations before funds are available.
                    This can take anywhere from 10 minutes to an hour depending on network conditions.
                  </AlertDescription>
                </VStack>
              </Alert>
            </VStack>
          </TabPanel>
          
          {/* Off-chain Deposit Panel */}
          <TabPanel px={5} py={4}>
            <VStack align="stretch" spacing={4}>
              <Text>
                Send Bitcoin to this off-chain Ark address for faster and cheaper transactions:
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
                          <IconButton 
                            ml={2} 
                            onClick={onCopyOffchain} 
                            icon={hasOffchainCopied ? <CheckIcon /> : <CopyIcon />}
                            aria-label="Copy off-chain address" 
                            size="sm"
                            colorScheme={hasOffchainCopied ? "green" : "blue"}
                          />
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
                <VStack align="start" spacing={1}>
                  <AlertTitle>Off-chain Deposit Information</AlertTitle>
                  <AlertDescription>
                    Off-chain deposits through the Ark protocol are typically available within seconds to minutes.
                    They have lower fees and faster processing times, ideal for trading on the platform.
                  </AlertDescription>
                </VStack>
              </Alert>
            </VStack>
          </TabPanel>
          
          {/* Withdraw Panel */}
          <TabPanel px={5} py={4}>
            <VStack align="stretch" spacing={4}>
              {transactionId ? (
                <Alert status="success" variant="subtle">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Withdrawal successful!</AlertTitle>
                    <AlertDescription>
                      <Text mb={2}>Your funds have been withdrawn successfully.</Text>
                      <Text fontWeight="bold">Transaction ID:</Text>
                      <Code p={2} borderRadius="md" fontSize="sm" width="full" mb={3}>
                        {transactionId}
                      </Code>
                      <Button 
                        leftIcon={<ExternalLinkIcon />} 
                        size="sm" 
                        colorScheme="blue" 
                        variant="outline"
                        onClick={() => resetWithdrawalForm()}
                      >
                        New Withdrawal
                      </Button>
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : (
                <>
                  <FormControl isInvalid={!!addressError}>
                    <FormLabel>Recipient Address</FormLabel>
                    <Input
                      placeholder="Bitcoin or Ark address"
                      value={withdrawAddress}
                      onChange={(e) => {
                        setWithdrawAddress(e.target.value);
                        setAddressError('');
                      }}
                    />
                    {addressError && <FormErrorMessage>{addressError}</FormErrorMessage>}
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
                        Available: {balance?.available?.toLocaleString() || 0} sats
                      </FormHelperText>
                    )}
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Transaction Method</FormLabel>
                    <RadioGroup value={txMethod} onChange={(value: 'auto' | 'onchain' | 'offchain') => setTxMethod(value)}>
                      <VStack align="start" spacing={2}>
                        <Radio value="auto">Automatic (based on address)</Radio>
                        <Radio value="onchain">On-chain (higher fees, more secure)</Radio>
                        <Radio value="offchain">Off-chain (lower fees, faster)</Radio>
                      </VStack>
                    </RadioGroup>
                  </FormControl>
                  
                  <Box>
                    <FormLabel>Fee Rate</FormLabel>
                    <VStack align="stretch" spacing={2}>
                      <Flex justify="space-between">
                        <Text fontSize="sm">Economic</Text>
                        <Text fontSize="sm">Standard</Text>
                        <Text fontSize="sm">Priority</Text>
                      </Flex>
                      <Slider
                        min={1}
                        max={15}
                        step={1}
                        value={selectedFeeRate}
                        onChange={(value) => setSelectedFeeRate(value)}
                        colorScheme="blue"
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6} />
                      </Slider>
                    </VStack>
                    <HStack justify="space-between" mt={1}>
                      <Text fontSize="sm" fontWeight="bold">Current Fee:</Text>
                      <Text fontSize="sm">{selectedFeeRate} sat/vB (est. {calculatedFee} sats)</Text>
                    </HStack>
                  </Box>
                  
                  <Box p={3} borderWidth="1px" borderRadius="md" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
                    <Text fontWeight="bold" mb={2}>Transaction Summary</Text>
                    <HStack justify="space-between">
                      <Text>Amount:</Text>
                      <Text>{withdrawAmount.toLocaleString()} sats</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Fee:</Text>
                      <Text>{calculatedFee.toLocaleString()} sats</Text>
                    </HStack>
                    <Divider my={2} />
                    <HStack justify="space-between" fontWeight="bold">
                      <Text>Total:</Text>
                      <Text>{totalWithdrawAmount.toLocaleString()} sats</Text>
                    </HStack>
                  </Box>
                  
                  <Button
                    colorScheme="blue"
                    onClick={handleWithdraw}
                    isLoading={isProcessing}
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
