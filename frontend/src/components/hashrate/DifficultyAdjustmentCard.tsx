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
import React from 'react';
import {
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  helpText?: string;
  change?: number;
  icon?: IconType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helpText,
  change,
  icon,
  color = 'blue',
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Flex alignItems="center" mb={2}>
        {icon && (
          <Icon
            as={icon}
            boxSize={8}
            color={`${color}.500`}
            mr={3}
            bg={`${color}.50`}
            p={1}
            borderRadius="md"
          />
        )}
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium">
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}
          </StatNumber>
          {(helpText || change !== undefined) && (
            <StatHelpText mb={0}>
              {change !== undefined && (
                <>
                  <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(change).toFixed(2)}%
                </>
              )}
              {helpText && (change !== undefined ? ` ${helpText}` : helpText)}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Box>
  );
};

export default StatCard;

import React from 'react';
import {
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorMode,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  helpText?: string;
  change?: number;
  icon?: IconType;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  helpText,
  change,
  icon,
  color = 'blue',
}) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      borderWidth="1px"
      borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
    >
      <Flex alignItems="center" mb={2}>
        {icon && (
          <Icon
            as={icon}
            boxSize={8}
            color={`${color}.500`}
            mr={3}
            bg={`${color}.50`}
            p={1}
            borderRadius="md"
          />
        )}
        <Stat>
          <StatLabel fontSize="md" fontWeight="medium">
            {title}
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold">
            {value}
          </StatNumber>
          {(helpText || change !== undefined) && (
            <StatHelpText mb={0}>
              {change !== undefined && (
                <>
                  <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
                  {Math.abs(change).toFixed(2)}%
                </>
              )}
              {helpText && (change !== undefined ? ` ${helpText}` : helpText)}
            </StatHelpText>
          )}
        </Stat>
      </Flex>
    </Box>
  );
};

export default StatCard;

