
import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAppSelector } from '../../hooks/redux-hooks';

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSidebar = true }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  return (
    <Box minH="100vh">
      <Header />
      <Flex>
        {showSidebar && isAuthenticated && (
          <Sidebar
            display={{ base: 'none', md: 'block' }}
            w={{ base: 'full', md: '250px' }}
            flexShrink={0}
          />
        )}
        <Box
          w="full"
          ml={{ base: 0, md: showSidebar && isAuthenticated ? '250px' : 0 }}
          transition="margin-left 0.3s"
        >
          {children}
        </Box>
      </Flex>
    </Box>
  );
};

export default Layout;
