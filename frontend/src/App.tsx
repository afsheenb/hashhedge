// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import store from './store';
import theme from './styles/theme';
import { useAppDispatch, useAppSelector } from './hooks/redux-hooks';
import { loadUser } from './store/auth-slice';
import { fetchCurrentHashRate } from './store/hash-rate-slice';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OrderBookPage from './pages/OrderBookPage';
import ContractsPage from './pages/ContractsPage';
import ContractDetailsPage from './pages/ContractDetailsPage';
import HashRatePage from './pages/HashRatePage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import NotFoundPage from './pages/NotFoundPage';
import OfflineExitTool from './pages/OfflineExitTool';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';

const AppRoutes: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Try to load user on app start
    dispatch(loadUser());
    
    // Fetch initial hash rate data
    dispatch(fetchCurrentHashRate());
  }, [dispatch]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/orderbook" element={<OrderBookPage />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/contracts/:id" element={<ContractDetailsPage />} />
        <Route path="/hashrate" element={<HashRatePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/emergency-exit" element={<OfflineExitTool />} />
      </Route>
      
      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <Router>
          <AppRoutes />
        </Router>
      </ChakraProvider>
    </Provider>
  );
};

export default App;
