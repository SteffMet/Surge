import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Alert,
  Fade,
  useTheme,
} from '@mui/material';
import { AutoAwesome as AIIcon } from '@mui/icons-material';

const AIResponse = ({ aiResponse }) => {
  const theme = useTheme();
  
  if (!aiResponse) return null;

  return (
    <Fade in timeout={600}>
      <Card
        sx={{
          mb: 4,
          background: 'white',
          color: 'text.primary',
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AIIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
              AI Assistant
            </Typography>
            {aiResponse.model && (
              <Chip
                label={aiResponse.model}
                size="small"
                sx={{
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {aiResponse.response}
          </Typography>
          {!aiResponse.hasDocumentContext && (
            <Alert
              severity="info"
              sx={{
                mt: 2,
                bgcolor: 'info.light',
                color: 'info.contrastText',
                '& .MuiAlert-icon': { color: 'info.dark' },
              }}
            >
              This answer was generated without specific document context.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Fade>
  );
};

export default AIResponse;