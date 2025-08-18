import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const ProtectedRoute = ({ requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
    return <Navigate to="/home" />;
  }

  return <Outlet />;
};

// Helper function to check role hierarchy
const hasRequiredRole = (userRole, requiredRole) => {
  const roleHierarchy = {
    'basic': 1,
    'basic-upload': 2,
    'admin': 3
  };
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

export default ProtectedRoute;