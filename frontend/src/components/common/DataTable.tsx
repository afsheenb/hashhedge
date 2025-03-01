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

