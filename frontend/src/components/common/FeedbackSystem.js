import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Refresh as RetryIcon
} from '@mui/icons-material';

export const FeedbackTypes = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

export const FeedbackMessages = {
  // Workspace messages
  WORKSPACE_ACCESS_GRANTED: 'Successfully accessed workspace',
  WORKSPACE_ACCESS_DENIED: 'Access denied. Please check your permissions or contact the workspace owner.',
  WORKSPACE_LOADING: 'Loading workspace data...',
  WORKSPACE_ERROR: 'Failed to load workspace. Please try again or contact support.',
  
  // Document messages
  DOCUMENT_CREATED: 'Document created successfully',
  DOCUMENT_SAVED: 'Document saved successfully',
  DOCUMENT_SAVE_ERROR: 'Failed to save document. Your changes are preserved locally.',
  DOCUMENT_LOADING: 'Loading document...',
  TEMPLATE_APPLIED: 'Template applied successfully',
  TEMPLATE_ERROR: 'Failed to apply template. Please try again.',
  
  // Search messages
  SEARCH_STARTED: 'Searching through your documents...',
  SEARCH_AI_STARTED: 'AI is analyzing your question...',
  SEARCH_COMPLETED: (count) => `Found ${count} relevant document${count !== 1 ? 's' : ''}`,
  SEARCH_NO_RESULTS: 'No documents found. Try different keywords or check spelling.',
  SEARCH_ERROR: 'Search failed. Please check your connection and try again.',
  SEARCH_TIMEOUT: 'Search timed out. Try using simpler search terms.',
  
  // Connection messages
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  CONNECTION_RESTORED: 'Connection restored successfully',
  RETRY_ATTEMPT: (attempt, max) => `Retrying... (${attempt}/${max})`,
  
  // Generic messages
  OPERATION_SUCCESS: 'Operation completed successfully',
  OPERATION_ERROR: 'Operation failed. Please try again.',
  PERMISSION_DENIED: 'You don\'t have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.'
};

const FeedbackSystem = {
  // Enhanced snackbar component with retry and additional actions
  EnhancedSnackbar: ({ 
    open, 
    onClose, 
    type = FeedbackTypes.INFO, 
    title, 
    message, 
    action,
    autoHideDuration = 6000,
    showProgress = false,
    retryAction,
    retryCount = 0,
    maxRetries = 3
  }) => {
    const getIcon = () => {
      switch (type) {
        case FeedbackTypes.SUCCESS:
          return <SuccessIcon />;
        case FeedbackTypes.ERROR:
          return <ErrorIcon />;
        case FeedbackTypes.WARNING:
          return <WarningIcon />;
        case FeedbackTypes.INFO:
        default:
          return <InfoIcon />;
      }
    };

    const getColor = () => {
      switch (type) {
        case FeedbackTypes.SUCCESS:
          return 'success';
        case FeedbackTypes.ERROR:
          return 'error';
        case FeedbackTypes.WARNING:
          return 'warning';
        case FeedbackTypes.INFO:
        default:
          return 'info';
      }
    };

    return (
      <Snackbar
        open={open}
        autoHideDuration={type === FeedbackTypes.ERROR ? null : autoHideDuration}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={getColor()}
          icon={getIcon()}
          onClose={onClose}
          sx={{
            minWidth: 350,
            maxWidth: 500,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {retryAction && retryCount < maxRetries && (
                <Button
                  size="small"
                  onClick={retryAction}
                  startIcon={<RetryIcon />}
                  sx={{ color: 'inherit' }}
                >
                  Retry
                  {retryCount > 0 && ` (${retryCount})`}
                </Button>
              )}
              {action}
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={onClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {message}
          {showProgress && (
            <LinearProgress 
              sx={{ mt: 1, backgroundColor: 'transparent' }} 
              color="inherit" 
            />
          )}
        </Alert>
      </Snackbar>
    );
  },

  // Status chip component for showing current states
  StatusChip: ({ type, label, onClick, onDelete, icon }) => {
    const getChipProps = () => {
      switch (type) {
        case FeedbackTypes.SUCCESS:
          return { color: 'success', variant: 'outlined' };
        case FeedbackTypes.ERROR:
          return { color: 'error', variant: 'filled' };
        case FeedbackTypes.WARNING:
          return { color: 'warning', variant: 'outlined' };
        case FeedbackTypes.LOADING:
          return { color: 'primary', variant: 'outlined' };
        case FeedbackTypes.INFO:
        default:
          return { color: 'default', variant: 'outlined' };
      }
    };

    return (
      <Chip
        {...getChipProps()}
        label={label}
        icon={icon}
        onClick={onClick}
        onDelete={onDelete}
        size="small"
        sx={{
          '& .MuiChip-label': {
            fontWeight: 500
          },
          ...(type === FeedbackTypes.LOADING && {
            animation: 'pulse 2s ease-in-out infinite'
          })
        }}
      />
    );
  },

  // Connection status indicator
  ConnectionStatus: ({ isOnline, isConnecting, lastError }) => {
    if (isConnecting) {
      return (
        <FeedbackSystem.StatusChip
          type={FeedbackTypes.LOADING}
          label="Connecting..."
          icon={<InfoIcon />}
        />
      );
    }

    if (!isOnline) {
      return (
        <FeedbackSystem.StatusChip
          type={FeedbackTypes.ERROR}
          label="Offline"
          icon={<ErrorIcon />}
        />
      );
    }

    return (
      <FeedbackSystem.StatusChip
        type={FeedbackTypes.SUCCESS}
        label="Online"
        icon={<SuccessIcon />}
      />
    );
  },

  // Progress indicator with context
  ProgressIndicator: ({ 
    progress, 
    message, 
    showPercentage = true,
    variant = 'linear' // 'linear' or 'circular'
  }) => (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {message}
        </Typography>
        {showPercentage && (
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 8, 
          borderRadius: 4,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4
          }
        }} 
      />
    </Box>
  )
};

export default FeedbackSystem;
