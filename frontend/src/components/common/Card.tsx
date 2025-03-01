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

