// src/components/wallet/WalletStatus.tsx
import React, { useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  useToast,
  Spinner,
  Flex,
  Tooltip,
  IconButton,
  useClipboard,
  Alert,
  AlertIcon,
  AlertTitle,
  Divider,
  Progress,
  Code,
} from '@chakra-ui/react';
import { 
  CopyIcon, 
  CheckIcon, 
  RepeatIcon, 
  UnlockIcon, 
  LockIcon, 
  InfoIcon,
  TimeIcon
} from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

const WalletStatus: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { 
    isConnected, 
    addresses, 
    balance, 
    loading, 
    error, 
    exitInfo 
  } = useAppSelector((state) => state.arkWallet);
  
  const { hasCopied: hasOnchainCopied, onCopy: onCopyOnchain } = useClipboard(addresses?.onchain || '');
  const { hasCopied: hasOffchainCopied, onCopy: onCopyOffchain } = useClipboard(addresses?.offchain || '');
  
  // Calculate if timelock is expired
  const isTimelockExpired = exitInfo?.timelockExpiry 
    ? new Date(exitInfo.timelockExpiry) <= new Date() 
    : false;
  
  // Format date utility
  const formatDate = (timestamp: number | string | undefined) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Calculate timelock percentage
  const calculateTimelockPercentage = () => {
    if (!exitInfo?.timelockExpiry) return 0;
    
    const now = new Date().getTime();
    const start = exitInfo.timelockStart ? new Date(exitInfo.timelockStart).getTime() : now;
    const end = new Date(exitInfo.timelockExpiry).getTime();
    
    // If already expired
    if (now >= end) return 100;
    
    // Calculate percentage
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.floor((elapsed / total) * 100), 100);
  };
  
  useEffect(() => {
    if (isConnected) {
      dispatch(fetchWalletBalance());
    }
  }, [dispatch, isConnected]);
  
  const handleRefreshBalance = () => {
    dispatch(fetchWalletBalance())
      .unwrap()
      .then(() => {
        toast({
          title: 'Balance refreshed',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      })
      .catch((err) => {
        toast({
          title: 'Failed to refresh balance',
          description: err,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });
  };
  
  if (!isConnected) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Text>Wallet not connected. Connect your wallet to view balance and addresses.</Text>
      </Box>
    );
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack align="stretch" spacing={4}>
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold" fontSize="lg">Wallet Status</Text>
          <HStack>
            <Badge colorScheme="green">Connected</Badge>
            <Tooltip label="Refresh balance">
              <IconButton
                aria-label="Refresh balance"
                icon={<RepeatIcon />}
                size="sm"
                onClick={handleRefreshBalance}
                isLoading={loading}
              />
            </Tooltip>
          </HStack>
        </Flex>
        
        <Box>
          <Text fontWeight="semibold" mb={2}>Bitcoin Addresses</Text>
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Text fontSize="sm" color="gray.500">On-chain:</Text>
              <Text fontSize="sm" fontFamily="mono" noOfLines={1} maxW="60%">
                {addresses?.onchain}
              </Text>
              <Tooltip label={hasOnchainCopied ? "Copied!" : "Copy address"}>
                <IconButton
                  aria-label="Copy on-chain address"
                  icon={hasOnchainCopied ? <CheckIcon /> : <CopyIcon />}
                  size="xs"
                  onClick={onCopyOnchain}
                />
              </Tooltip>
            </HStack>
            <HStack>
              <Text fontSize="sm" color="gray.500">Off-chain (Ark):</Text>
              <Text fontSize="sm" fontFamily="mono" noOfLines={1} maxW="60%">
                {addresses?.offchain}
              </Text>
              <Tooltip label={hasOffchainCopied ? "Copied!" : "Copy address"}>
                <IconButton
                  aria-label="Copy off-chain address"
                  icon={hasOffchainCopied ? <CheckIcon /> : <CopyIcon />}
                  size="xs"
                  onClick={onCopyOffchain}
                />
              </Tooltip>
            </HStack>
          </VStack>
        </Box>
        
        {/* Exit Status Section */}
        <Box>
          <Text fontWeight="semibold" mb={2}>Exit Guarantees</Text>
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Badge colorScheme={exitInfo?.hasPreSignedExit ? "green" : "red"}>
                {exitInfo?.hasPreSignedExit ? "Available" : "Not Available"}
              </Badge>
              <Text fontSize="sm">Pre-signed Exit Transaction</Text>
              <Tooltip label="A transaction you can broadcast anytime to withdraw your funds">
                <InfoIcon boxSize={3} color="gray.500" />
              </Tooltip>
            </HStack>
            
            <Box>
              <HStack mb={1}>
                <Badge colorScheme={isTimelockExpired ? "green" : "yellow"}>
                  {isTimelockExpired ? "Unlocked" : `${calculateTimelockPercentage()}%`}
                </Badge>
                <Text fontSize="sm">Timelock Path Status</Text>
                <Tooltip label="After this timelock expires, you can withdraw funds unilaterally">
                  <InfoIcon boxSize={3} color="gray.500" />
                </Tooltip>
              </HStack>
              <Progress 
                value={calculateTimelockPercentage()} 
                size="xs" 
                colorScheme={isTimelockExpired ? "green" : "yellow"} 
                borderRadius="full"
              />
              <Flex justify="space-between" mt={1}>
                <HStack>
                  <TimeIcon boxSize={3} color="gray.500" />
                  <Text fontSize="xs" color="gray.500">
                    {exitInfo?.timelockExpiry ? formatDate(exitInfo.timelockExpiry) : 'Unknown'}
                  </Text>
                </HStack>
                <HStack>
                  <Icon as={isTimelockExpired ? UnlockIcon : LockIcon} boxSize={3} color="gray.500" />
                  <Text fontSize="xs" color="gray.500">
                    {isTimelockExpired ? "Unlocked" : "Locked"}
                  </Text>
                </HStack>
              </Flex>
            </Box>
          </VStack>
        </Box>
        
        {loading ? (
          <Flex justify="center" py={4}>
            <Spinner />
          </Flex>
        ) : (
          <Box>
            <Text fontWeight="semibold" mb={2}>Balance</Text>
            <HStack justify="space-between">
              <Text color="gray.500">Total:</Text>
              <Text fontWeight="bold">{balance ? formatSats(balance.total) : '0'} sats</Text>
            </HStack>
            
            <Box mt={3}>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>On-chain</Text>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Confirmed:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.onchain.confirmed) : '0'} sats</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Unconfirmed:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.onchain.unconfirmed) : '0'} sats</Text>
              </HStack>
            </Box>
            
            <Box mt={3}>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>Off-chain (Ark)</Text>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Settled:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.offchain.settled) : '0'} sats</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Pending:</Text>
                <Text fontSize="sm">{balance ? formatSats(balance.offchain.pending) : '0'} sats</Text>
              </HStack>
            </Box>
          </Box>
        )}
        
        {/* Security Status Alert */}
        <Alert
          status={determineSecurityStatus()}
          variant="subtle"
          borderRadius="md"
          mt={2}
        >
          <AlertIcon />
          <Box>
            <AlertTitle>
              {isTimelockExpired 
                ? "Full Exit Control Available" 
                : exitInfo?.hasPreSignedExit 
                  ? "Exit Transaction Ready" 
                  : "Limited Exit Options"}
            </AlertTitle>
            <Text fontSize="sm">
              {isTimelockExpired 
                ? "You have full control to exit your funds via multiple paths" 
                : exitInfo?.hasPreSignedExit 
                  ? "You can broadcast your pre-signed exit transaction anytime" 
                  : "Your timelock has not expired. Limited exit options available."}
            </Text>
          </Box>
        </Alert>
      </VStack>
    </Box>
  );
};

// Helper function to format satoshis
const formatSats = (sats: number): string => {
  return sats.toLocaleString();
};

// Determine security status based on exit capabilities
const determineSecurityStatus = (): "success" | "warning" | "error" => {
  const { exitInfo } = useAppSelector((state) => state.arkWallet);
  
  // If timelock is expired, user has full control
  const isTimelockExpired = exitInfo?.timelockExpiry 
    ? new Date(exitInfo.timelockExpiry) <= new Date() 
    : false;
  
  if (isTimelockExpired) {
    return "success";
  }
  
  // If user has pre-signed exit transaction
  if (exitInfo?.hasPreSignedExit) {
    return "warning";
  }
  
  // No exit options
  return "error";
};

export default WalletStatus;
