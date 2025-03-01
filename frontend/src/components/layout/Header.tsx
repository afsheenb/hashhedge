// src/components/layout/Header.tsx
import React from 'react';
import { Box, Flex, Button, Heading, HStack, useColorMode, IconButton, useDisclosure, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { logout } from '../../store/auth-slice';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box 
      as="header" 
      bg={colorMode === 'light' ? 'white' : 'gray.800'} 
      px={4} 
      py={2} 
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Flex alignItems="center">
          <Heading 
            as={RouterLink} 
            to="/" 
            size="md" 
            color={colorMode === 'light' ? 'blue.600' : 'blue.300'}
            mr={8}
          >
            HashHedge
          </Heading>

          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Button as={RouterLink} to="/dashboard" variant="ghost">
              Dashboard
            </Button>
            <Button as={RouterLink} to="/orderbook" variant="ghost">
              Order Book
            </Button>
            <Button as={RouterLink} to="/contracts" variant="ghost">
              Contracts
            </Button>
            <Button as={RouterLink} to="/hashrate" variant="ghost">
              Hash Rate
            </Button>
            <Button as={RouterLink} to="/wallet" variant="ghost">
              Wallet
            </Button>
          </HStack>
        </Flex>

        <HStack spacing={4}>
          <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="md"
          />

          {isAuthenticated ? (
            <Menu>
              <MenuButton as={Button} variant="ghost">
                {user?.username || 'My Account'}
              </MenuButton>
              <MenuList>
                <MenuItem as={RouterLink} to="/profile">Profile</MenuItem>
                <MenuItem as={RouterLink} to="/wallet">Wallet</MenuItem>
                <MenuItem as={RouterLink} to="/my-orders">My Orders</MenuItem>
                <MenuItem as={RouterLink} to="/my-contracts">My Contracts</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack>
              <Button as={RouterLink} to="/login" variant="ghost">
                Login
              </Button>
              <Button as={RouterLink} to="/register" colorScheme="blue">
                Register
              </Button>
            </HStack>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;

// src/components/layout/Footer.tsx
import React from 'react';
import { Box, Container, Flex, Link, Text, useColorMode } from '@chakra-ui/react';

const Footer: React.FC = () => {
  const { colorMode } = useColorMode();

  return (
    <Box 
      as="footer"
      bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}
      py={4}
      borderTop="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
      mt="auto"
    >
      <Container maxW="container.xl">
        <Flex
          direction={{ base: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'center', md: 'flex-start' }}
          textAlign={{ base: 'center', md: 'left' }}
        >
          <Text fontSize="sm" color="gray.500">
            &copy; {new Date().getFullYear()} HashHedge - Bitcoin Hash Rate Derivatives on Layer 2
          </Text>
          <Flex mt={{ base: 4, md: 0 }} gap={4}>
            <Link fontSize="sm" color="gray.500" href="#">Privacy Policy</Link>
            <Link fontSize="sm" color="gray.500" href="#">Terms of Service</Link>
            <Link fontSize="sm" color="gray.500" href="#">FAQ</Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};

export default Footer;

// src/components/layout/MainLayout.tsx
import React from 'react';
import { Box, Container, Flex, useColorMode } from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { colorMode } = useColorMode();

  return (
    <Flex 
      direction="column" 
      minHeight="100vh"
      bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}
    >
      <Header />
      <Box as="main" flex="1" py={6}>
        <Container maxW="container.xl">
          {children}
        </Container>
      </Box>
      <Footer />
    </Flex>
  );
};

export default MainLayout;

// src/components/common/PageHeader.tsx
import React from 'react';
import { Box, Heading, Text, Flex, Button } from '@chakra-ui/react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <Box mb={6}>
      <Flex justifyContent="space-between" alignItems="center" mb={2}>
        <Heading as="h1" size="xl">{title}</Heading>
        {action && (
          <Button colorScheme="blue" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </Flex>
      {description && <Text color="gray.500">{description}</Text>}
    </Box>
  );
};

export default PageHeader;

// src/components/common/LoadingSpinner.tsx
import React from 'react';
import { Flex, Spinner, Text } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <Flex direction="column" alignItems="center" justifyContent="center" height="200px">
      <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" mb={4} />
      <Text color="gray.500">{message}</Text>
    </Flex>
  );
};

export default LoadingSpinner;

// src/components/common/ErrorDisplay.tsx
import React from 'react';
import { Alert, AlertIcon, AlertTitle, AlertDescription, Box, Button } from '@chakra-ui/react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  return (
    <Alert
      status="error"
      variant="subtle"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      height="200px"
      borderRadius="md"
    >
      <AlertIcon boxSize="40px" mr={0} />
      <AlertTitle mt={4} mb={1} fontSize="lg">
        Error
      </AlertTitle>
      <AlertDescription maxWidth="sm">
        {message}
      </AlertDescription>
      {onRetry && (
        <Box mt={4}>
          <Button colorScheme="red" onClick={onRetry}>
            Try Again
          </Button>
        </Box>
      )}
    </Alert>
  );
};

export default ErrorDisplay;

// src/components/common/EmptyState.tsx
import React from 'react';
import { Box, Heading, Text, Button, Center, Icon } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <Center 
      py={10} 
      px={6} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderStyle="dashed"
      height="300px"
    >
      <Box textAlign="center">
        <Icon as={InfoIcon} boxSize="50px" color="blue.500" mb={4} />
        <Heading as="h2" size="lg" mb={2}>
          {title}
        </Heading>
        <Text color="gray.500" mb={6}>
          {description}
        </Text>
        {actionText && onAction && (
          <Button
            colorScheme="blue"
            onClick={onAction}
          >
            {actionText}
          </Button>
        )}
      </Box>
    </Center>
  );
};

export default EmptyState;

// src/components/common/Card.tsx
import React from 'react';
import { Box, Heading, useColorMode } from '@chakra-ui/react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  height?: string;
  maxHeight?: string;
}

const Card: React.FC<CardProps> = ({ title, children, height, maxHeight }) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      borderRadius="lg"
      overflow="hidden"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      boxShadow="sm"
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
      height={height}
      maxHeight={maxHeight}
    >
      {title && (
        <Box
          px={6}
          py={4}
          borderBottomWidth="1px"
          borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
        >
          <Heading size="md">{title}</Heading>
        </Box>
      )}
      <Box p={6}>{children}</Box>
    </Box>
  );
};

export default Card;

// src/components/common/DataTable.tsx
import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useColorMode,
  Text,
  Box,
  Flex,
} from '@chakra-ui/react';

export interface Column<T> {
  Header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  Cell?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  maxHeight?: string;
}

function DataTable<T>({ columns, data, emptyMessage = 'No data available', maxHeight }: DataTableProps<T>) {
  const { colorMode } = useColorMode();

  return (
    <TableContainer maxHeight={maxHeight} overflowY={maxHeight ? 'auto' : undefined}>
      <Table variant="simple" size="sm">
        <Thead
          position="sticky"
          top={0}
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          zIndex={1}
        >
          <Tr>
            {columns.map((column, index) => (
              <Th key={index} width={column.width}>
                {column.Header}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.length === 0 ? (
            <Tr>
              <Td colSpan={columns.length}>
                <Flex justify="center" py={4}>
                  <Text color="gray.500">{emptyMessage}</Text>
                </Flex>
              </Td>
            </Tr>
          ) : (
            data.map((row, rowIndex) => (
              <Tr 
                key={rowIndex}
                _hover={{ bg: colorMode === 'light' ? 'gray.50' : 'gray.700' }}
              >
                {columns.map((column, colIndex) => {
                  const cellValue = typeof column.accessor === 'function'
                    ? column.accessor(row)
                    : row[column.accessor as keyof T];
                  
                  return (
                    <Td key={colIndex}>
                      {column.Cell ? column.Cell(cellValue, row) : cellValue as React.ReactNode}
                    </Td>
                  );
                })}
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

export default DataTable;
import React from 'react';
import { Box, Flex, Button, Heading, HStack, useColorMode, IconButton, useDisclosure, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { logout } from '../../store/auth-slice';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box 
      as="header" 
      bg={colorMode === 'light' ? 'white' : 'gray.800'} 
      px={4} 
      py={2} 
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Flex alignItems="center">
          <Heading 
            as={RouterLink} 
            to="/" 
            size="md" 
            color={colorMode === 'light' ? 'blue.600' : 'blue.300'}
            mr={8}
          >
            HashHedge
          </Heading>

          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Button as={RouterLink} to="/dashboard" variant="ghost">
              Dashboard
            </Button>
            <Button as={RouterLink} to="/orderbook" variant="ghost">
              Order Book
            </Button>
            <Button as={RouterLink} to="/contracts" variant="ghost">
              Contracts
            </Button>
            <Button as={RouterLink} to="/hashrate" variant="ghost">
              Hash Rate
            </Button>
          </HStack>
        </Flex>

        <HStack spacing={4}>
          <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="md"
          />

          {isAuthenticated ? (
            <Menu>
              <MenuButton as={Button} variant="ghost">
                {user?.username || 'My Account'}
              </MenuButton>
              <MenuList>
                <MenuItem as={RouterLink} to="/profile">Profile</MenuItem>
                <MenuItem as={RouterLink} to="/wallet">Wallet</MenuItem>
                <MenuItem as={RouterLink} to="/my-orders">My Orders</MenuItem>
                <MenuItem as={RouterLink} to="/my-contracts">My Contracts</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack>
              <Button as={RouterLink} to="/login" variant="ghost">
                Login
              </Button>
              <Button as={RouterLink} to="/register" colorScheme="blue">
                Register
              </Button>
            </HStack>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;

import React from 'react';
import { Box, Flex, Button, Heading, HStack, useColorMode, IconButton, useDisclosure, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { logout } from '../../store/auth-slice';

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box 
      as="header" 
      bg={colorMode === 'light' ? 'white' : 'gray.800'} 
      px={4} 
      py={2} 
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Flex alignItems="center">
          <Heading 
            as={RouterLink} 
            to="/" 
            size="md" 
            color={colorMode === 'light' ? 'blue.600' : 'blue.300'}
            mr={8}
          >
            HashHedge
          </Heading>

          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Button as={RouterLink} to="/dashboard" variant="ghost">
              Dashboard
            </Button>
            <Button as={RouterLink} to="/orderbook" variant="ghost">
              Order Book
            </Button>
            <Button as={RouterLink} to="/contracts" variant="ghost">
              Contracts
            </Button>
            <Button as={RouterLink} to="/hashrate" variant="ghost">
              Hash Rate
            </Button>
          </HStack>
        </Flex>

        <HStack spacing={4}>
          <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
            size="md"
          />

          {isAuthenticated ? (
            <Menu>
              <MenuButton as={Button} variant="ghost">
                {user?.username || 'My Account'}
              </MenuButton>
              <MenuList>
                <MenuItem as={RouterLink} to="/profile">Profile</MenuItem>
                <MenuItem as={RouterLink} to="/wallet">Wallet</MenuItem>
                <MenuItem as={RouterLink} to="/my-orders">My Orders</MenuItem>
                <MenuItem as={RouterLink} to="/my-contracts">My Contracts</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <HStack>
              <Button as={RouterLink} to="/login" variant="ghost">
                Login
              </Button>
              <Button as={RouterLink} to="/register" colorScheme="blue">
                Register
              </Button>
            </HStack>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;

