import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';

/**
 * ProtectedRoute Component
 * Restricts access to authenticated users only.
 * If user does not have a valid token, redirects to /login.
 */
export function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * PublicOnlyRoute Component
 * Used for Login and Signup pages.
 * If the user is ALREADY logged in, redirects them straight to /budget.
 */
export function PublicOnlyRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/budget" replace />;
  }
  return children;
}

export default ProtectedRoute;
