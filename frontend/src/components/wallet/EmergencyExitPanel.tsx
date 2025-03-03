// src/components/wallet/EmergencyExitPanel.tsx
import React, { useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Flex,
  HStack,
  Icon,
  Progress,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorMode,
  Divider,
  Code,
} from '@chakra-ui/react';
import {
  WarningIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LockIcon,
  UnlockIcon,
  InfoIcon,
  CheckCircleIcon,
} from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  executeEmergencyExit,
  downloadExitTransactions,
  broadcastEmergencyTransaction,
} from '../../features/wallet/arkWalletSlice';

const EmergencyExitPanel: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const toast = useToast();
  
  const [isExiting, setIsExiting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFeeRate, setSelectedFeeRate] = useState(5);
  const [exitAddress, setExitAddress] = useState('');
  const [selectedExitTx, setSelectedExitTx] = useState<string | null>(null);
  
  const { 
    isConnected, 
    addresses, 
    exitInfo, 
    exitTransactions 
  } = useAppSelector((state) => state.arkWallet);
  
  const {
    isOpen: isExitModalOpen,
    onOpen: openExitModal,
    onClose: closeExitModal
  } = useDisclosure();
  
  const {
    isOpen: isExitTxModalOpen,
    onOpen: openExitTxModal,
    onClose: closeExitTxModal
  } = useDisclosure();
  
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
  
  // Handle emergency exit
  const handleEmergencyExit = async () => {
    setIsExiting(true);
    
    try {
      const txid = await dispatch(executeEmergencyExit({
        address: exitAddress || addresses?.onchain || '',
        feeRate: selectedFeeRate,
      })).unwrap();
      
      toast({
        title: 'Emergency exit initiated',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      closeExitModal();
    } catch (err) {
      toast({
        title: 'Emergency exit failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExiting(false);
    }
  };
  
  // Handle downloading exit transactions
  const handleDownloadExitTx = async () => {
    setIsDownloading(true);
    
    try {
      await dispatch(downloadExitTransactions()).unwrap();
      
      toast({
        title: 'Exit transactions downloaded',
        description: 'Save these files in a secure location for emergency use',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle broadcasting specific exit transaction
  const handleBroadcastExitTx = async () => {
    if (!selectedExitTx) return;
    
    setIsExiting(true);
    
    try {
      const txid = await dispatch(broadcastEmergencyTransaction(selectedExitTx)).unwrap();
      
      toast({
        title: 'Exit transaction broadcast',
        description: `Transaction ID: ${txid}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      closeExitTxModal();
    } catch (err) {
      toast({
        title: 'Broadcast failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExiting(false);
    }
  };
  
  // Open transaction-specific modal
  const openSpecificExitTxModal = (txId: string) => {
    setSelectedExitTx(txId);
    openExitTxModal();
  };
  
  if (!isConnected) {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>Connect your wallet to access emergency exit features.</AlertDescription>
          </Box>
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={0} borderWidth="1px" borderRadius="lg">
      <Box p={5} borderBottomWidth="1px">
        <Heading size="md" mb={3}>Emergency Exit Options</Heading>
        <Text>
          HashHedge guarantees you can always withdraw your funds, even if our services are
          unavailable. These emergency exit features ensure you always maintain control.
        </Text>
      </Box>
      
      {/* Current Exit Status */}
      <Box p={5} borderBottomWidth="1px" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
        <Heading size="sm" mb={3}>Exit Protection Status</Heading>
        <HStack mb={3}>
          <Badge 
            colorScheme={isTimelockExpired ? "green" : exitInfo?.hasPreSignedExit ? "yellow" : "red"}
            fontSize="md"
            px={2}
            py={1}
          >
            {isTimelockExpired 
              ? "Fully Unlocked" 
              : exitInfo?.hasPreSignedExit 
                ? "Protected" 
                : "Limited"}
          </Badge>
          <Text>
            {isTimelockExpired 
              ? "You have full control over your funds" 
              : exitInfo?.hasPreSignedExit 
                ? "Pre-signed emergency exit available" 
                : "Limited exit options available"}
          </Text>
        </HStack>
        
        <VStack align="stretch" spacing={4}>
          {/* Pre-signed Exit Transaction Status */}
          <HStack>
            <Icon 
              as={exitInfo?.hasPreSignedExit ? CheckCircleIcon : WarningIcon} 
              color={exitInfo?.hasPreSignedExit ? "green.500" : "red.500"} 
              boxSize={5}
            />
            <Box>
              <Text fontWeight="medium">Pre-signed Exit Transaction</Text>
              <Text fontSize="sm" color={exitInfo?.hasPreSignedExit ? "green.500" : "red.500"}>
                {exitInfo?.hasPreSignedExit 
                  ? "Available - Can be used anytime" 
                  : "Not available - Contact support"}
              </Text>
            </Box>
          </HStack>
          
          {/* Timelock Status */}
          <Box>
            <HStack mb={1}>
              <Icon 
                as={isTimelockExpired ? UnlockIcon : LockIcon} 
                color={isTimelockExpired ? "green.500" : "yellow.500"} 
                boxSize={5}
              />
              <Box>
                <Text fontWeight="medium">Timelock Path</Text>
                <Text fontSize="sm" color={isTimelockExpired ? "green.500" : "yellow.500"}>
                  {isTimelockExpired 
                    ? "Unlocked - Can be used anytime" 
                    : `Locked until ${formatDate(exitInfo?.timelockExpiry)}`}
                </Text>
              </Box>
            </HStack>
            <Progress 
              value={calculateTimelockPercentage()} 
              size="sm" 
              colorScheme={isTimelockExpired ? "green" : "yellow"} 
              borderRadius="full"
              mt={2}
            />
            <Flex justify="space-between" mt={1}>
              <Text fontSize="xs" color="gray.500">Started: {formatDate(exitInfo?.timelockStart)}</Text>
              <Text fontSize="xs" color="gray.500">Unlocks: {formatDate(exitInfo?.timelockExpiry)}</Text>
            </Flex>
          </Box>
        </VStack>
      </Box>
      
      {/* Exit Options */}
      <Box p={5}>
        <Heading size="sm" mb={4}>Exit Actions</Heading>
        <VStack align="stretch" spacing={4}>
          {/* Option 1: Execute Emergency Exit */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Flex justify="space-between" align="flex-start" mb={2}>
              <Heading size="xs">1. Execute Emergency Exit</Heading>
              <Badge colorScheme={exitInfo?.hasPreSignedExit ? "green" : "red"}>
                {exitInfo?.hasPreSignedExit ? "Available" : "Unavailable"}
              </Badge>
            </Flex>
            <Text fontSize="sm" mb={3}>
              This option broadcasts a pre-signed transaction that withdraws all your funds
              to your on-chain Bitcoin address.
            </Text>
            <Button
              leftIcon={<WarningIcon />}
              colorScheme="orange"
              isDisabled={!exitInfo?.hasPreSignedExit}
              onClick={openExitModal}
              width="full"
            >
              Execute Emergency Exit
            </Button>
          </Box>
          
          {/* Option 2: Use Timelock Path */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Flex justify="space-between" align="flex-start" mb={2}>
              <Heading size="xs">2. Use Timelock Path</Heading>
              <Badge colorScheme={isTimelockExpired ? "green" : "red"}>
                {isTimelockExpired ? "Available" : "Locked"}
              </Badge>
            </Flex>
            <Text fontSize="sm" mb={3}>
              After the timelock expires, you can unilaterally withdraw your funds using just
              your key, even without HashHedge's cooperation.
            </Text>
            <Button
              leftIcon={<UnlockIcon />}
              colorScheme="green"
              isDisabled={!isTimelockExpired}
              onClick={openExitModal}
              width="full"
            >
              Use Timelock Exit
            </Button>
          </Box>
          
          {/* Option 3: Download Exit Transactions */}
          <Box p={4} borderWidth="1px" borderRadius="md">
            <Heading size="xs" mb={2}>3. Download Exit Transactions</Heading>
            <Text fontSize="sm" mb={3}>
              Download your pre-signed exit transactions that can be broadcast using any Bitcoin node
              or block explorer, even if this website is unavailable.
            </Text>
            <Button
              leftIcon={<DownloadIcon />}
              colorScheme="blue"
              onClick={handleDownloadExitTx}
              isLoading={isDownloading}
              loadingText="Downloading"
              isDisabled={!exitInfo?.hasPreSignedExit}
              width="full"
            >
              Download Exit Transactions
            </Button>
          </Box>
          
          {/* Option 4: Manage Exit Transactions */}
          {exitTransactions.length > 0 && (
            <Box p={4} borderWidth="1px" borderRadius="md">
              <Heading size="xs" mb={2}>4. Available Exit Transactions</Heading>
              <Text fontSize="sm" mb={3}>
                The following pre-signed exit transactions are available for broadcasting:
              </Text>
              <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto">
                {exitTransactions.map((tx) => (
                  <Box key={tx.id} p={2} borderWidth="1px" borderRadius="md">
                    <Flex justify="space-between" align="center">
                      <Code fontSize="xs">{tx.id.substring(0, 10)}...</Code>
                      <Button
                        size="xs"
                        colorScheme="orange"
                        onClick={() => openSpecificExitTxModal(tx.id)}
                      >
                        Broadcast
                      </Button>
                    </Flex>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      </Box>
      
      {/* Important Information */}
      <Box p={5} borderTopWidth="1px" bg={colorMode === "light" ? "gray.50" : "gray.700"}>
        <Alert status="warning">
          <AlertIcon />
          <Box>
            <AlertTitle>When to use emergency exits</AlertTitle>
            <AlertDescription fontSize="sm">
              These options should only be used in emergency situations when normal withdrawal methods aren't available.
              Broadcasting an emergency exit transaction will withdraw all your funds and terminate active contracts.
            </AlertDescription>
          </Box>
        </Alert>
      </Box>
      
      {/* Emergency Exit Modal */}
      <Modal isOpen={isExitModalOpen} onClose={closeExitModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Emergency Exit</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning">
                <AlertIcon />
                <Box>
                  <AlertTitle>Emergency Exit</AlertTitle>
                  <AlertDescription>
                    You are about to execute an emergency exit transaction. This will withdraw
                    all your available funds to your on-chain Bitcoin address.
                  </AlertDescription>
                </Box>
              </Alert>
              
              <FormControl>
                <FormLabel>Withdrawal Address</FormLabel>
                <Input
                  placeholder="Bitcoin address"
                  value={exitAddress}
                  onChange={(e) => setExitAddress(e.target.value)}
                />
                <FormHelperText>
                  {!exitAddress && addresses?.onchain && 
                    "Your on-chain address will be used if none is provided"}
                </FormHelperText>
              </FormControl>
              
              <FormControl>
                <FormLabel>Fee Rate (sat/vB)</FormLabel>
                <Slider
                  min={1}
                  max={25}
                  step={1}
                  value={selectedFeeRate}
                  onChange={(value) => setSelectedFeeRate(value)}
                  colorScheme="orange"
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
                <Flex justify="space-between">
                  <Text fontSize="xs">Economic ({selectedFeeRate < 5 ? "Selected" : ""})</Text>
                  <Text fontSize="xs">Standard ({selectedFeeRate >= 5 && selectedFeeRate < 15 ? "Selected" : ""})</Text>
                  <Text fontSize="xs">Priority ({selectedFeeRate >= 15 ? "Selected" : ""})</Text>
                </Flex>
                <FormHelperText>
                  Higher fees ensure faster confirmation during network congestion
                </FormHelperText>
              </FormControl>
              
              <Box p={3} borderWidth="1px" borderRadius="md" bg="orange.50">
                <Text fontWeight="bold" color="orange.800">Important Information</Text>
                <Text fontSize="sm">
                  This action will recover your funds using specialized Bitcoin transactions.
                  The funds will be sent to your specified Bitcoin address or your default on-chain address.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeExitModal}>
              Cancel
            </Button>
            <Button 
              colorScheme="orange" 
              onClick={handleEmergencyExit}
              isLoading={isExiting}
              loadingText="Processing"
            >
              Confirm Emergency Exit
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Exit Transaction Modal */}
      <Modal isOpen={isExitTxModalOpen} onClose={closeExitTxModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Broadcast Exit Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" variant="solid">
                <AlertIcon />
                <Box>
                  <AlertTitle>Emergency Exit</AlertTitle>
                  <AlertDescription>
                    You are about to broadcast a pre-signed exit transaction.
                    This will withdraw your funds to your on-chain address.
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Box p={3} borderWidth="1px" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Transaction Details</Text>
                <Text fontSize="sm" mb={1}>ID: {selectedExitTx}</Text>
                {exitTransactions.find(tx => tx.id === selectedExitTx) && (
                  <>
                    <Text fontSize="sm" mb={1}>
                      Amount: {exitTransactions.find(tx => tx.id === selectedExitTx)?.amount.toLocaleString()} sats
                    </Text>
                    <Text fontSize="sm" mb={1}>
                      Address: {exitTransactions.find(tx => tx.id === selectedExitTx)?.address}
                    </Text>
                    <Text fontSize="sm">
                      Created: {formatDate(exitTransactions.find(tx => tx.id === selectedExitTx)?.created)}
                    </Text>
                  </>
                )}
              </Box>
              
              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  This transaction was pre-signed during the onboarding process to guarantee
                  you can always recover your funds, even without HashHedge's cooperation.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeExitTxModal}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={handleBroadcastExitTx}
              isLoading={isExiting}
              loadingText="Broadcasting"
            >
              Confirm Broadcasting
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EmergencyExitPanel;
