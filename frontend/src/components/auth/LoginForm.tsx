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

