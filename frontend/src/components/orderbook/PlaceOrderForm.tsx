import React from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  FormErrorMessage,
  useToast,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  InputGroup,
  InputRightAddon,
  HStack,
  RadioGroup,
  Radio,
  Text,
  Divider,
  VStack,
  Heading,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { placeOrder } from '../../store/order-slice';
import { PlaceOrderForm as PlaceOrderFormType, ContractType, OrderSide } from '../../types';
import { getBestBlockHeight } from '../../utils/bitcoinUtils';

interface PlaceOrderFormProps {
  initialContractType?: ContractType;
  initialStrikeHashRate?: number;
  onSuccess?: () => void;
}

const PlaceOrderForm: React.FC<PlaceOrderFormProps> = ({
  initialContractType = ContractType.CALL,
  initialStrikeHashRate = 350,
  onSuccess,
}) => {
  const { user, userKeys } = useAppSelector((state) => state.auth);
  const { currentHashRate } = useAppSelector((state) => state.hashRate);
  
  const dispatch = useAppDispatch();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
    setValue,
  } = useForm<PlaceOrderFormType>({
    defaultValues: {
      user_id: user?.id || '',
      side: OrderSide.BUY,
      contract_type: initialContractType,
      strike_hash_rate: initialStrikeHashRate,
      start_block_height: getBestBlockHeight(),
      end_block_height: getBestBlockHeight() + 2016, // ~2 weeks
      price: 10000, // 10,000 sats
      quantity: 1,
      pub_key: userKeys.length > 0 ? userKeys[0].pub_key : '',
      expires_in: 1440, // 24 hours
    },
  });

  const side = watch('side');
  const contractType = watch('contract_type');
  const price = watch('price');
  const quantity = watch('quantity');

  // Update key when user changes side
  React.useEffect(() => {
    if (userKeys.length > 0) {
      setValue('pub_key', userKeys[0].pub_key);
    }
  }, [userKeys, setValue]);

  const onSubmit = async (data: PlaceOrderFormType) => {
    try {
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to place an order',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Ensure user_id is set
      data.user_id = user.id;

      await dispatch(placeOrder(data)).unwrap();
      toast({
        title: 'Order placed',
        description: 'Your order has been placed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      if (onSuccess) onSuccess();
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

  const getOrderDescription = () => {
    const direction = side === OrderSide.BUY ? 'BUY' : 'SELL';
    const optionType = contractType === ContractType.CALL ? 'CALL' : 'PUT';
    const totalPrice = price * quantity;
    
    let predictionText = '';
    if (contractType === ContractType.CALL) {
      predictionText = `the hash rate will be ABOVE ${initialStrikeHashRate} EH/s`;
    } else {
      predictionText = `the hash rate will be BELOW ${initialStrikeHashRate} EH/s`;
    }

    return `You are placing a ${direction} order for ${quantity} ${optionType} contract(s) at ${price.toLocaleString()} sats each (total: ${totalPrice.toLocaleString()} sats), predicting that ${predictionText} by the target block/date.`;
  };

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="sm" mb={3}>Order Type</Heading>
          <HStack spacing={6}>
            <FormControl isInvalid={!!errors.side} isRequired>
              <FormLabel>Side</FormLabel>
              <Controller
                control={control}
                name="side"
                rules={{ required: 'Side is required' }}
                render={({ field }) => (
                  <RadioGroup {...field}>
                    <HStack spacing={5}>
                      <Radio value={OrderSide.BUY} colorScheme="green">Buy</Radio>
                      <Radio value={OrderSide.SELL} colorScheme="red">Sell</Radio>
                    </HStack>
                  </RadioGroup>
                )}
              />
              <FormErrorMessage>{errors.side?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.contract_type} isRequired>
              <FormLabel>Contract Type</FormLabel>
              <Controller
                control={control}
                name="contract_type"
                rules={{ required: 'Contract type is required' }}
                render={({ field }) => (
                  <RadioGroup {...field}>
                    <HStack spacing={5}>
                      <Radio value={ContractType.CALL} colorScheme="teal">Call</Radio>
                      <Radio value={ContractType.PUT} colorScheme="purple">Put</Radio>
                    </HStack>
                  </RadioGroup>
                )}
              />
              <FormErrorMessage>{errors.contract_type?.message}</FormErrorMessage>
            </FormControl>
          </HStack>
        </Box>

        <Divider />

        <Box>
          <Heading size="sm" mb={3}>Contract Parameters</Heading>
          <Stack spacing={4} direction={{ base: 'column', md: 'row' }}>
            <FormControl isInvalid={!!errors.strike_hash_rate} isRequired>
              <FormLabel>Strike Hash Rate (EH/s)</FormLabel>
              <Controller
                control={control}
                name="strike_hash_rate"
                rules={{
                  required: 'Strike hash rate is required',
                  min: {
                    value: 1,
                    message: 'Hash rate must be at least 1 EH/s',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={5}
                    precision={2}
                    value={field.value}
                    onChange={(valueString) => field.onChange(parseFloat(valueString))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.strike_hash_rate?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.start_block_height} isRequired>
              <FormLabel>Start Block Height</FormLabel>
              <Controller
                control={control}
                name="start_block_height"
                rules={{
                  required: 'Start block height is required',
                  min: {
                    value: 1,
                    message: 'Block height must be positive',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={(valueString) => field.onChange(parseInt(valueString, 10))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.expires_in}>
              <FormLabel>Expires In (minutes)</FormLabel>
              <Controller
                control={control}
                name="expires_in"
                render={({ field }) => (
                  <NumberInput
                    min={1}
                    step={60}
                    value={field.value || ''}
                    onChange={(valueString) => field.onChange(valueString ? parseInt(valueString, 10) : null)}
                  >
                    <NumberInputField placeholder="Never expires" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                )}
              />
              <FormErrorMessage>{errors.expires_in?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading size="sm" mb={3}>Your Key</Heading>
          <FormControl isInvalid={!!errors.pub_key} isRequired>
            <FormLabel>Public Key</FormLabel>
            {userKeys.length > 0 ? (
              <Select
                placeholder="Select a key"
                {...register('pub_key', { required: 'Public key is required' })}
              >
                {userKeys.map((key) => (
                  <option key={key.id} value={key.pub_key}>
                    {key.label} ({key.key_type})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                placeholder="Enter your public key"
                {...register('pub_key', {
                  required: 'Public key is required',
                  pattern: {
                    value: /^[0-9a-fA-F]{64,66}$/,
                    message: 'Please enter a valid public key (hex format)',
                  },
                })}
              />
            )}
            <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
          </FormControl>
        </Box>

        <Box p={4} bg="blue.50" borderRadius="md">
          <Text fontWeight="medium">{getOrderDescription()}</Text>
          <Text fontSize="sm" mt={2} color="gray.600">
            Total order value: {(price * quantity).toLocaleString()} sats
          </Text>
        </Box>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Placing Order"
        >
          Place Order
        </Button>
      </VStack>
    </Box>
  );
};

export default PlaceOrderForm;

