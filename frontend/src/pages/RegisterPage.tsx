import React from 'react';
import {
  Box,
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
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
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
          <Box
            flex="1"
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            bg={colorMode === 'light' ? 'white' : 'gray.800'}
          >
            <Stack spacing={6} mb={8}>
              <Heading as="h1" size="xl" textAlign="center">
                Create Your Account
              </Heading>
              <Text color="gray.500" textAlign="center">
                Join HashHedge and access Bitcoin hash rate derivatives
              </Text>
            </Stack>

            <RegisterForm />

            <Text mt={8} textAlign="center">
              Already have an account?{' '}
              <Link as={RouterLink} to="/login" color="blue.500" fontWeight="medium">
                Log in
              </Link>
            </Text>
          </Box>

          <Box flex="1" display={{ base: 'none', md: 'block' }}>
            <Image
              alt="Register image"
              src="/register-illustration.svg"
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
                    Account Creation Illustration
                  </Text>
                </Box>
              }
            />
          </Box>
        </Flex>
      </Container>
    </MainLayout>
  );
};

export default RegisterPage;

