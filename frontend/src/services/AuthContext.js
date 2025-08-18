import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from './api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Check if token is expired
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token expired
            localStorage.removeItem('token');
            setLoading(false);
            return;
          }

          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user profile
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, passwordChangeRequired } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user profile
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      
      return { success: true, passwordChangeRequired };
    } catch (error) {
      const message = error.response?.data?.errors?.[0]?.msg || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token } = response.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Get user profile
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'basic': 1,
      'basic-upload': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const canUpload = () => {
    return hasRole('basic'); // Changed from 'basic-upload' to 'basic' to match backend permissions
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const forcePasswordChange = async (password) => {
    try {
      await api.post('/auth/force-change-password', { password });
      logout(); // Force user to log in again with new password
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.errors?.[0]?.msg || 'Password change failed';
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole,
    canUpload,
    isAdmin,
    forcePasswordChange,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};