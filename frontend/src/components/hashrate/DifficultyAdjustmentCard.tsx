import React from 'react';
import {
  Box,
  Heading,
  Text,
  Progress,
  Flex,
  Badge,
  useColorMode,
} from '@chakra-ui/react';
import { format, addHours } from 'date-fns';

const DifficultyAdjustmentCard: React.FC = () => {
  const { colorMode } = useColorMode();

  // Placeholder data for demonstration
  const currentBlock = 800500;
  const nextAdjustmentBlock = 802368; // Approximately
  const blocksRemaining = nextAdjustmentBlock - currentBlock;
  const percentComplete = ((2016 - blocksRemaining) / 2016) * 100;
  
  // Estimate adjustment date (assuming 10 min per block)
  const minutesRemaining = blocksRemaining * 10;
  const estimatedDate = addHours(new Date(), minutesRemaining / 60);
  
  // Estimated adjustment percentage (placeholder)
  const estimatedAdjustment = 3.2;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      p={4}
    >
      <Heading size="md" mb={4}>Next Difficulty Adjustment</Heading>
      
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="medium">Progress:</Text>
        <Text>{Math.round(percentComplete)}% complete</Text>
      </Flex>
      
      <Progress 
        value={percentComplete} 
        colorScheme="blue" 
        size="md" 
        mb={4} 
        borderRadius="md"
      />
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Current Block:</Text>
        <Text fontWeight="medium">{currentBlock.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Adjustment Block:</Text>
        <Text fontWeight="medium">{nextAdjustmentBlock.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Blocks Remaining:</Text>
        <Text fontWeight="medium">{blocksRemaining.toLocaleString()}</Text>
      </Flex>
      
      <Flex justify="space-between" mb={2}>
        <Text color="gray.500">Estimated Date:</Text>
        <Text fontWeight="medium">{format(estimatedDate, 'PPP p')}</Text>
      </Flex>
      
      <Flex justify="space-between" align="center" mt={4}>
        <Text color="gray.500">Estimated Adjustment:</Text>
        <Badge 
          colorScheme={estimatedAdjustment >= 0 ? "green" : "red"} 
          fontSize="md"
          px={2}
          py={1}
        >
          {estimatedAdjustment >= 0 ? '+' : ''}{estimatedAdjustment.toFixed(2)}%
        </Badge>
      </Flex>
    </Box>
  );
};

export default DifficultyAdjustmentCard;
