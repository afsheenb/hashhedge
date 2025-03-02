// src/components/layout/MainLayout.tsx
import React from 'react';
import { Box, Container, Flex, useColorMode } from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { colorMode } = useColorMode();

  return (
    <Flex 
      direction="column" 
      minHeight="100vh"
      bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}
    >
      <Header />
      <Box as="main" flex="1" py={6}>
        <Container maxW="container.xl">
          {children}
        </Container>
      </Box>
      <Footer />
    </Flex>
  );
};

export default MainLayout;
