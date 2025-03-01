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

