// src/components/layout/Footer.tsx
import React from 'react';
import { Box, Container, Flex, Link, Text, useColorMode, HStack, Divider } from '@chakra-ui/react';

const Footer: React.FC = () => {
  const { colorMode } = useColorMode();
  const year = new Date().getFullYear();

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
          <Box mb={{ base: 4, md: 0 }}>
            <Text fontSize="sm" color="gray.500">
              &copy; {year} HashHedge. All rights reserved.
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Bitcoin hashrate derivatives trading platform
            </Text>
          </Box>
          
          <HStack spacing={4} display={{ base: 'none', md: 'flex' }}>
            <Link href="#" fontSize="sm" color="gray.500">
              Terms of Service
            </Link>
            <Link href="#" fontSize="sm" color="gray.500">
              Privacy Policy
            </Link>
            <Link href="#" fontSize="sm" color="gray.500">
              Documentation
            </Link>
            <Link href="#" fontSize="sm" color="gray.500">
              FAQ
            </Link>
          </HStack>
          
          <Box display={{ base: 'flex', md: 'none' }} mt={2}>
            <HStack spacing={4}>
              <Link href="#" fontSize="sm" color="gray.500">
                Terms
              </Link>
              <Link href="#" fontSize="sm" color="gray.500">
                Privacy
              </Link>
              <Link href="#" fontSize="sm" color="gray.500">
                Docs
              </Link>
              <Link href="#" fontSize="sm" color="gray.500">
                FAQ
              </Link>
            </HStack>
          </Box>
        </Flex>
        
        <Divider my={4} borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'} />
        
        <Text fontSize="xs" color="gray.500" textAlign="center">
          HashHedge is a Bitcoin hashrate derivatives platform built on the Ark layer 2 protocol.
          This platform is for demonstration purposes only and not intended for production use.
        </Text>
      </Container>
    </Box>
  );
};

export default Footer;
