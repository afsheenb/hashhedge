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

