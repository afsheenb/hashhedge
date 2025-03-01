import React, { useState } from 'react';
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
  Switch,
  VStack,
  Heading,
  Divider,
  Flex,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { createContract } from '../../store/contract-slice';
import { CreateContractForm as CreateContractFormType, ContractType } from '../../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CreateContractForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
  } = useForm<CreateContractFormType>({
    defaultValues: {
      contract_type: ContractType.CALL,
      strike_hash_rate: 400, // Default current hash rate
      start_block_height: 800000, // Example block height
      end_block_height: 802016, // ~2 weeks later
      contract_size: 100000, // 100,000 sats
      premium: 5000, // 5,000 sats
      target_timestamp: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    },
  });

  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const { userKeys } = useAppSelector((state) => state.auth);
  const { currentHashRate } = useAppSelector((state) => state.hashRate);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const contractType = watch('contract_type');
  const strikeHashRate = watch('strike_hash_rate');

  const getContractDescription = () => {
    if (contractType === ContractType.CALL) {
      return `This contract will pay out if the network hash rate exceeds ${strikeHashRate} EH/s before the target date.`;
    } else {
      return `This contract will pay out if the network hash rate stays below ${strikeHashRate} EH/s until the target date.`;
    }
  };

  const onSubmit = async (data: CreateContractFormType) => {
    try {
      const resultAction = await dispatch(createContract(data)).unwrap();
      toast({
        title: 'Contract created',
        description: 'Your new contract has been created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate(`/contracts/${resultAction.id}`);
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

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="md" mb={4}>Contract Details</Heading>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.contract_type} isRequired>
              <FormLabel>Contract Type</FormLabel>
              <Select {...register('contract_type', { required: 'Contract type is required' })}>
                <option value={ContractType.CALL}>CALL (Bet on Hash Rate Increase)</option>
                <option value={ContractType.PUT}>PUT (Bet on Hash Rate Decrease)</option>
              </Select>
              <FormErrorMessage>{errors.contract_type?.message}</FormErrorMessage>
            </FormControl>

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

            <HStack>
              <FormControl isInvalid={!!errors.start_block_height} isRequired flex="1">
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
                <FormErrorMessage>{errors.start_block_height?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.end_block_height} isRequired flex="1">
                <FormLabel>End Block Height</FormLabel>
                <Controller
                  control={control}
                  name="end_block_height"
                  rules={{
                    required: 'End block height is required',
                    validate: (value, { start_block_height }) =>
                      value > start_block_height || 'End block must be greater than start block',
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
                <FormErrorMessage>{errors.end_block_height?.message}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl isInvalid={!!errors.target_timestamp} isRequired>
              <FormLabel>Target Timestamp</FormLabel>
              <Controller
                control={control}
                name="target_timestamp"
                rules={{
                  required: 'Target timestamp is required',
                  validate: (value) => 
                    new Date(value) > new Date() || 'Date must be in the future',
                }}
                render={({ field: { onChange, value, ...rest } }) => (
                  <Box className="date-picker-wrapper">
                    <DatePicker
                      selected={value ? new Date(value) : null}
                      onChange={(date: Date) => onChange(date.toISOString())}
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      customInput={<Input />}
                      {...rest}
                    />
                  </Box>
                )}
              />
              <FormErrorMessage>{errors.target_timestamp?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>Financial Details</Heading>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.contract_size} isRequired>
              <FormLabel>Contract Size (sats)</FormLabel>
              <Controller
                control={control}
                name="contract_size"
                rules={{
                  required: 'Contract size is required',
                  min: {
                    value: 1000,
                    message: 'Contract size must be at least 1,000 sats',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1000}
                    step={1000}
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
              <FormErrorMessage>{errors.contract_size?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.premium} isRequired>
              <FormLabel>Premium (sats)</FormLabel>
              <Controller
                control={control}
                name="premium"
                rules={{
                  required: 'Premium is required',
                  min: {
                    value: 0,
                    message: 'Premium cannot be negative',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={0}
                    step={100}
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
              <FormErrorMessage>{errors.premium?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Participants</Heading>
            <FormControl display="flex" alignItems="center" width="auto">
              <FormLabel htmlFor="use-own-keys" mb="0">
                Use My Keys
              </FormLabel>
              <Switch id="use-own-keys" isChecked={useOwnKeys} onChange={() => setUseOwnKeys(!useOwnKeys)} />
            </FormControl>
          </Flex>

          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.buyer_pub_key} isRequired>
              <FormLabel>Buyer Public Key</FormLabel>
              {useOwnKeys && userKeys.length > 0 ? (
                <Select
                  placeholder="Select a key"
                  {...register('buyer_pub_key', { required: 'Buyer public key is required' })}
                >
                  {userKeys.map((key) => (
                    <option key={key.id} value={key.pub_key}>
                      {key.label} ({key.key_type})
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="Enter buyer public key"
                  {...register('buyer_pub_key', {
                    required: 'Buyer public key is required',
                    pattern: {
                      value: /^[0-9a-fA-F]{64,66}$/,
                      message: 'Please enter a valid public key (hex format)',
                    },
                  })}
                />
              )}
              <FormErrorMessage>{errors.buyer_pub_key?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.seller_pub_key} isRequired>
              <FormLabel>Seller Public Key</FormLabel>
              <Input
                placeholder="Enter seller public key"
                {...register('seller_pub_key', {
                  required: 'Seller public key is required',
                  pattern: {
                    value: /^[0-9a-fA-F]{64,66}$/,
                    message: 'Please enter a valid public key (hex format)',
                  },
                })}
              />
              <FormErrorMessage>{errors.seller_pub_key?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Box bg="blue.50" p={4} borderRadius="md">
          <Text fontWeight="bold">Contract Summary:</Text>
          <Text>{getContractDescription()}</Text>
        </Box>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Creating Contract"
        >
          Create Contract
        </Button>
      </VStack>
    </Box>
  );
};

export default CreateContractForm;

import React, { useState } from 'react';
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
  Switch,
  VStack,
  Heading,
  Divider,
  Flex,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { createContract } from '../../store/contract-slice';
import { CreateContractForm as CreateContractFormType, ContractType } from '../../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CreateContractForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
  } = useForm<CreateContractFormType>({
    defaultValues: {
      contract_type: ContractType.CALL,
      strike_hash_rate: 400, // Default current hash rate
      start_block_height: 800000, // Example block height
      end_block_height: 802016, // ~2 weeks later
      contract_size: 100000, // 100,000 sats
      premium: 5000, // 5,000 sats
      target_timestamp: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    },
  });

  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const { userKeys } = useAppSelector((state) => state.auth);
  const { currentHashRate } = useAppSelector((state) => state.hashRate);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const contractType = watch('contract_type');
  const strikeHashRate = watch('strike_hash_rate');

  const getContractDescription = () => {
    if (contractType === ContractType.CALL) {
      return `This contract will pay out if the network hash rate exceeds ${strikeHashRate} EH/s before the target date.`;
    } else {
      return `This contract will pay out if the network hash rate stays below ${strikeHashRate} EH/s until the target date.`;
    }
  };

  const onSubmit = async (data: CreateContractFormType) => {
    try {
      const resultAction = await dispatch(createContract(data)).unwrap();
      toast({
        title: 'Contract created',
        description: 'Your new contract has been created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate(`/contracts/${resultAction.id}`);
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

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="md" mb={4}>Contract Details</Heading>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.contract_type} isRequired>
              <FormLabel>Contract Type</FormLabel>
              <Select {...register('contract_type', { required: 'Contract type is required' })}>
                <option value={ContractType.CALL}>CALL (Bet on Hash Rate Increase)</option>
                <option value={ContractType.PUT}>PUT (Bet on Hash Rate Decrease)</option>
              </Select>
              <FormErrorMessage>{errors.contract_type?.message}</FormErrorMessage>
            </FormControl>

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

            <HStack>
              <FormControl isInvalid={!!errors.start_block_height} isRequired flex="1">
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
                <FormErrorMessage>{errors.start_block_height?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.end_block_height} isRequired flex="1">
                <FormLabel>End Block Height</FormLabel>
                <Controller
                  control={control}
                  name="end_block_height"
                  rules={{
                    required: 'End block height is required',
                    validate: (value, { start_block_height }) =>
                      value > start_block_height || 'End block must be greater than start block',
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
                <FormErrorMessage>{errors.end_block_height?.message}</FormErrorMessage>
              </FormControl>
            </HStack>

            <FormControl isInvalid={!!errors.target_timestamp} isRequired>
              <FormLabel>Target Timestamp</FormLabel>
              <Controller
                control={control}
                name="target_timestamp"
                rules={{
                  required: 'Target timestamp is required',
                  validate: (value) => 
                    new Date(value) > new Date() || 'Date must be in the future',
                }}
                render={({ field: { onChange, value, ...rest } }) => (
                  <Box className="date-picker-wrapper">
                    <DatePicker
                      selected={value ? new Date(value) : null}
                      onChange={(date: Date) => onChange(date.toISOString())}
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      customInput={<Input />}
                      {...rest}
                    />
                  </Box>
                )}
              />
              <FormErrorMessage>{errors.target_timestamp?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Heading size="md" mb={4}>Financial Details</Heading>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.contract_size} isRequired>
              <FormLabel>Contract Size (sats)</FormLabel>
              <Controller
                control={control}
                name="contract_size"
                rules={{
                  required: 'Contract size is required',
                  min: {
                    value: 1000,
                    message: 'Contract size must be at least 1,000 sats',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={1000}
                    step={1000}
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
              <FormErrorMessage>{errors.contract_size?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.premium} isRequired>
              <FormLabel>Premium (sats)</FormLabel>
              <Controller
                control={control}
                name="premium"
                rules={{
                  required: 'Premium is required',
                  min: {
                    value: 0,
                    message: 'Premium cannot be negative',
                  },
                }}
                render={({ field }) => (
                  <NumberInput
                    min={0}
                    step={100}
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
              <FormErrorMessage>{errors.premium?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Participants</Heading>
            <FormControl display="flex" alignItems="center" width="auto">
              <FormLabel htmlFor="use-own-keys" mb="0">
                Use My Keys
              </FormLabel>
              <Switch id="use-own-keys" isChecked={useOwnKeys} onChange={() => setUseOwnKeys(!useOwnKeys)} />
            </FormControl>
          </Flex>

          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.buyer_pub_key} isRequired>
              <FormLabel>Buyer Public Key</FormLabel>
              {useOwnKeys && userKeys.length > 0 ? (
                <Select
                  placeholder="Select a key"
                  {...register('buyer_pub_key', { required: 'Buyer public key is required' })}
                >
                  {userKeys.map((key) => (
                    <option key={key.id} value={key.pub_key}>
                      {key.label} ({key.key_type})
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  placeholder="Enter buyer public key"
                  {...register('buyer_pub_key', {
                    required: 'Buyer public key is required',
                    pattern: {
                      value: /^[0-9a-fA-F]{64,66}$/,
                      message: 'Please enter a valid public key (hex format)',
                    },
                  })}
                />
              )}
              <FormErrorMessage>{errors.buyer_pub_key?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.seller_pub_key} isRequired>
              <FormLabel>Seller Public Key</FormLabel>
              <Input
                placeholder="Enter seller public key"
                {...register('seller_pub_key', {
                  required: 'Seller public key is required',
                  pattern: {
                    value: /^[0-9a-fA-F]{64,66}$/,
                    message: 'Please enter a valid public key (hex format)',
                  },
                })}
              />
              <FormErrorMessage>{errors.seller_pub_key?.message}</FormErrorMessage>
            </FormControl>
          </Stack>
        </Box>

        <Box bg="blue.50" p={4} borderRadius="md">
          <Text fontWeight="bold">Contract Summary:</Text>
          <Text>{getContractDescription()}</Text>
        </Box>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Creating Contract"
        >
          Create Contract
        </Button>
      </VStack>
    </Box>
  );
};

export default CreateContractForm;

