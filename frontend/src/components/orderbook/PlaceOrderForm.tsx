// src/components/orderbook/PlaceOrderForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  VStack,
  HStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
  Tooltip,
  InputGroup,
  InputRightAddon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Divider,
  useColorMode,
  Switch,
  Flex,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAppSelector } from '../../hooks/redux-hooks';
import { bitcoinService } from '../../api';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';

interface PlaceOrderFormProps {
  onSubmit: (data: PlaceOrderFormType) => void;
  isProcessing?: boolean;
  isWalletConnected?: boolean;
  availableBalance?: number;
  defaultOrderType?: 'buy' | 'sell';
  defaultContractType?: string;
  defaultStrikeHashRate?: number;
  defaultPrice?: number;
  defaultQuantity?: number;
}

const PlaceOrderForm: React.FC<PlaceOrderFormProps> = ({
  onSubmit,
  isProcessing = false,
  isWalletConnected = false,
  availableBalance = 0,
  defaultOrderType = 'buy',
  defaultContractType = 'call',
  defaultStrikeHashRate,
  defaultPrice,
  defaultQuantity = 1,
}) => {
  const { colorMode } = useColorMode();
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>(defaultOrderType);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [priceSlider, setPriceSlider] = useState(50);
  const [currentHashRate, setCurrentHashRate] = useState<number | null>(null);
  const [initialHashRateLoading, setInitialHashRateLoading] = useState(true);
  const [isLoadingHashRate, setIsLoadingHashRate] = useState(false);
  
  const { user } = useAppSelector((state) => state.auth);
  const { userKeys } = useAppSelector((state) => state.auth);
  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<PlaceOrderFormType>({
    defaultValues: {
      user_id: user?.id || '',
      side: defaultOrderType,
      contract_type: defaultContractType,
      strike_hash_rate: defaultStrikeHashRate || 0,
      start_block_height: 0,
      end_block_height: 0,
      price: defaultPrice || 0,
      quantity: defaultQuantity,
      pub_key: userKeys && userKeys.length > 0 ? userKeys[0].pub_key : '',
      expires_in: undefined,
    }
  });
  
  // Watch for form value changes
  const watchContractType = watch('contract_type');
  const watchQuantity = watch('quantity');
  const watchPrice = watch('price');
  
  useEffect(() => {
  let mounted = true;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  const fetchHashRate = async () => {
    setInitialHashRateLoading(true);

    try {
      const response = await bitcoinService.getCurrentHashRate();

      if (!mounted) return;

      if (response.success && response.data) {
        setCurrentHashRate(response.data);

        // Set default strike hash rate to current hash rate if not already provided
        if (!defaultStrikeHashRate && mounted) {
          setValue('strike_hash_rate', response.data);
        }

        // Fetching succeeded, so exit retry loop
        retryCount = MAX_RETRIES;
      } else if (retryCount < MAX_RETRIES) {
        // If the response wasn't successful, retry after a delay
        retryCount++;
        setTimeout(fetchHashRate, 1000); // Retry after 1 second
      }
    } catch (error) {
      console.error('Failed to fetch current hash rate:', error);

      if (mounted && retryCount < MAX_RETRIES) {
        // If there was an error, retry after a delay
        retryCount++;
        setTimeout(fetchHashRate, 1000); // Retry after 1 second
      }
    } finally {
      if (mounted) {
        setInitialHashRateLoading(false);
      }
    }
  };

  // Start the fetch process
  fetchHashRate();

  // Cleanup function
  return () => {
    mounted = false;
  };
}, [setValue, defaultStrikeHashRate]);


  // Fetch current hash rate on component mount
  useEffect(() => {
    const fetchCurrentHashRate = async () => {
      setIsLoadingHashRate(true);
      try {
        const response = await bitcoinService.getCurrentHashRate();
        if (response.success && response.data) {
          setCurrentHashRate(response.data);
          // Set default strike hash rate to current hash rate if not already provided
          if (!defaultStrikeHashRate) {
            setValue('strike_hash_rate', response.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch current hash rate:', error);
      } finally {
        setIsLoadingHashRate(false);
      }
    };
    
    fetchCurrentHashRate();
    
    // Get the current best block and set default block heights
    const fetchBestBlock = async () => {
      try {
        const response = await bitcoinService.getBestBlock();
        if (response.success && response.data) {
          const bestBlock = response.data;
          // Set default start block height to current height + 100
          setValue('start_block_height', bestBlock.height + 100);
          // Set default end block height to start + 2016 (approximately 2 weeks)
          setValue('end_block_height', bestBlock.height + 100 + 2016);
        }
      } catch (error) {
        console.error('Failed to fetch best block:', error);
      }
    };
    
    fetchBestBlock();
  }, [setValue, defaultStrikeHashRate]);
  
  // Update user_id when user changes
  useEffect(() => {
    if (user?.id) {
      setValue('user_id', user.id);
    }
  }, [user, setValue]);
  
  // Update default pub_key when userKeys changes
  useEffect(() => {
    if (userKeys && userKeys.length > 0 && !watch('pub_key')) {
      setValue('pub_key', userKeys[0].pub_key);
    }
  }, [userKeys, setValue, watch]);
  
  // Handle order side change
  const handleOrderSideChange = (side: 'buy' | 'sell') => {
    setOrderSide(side);
    setValue('side', side);
  };
  
  // Handle price slider change
  useEffect(() => {
    if (currentHashRate) {
      // Calculate price based on slider position (40-160% of current rate)
      const minPrice = 10000; // Minimum price in sats
      const maxPrice = 1000000; // Maximum price in sats
      const calculatedPrice = minPrice + (maxPrice - minPrice) * (priceSlider / 100);
      if (!defaultPrice) {
        setValue('price', Math.round(calculatedPrice));
      }
    }
  }, [priceSlider, currentHashRate, setValue, defaultPrice]);
  
  // Handle expiry toggle
  const handleExpiryToggle = (enabled: boolean) => {
    setExpiryEnabled(enabled);
    setValue('expires_in', enabled ? expiryMinutes : undefined);
  };
  
  // Handle expiry time change
  const handleExpiryChange = (minutes: number) => {
    setExpiryMinutes(minutes);
    if (expiryEnabled) {
      setValue('expires_in', minutes);
    }
  };
  
  // Calculate total cost or revenue
  const calculateTotal = () => {
    const quantity = watchQuantity || 0;
    const price = watchPrice || 0;
    return quantity * price;
  };
  
  // Submit handler
  const onFormSubmit = (data: PlaceOrderFormType) => {
    onSubmit(data);
  };
  
  return (
    <Box 
      as="form" 
      onSubmit={handleSubmit(onFormSubmit)}
      p={5}
      borderWidth="1px"
      borderRadius="lg"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Tabs isFitted variant="enclosed" mb={4}>
        <TabList>
          <Tab 
            bg={orderSide === 'buy' ? 'green.50' : undefined}
            color={orderSide === 'buy' ? 'green.600' : undefined}
            borderTopColor={orderSide === 'buy' ? 'green.400' : undefined}
            onClick={() => handleOrderSideChange('buy')}
            _selected={{ 
              color: 'green.600', 
              borderColor: 'green.400',
              borderTopWidth: '2px'
            }}
          >
            Buy
          </Tab>
          <Tab 
            bg={orderSide === 'sell' ? 'red.50' : undefined}
            color={orderSide === 'sell' ? 'red.600' : undefined}
            borderTopColor={orderSide === 'sell' ? 'red.400' : undefined}
            onClick={() => handleOrderSideChange('sell')}
            _selected={{ 
              color: 'red.600', 
              borderColor: 'red.400',
              borderTopWidth: '2px'
            }}
          >
            Sell
          </Tab>
        </TabList>
        
        <TabPanels>
          {/* Buy Panel */}
          <TabPanel>
            <VStack spacing={5} align="stretch">
              <Controller
                name="contract_type"
                control={control}
                rules={{ required: 'Contract type is required' }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.contract_type}>
                    <FormLabel>Contract Type</FormLabel>
                    <Select {...field}>
                      <option value="call">CALL - Bet Hash Rate Will Increase</option>
                      <option value="put">PUT - Bet Hash Rate Will Decrease</option>
                    </Select>
                    <FormErrorMessage>{errors.contract_type?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Controller
                name="strike_hash_rate"
                control={control}
                rules={{ 
                  required: 'Strike hash rate is required',
                  min: {
                    value: 1,
                    message: 'Strike hash rate must be at least 1 EH/s'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.strike_hash_rate}>
                    <FormLabel>
                      Strike Hash Rate (EH/s)
                      {currentHashRate && (
                        <Text as="span" ml={2} fontSize="sm" color="gray.500">
                          Current: {currentHashRate.toFixed(2)} EH/s
                        </Text>
                      )}
                    </FormLabel>
                    <NumberInput 
                      {...field} 
                      onChange={(_, value) => field.onChange(value)}
                      min={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.strike_hash_rate?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <HStack>
                <Controller
                  name="start_block_height"
                  control={control}
                  rules={{ 
                    required: 'Start block height is required',
                    min: {
                      value: 1,
                      message: 'Start block height must be positive'
                    }
                  }}
                  render={({ field }) => (
                    <FormControl isInvalid={!!errors.start_block_height}>
                      <FormLabel>Start Block</FormLabel>
                      <NumberInput 
                        {...field}
                        onChange={(_, value) => field.onChange(value)}
                        min={1}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormErrorMessage>{errors.start_block_height?.message}</FormErrorMessage>
                    </FormControl>
                  )}
                />
                
                <Controller
                  name="end_block_height"
                  control={control}
                  rules={{ 
                    required: 'End block height is required',
                    validate: (value, formValues) => 
                      value > formValues.start_block_height || 
                      'End block must be greater than start block'
                  }}
                  render={({ field }) => (
                    <FormControl isInvalid={!!errors.end_block_height}>
                      <FormLabel>End Block</FormLabel>
                      <NumberInput 
                        {...field}
                        onChange={(_, value) => field.onChange(value)}
                        min={watch('start_block_height') ? watch('start_block_height') + 1 : 2}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormErrorMessage>{errors.end_block_height?.message}</FormErrorMessage>
                    </FormControl>
                  )}
                />
              </HStack>
              
              <Controller
                name="price"
                control={control}
                rules={{ 
                  required: 'Price is required',
                  min: {
                    value: 1000,
                    message: 'Price must be at least 1000 sats'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.price}>
                    <FormLabel>Price (sats)</FormLabel>
                    <NumberInput 
                      {...field}
                      onChange={(_, value) => field.onChange(value)}
                      min={1000}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Slider
                      aria-label="price-slider"
                      value={priceSlider}
                      onChange={setPriceSlider}
                      min={0}
                      max={100}
                      mt={2}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Controller
                name="quantity"
                control={control}
                rules={{ 
                  required: 'Quantity is required',
                  min: {
                    value: 1,
                    message: 'Quantity must be at least 1'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.quantity}>
                    <FormLabel>Quantity</FormLabel>
                    <NumberInput 
                      {...field}
                      onChange={(_, value) => field.onChange(value)}
                      min={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <FormLabel mb="0">Order Expiration</FormLabel>
                  <Switch
                    isChecked={expiryEnabled}
                    onChange={(e) => handleExpiryToggle(e.target.checked)}
                  />
                </Flex>
                
                {expiryEnabled && (
                  <Controller
                    name="expires_in"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={expiryMinutes} 
                        onChange={(e) => handleExpiryChange(parseInt(e.target.value))}
                        isDisabled={!expiryEnabled}
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={360}>6 hours</option>
                        <option value={1440}>24 hours</option>
                        <option value={10080}>1 week</option>
                      </Select>
                    )}
                  />
                )}
              </Box>
              
              <Controller
                name="pub_key"
                control={control}
                rules={{ 
                  required: 'Public key is required',
                  pattern: {
                    value: /^[0-9a-fA-F]{64,66}$/,
                    message: 'Please enter a valid public key (hex format)'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.pub_key}>
                    <FormLabel>
                      Public Key
                      <Tooltip label="Your public key is used to identify you as a participant in the contract">
                        <InfoIcon ml={1} boxSize={3} />
                      </Tooltip>
                    </FormLabel>
                    {userKeys && userKeys.length > 0 ? (
                      <Select {...field}>
                        {userKeys.map((key) => (
                          <option key={key.id} value={key.pub_key}>
                            {key.label} ({key.key_type})
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input {...field} placeholder="Enter your public key" />
                    )}
                    <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Divider my={2} />
              
              <Box bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} p={3} borderRadius="md">
                <HStack justify="space-between">
                  <Text>Total Cost:</Text>
                  <Text fontWeight="bold">{calculateTotal().toLocaleString()} sats</Text>
                </HStack>
                {isWalletConnected && (
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="sm">Available Balance:</Text>
                    <Text fontSize="sm">{availableBalance.toLocaleString()} sats</Text>
                  </HStack>
                )}
              </Box>
            </VStack>
          </TabPanel>
          
          {/* Sell Panel - Same as Buy Panel with different color scheme */}
          <TabPanel>
            <VStack spacing={5} align="stretch">
              <Controller
                name="contract_type"
                control={control}
                rules={{ required: 'Contract type is required' }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.contract_type}>
                    <FormLabel>Contract Type</FormLabel>
                    <Select {...field}>
                      <option value="call">CALL - Bet Hash Rate Will Increase</option>
                      <option value="put">PUT - Bet Hash Rate Will Decrease</option>
                    </Select>
                    <FormErrorMessage>{errors.contract_type?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Controller
                name="strike_hash_rate"
                control={control}
                rules={{ 
                  required: 'Strike hash rate is required',
                  min: {
                    value: 1,
                    message: 'Strike hash rate must be at least 1 EH/s'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.strike_hash_rate}>
                    <FormLabel>
                      Strike Hash Rate (EH/s)
                      {currentHashRate && (
                        <Text as="span" ml={2} fontSize="sm" color="gray.500">
                          Current: {currentHashRate.toFixed(2)} EH/s
                        </Text>
                      )}
                    </FormLabel>
                    <NumberInput 
                      {...field} 
                      onChange={(_, value) => field.onChange(value)}
                      min={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.strike_hash_rate?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <HStack>
                <Controller
                  name="start_block_height"
                  control={control}
                  rules={{ 
                    required: 'Start block height is required',
                    min: {
                      value: 1,
                      message: 'Start block height must be positive'
                    }
                  }}
                  render={({ field }) => (
                    <FormControl isInvalid={!!errors.start_block_height}>
                      <FormLabel>Start Block</FormLabel>
                      <NumberInput 
                        {...field}
                        onChange={(_, value) => field.onChange(value)}
                        min={1}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormErrorMessage>{errors.start_block_height?.message}</FormErrorMessage>
                    </FormControl>
                  )}
                />
                
                <Controller
                  name="end_block_height"
                  control={control}
                  rules={{ 
                    required: 'End block height is required',
                    validate: (value, formValues) => 
                      value > formValues.start_block_height || 
                      'End block must be greater than start block'
                  }}
                  render={({ field }) => (
                    <FormControl isInvalid={!!errors.end_block_height}>
                      <FormLabel>End Block</FormLabel>
                      <NumberInput 
                        {...field}
                        onChange={(_, value) => field.onChange(value)}
                        min={watch('start_block_height') ? watch('start_block_height') + 1 : 2}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <FormErrorMessage>{errors.end_block_height?.message}</FormErrorMessage>
                    </FormControl>
                  )}
                />
              </HStack>
              
              <Controller
                name="price"
                control={control}
                rules={{ 
                  required: 'Price is required',
                  min: {
                    value: 1000,
                    message: 'Price must be at least 1000 sats'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.price}>
                    <FormLabel>Price (sats)</FormLabel>
                    <NumberInput 
                      {...field}
                      onChange={(_, value) => field.onChange(value)}
                      min={1000}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Slider
                      aria-label="price-slider"
                      value={priceSlider}
                      onChange={setPriceSlider}
                      min={0}
                      max={100}
                      mt={2}
                      colorScheme="red"
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Controller
                name="quantity"
                control={control}
                rules={{ 
                  required: 'Quantity is required',
                  min: {
                    value: 1,
                    message: 'Quantity must be at least 1'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.quantity}>
                    <FormLabel>Quantity</FormLabel>
                    <NumberInput 
                      {...field}
                      onChange={(_, value) => field.onChange(value)}
                      min={1}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <FormLabel mb="0">Order Expiration</FormLabel>
                  <Switch
                    isChecked={expiryEnabled}
                    onChange={(e) => handleExpiryToggle(e.target.checked)}
                  />
                </Flex>
                
                {expiryEnabled && (
                  <Controller
                    name="expires_in"
                    control={control}
                    render={({ field }) => (
                      <Select 
                        value={expiryMinutes} 
                        onChange={(e) => handleExpiryChange(parseInt(e.target.value))}
                        isDisabled={!expiryEnabled}
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={360}>6 hours</option>
                        <option value={1440}>24 hours</option>
                        <option value={10080}>1 week</option>
                      </Select>
                    )}
                  />
                )}
              </Box>
              
              <Controller
                name="pub_key"
                control={control}
                rules={{ 
                  required: 'Public key is required',
                  pattern: {
                    value: /^[0-9a-fA-F]{64,66}$/,
                    message: 'Please enter a valid public key (hex format)'
                  }
                }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.pub_key}>
                    <FormLabel>
                      Public Key
                      <Tooltip label="Your public key is used to identify you as a participant in the contract">
                        <InfoIcon ml={1} boxSize={3} />
                      </Tooltip>
                    </FormLabel>
                    {userKeys && userKeys.length > 0 ? (
                      <Select {...field}>
                        {userKeys.map((key) => (
                          <option key={key.id} value={key.pub_key}>
                            {key.label} ({key.key_type})
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input {...field} placeholder="Enter your public key" />
                    )}
                    <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <Divider my={2} />
              
              <Box bg={colorMode === 'light' ? 'gray.50' : 'gray.700'} p={3} borderRadius="md">
                <HStack justify="space-between">
                  <Text>Total Revenue:</Text>
                  <Text fontWeight="bold">{calculateTotal().toLocaleString()} sats</Text>
                </HStack>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      <Divider my={4} />
      
      <Button
        type="submit"
        colorScheme={orderSide === 'buy' ? 'green' : 'red'}
        width="full"
        size="lg"
        isLoading={isProcessing}
        loadingText="Processing"
        isDisabled={!isWalletConnected}
      >
        {orderSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
      </Button>
      
      {!isWalletConnected && (
        <Text mt={2} fontSize="sm" color="yellow.500" textAlign="center">
          Please connect your wallet to place orders
        </Text>
      )}
    </Box>
  );
};

export default PlaceOrderForm;
