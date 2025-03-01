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
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

const WalletStatus: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isConnected, addresses, balance, loading, error } = useAppSelector((state) => state.arkWallet);
  
  const { hasCopied: hasOnchainCopied, onCopy: onCopyOnchain } = useClipboard(addresses?.onchain || '');
  const { hasCopied: hasOffchainCopied, onCopy: onCopyOffchain } = useClipboard(addresses?.offchain || '');
  
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
      </VStack>
    </Box>
  );
};

// Helper function to format satoshis
const formatSats = (sats: number): string => {
  return sats.toLocaleString();
};

export default WalletStatus;

