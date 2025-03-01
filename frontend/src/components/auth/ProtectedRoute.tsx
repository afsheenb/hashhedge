import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux-hooks';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux-hooks';
import LoadingSpinner from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If still loading auth state, show loading spinner
  if (loading) {
    return <LoadingSpinner message="Verifying authentication..." />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, show children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
