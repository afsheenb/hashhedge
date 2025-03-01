import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Select,
  Heading,
  Text,
  useColorMode,
  Skeleton,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchHistoricalHashRate } from '../../store/hash-rate-slice';
import { format } from 'date-fns';

interface HashRateChartProps {
  height?: string | number;
  showControls?: boolean;
  referenceValue?: number;
  referenceLabel?: string;
}

const HashRateChart: React.FC<HashRateChartProps> = ({
  height = 400,
  showControls = true,
  referenceValue,
  referenceLabel,
}) => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { currentHashRate, historicalData, loading, error } = useAppSelector(
    (state) => state.hashRate
  );
  
  const [timeRange, setTimeRange] = useState<number>(30); // Default to 30 days
  
  useEffect(() => {
    dispatch(fetchHistoricalHashRate(timeRange));
  }, [dispatch, timeRange]);
  
  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(Number(e.target.value));
  };
  
  // Format the data for the chart
  const chartData = historicalData.map((point) => ({
    date: new Date(point.timestamp),
    hashRate: point.hashRate,
  }));
  
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          p={3}
          borderRadius="md"
          boxShadow="md"
          borderWidth="1px"
        >
          <Text fontWeight="bold">{format(new Date(label), 'PPP')}</Text>
          <Text>
            Hash Rate: {payload[0].value.toFixed(2)} EH/s
          </Text>
        </Box>
      );
    }
    return null;
  };
  
  return (
    <Box>
      {showControls && (
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="md">Bitcoin Network Hash Rate</Heading>
          <Select 
            value={timeRange} 
            onChange={handleRangeChange} 
            width="150px"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 1 year</option>
          </Select>
        </Flex>
      )}
      
      {loading ? (
        <Skeleton height={height} />
      ) : error ? (
        <Text color="red.500">{error}</Text>
      ) : (
        <Box height={height}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={colorMode === 'light' ? '#e2e8f0' : '#2d3748'} 
              />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'M/d')}
                stroke={colorMode === 'light' ? 'black' : 'white'} 
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']} 
                label={{ 
                  value: 'Hash Rate (EH/s)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: colorMode === 'light' ? 'black' : 'white' }  
                }}
                stroke={colorMode === 'light' ? 'black' : 'white'}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="hashRate"
                name="Hash Rate (EH/s)"
                stroke="#3182ce"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
                isAnimationActive={true}
                animationDuration={1000}
              />
              {referenceValue && (
                <ReferenceLine
                  y={referenceValue}
                  stroke="#E53E3E"
                  strokeDasharray="3 3"
                  label={{
                    value: referenceLabel || `${referenceValue} EH/s`,
                    position: 'right',
                    fill: '#E53E3E',
                  }}
                />
              )}
              {currentHashRate && (
                <ReferenceLine
                  y={currentHashRate}
                  stroke="#38A169"
                  strokeDasharray="3 3"
                  label={{
                    value: `Current: ${currentHashRate.toFixed(2)} EH/s`,
                    position: 'left',
                    fill: '#38A169',
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default HashRateChart;
