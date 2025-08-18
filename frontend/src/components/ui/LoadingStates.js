import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  Skeleton,
  useTheme
} from '@mui/material';

const LoadingStates = {
  // Search loading component
  SearchLoading: ({ message = 'Searching documents...' }) => {
    const theme = useTheme();
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        gap: 2
      }}>
        <CircularProgress 
          size={40} 
          sx={{ 
            color: theme.palette.primary.main,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            }
          }} 
        />
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          This may take a few moments...
        </Typography>
      </Box>
    );
  },

  // AI thinking loading component
  AIThinking: ({ message = 'AI is analyzing your question...' }) => {
    const theme = useTheme();
    
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          backgroundColor: theme.palette.primary.main + '08',
          border: `1px solid ${theme.palette.primary.main}20`,
          borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1 }}>
          <CircularProgress 
            size={24} 
            sx={{ 
              color: theme.palette.primary.main,
              animation: 'pulse 2s ease-in-out infinite'
            }} 
          />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            🤖 AI Assistant
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
          Analyzing documents and generating insights...
        </Typography>
      </Paper>
    );
  },

  // Document loading skeleton
  DocumentSkeleton: ({ count = 3 }) => (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Paper key={index} sx={{ p: 3, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
          </Box>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
          <Skeleton variant="text" width="90%" />
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="rounded" width={70} height={24} />
          </Box>
        </Paper>
      ))}
    </Box>
  ),

  // Workspace loading component
  WorkspaceLoading: () => (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rounded" width={120} height={36} />
        <Skeleton variant="rounded" width={140} height={36} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Paper key={index} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" width="70%" height={24} />
            </Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="60%" />
          </Paper>
        ))}
      </Box>
    </Box>
  ),

  // Template creation loading
  TemplateLoading: ({ message = 'Preparing your template...' }) => {
    const theme = useTheme();
    
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 3
      }}>
        <Box sx={{ position: 'relative' }}>
          <CircularProgress 
            size={60} 
            sx={{ 
              color: theme.palette.primary.main,
              animation: 'spin 1s linear infinite'
            }} 
          />
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '24px'
            }}
          >
            📝
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {message}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
          Setting up your document editor with the selected template content...
        </Typography>
      </Box>
    );
  },

  // Generic inline loading
  InlineLoading: ({ size = 16, message }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CircularProgress size={size} />
      {message && (
        <Typography variant="caption" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  )
};

export default LoadingStates;
