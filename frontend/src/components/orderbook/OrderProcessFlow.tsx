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
import {
  Order,
  OrderSide,
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

// Error handling utility function to standardize error messages
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
};

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
  
  const { orderBook, userOrders, loading: ordersLoading } = useAppSelector((state) => state.orders);
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
    let isMounted = true;
    const fetchInitialData = async () => {
      setIsProcessing(true);
      setStepProgress(20);
      
      try {
        // First make sure we have a valid strike hash rate
        let effectiveStrikeHashRate = currentStrikeHashRate;
        
        if (!effectiveStrikeHashRate) {
          try {
            const hashRateResult = await dispatch(fetchCurrentHashRate()).unwrap();
            
            // Only update if component is still mounted
            if (isMounted && hashRateResult) {
              setCurrentStrikeHashRate(hashRateResult);
              effectiveStrikeHashRate = hashRateResult;
            }
          } catch (error) {
            console.error("Failed to fetch hash rate:", error);
            // Default to a reasonable value if we couldn't get the current rate
            effectiveStrikeHashRate = 350; // Default value
            if (isMounted) {
              setCurrentStrikeHashRate(effectiveStrikeHashRate);
            }
          }
        }
        
        if (!isMounted) return;
        setStepProgress(40);
        
        // Fetch hash rate summary for reference
        await dispatch(fetchHashRateSummary()).unwrap();
        
        if (!isMounted) return;
        setStepProgress(60);
        
        // Use the effective strike hash rate we've determined
        if (effectiveStrikeHashRate) {
          await dispatch(getOrderBook({
            contractType: contractType.toLowerCase(),
            strikeHashRate: effectiveStrikeHashRate,
          })).unwrap();
        }
        
        if (!isMounted) return;
        setStepProgress(80);
        
        // Fetch user orders if authenticated
        if (user) {
          await dispatch(getUserOrders({ userId: user.id })).unwrap();
        }
        
        // Fetch recent trades
        await dispatch(getRecentTrades()).unwrap();
        
        if (!isMounted) return;
        setStepProgress(100);
      } catch (err) {
        if (isMounted) {
          setError(`Failed to load initial data: ${getErrorMessage(err)}`);
          openErrorModal();
        }
      } finally {
        if (isMounted) {
          setIsProcessing(false);
          setStepProgress(0);
        }
      }
    };
    
    fetchInitialData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [dispatch, contractType, user, openErrorModal]);
  
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
        description: getErrorMessage(err),
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
  
  // Handle placing an order
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

      // Refresh data after order placement
      await refreshDataAfterOrderPlacement(formData, user.id);

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
      const errorMessage = getErrorMessage(err);
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

  // Handle refreshing data after order placement
  const refreshDataAfterOrderPlacement = async (formData: PlaceOrderFormType, userId: string) => {
    try {
      await Promise.all([
        dispatch(getOrderBook({
          contractType: formData.contract_type.toLowerCase(),
          strikeHashRate: formData.strike_hash_rate,
        })),
        dispatch(getUserOrders({ userId })),
        dispatch(fetchWalletBalance())
      ]);
    } catch (error) {
      // Log but don't throw - this is non-critical
      console.error('Error refreshing data after order placement:', error);
      toast({
        title: 'Warning',
        description: 'Order placed successfully, but failed to refresh data',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
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
        await Promise.all([
          dispatch(getUserOrders({ userId: user.id })),
          dispatch(getOrderBook({
            contractType: contractType.toLowerCase(),
            strikeHashRate: currentStrikeHashRate || 0,
          }))
        ]);
      }
      
      // Clear submitted order if it was cancelled
      if (submittedOrder && submittedOrder.id === orderId) {
        setSubmittedOrder(null);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: getErrorMessage(err),
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
                onClick={() => handlePlaceOrder({
                  side: selectedOrderSide,
                  contract_type: contractType,
                  strike_hash_rate: currentStrikeHashRate || 0,
                  price: selectedOrder?.price || 0,
                  quantity: selectedOrder?.remaining_quantity || 1,
                  start_block_height: 0, // These would be populated from form data
                  end_block_height: 0,   // These would be populated from form data
                })}
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
