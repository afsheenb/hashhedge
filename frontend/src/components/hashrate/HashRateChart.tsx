import React, { useEffect } from 'react';
import {
  Box,
  Heading,
  Select,
  Flex,
  Button,
  useColorMode,
} from '@chakra-ui/react';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchHistoricalHashRate } from '../../store/hash-rate-slice';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorDisplay from '../common/ErrorDisplay';
import { format, parseISO } from 'date-fns';

const HashRateChart: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { historicalData, loading, error } = useAppSelector((state) => state.hashRate);
  const [timeRange, setTimeRange] = React.useState<number>(30); // Default to 30 days

  useEffect(() => {
    dispatch(fetchHistoricalHashRate(timeRange));
  }, [dispatch, timeRange]);

  const handleRefresh = () => {
    dispatch(fetchHistoricalHashRate(timeRange));
  };

  const handleTimeRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(parseInt(event.target.value, 10));
  };

  if (loading && historicalData.length === 0) {
    return <LoadingSpinner message="Loading hash rate data..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={handleRefresh} />;
  }

  // Format data for the chart
  const chartData = historicalData.map(item => ({
    date: format(parseISO(item.timestamp), 'MMM dd'),
    hashRate: item.hash_rate,
    timestamp: item.timestamp,
  }));

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
    >
      <Flex px={4} py={3} borderBottomWidth="1px" justifyContent="space-between" alignItems="center">
        <Heading size="md">Bitcoin Network Hash Rate</Heading>
        <Flex alignItems="center">
          <Select
            value={timeRange}
            onChange={handleTimeRangeChange}
            size="sm"
            width="auto"
            mr={2}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </Select>
          <Button size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
        </Flex>
      </Flex>
      <Box p={4} height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="hashRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3182CE" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3182CE" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'light' ? '#E2E8F0' : '#2D3748'} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' }}
            />
            <YAxis 
              tick={{ fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' }}
              domain={['auto', 'auto']}
              label={{ 
                value: 'EH/s', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: colorMode === 'light' ? '#1A202C' : '#E2E8F0' } 
              }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: colorMode === 'light' ? 'white' : '#1A202C',
                borderColor: colorMode === 'light' ? '#E2E8F0' : '#2D3748',
                color: colorMode === 'light' ? '#1A202C' : '#E2E8F0'
              }}
              formatter={(value: number) => [`${value.toFixed(2)} EH/s`, 'Hash Rate']}
              labelFormatter={(value) => {
                const dataItem = chartData.find(item => item.date === value);
                return dataItem ? format(parseISO(dataItem.timestamp), 'PPP') : value;
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="hashRate"
              stroke="#3182CE"
              fillOpacity={1}
              fill="url(#hashRateGradient)"
              name="Hash Rate (EH/s)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default HashRateChart;

