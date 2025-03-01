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

