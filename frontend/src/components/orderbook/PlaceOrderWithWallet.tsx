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
  Flex,
  Progress,
  Badge,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { PlaceOrderForm as PlaceOrderFormType } from '../../types';
import PlaceOrderForm from './PlaceOrderForm';
import { orderService } from '../../api';
import { getOrderBook, getUserOrders } from '../../store/order-slice';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';

interface PlaceOrderWithWalletProps {
  onOrderPlaced?: () => void;
  defaultOrderType?: 'buy' | 'sell';
  defaultContractType?: 'call' | 'put';
  defaultStrikeHashRate?: number;
}

const PlaceOrderWithWallet: React.FC<PlaceOrderWithWalletProps> = ({ 
  onOrderPlaced,
  defaultOrderType = 'buy',
  defaultContractType = 'call',
  defaultStrikeHashRate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderStep, setOrderStep] = useState(0);
  const [orderDetails, setOrderDetails] = useState<{
    id?: string;
    price?: number;
    quantity?: number;
    side?: string;
    contractType?: string;
  } | null>(null);
  
  const { isConnected, balance } = useAppSelector((state) => state.arkWallet);
  const { user } = useAppSelector((state) => state.auth);
  const { currentHashRate } = useAppSelector((state) => state.hashRate);
  const toast = useToast();
  const dispatch = useAppDispatch();
  
  // Refresh wallet balance when component mounts
  useEffect(() => {
    if (isConnected) {
      dispatch(fetchWalletBalance());
    }
  }, [dispatch, isConnected]);
  
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
    
    // Validate balance for buy orders
    if (orderData.side === 'buy') {
      const totalCost = orderData.price * orderData.quantity;
      if (balance && totalCost > balance.available) {
        toast({
          title: 'Insufficient balance',
          description: `You need ${totalCost.toLocaleString()} sats, but only have ${balance.available.toLocaleString()} sats available`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }
    
    setIsProcessing(true);
    setOrderStep(1);
    
    try {
      // Add user ID to the order data
      const completeOrderData = {
        ...orderData,
        user_id: user?.id || '',
      };
      
      // Step 1: Submit the order
      const response = await orderService.placeOrder(completeOrderData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to place order');
      }
      
      setOrderStep(2);
      setOrderDetails({
        id: response.data?.id,
        price: orderData.price,
        quantity: orderData.quantity,
        side: orderData.side,
        contractType: orderData.contract_type,
      });
      
      // Step 2: Refresh order book and user orders
      dispatch(getOrderBook({
        contractType: orderData.contract_type.toLowerCase(),
        strikeHashRate: orderData.strike_hash_rate,
      }));
      
      if (user) {
        dispatch(getUserOrders({ userId: user.id }));
      }
      
      // Step 3: Refresh wallet balance
      dispatch(fetchWalletBalance());
      setOrderStep(3);
      
      toast({
        title: 'Order placed',
        description: `Your ${orderData.side} order for ${orderData.quantity} ${orderData.contract_type.toUpperCase()} contracts has been successfully placed`,
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
      setOrderStep(0);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getOrderStepText = () => {
    switch (orderStep) {
      case 1:
        return "Submitting order...";
      case 2:
        return "Processing transaction...";
      case 3:
        return "Order completed!";
      default:
        return "";
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
              Connect your wallet to place orders using the Ark protocol.
            </AlertDescription>
          </VStack>
        </Alert>
      ) : balance && balance.available < 10000 ? (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Low balance</AlertTitle>
            <AlertDescription>
              Your available balance is {balance.available.toLocaleString()} sats, which may be insufficient for meaningful trading.
              Consider depositing more funds to your wallet.
            </AlertDescription>
          </VStack>
        </Alert>
      ) : (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <AlertTitle>Wallet connected</AlertTitle>
            <AlertDescription>
              You have {balance?.available.toLocaleString() || 0} sats available to trade.
            </AlertDescription>
          </VStack>
        </Alert>
      )}
      
      {orderDetails && orderStep === 3 ? (
        <Box mb={6}>
          <Alert status="success" variant="subtle">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>Order Successfully Placed!</AlertTitle>
              <AlertDescription>
                <Text>Your order has been submitted to the order book.</Text>
                <Divider my={2} />
                <Text><strong>Order Type:</strong> {orderDetails.side === 'buy' ? 'BUY' : 'SELL'}</Text>
                <Text><strong>Contract Type:</strong> {orderDetails.contractType?.toUpperCase()}</Text>
                <Text><strong>Price:</strong> {orderDetails.price?.toLocaleString()} sats</Text>
                <Text><strong>Quantity:</strong> {orderDetails.quantity}</Text>
                <Text><strong>Total:</strong> {((orderDetails.price || 0) * (orderDetails.quantity || 0)).toLocaleString()} sats</Text>
              </AlertDescription>
            </VStack>
          </Alert>
          <Flex justifyContent="flex-end" mt={4}>
            <Button 
              colorScheme="blue" 
              onClick={() => {
                setOrderDetails(null);
                setOrderStep(0);
              }}
            >
              Place Another Order
            </Button>
          </Flex>
        </Box>
      ) : (
        <>
          {isProcessing && (
            <Box mb={4}>
              <Text mb={2}>{getOrderStepText()}</Text>
              <Progress 
                value={(orderStep / 3) * 100} 
                size="sm" 
                colorScheme="blue" 
                borderRadius="md"
                isAnimated
              />
            </Box>
          )}
          
          <PlaceOrderForm 
            onSubmit={handlePlaceOrder} 
            isProcessing={isProcessing}
            isWalletConnected={isConnected}
            availableBalance={balance?.available || 0}
            defaultOrderType={defaultOrderType}
            defaultContractType={defaultContractType}
            defaultStrikeHashRate={defaultStrikeHashRate || currentHashRate || 350}
          />
        </>
      )}
    </Box>
  );
};

export default PlaceOrderWithWallet;
