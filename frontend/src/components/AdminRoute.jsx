import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUser } from '../services/api';

/**
 * AdminRoute Component
 * Restricts access to administrator accounts only.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated but not an admin, redirects to /destinations.
 */
export function AdminRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = getUser();
  if (!user || !user.is_admin) {
    return <Navigate to="/destinations" replace />;
  }

  return children;
}

export default AdminRoute;
