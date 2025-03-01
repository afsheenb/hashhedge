
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  useToast,
} from '@chakra-ui/react';
import { orderService } from '../../api';
import { useAppSelector } from '../../hooks/redux-hooks';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';
import PlaceOrderForm from './PlaceOrderForm';

interface PlaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced?: () => void;
}

const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({ 
  isOpen, 
  onClose,
  onOrderPlaced,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToast();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const { isConnected, balance } = useAppSelector(state => state.arkWallet);
  
  const handleSubmitOrder = async (formData: PlaceOrderFormType) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to place orders',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Add user ID to form data
      const orderData = {
        ...formData,
        user_id: user?.id || '',
      };
      
      const response = await orderService.placeOrder(orderData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to place order');
      }
      
      toast({
        title: 'Order placed',
        description: 'Your order has been successfully placed',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
      
      if (onOrderPlaced) {
        onOrderPlaced();
      }
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
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Place New Order</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <PlaceOrderForm 
            onSubmit={handleSubmitOrder} 
            isProcessing={isSubmitting}
            isWalletConnected={isConnected}
            availableBalance={balance?.confirmed || 0}
          />
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

