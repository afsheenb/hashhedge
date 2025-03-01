import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  GridItem,
  SimpleGrid,
  Heading,
  Text,
  Select,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import { getOrderBook, getRecentTrades } from '../store/order-slice';
import Layout from '../components/layout/Layout';
import OrderBookDisplay from '../components/orderbook/OrderBookDisplay';
import PlaceOrderForm from '../components/orderbook/PlaceOrderForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import PageHeader from '../components/common/PageHeader';
import { PlaceOrderForm as PlaceOrderFormType } from '../types';
import { orderService } from '../api';
import { fetchCurrentHashRate } from '../store/hash-rate-slice';

const OrderBookPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [contractType, setContractType] = useState<'CALL' | 'PUT'>('CALL');
  const [strikeHashRate, setStrikeHashRate] = useState<number>(350); // Default to 350 EH/s
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { orderBook, recentTrades, loading, error } = useAppSelector((state) => state.orders);
  const { currentHashRate } = useAppSelector((state) => state.hashRate);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  useEffect(() => {
    // Fetch current hash rate
    dispatch(fetchCurrentHashRate());
    
    // Setup polling for order book data
    const fetchData = () => {
      dispatch(getOrderBook({
        contractType: contractType.toLowerCase(),
        strikeHashRate,
      }));
      dispatch(getRecentTrades());
    };
    
    fetchData();
    
    // Poll every 10 seconds
    const intervalId = setInterval(fetchData, 10000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [dispatch, contractType, strikeHashRate]);
  
  // If current hash rate loads and no strike hash rate is set, use the current hash rate
  useEffect(() => {
    if (currentHashRate && strikeHashRate === 0) {
      setStrikeHashRate(currentHashRate);
    }
  }, [currentHashRate, strikeHashRate]);
  
  const handleContractTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContractType(e.target.value as 'CALL' | 'PUT');
  };
  
  const handleStrikeHashRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStrikeHashRate(Number(e.target.value));
  };
  
  const handlePlaceOrder = async (formData: PlaceOrderFormType) => {
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
      const response = await orderService.placeOrder(formData);
      
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
      
      // Refresh order book data
      dispatch(getOrderBook({
        contractType: contractType.toLowerCase(),
        strikeHashRate,
      }));
      
      onClose();
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
  
  // Generate strike hash rate options
  const strikeHashRateOptions = () => {
    const options = [];
    
    if (currentHashRate) {
      // Add options around the current hash rate
      const baseRate = Math.round(currentHashRate / 5) * 5; // Round to nearest 5
      
      for (let i = -20; i <= 20; i += 5) {
        const rate = baseRate + i;
        if (rate > 0) {
          options.push(
            <option key={rate} value={rate}>
              {rate} EH/s {i === 0 ? '(Current)' : i < 0 ? '(Lower)' : '(Higher)'}
            </option>
          );
        }
      }
    } else {
      // Default options if current hash rate is not available
      for (let rate = 200; rate <= 500; rate += 50) {
        options.push(
          <option key={rate} value={rate}>
            {rate} EH/s
          </option>
        );
      }
    }
    
    return options;
  };
  
  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Order Book"
          description="View and place hash rate derivative orders"
          action={
            isAuthenticated
              ? {
                  label: 'Place Order',
                  onClick: onOpen,
                }
              : undefined
          }
        />
        
        <Box mb={6}>
          <HStack spacing={4}>
            <Select
              value={contractType}
              onChange={handleContractTypeChange}
              w="200px"
            >
              <option value="CALL">CALL Options</option>
              <option value="PUT">PUT Options</option>
            </Select>
            <Select
              value={strikeHashRate}
              onChange={handleStrikeHashRateChange}
              w="250px"
            >
              {strikeHashRateOptions()}
            </Select>
          </HStack>
        </Box>
        
        {loading && !orderBook ? (
          <LoadingSpinner message="Loading order book data..." />
        ) : error ? (
          <ErrorDisplay 
            message={error}
            onRetry={() => dispatch(getOrderBook({
              contractType: contractType.toLowerCase(),
              strikeHashRate,
            }))}
          />
        ) : (
          <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={6}>
            <GridItem>
              <Box 
                p={5} 
                borderWidth="1px" 
                borderRadius="lg" 
                boxShadow="sm"
              >
                <OrderBookDisplay
                  orderBook={orderBook!}
                  contractType={contractType}
                  strikeHashRate={strikeHashRate}
                />
              </Box>
            </GridItem>
            
            <GridItem>
              <VStack spacing={6} align="stretch">
                <Box p={5} borderWidth="1px" borderRadius="lg" boxShadow="sm">
                  <Heading size="md" mb={4}>Recent Trades</Heading>
                  {recentTrades && recentTrades.length > 0 ? (
                    <VStack spacing={3} align="stretch">
                      {recentTrades.map(trade => (
                        <Box
                          key={trade.id}
                          p={3}
                          borderWidth="1px"
                          borderRadius="md"
                          borderLeftWidth="4px"
                          borderLeftColor={trade.price >= 0 ? "green.400" : "red.400"}
                        >
                          <Flex justify="space-between">
                            <Text fontWeight="bold">
                              {trade.price.toLocaleString()} sats
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              {new Date(trade.executed_at).toLocaleTimeString()}
                            </Text>
                          </Flex>
                          <Text fontSize="sm">
                            Quantity: {trade.quantity}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">No recent trades</Text>
                  )}
                </Box>
                
                <Box p={5} borderWidth="1px" borderRadius="lg" boxShadow="sm">
                  <Heading size="md" mb={4}>Market Information</Heading>
                  
                  <VStack spacing={3} align="stretch">
                    <Flex justify="space-between">
                      <Text>Current Hash Rate:</Text>
                      <Text fontWeight="bold">
                        {currentHashRate 
                          ? `${currentHashRate.toFixed(2)} EH/s` 
                          : 'Loading...'}
                      </Text>
                    </Flex>
                    
                    <Flex justify="space-between">
                      <Text>Contract Type:</Text>
                      <Text fontWeight="bold">
                        {contractType === 'CALL' 
                          ? 'CALL (Bet hash rate increases)' 
                          : 'PUT (Bet hash rate decreases)'}
                      </Text>
                    </Flex>
                    
                    <Flex justify="space-between">
                      <Text>Settlement:</Text>
                      <Text fontWeight="bold">Block Height vs. Timestamp</Text>
                    </Flex>
                    
                    <Text fontSize="sm" mt={2}>
                      HashHedge contracts settle based on whether a target block height
                      is reached before a target timestamp. For CALL options, the buyer
                      wins if the block height is reached first (indicating high hash rate).
                      For PUT options, the buyer wins if the timestamp is reached first
                      (indicating low hash rate).
                    </Text>
                  </VStack>
                </Box>
              </VStack>
            </GridItem>
          </Grid>
        )}
        
        {/* Place Order Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Place Order</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <PlaceOrderForm 
                onSubmit={handlePlaceOrder} 
                isProcessing={isSubmitting}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </Layout>
  );
};

export default OrderBookPage;
