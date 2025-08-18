import React from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You could also log the error to an error reporting service here
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, title, message } = this.props;
      
      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback 
            error={this.state.error}
            retry={this.handleRetry}
            retryCount={this.state.retryCount}
          />
        );
      }

      // Default error UI
      return (
        <Box 
          sx={{ 
            p: 4, 
            minHeight: '50vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              maxWidth: 600, 
              textAlign: 'center',
              border: '1px solid',
              borderColor: 'error.light'
            }}
          >
            <ErrorIcon 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              {title || 'Something went wrong'}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {message || 'An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.'}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Error Details (Development Mode):
                </Typography>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
                  {this.state.error.toString()}
                </Typography>
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={this.handleRetry}
                startIcon={<RefreshIcon />}
                sx={{ minWidth: 120 }}
              >
                Try Again
                {this.state.retryCount > 0 && ` (${this.state.retryCount})`}
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={this.handleGoHome}
                sx={{ minWidth: 120 }}
              >
                Go Home
              </Button>
            </Box>

            {this.state.retryCount > 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                If this error persists, please contact support with the error details above.
              </Typography>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
