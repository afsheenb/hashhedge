// src/components/contract/ContractTimelocks.tsx
import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Button,
  Flex,
  Tooltip,
  IconButton,
  Heading,
  Divider,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useToast,
} from '@chakra-ui/react';
import {
  InfoIcon,
  TimeIcon,
  WarningIcon,
  UnlockIcon,
  LockIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
} from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { exitContract } from '../../features/contracts/contractsSlice';

interface ContractTimelocksProps {
  contractId: string;
}

const ContractTimelocks: React.FC<ContractTimelocksProps> = ({ contractId }) => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isExiting, setIsExiting] = React.useState(false);
  
  const { contracts } = useAppSelector((state) => state.contracts);
  const contract = contracts.find(c => c.id === contractId);
  
  if (!contract) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>Contract not found</Text>
      </Alert>
    );
  }
  
  // Format date utility
  const formatDate = (timestamp: number | string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Calculate if timelock is expired
  const isTimelockExpired = contract.expiryTime 
    ? new Date(contract.expiryTime) <= new Date() 
    : false;
  
  // Calculate emergency exit percentage
  const calculateExitPercentage = () => {
    if (!contract.expiryTime) return 0;
    
    const now = new Date().getTime();
    const start = contract.startTime ? new Date(contract.startTime).getTime() : now;
    const end = new Date(contract.expiryTime).getTime();
    
    // If already expired
    if (now >= end) return 100;
    
    // Calculate percentage
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.floor((elapsed / total) * 100), 100);
  };
  
  // Check if contract can be exited
  const canExit = isTimelockExpired || contract.canForceSettle;
  
  // Handle contract exit
  const handleExitContract = async () => {
    setIsExiting(true);
    
    try {
      await dispatch(exitContract(contractId)).unwrap();
      
      toast({
        title: 'Contract exit initiated',
        description: 'Your funds will be withdrawn to your on-chain address',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
    } catch (err) {
      toast({
        title: 'Exit failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExiting(false);
    }
  };
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <Heading size="sm" mb={3}>Contract Exit Status</Heading>
      
      <HStack mb={3}>
        <Badge 
          colorScheme={isTimelockExpired ? "green" : contract.canForceSettle ? "yellow" : "red"}
          px={2}
          py={1}
        >
          {isTimelockExpired 
            ? "Timelock Expired" 
            : contract.canForceSettle 
              ? "Force Settle Available" 
              : "Locked"}
        </Badge>
        <Text fontSize="sm">
          {isTimelockExpired 
            ? "You can exit this contract unilaterally" 
            : contract.canForceSettle 
              ? "You can force settlement via pre-signed transaction" 
              : "Normal cooperative settlement only"}
        </Text>
      </HStack>
      
      <VStack align="stretch" spacing={4}>
        {/* Settlement Status */}
        <Box>
          <HStack mb={1}>
            <Text fontWeight="semibold" fontSize="sm">Settlement Status:</Text>
            <Badge colorScheme={contract.status === 'active' ? 'yellow' : 'green'}>
              {contract.status === 'active' ? 'Pending' : 'Settled'}
            </Badge>
          </HStack>
          
          <Text fontSize="sm">
            Contract expires: {formatDate(contract.targetTime)}
          </Text>
          
          {contract.status === 'active' && (
            <Progress 
              value={(new Date().getTime() - new Date(contract.startTime).getTime()) / 
                     (new Date(contract.targetTime).getTime() - new Date(contract.startTime).getTime()) * 100} 
              size="xs" 
              colorScheme="blue" 
              mt={2}
            />
          )}
        </Box>
        
        <Divider />
        
        {/* Timelock Status */}
        <Box>
          <HStack mb={1}>
            <Icon as={isTimelockExpired ? UnlockIcon : LockIcon} color={isTimelockExpired ? "green.500" : "orange.500"} />
            <Text fontWeight="semibold" fontSize="sm">Emergency Exit Timelock:</Text>
            <Tooltip label="After this timelock expires, you can withdraw funds unilaterally">
              <InfoIcon boxSize={3} color="gray.500" />
            </Tooltip>
          </HStack>
        ZZ<Text fontSize="sm">
            Timelock expires: {formatDate(contract.expiryTime)}
          </Text>
          
          <Progress 
            value={calculateExitPercentage()} 
            size="xs" 
            colorScheme={isTimelockExpired ? "green" : "orange"} 
            borderRadius="full"
            mt={2}
          />
          
          <HStack mt={1} justify="space-between">
            <Text fontSize="xs" color="gray.500">Started: {formatDate(contract.startTime)}</Text>
            <Text fontSize="xs" color="gray.500">Unlocks: {formatDate(contract.expiryTime)}</Text>
          </HStack>
        </Box>
        
        {/* Force Settlement Status */}
        <Box>
          <HStack mb={1}>
            <Icon 
              as={contract.canForceSettle ? CheckCircleIcon : WarningIcon} 
              color={contract.canForceSettle ? "green.500" : "red.500"} 
            />
            <Text fontWeight="semibold" fontSize="sm">Force Settlement:</Text>
            <Tooltip label="A pre-signed transaction that can be broadcast to settle the contract">
              <InfoIcon boxSize={3} color="gray.500" />
            </Tooltip>
          </HStack>
          
          <Text fontSize="sm">
            {contract.canForceSettle 
              ? "Pre-signed settlement transaction available" 
              : "No pre-signed settlement transaction"}
          </Text>
        </Box>
        
        {/* Exit Button */}
        <Button
          colorScheme={isTimelockExpired ? "green" : "orange"}
          leftIcon={isTimelockExpired ? <UnlockIcon /> : <WarningIcon />}
          isDisabled={!canExit}
          onClick={onOpen}
          mt={2}
        >
          {isTimelockExpired 
            ? "Exit via Timelock" 
            : contract.canForceSettle 
              ? "Force Settlement" 
              : "Exit Unavailable"}
        </Button>
        
        {!canExit && (
          <Alert status="info" size="sm">
            <AlertIcon />
            <Text fontSize="sm">
              This contract can only be settled cooperatively until the timelock expires on {formatDate(contract.expiryTime)}.
            </Text>
          </Alert>
        )}
      </VStack>
      
      {/* Exit Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isTimelockExpired 
              ? "Exit Contract via Timelock" 
              : "Force Contract Settlement"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <AlertTitle>Emergency Contract Exit</AlertTitle>
                  <AlertDescription>
                    {isTimelockExpired 
                      ? "You are about to exit this contract using the timelock path. This allows unilateral withdrawal."
                      : "You are about to force settlement of this contract using a pre-signed transaction."}
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Box p={3} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Contract Details</Text>
                <Text fontSize="sm" mb={1}>ID: {contract.id}</Text>
                <Text fontSize="sm" mb={1}>Type: {contract.contractType}</Text>
                <Text fontSize="sm" mb={1}>Size: {contract.contractSize.toLocaleString()} sats</Text>
                <Text fontSize="sm" mb={1}>Status: {contract.status}</Text>
                <Text fontSize="sm">Started: {formatDate(contract.startTime)}</Text>
              </Box>
              
              <Alert status="info" size="sm">
                <AlertIcon />
                <Box>
                  <AlertTitle>What will happen</AlertTitle>
                  <Text fontSize="sm">
                    {isTimelockExpired 
                      ? "This will broadcast a transaction using the timelock path, withdrawing your funds."
                      : "This will broadcast a pre-signed settlement transaction, terminating the contract."}
                  </Text>
                  <Text fontSize="sm" mt={1}>
                    Funds will be sent to your on-chain Bitcoin address.
                  </Text>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme={isTimelockExpired ? "green" : "orange"}
              onClick={handleExitContract}
              isLoading={isExiting}
              loadingText="Processing"
            >
              Confirm Exit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContractTimelocks;
