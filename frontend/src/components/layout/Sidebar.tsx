import React from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Icon,
  Link,
  Divider,
  useColorMode,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiTrendingUp,
  FiDollarSign,
  FiFileText,
  FiUser,
  FiSettings,
  FiCpu,
  FiBook,
  FiExternalLink,
} from 'react-icons/fi';
import { useAppSelector } from '../../hooks/redux-hooks';

interface SidebarProps {
  [x: string]: any;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { colorMode } = useColorMode();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const navItems = [
    { name: 'Dashboard', icon: FiHome, path: '/dashboard' },
    { name: 'Order Book', icon: FiTrendingUp, path: '/orderbook' },
    { name: 'My Contracts', icon: FiFileText, path: '/contracts' },
    { name: 'Hash Rate', icon: FiCpu, path: '/hashrate' },
    { name: 'Wallet', icon: FiDollarSign, path: '/wallet' },
    { name: 'Profile', icon: FiUser, path: '/profile' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Box
      as="nav"
      pos="fixed"
      top="60px"
      left="0"
      h="calc(100vh - 60px)"
      pb="10"
      overflowY="auto"
      borderRightWidth="1px"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      {...props}
    >
      <Flex direction="column" h="full" p={4}>
        {/* User info */}
        {user && (
          <Box mb={6}>
            <Text fontWeight="bold">{user.username}</Text>
            <Text fontSize="sm" color="gray.500">{user.email}</Text>
          </Box>
        )}

        {/* Navigation Links */}
        <VStack spacing={1} align="stretch">
          {navItems.map((item) => (
            <Link
              key={item.name}
              as={RouterLink}
              to={item.path}
              p={2}
              borderRadius="md"
              bg={isActive(item.path) ? (colorMode === 'light' ? 'blue.50' : 'blue.900') : undefined}
              color={isActive(item.path) ? 'blue.500' : undefined}
              _hover={{
                bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
                textDecoration: 'none',
              }}
            >
              <HStack spacing={3}>
                <Icon as={item.icon} boxSize={5} />
                <Text>{item.name}</Text>
              </HStack>
            </Link>
          ))}
        </VStack>

        <Divider my={6} />

        {/* Resources Section */}
        <Box>
          <Text mb={2} fontWeight="bold" fontSize="sm" color="gray.500">
            Resources
          </Text>
          <VStack spacing={1} align="stretch">
            <Link
              p={2}
              borderRadius="md"
              _hover={{
                bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
                textDecoration: 'none',
              }}
              href="https://bitcoin.org/en/bitcoin-paper"
              isExternal
            >
              <HStack spacing={3}>
                <Icon as={FiBook} boxSize={5} />
                <Text>Bitcoin Whitepaper</Text>
                <Icon as={FiExternalLink} boxSize={3} ml="auto" />
              </HStack>
            </Link>
            <Link
              p={2}
              borderRadius="md"
              _hover={{
                bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
                textDecoration: 'none',
              }}
              href="https://bitcoinvisuals.com/hash-rate"
              isExternal
            >
              <HStack spacing={3}>
                <Icon as={FiTrendingUp} boxSize={5} />
                <Text>Bitcoin Hash Rate Data</Text>
                <Icon as={FiExternalLink} boxSize={3} ml="auto" />
              </HStack>
            </Link>
          </VStack>
        </Box>

        <Box mt="auto" pt={6}>
          <Link
            p={2}
            borderRadius="md"
            _hover={{
              bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
              textDecoration: 'none',
            }}
            as={RouterLink}
            to="/settings"
          >
            <HStack spacing={3}>
              <Icon as={FiSettings} boxSize={5} />
              <Text>Settings</Text>
            </HStack>
          </Link>
        </Box>
      </Flex>
    </Box>
  );
};

export default Sidebar;
