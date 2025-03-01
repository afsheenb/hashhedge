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
            &copy
