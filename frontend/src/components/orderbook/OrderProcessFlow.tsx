// src/components/orderbook/OrderProcessFlow.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  Divider,
  Progress,
  Badge,
  Collapse,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useToast,
  useColorMode,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
} from '@chakra-ui/react';
import { CheckIcon, WarningIcon } from '@chakra-ui/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import {
  getOrderBook,
  getUserOrders,
  placeOrder,
  cancelOrder,
  getRecentTrades,
} from '../../store/order-slice';
import { fetchWalletBalance } from '../../features/wallet/arkWalletSlice';
import {
  fetchCurrentHashRate,
  fetchHashRateSummary,
} from '../../store/hash-rate-slice';
import PlaceOrderForm from './PlaceOrderForm';
import OrderBookDisplay from './OrderBookDisplay';
import OrderTable from './OrderTable';
import {
  Order,
  OrderSide,
  OrderBook,
  Trade,
  PlaceOrderForm as PlaceOrderFormType,
} from '../../types';

// Define the steps for the order process flow
const steps = [
  { title: 'Review Market', description: 'Analyze order book' },
  { title: 'Place Order', description: 'Create buy or sell order' },
  { title: 'Confirm Order', description: 'Validate and submit' },
  { title: 'Monitor Order', description: 'Track order status' },
];

interface OrderProcessFlowProps {
  contractType?: 'call' | 'put';
  strikeHashRate?: number;
  initialOrderSide?: 'buy' | 'sell';
  onOrderComplete?: (order: Order) => void;
}

const OrderProcessFlow: React.FC<OrderProcessFlowProps> = ({
  contractType = 'call',
  strikeHashRate,
  initialOrderSide = 'buy',
  onOrderComplete,
}) => {
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });
  
  const [selectedOrderSide, setSelectedOrderSide] = useState<'buy' | 'sell'>(initialOrderSide);
  const [currentStrikeHashRate, setCurrentStrikeHashRate] = useState<number | undefined>(strikeHashRate);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepProgress, setStepProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { colorMode } = useColorMode();
  
  const { orderBook, userOrders, trades, loading: ordersLoading } = useAppSelector((state) => state.orders);
  const { currentHashRate, loading: hashRateLoading } = useAppSelector((state) => state.hashRate);
  const { isConnected, balance } = useAppSelector((state) => state.arkWallet);
  const { user } = useAppSelector((state) => state.auth);
  
  const { 
    isOpen: isErrorModalOpen, 
    onOpen: openErrorModal, 
    onClose: closeErrorModal 
  } = useDisclosure();
  
  // Initialize with data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsProcessing(true);
      setStepProgress(20);
      
      try {
        // Fetch current hash rate if strike hasn't been specified
        if (!currentStrikeHashRate) {
          await dispatch(fetchCurrentHashRate()).unwrap();
          setCurrentStrikeHashRate(currentHashRate);
        }
        
        setStepProgress(40);
        
        // Fetch hash rate summary for reference
        await dispatch(fetchHashRateSummary()).unwrap();
        
        setStepProgress(60);
        
        // Fetch current order book
        if (currentStrikeHashRate) {
          await dispatch(getOrderBook({
            contractType: contractType.toLowerCase(),
            strikeHashRate: currentStrikeHashRate,
          })).unwrap();
        }
        
        setStepProgress(80);
        
        // Fetch user orders if authenticated
        if (user) {
          await dispatch(getUserOrders({ userId: user.id })).unwrap();
        }
        
        // Fetch recent trades
        await dispatch(getRecentTrades()).unwrap();
        
        setStepProgress(100);
      } catch (err) {
        setError(`Failed to load initial data: ${err.message || err}`);
        openErrorModal();
      } finally {
        setIsProcessing(false);
        setStepProgress(0);
      }
    };
    
    fetchInitialData();
  }, [dispatch, contractType, currentStrikeHashRate, currentHashRate, user, openErrorModal]);
  
  // Handle order book refresh
  const handleRefreshOrderBook = async () => {
    if (!currentStrikeHashRate) return;
    
    setIsProcessing(true);
    
    try {
      await dispatch(getOrderBook({
        contractType: contractType.toLowerCase(),
        strikeHashRate: currentStrikeHashRate,
      })).unwrap();
      
      toast({
        title: 'Order book refreshed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Failed to refresh order book',
        description: err.message || 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle order selection from order book
  const handleOrderSelect = (order: Order, side: OrderSide) => {
    setSelectedOrder(order);
    setSelectedOrderSide(side === OrderSide.BUY ? 'buy' : 'sell');
    setActiveStep(1); // Move to place order step
  };
  
  
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

  // Additional validation for wallet balance
  if (formData.side === 'buy') {
    const totalCost = formData.price * formData.quantity;
    if (balance && totalCost > balance.available) {
      toast({
        title: 'Insufficient balance',
        description: `You need ${totalCost.toLocaleString()} sats, but only have ${balance.available.toLocaleString()} available`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
  }

  setIsProcessing(true);
  setStepProgress(20);
  setError(null);

  try {
    // Validate user ID is present
    if (!user?.id) {
      throw new Error('User ID is required for placing orders');
    }

    // Add user ID to form data
    const completeFormData = {
      ...formData,
      user_id: user.id,
    };

    setStepProgress(50);

    // Submit the order
    const order = await dispatch(placeOrder(completeFormData)).unwrap();

    if (!order) {
      throw new Error('Failed to place order: No response received');
    }

    setSubmittedOrder(order);
    setStepProgress(80);

    // Refresh order book and user orders with better error handling
    try {
      await Promise.all([
        dispatch(getOrderBook({
          contractType: formData.contract_type.toLowerCase(),
          strikeHashRate: formData.strike_hash_rate,
        })),
        dispatch(getUserOrders({ userId: user.id })),
      ]);
    } catch (refreshError) {
      // Non-critical error - log but don't throw
      console.error('Failed to refresh data after order placement:', refreshError);
      toast({
        title: 'Warning',
        description: 'Order placed successfully, but failed to refresh data',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
    }

    // Refresh wallet balance
    try {
      await dispatch(fetchWalletBalance());
    } catch (walletError) {
      // Non-critical error - log but don't throw
      console.error('Failed to refresh wallet balance:', walletError);
    }

    setStepProgress(100);

    toast({
      title: 'Order placed successfully',
      description: `Your ${formData.side} order for ${formData.quantity} contracts has been placed`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });

    // Move to the next step
    setActiveStep(3); // Skip to monitor step
  } catch (err) {
    const errorMessage = err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown error occurred';

    setError(`Failed to place order: ${errorMessage}`);
    openErrorModal();

    toast({
      title: 'Order placement failed',
      description: errorMessage,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  } finally {
    setIsProcessing(false);
    setStepProgress(0);
  }
};
  // Handle order cancellation
  const handleCancelOrder = async (orderId: string) => {
    setIsProcessing(true);
    
    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      
      toast({
        title: 'Order cancelled',
        description: 'Your order has been cancelled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh user orders and order book
      if (user) {
        await dispatch(getUserOrders({ userId: user.id })).unwrap();
      }
      
      if (currentStrikeHashRate) {
        await dispatch(getOrderBook({
          contractType: contractType.toLowerCase(),
          strikeHashRate: currentStrikeHashRate,
        })).unwrap();
      }
      
      // Clear submitted order if it was cancelled
      if (submittedOrder && submittedOrder.id === orderId) {
        setSubmittedOrder(null);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel order',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Review Market
        return (
          <Box>
            <Heading size="md" mb={4}>Review Market</Heading>
            {orderBook && currentStrikeHashRate ? (
              <VStack spacing={5} align="stretch">
                <OrderBookDisplay
                  orderBook={orderBook}
                  contractType={contractType.toUpperCase() as 'CALL' | 'PUT'}
                  strikeHashRate={currentStrikeHashRate}
                  onOrderSelect={handleOrderSelect}
                  onRefresh={handleRefreshOrderBook}
                  currentHashRate={currentHashRate}
                />
                
                <Box p={4} borderWidth="1px" borderRadius="md" bg={colorMode === 'light' ? 'blue.50' : 'blue.900'}>
                  <Heading size="sm" mb={3}>Market Analysis</Heading>
                  <Text mb={2}>
                    Current network hash rate is {currentHashRate?.toFixed(2) || 'loading...'} EH/s.
                    This contract has a strike rate of {currentStrikeHashRate} EH/s.
                  </Text>
                  <Text>
                    {contractType.toUpperCase() === 'CALL'
                      ? `If the hash rate exceeds ${currentStrikeHashRate} EH/s before the target date, the buyer wins.`
                      : `If the hash rate stays below ${currentStrikeHashRate} EH/s until the target date, the buyer wins.`}
                  </Text>
                </Box>
                
                <Divider />
                
                <HStack spacing={4}>
                  <Button
                    colorScheme="green"
                    flex="1"
                    onClick={() => {
                      setSelectedOrderSide('buy');
                      setActiveStep(1);
                    }}
                  >
                    Place Buy Order
                  </Button>
                  
                  <Button
                    colorScheme="red"
                    flex="1"
                    onClick={() => {
                      setSelectedOrderSide('sell');
                      setActiveStep(1);
                    }}
                  >
                    Place Sell Order
                  </Button>
                </HStack>
              </VStack>
            ) : (
              <Alert status="info">
                <AlertIcon />
                <AlertDescription>
                  {hashRateLoading || ordersLoading
                    ? 'Loading market data...'
                    : 'Market data not available. Please specify a contract type and strike hash rate.'}
                </AlertDescription>
              </Alert>
            )}
          </Box>
        );
      
      case 1: // Place Order
        return (
          <Box>
            <Heading size="md" mb={4}>
              Place {selectedOrderSide === 'buy' ? 'Buy' : 'Sell'} Order
            </Heading>
            
            {!isConnected ? (
              <Alert status="warning" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>Wallet not connected</AlertTitle>
                  <AlertDescription>
                    Please connect your wallet to place orders.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              selectedOrder ? (
                <Alert status="info" mb={4}>
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Responding to existing order</AlertTitle>
                    <AlertDescription>
                      You are placing an order to match with an existing {selectedOrder.side.toLowerCase()} order
                      at {selectedOrder.price.toLocaleString()} sats.
                    </AlertDescription>
                  </Box>
                </Alert>
              ) : null
            )}
            
            <PlaceOrderForm
              onSubmit={handlePlaceOrder}
              isProcessing={isProcessing}
              isWalletConnected={isConnected}
              availableBalance={balance?.available || 0}
              defaultOrderType={selectedOrderSide}
              defaultContractType={contractType}
              defaultStrikeHashRate={currentStrikeHashRate}
              defaultPrice={selectedOrder?.price}
              defaultQuantity={selectedOrder?.remaining_quantity}
            />
            
            <HStack mt={4} justify="space-between">
              <Button variant="outline" onClick={() => setActiveStep(0)}>
                Back to Market
              </Button>
              
              <Button
                colorScheme="blue"
                onClick={() => setActiveStep(2)}
              >
                Preview Order
              </Button>
            </HStack>
          </Box>
        );
      
      case 2: // Confirm Order
        return (
          <Box>
            <Heading size="md" mb={4}>Confirm Order</Heading>
            
            <Alert status="info" mb={4}>
              <AlertIcon />
              <Box>
                <AlertTitle>Order Confirmation</AlertTitle>
                <AlertDescription>
                  Please review your order details before submitting.
                </AlertDescription>
              </Box>
            </Alert>
            
            {/* Order preview would be shown here */}
            <Box p={4} borderWidth="1px" borderRadius="md">
              <Text fontWeight="bold" mb={3}>Order Details</Text>
              <VStack align="stretch" spacing={2}>
                <HStack justify="space-between">
                  <Text>Type:</Text>
                  <Badge colorScheme={selectedOrderSide === 'buy' ? 'green' : 'red'}>
                    {selectedOrderSide.toUpperCase()}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>Contract:</Text>
                  <Badge colorScheme={contractType === 'call' ? 'teal' : 'purple'}>
                    {contractType.toUpperCase()}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text>Strike Hash Rate:</Text>
                  <Text>{currentStrikeHashRate} EH/s</Text>
                </HStack>
                
                {/* Additional order details would be shown here */}
              </VStack>
            </Box>
            
            <HStack mt={4} justify="space-between">
              <Button variant="outline" onClick={() => setActiveStep(1)}>
                Back to Order Form
              </Button>
              
              <Button
                colorScheme="green"
                onClick={handlePlaceOrder}
                isLoading={isProcessing}
                loadingText="Submitting"
              >
                Submit Order
              </Button>
            </HStack>
          </Box>
        );
      
      case 3: // Monitor Order
        return (
          <Box>
            <Heading size="md" mb={4}>Monitor Order</Heading>
            
            {submittedOrder ? (
              <VStack spacing={4} align="stretch">
                <Alert
                  status={
                    submittedOrder.status === 'FILLED' 
                      ? 'success' 
                      : submittedOrder.status === 'OPEN' || submittedOrder.status === 'PARTIAL' 
                        ? 'info' 
                        : 'warning'
                  }
                >
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Order Status: {submittedOrder.status}</AlertTitle>
                    <AlertDescription>
                      {submittedOrder.status === 'FILLED'
                        ? 'Your order has been completely filled!'
                        : submittedOrder.status === 'OPEN'
                          ? 'Your order is open and waiting to be matched.'
                          : submittedOrder.status === 'PARTIAL'
                            ? 'Your order has been partially filled and is still active.'
                            : 'Your order is no longer active.'}
                    </AlertDescription>
                  </Box>
                </Alert>
                
                <Box p={4} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="bold" mb={3}>Order Summary</Text>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text>Order ID:</Text>
                      <Text fontFamily="mono" fontSize="sm">{submittedOrder.id}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Side:</Text>
                      <Badge colorScheme={submittedOrder.side === 'BUY' ? 'green' : 'red'}>
                        {submittedOrder.side}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Contract Type:</Text>
                      <Badge colorScheme={submittedOrder.contract_type === 'CALL' ? 'teal' : 'purple'}>
                        {submittedOrder.contract_type}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Price:</Text>
                      <Text>{submittedOrder.price.toLocaleString()} sats</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Original Quantity:</Text>
                      <Text>{submittedOrder.quantity}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Remaining Quantity:</Text>
                      <Text>{submittedOrder.remaining_quantity}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Status:</Text>
                      <Badge 
                        colorScheme={
                          submittedOrder.status === 'OPEN' 
                            ? 'blue' 
                            : submittedOrder.status === 'PARTIAL' 
                              ? 'orange' 
                              : submittedOrder.status === 'FILLED' 
                                ? 'green' 
                                : 'gray'
                        }
                      >
                        {submittedOrder.status}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>
                
                <HStack spacing={4}>
                  {(submittedOrder.status === 'OPEN' || submittedOrder.status === 'PARTIAL') && (
                    <Button
                      colorScheme="red"
                      flex="1"
                      onClick={() => handleCancelOrder(submittedOrder.id)}
                      isLoading={isProcessing}
                      loadingText="Cancelling"
                    >
                      Cancel Order
                    </Button>
                  )}
                  
                  <Button
                    colorScheme="blue"
                    flex="1"
                    onClick={handleRefreshOrderBook}
                    isLoading={isProcessing}
                    loadingText="Refreshing"
                  >
                    Refresh Market
                  </Button>
                </HStack>
                
                {onOrderComplete && (
                  <Button
                    colorScheme="green"
                    onClick={() => onOrderComplete(submittedOrder)}
                  >
                    Done
                  </Button>
                )}
              </VStack>
            ) : (
              <Alert status="warning">
                <AlertIcon />
                <AlertDescription>
                  No active order to monitor. Please place an order first.
                </AlertDescription>
              </Alert>
            )}
          </Box>
        );
      
      default:
        return (
          <Alert status="error">
            <AlertIcon />
            Invalid step
          </Alert>
        );
    }
  };
  
  return (
    <Box>
      <Stepper index={activeStep} mb={8} size="sm">
        {steps.map((step, index) => (
          <Step key={index}>
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>
            
            <Box flexShrink="0">
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </Box>
            
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      {isProcessing && stepProgress > 0 && (
        <Box mb={4}>
          <Progress 
            value={stepProgress} 
            size="sm" 
            colorScheme="blue" 
            borderRadius="md"
            isAnimated
          />
        </Box>
      )}
      
      {renderStepContent()}
      
      {/* Error Modal */}
      <Modal isOpen={isErrorModalOpen} onClose={closeErrorModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Error</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="error" variant="left-accent">
              <AlertIcon as={WarningIcon} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={closeErrorModal}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default OrderProcessFlow;
