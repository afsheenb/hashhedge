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

