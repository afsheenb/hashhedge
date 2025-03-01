// src/components/auth/LoginForm.tsx
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
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { loginUser } from '../../store/auth-slice';
import { AuthForm } from '../../types';

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthForm>();
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async (data: AuthForm) => {
    try {
      const resultAction = await dispatch(loginUser(data)).unwrap();
      toast({
        title: 'Login successful',
        description: `Welcome back, ${resultAction.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
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
        <FormControl isInvalid={!!errors.username} isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            type="text"
            placeholder="Enter your username"
            {...register('username', {
              required: 'Username is required',
              minLength: {
                value: 3,
                message: 'Username must be at least 3 characters',
              },
            })}
          />
          <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.password} isRequired>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Logging in"
        >
          Log In
        </Button>
      </Stack>
    </Box>
  );
};

export default LoginForm;

// src/components/auth/RegisterForm.tsx
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
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { registerUser } from '../../store/auth-slice';
import { RegisterForm as RegisterFormType } from '../../types';

const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<RegisterFormType>();
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormType) => {
    try {
      const resultAction = await dispatch(registerUser(data)).unwrap();
      toast({
        title: 'Registration successful',
        description: `Welcome, ${resultAction.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Registration failed',
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
        <FormControl isInvalid={!!errors.username} isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            type="text"
            placeholder="Choose a username"
            {...register('username', {
              required: 'Username is required',
              minLength: {
                value: 3,
                message: 'Username must be at least 3 characters',
              },
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: 'Username can only contain letters, numbers, underscores, and hyphens',
              },
            })}
          />
          <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.email} isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            placeholder="Enter your email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Please enter a valid email address',
              },
            })}
          />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.password} isRequired>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message:
                    'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
                },
              })}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.confirm_password} isRequired>
          <FormLabel>Confirm Password</FormLabel>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            {...register('confirm_password', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'The passwords do not match',
            })}
          />
          <FormErrorMessage>{errors.confirm_password?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Creating Account"
        >
          Create Account
        </Button>
      </Stack>
    </Box>
  );
};

export default RegisterForm;

// src/components/auth/UserKeyItem.tsx
import React from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  IconButton,
  useToast,
  Tooltip,
  useClipboard,
  useColorMode,
} from '@chakra-ui/react';
import { DeleteIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { UserKey } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { deleteUserKey } from '../../store/auth-slice';

interface UserKeyItemProps {
  userKey: UserKey;
}

const UserKeyItem: React.FC<UserKeyItemProps> = ({ userKey }) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { hasCopied, onCopy } = useClipboard(userKey.pub_key);

  const handleDelete = async () => {
    try {
      await dispatch(deleteUserKey(userKey.id)).unwrap();
      toast({
        title: 'Key deleted',
        description: `The key "${userKey.label}" has been removed`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
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
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      shadow="sm"
    >
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Box flex="1">
          <Flex alignItems="center" mb={2}>
            <Text fontWeight="bold" mr={2}>
              {userKey.label}
            </Text>
            <Badge colorScheme="blue">{userKey.key_type}</Badge>
          </Flex>
          <Flex alignItems="center">
            <Text
              fontSize="sm"
              color="gray.500"
              isTruncated
              maxWidth="300px"
              mr={2}
            >
              {userKey.pub_key}
            </Text>
            <Tooltip
              label={hasCopied ? 'Copied!' : 'Copy to clipboard'}
              placement="top"
              hasArrow
            >
              <IconButton
                aria-label="Copy public key"
                icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                size="xs"
                variant="ghost"
                onClick={onCopy}
              />
            </Tooltip>
          </Flex>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Added on {format(new Date(userKey.created_at), 'MMM d, yyyy')}
          </Text>
        </Box>
        <IconButton
          aria-label="Delete key"
          icon={<DeleteIcon />}
          colorScheme="red"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
        />
      </Flex>
    </Box>
  );
};

export default UserKeyItem;

// src/components/auth/AddKeyForm.tsx
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

// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux-hooks';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If still loading auth state, return null (or a loading spinner)
  if (loading) {
    return null;
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
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { loginUser } from '../../store/auth-slice';
import { AuthForm } from '../../types';

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthForm>();
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async (data: AuthForm) => {
    try {
      const resultAction = await dispatch(loginUser(data)).unwrap();
      toast({
        title: 'Login successful',
        description: `Welcome back, ${resultAction.user.username}!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
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
        <FormControl isInvalid={!!errors.username} isRequired>
          <FormLabel>Username</FormLabel>
          <Input
            type="text"
            placeholder="Enter your username"
            {...register('username', {
              required: 'Username is required',
              minLength: {
                value: 3,
                message: 'Username must be at least 3 characters',
              },
            })}
          />
          <FormErrorMessage>{errors.username?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.password} isRequired>
          <FormLabel>Password</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={isSubmitting}
          loadingText="Logging in"
        >
          Log In
        </Button>
      </Stack>
    </Box>
  );
};

export default LoginForm;

