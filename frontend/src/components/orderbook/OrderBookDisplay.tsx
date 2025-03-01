import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Divider,
  HStack,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useColorMode,
  Stack,
} from '@chakra-ui/react';
import { OrderBook, OrderSide, ContractType } from '../../types';
import OrderTable from './OrderTable';
import PlaceOrderForm from './PlaceOrderForm';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchOrderBook } from '../../store/order-slice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';

interface OrderBookDisplayProps {
  contractType?: ContractType;
  strikeHashRate?: number;
}

const OrderBookDisplay: React.FC<OrderBookDisplayProps> = ({
  contractType: initialContractType = ContractType.CALL,
  strikeHashRate: initialStrikeHashRate = 350,
}) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { orderBook, loading, error } = useAppSelector((state) => state.orders);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [contractType, setContractType] = useState<ContractType>(initialContractType);
  const [strikeHashRate, setStrikeHashRate] = useState<number>(initialStrikeHashRate);

  const {
    isOpen: isPlaceOrderModalOpen,
    onOpen: onOpenPlaceOrderModal,
    onClose: onClosePlaceOrderModal,
  } = useDisclosure();

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchOrderBook({
        contractType: contractType.toLowerCase(),
        strikeHashRate: strikeHashRate,
      }));
    };

    fetchData();

    // Set up polling for real-time updates
    const intervalId = setInterval(fetchData, 10000); // Fetch every 10 seconds

    return () => clearInterval(intervalId);
  }, [dispatch, contractType, strikeHashRate]);

  const handleContractTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContractType(e.target.value as ContractType);
  };

  const handleStrikeHashRateChange = (valueString: string) => {
    setStrikeHashRate(parseFloat(valueString));
  };

  const handleRefresh = () => {
    dispatch(fetchOrderBook({
      contractType: contractType.toLowerCase(),
      strikeHashRate: strikeHashRate,
    }));
  };

  if (loading && !orderBook) {
    return <LoadingSpinner message="Loading order book..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  return (
    <Box>
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        mb={6}
        flexDirection={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <Heading as="h2" size="xl">
          {contractType} Hash Rate Order Book
        </Heading>

        <HStack spacing={4}>
          <Select
            value={contractType}
            onChange={handleContractTypeChange}
            width="auto"
          >
            <option value={ContractType.CALL}>CALL</option>
            <option value={ContractType.PUT}>PUT</option>
          </Select>

          <Flex alignItems="center">
            <Text mr={2} whiteSpace="nowrap">Strike: </Text>
            <NumberInput
              value={strikeHashRate}
              onChange={handleStrikeHashRateChange}
              min={1}
              step={5}
              precision={2}
              width="120px"
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text ml={2}>EH/s</Text>
          </Flex>

          <Button onClick={handleRefresh} size="sm">
            Refresh
          </Button>
        </HStack>
      </Flex>

      <Flex
        justifyContent="center"
        alignItems="stretch"
        gap={8}
        flexDirection={{ base: 'column', lg: 'row' }}
      >
        <Box
          flex="1"
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="sm"
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
        >
          <Box bg="green.50" px={4} py={3}>
            <Heading size="md" color="green.700">
              Buy Orders (Bids)
            </Heading>
          </Box>
          <Box maxHeight="400px" overflowY="auto">
            <OrderTable
              orders={orderBook?.buys || []}
              side={OrderSide.BUY}
              emptyMessage="No buy orders"
              maxHeight="400px"
            />
          </Box>
        </Box>

        <Box
          flex="1"
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="sm"
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
        >
          <Box bg="red.50" px={4} py={3}>
            <Heading size="md" color="red.700">
              Sell Orders (Asks)
            </Heading>
          </Box>
          <Box maxHeight="400px" overflowY="auto">
            <OrderTable
              orders={orderBook?.sells || []}
              side={OrderSide.SELL}
              emptyMessage="No sell orders"
              maxHeight="400px"
            />
          </Box>
        </Box>
      </Flex>

      {isAuthenticated && (
        <Flex justifyContent="center" mt={8}>
          <Button
            colorScheme="blue"
            size="lg"
            onClick={onOpenPlaceOrderModal}
          >
            Place New Order
          </Button>
        </Flex>
      )}

      {/* Place Order Modal */}
      <Modal
        isOpen={isPlaceOrderModalOpen}
        onClose={onClosePlaceOrderModal}
        size="xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Place New Order</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <PlaceOrderForm
              initialContractType={contractType}
              initialStrikeHashRate={strikeHashRate}
              onSuccess={onClosePlaceOrderModal}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClosePlaceOrderModal}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default OrderBookDisplay;

