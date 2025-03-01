// src/components/orderbook/PlaceOrderWithWallet.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';
import PlaceOrderForm from './PlaceOrderForm';
import { orderService } from '../../api';

interface PlaceOrderWithWalletProps {
  onOrderPlaced?: () => void;
}

const PlaceOrderWithWallet: React.FC<PlaceOrderWithWalletProps> = ({ onOrderPlaced }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isConnected, balance, userKeys } = useAppSelector((state) => state.arkWallet);
  const toast = useToast();
  
  const handlePlaceOrder = async (orderData: PlaceOrderFormType) => {
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet before placing an order',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // In a real implementation, we would:
      // 1. Sign the order with the wallet
      // 2. Submit the signed order to the server
      const response = await orderService.placeOrder(orderData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to place order');
      }
      
      toast({
        title: 'Order placed',
        description: 'Your order has been placed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onOrderPlaced) {
        onOrderPlaced();
      }
    } catch (error) {
      toast({
        title: 'Order failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Box>
      {!isConnected ? (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>
              Connect your wallet to place orders using Ark protocol.
            </AlertDescription>
          </VStack>
        </Alert>
      ) : (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Wallet connected</AlertTitle>
            <AlertDescription>
              You have {balance?.total || 0} sats available to trade.
            </AlertDescription>
          </VStack>
        </Alert>
      )}
      
      <PlaceOrderForm 
        onSubmit={handlePlaceOrder} 
        isProcessing={isProcessing}
        isWalletConnected={isConnected}
        availableBalance={balance?.available || 0}
      />
    </Box>
  );
};

export default PlaceOrderWithWallet;

// Update the PlaceOrderModal to use PlaceOrderWithWallet
// src/components/orderbook/PlaceOrderModal.tsx
import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
} from '@chakra-ui/react';
import PlaceOrderWithWallet from './PlaceOrderWithWallet';

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({ isOpen, onClose }) => {
  const handleOrderPlaced = () => {
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Place New Order</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <PlaceOrderWithWallet onOrderPlaced={handleOrderPlaced} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PlaceOrderModal;
