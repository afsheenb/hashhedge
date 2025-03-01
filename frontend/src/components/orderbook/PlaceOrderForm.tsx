
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
}

const PlaceOrderForm: React.FC<PlaceOrderFormProps> = ({
  onSubmit,
  isProcessing = false,
  isWalletConnected = false,
  availableBalance = 0,
}) => {
  const { colorMode } = useColorMode();
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [priceSlider, setPriceSlider] = useState(50);
  const [currentHashRate, setCurrentHashRate] = useState<number | null>(null);
  const [isLoadingHashRate, setIsLoadingHashRate] = useState(false);
  
  const { user } = useAppSelector((state) => state.auth);
  const { userKeys } = useAppSelector((state) => state.auth);
  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<PlaceOrderFormType>({
    defaultValues: {
      user_id: user?.id || '',
      side: 'buy',
      contract_type: 'call',
      strike_hash_rate: 0,
      start_block_height: 0,
      end_block_height: 0,
      price: 0,
      quantity: 1,
      pub_key: userKeys && userKeys.length > 0 ? userKeys[0] : '',
      expires_in: undefined,
    }
  });
  
  // Watch for form value changes
  const watchContractType = watch('contract_type');
  const watchQuantity = watch('quantity');
  const watchPrice = watch('price');
  
  // Fetch current hash rate on component mount
  useEffect(() => {
    const fetchCurrentHashRate = async () => {
      setIsLoadingHashRate(true);
      try {
        const response = await bitcoinService.getCurrentHashRate();
        if (response.success && response.data) {
          setCurrentHashRate(response.data);
          // Set default strike hash rate to current hash rate
          setValue('strike_hash_rate', response.data);
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
  }, [setValue]);
  
  // Update user_id when user changes
  useEffect(() => {
    if (user?.id) {
      setValue('user_id', user.id);
    }
  }, [user, setValue]);
  
  // Update default pub_key when userKeys changes
  useEffect(() => {
    if (userKeys && userKeys.length > 0 && !watch('pub_key')) {
      setValue('pub_key', userKeys[0]);
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
      setValue('price', Math.round(calculatedPrice));
    }
  }, [priceSlider, currentHashRate, setValue]);
  
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
                      max={100}
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
              
              <Controller
                name="pub_key"
                control={control}
                rules={{ required: 'Public key is required' }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.pub_key}>
                    <FormLabel>
                      Public Key
                      <Tooltip label="The public key that will be used for this contract">
                        <InfoIcon ml={1} boxSize={3.5} />
                      </Tooltip>
                    </FormLabel>
                    <Select {...field}>
                      {userKeys && userKeys.length > 0 ? (
                        userKeys.map((key, index) => (
                          <option key={index} value={key}>
                            {key.substring(0, 6)}...{key.substring(key.length - 4)}
                          </option>
                        ))
                      ) : (
                        <option value="">No keys available</option>
                      )}
                    </Select>
                    <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              <HStack justify="space-between">
                <Text>Order Expiry:</Text>
                <HStack>
                  <Button
                    size="sm"
                    colorScheme={expiryEnabled ? "blue" : "gray"}
                    variant={expiryEnabled ? "solid" : "outline"}
                    onClick={() => handleExpiryToggle(true)}
                  >
                    Custom
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={!expiryEnabled ? "blue" : "gray"}
                    variant={!expiryEnabled ? "solid" : "outline"}
                    onClick={() => handleExpiryToggle(false)}
                  >
                    None
                  </Button>
                </HStack>
              </HStack>
              
              {expiryEnabled && (
                <HStack>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(60)}
                  >
                    1 hour
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 24 * 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 24 * 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(24 * 60)}
                  >
                    1 day
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 7 * 24 * 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 7 * 24 * 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(7 * 24 * 60)}
                  >
                    1 week
                  </Button>
                </HStack>
              )}
              
              <Divider my={2} />
              
              <Box>
                <Text fontWeight="bold">Order Summary:</Text>
                <HStack justify="space-between" mt={2}>
                  <Text>Type:</Text>
                  <Text>
                    {watchContractType === 'call' ? 'CALL' : 'PUT'} (
                    {watchContractType === 'call' 
                      ? 'Bet hash rate will increase' 
                      : 'Bet hash rate will decrease'}
                    )
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>Total {orderSide === 'buy' ? 'Cost' : 'Value'}:</Text>
                  <Text fontWeight="bold">
                    {calculateTotal().toLocaleString()} sats
                  </Text>
                </HStack>
                {isWalletConnected && (
                  <HStack justify="space-between">
                    <Text>Available Balance:</Text>
                    <Text>{availableBalance.toLocaleString()} sats</Text>
                  </HStack>
                )}
              </Box>
              
              <Button
                type="submit"
                colorScheme={orderSide === 'buy' ? 'green' : 'red'}
                isLoading={isProcessing}
                loadingText="Processing"
                size="lg"
                isDisabled={
                  !isWalletConnected || 
                  (orderSide === 'buy' && calculateTotal() > availableBalance)
                }
              >
                {orderSide === 'buy' ? 'Buy' : 'Sell'} {watchContractType?.toUpperCase()}
              </Button>
              
              {orderSide === 'buy' && calculateTotal() > availableBalance && (
                <Text color="red.500" fontSize="sm" textAlign="center">
                  Insufficient balance to place this order
                </Text>
              )}
            </VStack>
          </TabPanel>
          
          {/* Sell Panel - identical to Buy Panel except for button color and label */}
          <TabPanel>
            {/* Same form controls as Buy Panel */}
            <VStack spacing={5} align="stretch">
              {/* Identical form controls with same Controllers */}
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
                      max={100}
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
              
              <Controller
                name="pub_key"
                control={control}
                rules={{ required: 'Public key is required' }}
                render={({ field }) => (
                  <FormControl isInvalid={!!errors.pub_key}>
                    <FormLabel>
                      Public Key
                      <Tooltip label="The public key that will be used for this contract">
                        <InfoIcon ml={1} boxSize={3.5} />
                      </Tooltip>
                    </FormLabel>
                    <Select {...field}>
                      {userKeys && userKeys.length > 0 ? (
                        userKeys.map((key, index) => (
                          <option key={index} value={key}>
                            {key.substring(0, 6)}...{key.substring(key.length - 4)}
                          </option>
                        ))
                      ) : (
                        <option value="">No keys available</option>
                      )}
                    </Select>
                    <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
                  </FormControl>
                )}
              />
              
              {/* Order expiry controls identical to Buy panel */}
              <HStack justify="space-between">
                <Text>Order Expiry:</Text>
                <HStack>
                  <Button
                    size="sm"
                    colorScheme={expiryEnabled ? "blue" : "gray"}
                    variant={expiryEnabled ? "solid" : "outline"}
                    onClick={() => handleExpiryToggle(true)}
                  >
                    Custom
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={!expiryEnabled ? "blue" : "gray"}
                    variant={!expiryEnabled ? "solid" : "outline"}
                    onClick={() => handleExpiryToggle(false)}
                  >
                    None
                  </Button>
                </HStack>
              </HStack>
              
              {expiryEnabled && (
                <HStack>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(60)}
                  >
                    1 hour
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 24 * 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 24 * 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(24 * 60)}
                  >
                    1 day
                  </Button>
                  <Button
                    size="sm"
                    colorScheme={expiryMinutes === 7 * 24 * 60 ? "blue" : "gray"}
                    variant={expiryMinutes === 7 * 24 * 60 ? "solid" : "outline"}
                    onClick={() => handleExpiryChange(7 * 24 * 60)}
                  >
                    1 week
                  </Button>
                </HStack>
              )}
              
              <Divider my={2} />
              
              <Box>
                <Text fontWeight="bold">Order Summary:</Text>
                <HStack justify="space-between" mt={2}>
                  <Text>Type:</Text>
                  <Text>
                    {watchContractType === 'call' ? 'CALL' : 'PUT'} (
                    {watchContractType === 'call' 
                      ? 'Bet hash rate will increase' 
                      : 'Bet hash rate will decrease'}
                    )
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text>Total {orderSide === 'buy' ? 'Cost' : 'Value'}:</Text>
                  <Text fontWeight="bold">
                    {calculateTotal().toLocaleString()} sats
                  </Text>
                </HStack>
              </Box>
              
              <Button
                type="submit"
                colorScheme="red"
                isLoading={isProcessing}
                loadingText="Processing"
                size="lg"
                isDisabled={!isWalletConnected}
              >
                Sell {watchContractType?.toUpperCase()}
              </Button>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default PlaceOrderForm;
