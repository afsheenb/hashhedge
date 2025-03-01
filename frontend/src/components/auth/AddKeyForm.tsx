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
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { addUserKey } from '../../store/auth-slice';
import { AddKeyForm as AddKeyFormType } from '../../types';

interface AddKeyFormProps {
  onSuccess?: () => void;
}

const AddKeyForm: React.FC<AddKeyFormProps> = ({ onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<AddKeyFormType>();
  
  const dispatch = useAppDispatch();
  const toast = useToast();

  const onSubmit = async (data: AddKeyFormType) => {
    try {
      await dispatch(addUserKey(data)).unwrap();
      toast({
        title: 'Key added',
        description: 'Your public key has been added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      reset();
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

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4}>
        <FormControl isInvalid={!!errors.pub_key} isRequired>
          <FormLabel>Public Key</FormLabel>
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
          <FormErrorMessage>{errors.pub_key?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.key_type} isRequired>
          <FormLabel>Key Type</FormLabel>
          <Select
            placeholder="Select key type"
            {...register('key_type', {
              required: 'Key type is required',
            })}
          >
            <option value="taproot">Taproot</option>
            <option value="secp256k1">Secp256k1</option>
            <option value="schnorr">Schnorr</option>
          </Select>
          <FormErrorMessage>{errors.key_type?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.label} isRequired>
          <FormLabel>Label</FormLabel>
          <Input
            placeholder="Enter a label for this key"
            {...register('label', {
              required: 'Label is required',
              maxLength: {
                value: 64,
                message: 'Label must be less than 64 characters',
              },
            })}
          />
          <FormErrorMessage>{errors.label?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isSubmitting}
          loadingText="Adding"
        >
          Add Key
        </Button>
      </Stack>
    </Box>
  );
};

export default AddKeyForm;

