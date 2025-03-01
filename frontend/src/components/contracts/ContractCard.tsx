// src/components/contracts/ContractCard.tsx
import React from 'react';
import {
  Box,
  Badge,
  Text,
  Button,
  HStack,
  VStack,
  Flex,
  Divider,
  Tooltip,
  IconButton,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { InfoIcon, SettingsIcon, CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Contract, ContractStatus, ContractType } from '../../types';
import { useAppDispatch } from '../../hooks/redux-hooks';
import { cancelContract } from '../../store/contract-slice';

interface ContractCardProps {
  contract: Contract;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract }) => {
  const { colorMode } = useColorMode();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case 'CREATED':
        return 'yellow';
      case 'ACTIVE':
        return 'green';
      case 'SETTLED':
        return 'blue';
      case 'EXPIRED':
        return 'orange';
      case 'CANCELLED':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getTypeColor = (type: ContractType) => {
    return type === 'CALL' ? 'teal' : 'purple';
  };

  const handleViewDetails = () => {
    navigate(`/contracts/${contract.id}`);
  };

  const handleCancelContract = async () => {
    try {
      await dispatch(cancelContract(contract.id)).unwrap();
      toast({
        title: 'Contract cancelled',
        description: 'The contract has been cancelled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string || 'Failed to cancel contract',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatSats = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(2)} BTC`;
    } else {
      return `${sats.toLocaleString()} sats`;
    }
  };

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      p={4}
      transition="transform 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
    >
      <Flex justifyContent="space-between" alignItems="flex-start" mb={2}>
        <HStack>
          <Badge colorScheme={getTypeColor(contract.contract_type)} fontSize="sm">
            {contract.contract_type}
          </Badge>
          <Badge colorScheme={getStatusColor(contract.status)} fontSize="sm">
            {contract.status}
          </Badge>
        </HStack>
        <Tooltip label="View contract details">
          <IconButton
            aria-label="View contract details"
            icon={<InfoIcon />}
            size="sm"
            variant="ghost"
            onClick={handleViewDetails}
          />
        </Tooltip>
      </Flex>

      <VStack align="stretch" spacing={2} mb={3}>
        <Flex justifyContent="space-between">
          <Text fontWeight="medium" color="gray.500" fontSize="sm">
            Strike Hash Rate:
          </Text>
          <Text fontWeight="bold">{contract.strike_hash_rate.toFixed(2)} EH/s</Text>
        </Flex>
        <Flex justifyContent="space-between">
          <Text fontWeight="medium" color="gray.500" fontSize="sm">
            Contract Size:
          </Text>
          <Text fontWeight="bold">{formatSats(contract.contract_size)}</Text>
        </Flex>
        <Flex justifyContent="space-between">
          <Text fontWeight="medium" color="gray.500" fontSize="sm">
            Premium:
          </Text>
          <Text fontWeight="bold">{formatSats(contract.premium)}</Text>
        </Flex>
      </VStack>

      <Divider my={3} />

      <VStack align="stretch" spacing={2} mb={4}>
        <HStack color="gray.500" fontSize="xs">
          <CalendarIcon />
          <Text>
            Start Block: {contract.start_block_height}
          </Text>
        </HStack>
        <HStack color="gray.500" fontSize="xs">
          <CalendarIcon />
          <Text>
            End Block: {contract.end_block_height}
          </Text>
        </HStack>
        <HStack color="gray.500" fontSize="xs">
          <TimeIcon />
          <Text>
            Target: {format(new Date(contract.target_timestamp), 'PPP p')}
          </Text>
        </HStack>
      </VStack>

      <HStack spacing={2} mt={2}>
        <Button 
          size="sm" 
          width="full" 
          onClick={handleViewDetails}
          colorScheme="blue"
          variant="outline"
        >
          Details
        </Button>
        {contract.status === 'CREATED' && (
          <Button
            size="sm"
            width="full"
            onClick={handleCancelContract}
            colorScheme="red"
            variant="outline"
          >
            Cancel
          </Button>
        )}
      </HStack>
    </Box>
  );
};

export default ContractCard;
