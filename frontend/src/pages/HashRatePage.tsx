import React from 'react';
import {
  Container,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import MainLayout from '../components/layout/MainLayout';
import PageHeader from '../components/common/PageHeader';
import HashRateChart from '../components/hashrate/HashRateChart';
import HashRateStatsCard from '../components/hashrate/HashRateStatsCard';
import DifficultyAdjustmentCard from '../components/hashrate/DifficultyAdjustmentCard';

const HashRatePage: React.FC = () => {
  return (
    <MainLayout>
      <Container maxW="container.xl" py={8}>
        <PageHeader
          title="Bitcoin Hash Rate"
          description="Monitor and analyze Bitcoin network hash rate data"
        />

        <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap={6}>
          <GridItem>
            <HashRateChart />
          </GridItem>
          <GridItem>
            <VStack spacing={6}>
              <HashRateStatsCard />
              <DifficultyAdjustmentCard />
            </VStack>
          </GridItem>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default HashRatePage;

