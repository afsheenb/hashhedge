import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  useToast,
} from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '../hooks/redux-hooks';
import {
  fetchCurrentHashRate,
  fetchHashRateSummary,
  fetchHistoricalHashRate,
  getHashRateAtHeight,
} from '../store/hash-rate-slice';
import Layout from '../components/layout/Layout';
import HashRateChart from '../components/hashrate/HashRateChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PageHeader from '../components/common/PageHeader';

const HashRatePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { currentHashRate, summary, historicalData, loading, error } = useAppSelector(
    (state) => state.hashRate
  );
  const [blockHeight, setBlockHeight] = useState<number>(0);
  const [blockHashRate, setBlockHashRate] = useState<number | null>(null);
  const [isQueryingBlock, setIsQueryingBlock] = useState<boolean>(false);

  useEffect(() => {
    // Fetch hash rate data when component mounts
    dispatch(fetchCurrentHashRate());
    dispatch(fetchHashRateSummary());
    dispatch(fetchHistoricalHashRate(30)); // Default to 30 days
  }, [dispatch]);

  const handleBlockQuery = async () => {
    if (blockHeight <= 0) {
      toast({
        title: 'Invalid block height',
        description: 'Please enter a valid block height',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsQueryingBlock(true);
    setBlockHashRate(null);

    try {
      const resultAction = await dispatch(getHashRateAtHeight(blockHeight)).unwrap();
      setBlockHashRate(resultAction);
      toast({
        title: 'Hash rate retrieved',
        description: `Block ${blockHeight} hash rate: ${resultAction.toFixed(2)} EH/s`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error as string,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsQueryingBlock(false);
    }
  };

  return (
    <Layout>
      <Container maxW="container.xl" py={6}>
        <PageHeader
          title="Bitcoin Network Hash Rate"
          description="Monitor and analyze Bitcoin network hash rate trends"
        />

        {loading && !currentHashRate ? (
          <LoadingSpinner message="Loading hash rate data..." />
        ) : error ? (
          <Text color="red.500">{error}</Text>
        ) : (
          <>
            {/* Summary Stats */}
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>Current Hash Rate</StatLabel>
                    <StatNumber>
                      {currentHashRate ? `${currentHashRate.toFixed(2)} EH/s` : 'N/A'}
                    </StatNumber>
                    {summary && (
                      <StatHelpText>
                        <StatArrow
                          type={summary.change_24h > 0 ? 'increase' : 'decrease'}
                        />
                        {summary.change_24h.toFixed(2)}% (24h)
                      </StatHelpText>
                    )}
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>7-Day Average</StatLabel>
                    <StatNumber>
                      {summary ? `${summary.average_7d.toFixed(2)} EH/s` : 'N/A'}
                    </StatNumber>
                    {summary && (
                      <StatHelpText>
                        <StatArrow
                          type={summary.change_7d > 0 ? 'increase' : 'decrease'}
                        />
                        {summary.change_7d.toFixed(2)}% (7d)
                      </StatHelpText>
                    )}
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>30-Day Average</StatLabel>
                    <StatNumber>
                      {summary ? `${summary.average_30d.toFixed(2)} EH/s` : 'N/A'}
                    </StatNumber>
                    {summary && (
                      <StatHelpText>
                        <StatArrow
                          type={summary.change_30d > 0 ? 'increase' : 'decrease'}
                        />
                        {summary.change_30d.toFixed(2)}% (30d)
                      </StatHelpText>
                    )}
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>

            <Tabs isLazy variant="enclosed" mb={8}>
              <TabList>
                <Tab>Historical Trends</Tab>
                <Tab>Hash Rate by Block</Tab>
              </TabList>
              
              <TabPanels>
                {/* Historical Trends Tab */}
                <TabPanel px={0}>
                  <Box borderWidth="1px" borderRadius="lg" p={6}>
                    <HashRateChart height={400} />
                    
                    <Box mt={4}>
                      <Heading size="sm" mb={2}>
                        What This Chart Tells You
                      </Heading>
                      <Text>
                        Bitcoin's hash rate is a measure of the network's computational power
                        dedicated to mining. Higher hash rates indicate a more secure network and
                        increased miner participation. Significant drops may suggest miners going
                        offline due to profitability concerns, regulatory changes, or energy issues.
                      </Text>
                      <Text mt={2}>
                        Hash rate trends are important for contract traders, as changes in hash rate
                        can indicate shifts in mining economics and network security.
                      </Text>
                    </Box>
                  </Box>
                </TabPanel>
                
                {/* Hash Rate by Block Tab */}
                <TabPanel px={0}>
                  <Box borderWidth="1px" borderRadius="lg" p={6}>
                    <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                      <GridItem>
                        <Heading size="md" mb={4}>
                          Query Hash Rate by Block Height
                        </Heading>
                        
                        <FormControl mb={4}>
                          <FormLabel>Block Height</FormLabel>
                          <NumberInput
                            min={1}
                            value={blockHeight}
                            onChange={(_, value) => setBlockHeight(value)}
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                        
                        <Button
                          colorScheme="blue"
                          onClick={handleBlockQuery}
                          isLoading={isQueryingBlock}
                          loadingText="Querying"
                          mb={4}
                        >
                          Get Hash Rate
                        </Button>
                        
                        {blockHashRate !== null && (
                          <Box mt={4} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
                            <Heading size="sm" mb={2}>
                              Result:
                            </Heading>
                            <Text>
                              Block Height: <strong>{blockHeight}</strong>
                            </Text>
                            <Text>
                              Hash Rate: <strong>{blockHashRate.toFixed(2)} EH/s</strong>
                            </Text>
                          </Box>
                        )}
                      </GridItem>
                      
                      <GridItem>
                        <Box>
                          <Heading size="md" mb={4}>
                            Using Hash Rate Data for Contracts
                          </Heading>
                          <Text mb={3}>
                            When creating a hash rate derivative contract, you can use block height
                            data to:
                          </Text>
                          <Text as="ul" pl={5}>
                            <Text as="li" mb={2}>
                              Set appropriate strike hash rates based on historical data
                            </Text>
                            <Text as="li" mb={2}>
                              Project likely hash rate trends using past performance
                            </Text>
                            <Text as="li" mb={2}>
                              Identify seasonal patterns in hash rate fluctuations
                            </Text>
                            <Text as="li" mb={2}>
                              Understand the impact of mining difficulty adjustments
                            </Text>
                          </Text>
                          <Text mt={3}>
                            Remember that hash rate can be influenced by multiple factors including
                            Bitcoin price, energy costs, mining hardware efficiency, and regulatory
                            changes around the world.
                          </Text>
                        </Box>
                      </GridItem>
                    </Grid>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        )}
      </Container>
    </Layout>
  );
};

export default HashRatePage;
