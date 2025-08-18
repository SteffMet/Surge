import React from 'react';
import { Container, Box } from '@mui/material';

const AuthLayout = ({ children }) => {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        width: '100vw',
        overflow: 'auto', // Use auto for overflow
        m: 0,
        p: { xs: 2, sm: 3, md: 4 }, // Add padding for smaller screens
        background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        // Apply the app gradient so there is never white gutter around the login page
        // Allow the inner LoginPage component to handle its own centering/styling
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Min height to ensure the background gradient fills the viewport completely
        minHeight: '100vh',
        // Use always for the background repeat to create the gradient effect
        backgroundSize: 'cover',
      })}
    >
      {children}
    </Box>
  );
};

export default AuthLayout;