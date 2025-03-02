// src/components/orderbook/PlaceOrderModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { placeOrder } from '../../store/order-slice';
import PlaceOrderForm from './PlaceOrderForm';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderType?: 'buy' | 'sell';
  defaultContractType?: string;
  defaultStrikeHashRate?: number;
  defaultPrice?: number;
  defaultQuantity?: number;
}

const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({
  isOpen,
  onClose,
  defaultOrderType,
  defaultContractType,
  defaultStrikeHashRate,
  defaultPrice,
  defaultQuantity,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const { isConnected, balance } = useAppSelector((state) => state.arkWallet);
  
  const handlePlaceOrder = async (formData: PlaceOrderFormType) => {
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to place orders',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Add user ID to form data
      const completeFormData: PlaceOrderFormType = {
        ...formData,
        user_id: user?.id || '',
      };
      
      const resultAction = await dispatch(placeOrder(completeFormData)).unwrap();
      
      toast({
        title: 'Order placed',
        description: `Your ${formData.side} order has been placed successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
      
      // Refresh order book
      // You can add any additional actions here after successful order placement
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Place Order</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <PlaceOrderForm 
            onSubmit={handlePlaceOrder} 
            isProcessing={isSubmitting}
            isWalletConnected={isConnected}
            availableBalance={balance?.available || 0}
            defaultOrderType={defaultOrderType}
            defaultContractType={defaultContractType}
            defaultStrikeHashRate={defaultStrikeHashRate}
            defaultPrice={defaultPrice}
            defaultQuantity={defaultQuantity}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PlaceOrderModal;
