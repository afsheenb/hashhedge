import React, { useEffect } from 'react';
import { SimpleGrid, Box, Heading, useColorMode } from '@chakra-ui/react';
import { 
  FiTrendingUp, 
  FiTrendingDown,
  FiActivity,
  FiClock
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../hooks/redux-hooks';
import { fetchHashRateSummary } from '../../store/hash-rate-slice';
import StatCard from '../dashboard/StatCard';
import LoadingSpinner from '../common/LoadingSpinner';

const HashRateStatsCard: React.FC = () => {
  const { colorMode } = useColorMode();
  const dispatch = useAppDispatch();
  const { currentHashRate, loading } = useAppSelector((state) => state.hashRate);

  useEffect(() => {
    dispatch(fetchHashRateSummary());
  }, [dispatch]);

  if (loading && currentHashRate === 0) {
    return <LoadingSpinner message="Loading hash rate statistics..." />;
  }

  // Placeholder values for demonstration
  const dailyChange = 1.2;
  const weeklyChange = -2.5;
  const monthlyChange = 5.8;

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      bg={colorMode === 'light' ? 'white' : 'gray.800'}
      p={4}
    >
      <Heading size="md" mb={4}>Hash Rate Statistics</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <StatCard
          title="Current Hash Rate"
          value={`${currentHashRate.toFixed(2)} EH/s`}
          icon={FiActivity}
          color="blue"
        />
        <StatCard
          title="24-Hour Change"
          value={`${Math.abs(dailyChange).toFixed(2)}%`}
          change={dailyChange}
          icon={dailyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={dailyChange >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Weekly Change"
          value={`${Math.abs(weeklyChange).toFixed(2)}%`}
          change={weeklyChange}
          icon={weeklyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={weeklyChange >= 0 ? "green" : "red"}
        />
        <StatCard
          title="Monthly Change"
          value={`${Math.abs(monthlyChange).toFixed(2)}%`}
          change={monthlyChange}
          icon={monthlyChange >= 0 ? FiTrendingUp : FiTrendingDown}
          color={monthlyChange >= 0 ? "green" : "red"}
        />
      </SimpleGrid>
    </Box>
  );
};

export default HashRateStatsCard;

