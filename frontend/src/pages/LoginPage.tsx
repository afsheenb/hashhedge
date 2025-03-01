import React from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  Link,
  Image,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <MainLayout>
      <Container maxW="container.xl" py={12}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="center"
          gap={12}
        >
          <Box flex="1" display={{ base: 'none', md: 'block' }}>
            <Image
              alt="Login image"
              src="/login-illustration.svg"
              fallback={
                <Box
                  height="400px"
                  width="full"
                  bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize="lg" fontWeight="medium" color="gray.500">
                    Secure Login Illustration
                  </Text>
                </Box>
              }
            />
          </Box>

          <Box
            flex="1"
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            bg={colorMode === 'light' ? 'white' : 'gray.800'}
          >
            <Stack spacing={6} mb={8}>
              <Heading as="h1" size="xl" textAlign="center">
                Welcome Back
              </Heading>
              <Text color="gray.500" textAlign="center">
                Sign in to access your Bitcoin hash rate derivatives
              </Text>
            </Stack>

            <LoginForm />

            <Text mt={8} textAlign="center">
              Don't have an account?{' '}
              <Link as={RouterLink} to="/register" color="blue.500" fontWeight="medium">
                Register now
              </Link>
            </Text>
          </Box>
        </Flex>
      </Container>
    </MainLayout>
  );
};

export default LoginPage;

