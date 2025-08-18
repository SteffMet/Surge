import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  Fade,
  Zoom,
  Slide,
  CircularProgress,
  useTheme,
  Paper,
  Chip,
  Avatar,
  Tooltip,
  Link,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Login as LoginIcon,
  Security as SecurityIcon,
  AutoAwesome as AIIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { useAuth } from '../../services/AuthContext';
import { authAPI } from '../../services/api';

const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState({});
  const [mounted, setMounted] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fetch demo mode configuration
    const fetchDemoConfig = async () => {
      try {
        const response = await authAPI.getConfig();
        setDemoMode(response.data.demoMode);
      } catch (error) {
        console.error('Error fetching demo config:', error);
        // Default to false if error
        setDemoMode(false);
      }
    };
    fetchDemoConfig();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleFocus = (field) => {
    setFocused({ ...focused, [field]: true });
  };

  const handleBlur = (field) => {
    setFocused({ ...focused, [field]: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Disable password change requirement
        // if (result.passwordChangeRequired) {
        //   navigate('/force-change-password');
        //    enqueueSnackbar('Please change your password to continue.', {
        //     variant: 'info',
        //   });
        // } else {
          enqueueSnackbar('Welcome back to Surge! 🎉', {
            variant: 'success',
            anchorOrigin: { vertical: 'top', horizontal: 'center' },
          });
          navigate('/home');
        // }
      } else {
        setError(result.error);
        enqueueSnackbar('Login failed. Please check your credentials.', { 
          variant: 'error' 
        });
      }
    } catch (err) {
      const errorMessage = 'Connection failed. Please check your network and try again.';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleDemoLogin = (credentials) => {
    setFormData(credentials);
    // Auto-focus password field after setting demo credentials
    setTimeout(() => {
      const passwordField = document.querySelector('input[name="password"]');
      if (passwordField) passwordField.focus();
    }, 100);
  };

  const features = [
    { 
      icon: <AIIcon sx={{ fontSize: 20 }} />, 
      title: 'AI-Powered Search', 
      description: 'Intelligent document discovery',
      color: 'primary' 
    },
    { 
      icon: <SpeedIcon sx={{ fontSize: 20 }} />, 
      title: 'Lightning Fast', 
      description: 'Instant results and navigation',
      color: 'secondary' 
    },
    { 
      icon: <ShieldIcon sx={{ fontSize: 20 }} />, 
      title: 'Secure & Private', 
      description: 'Enterprise-grade security',
      color: 'success' 
    },
    { 
      icon: <CloudIcon sx={{ fontSize: 20 }} />, 
      title: 'Cloud-Native', 
      description: 'Access anywhere, anytime',
      color: 'info' 
    },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: { md: 1200 }, // Max width for larger screens
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 4, md: 8 },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* Left Side - Branding & Features */}
        <Slide 
          in={mounted} 
          direction="right" 
          timeout={800}
          style={{ transitionDelay: '200ms' }}
        >
          <Box 
            sx={{ 
              flex: 1,
              display: { xs: 'none', md: 'block' },
              maxWidth: 500,
            }}
          >
            {/* Logo and Main Title */}
            <Box sx={{ mb: 6 }}>
              <Zoom in={mounted} timeout={1000} style={{ transitionDelay: '400ms' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '2rem',
                    mb: 3,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  S
                </Box>
              </Zoom>
              
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 800,
                                        mb: 2,
                                        color: 'white',
                                        textShadow: `0 4px 20px ${theme.palette.grey[900]}4D`,
                                        fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.1,
                }}
              >
                Welcome to{' '}
                <Box 
                  component="span" 
                  sx={{
                    background: 'linear-gradient(45deg, #ffffff 30%, #e0e7ff 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Surge
                </Box>
              </Typography>
              
              <Typography 
                variant="h5" 
                sx={{
                                      color: 'rgba(255, 255, 255, 0.9)',
                                      fontWeight: 400,
                                      mb: 4,
                                      textShadow: `0 2px 10px ${theme.palette.grey[900]}33`,
                                    }}
              >
                Intelligent IT Documentation Platform
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{
                                      color: 'rgba(255, 255, 255, 0.8)',
                                      fontSize: '1.1rem',
                                      lineHeight: 1.7,
                                      textShadow: `0 2px 10px ${theme.palette.grey[900]}33`,
                                    }}
              >
                Revolutionize your documentation workflow with AI-powered search, 
                intelligent categorization, and seamless team collaboration.
              </Typography>
            </Box>

            {/* Feature Cards */}
            <Stack spacing={3}>
              {features.map((feature, index) => (
                <Fade 
                  key={feature.title}
                  in={mounted} 
                  timeout={1000}
                  style={{ transitionDelay: `${600 + (index * 150)}ms` }}
                >
                  <Paper
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        background: 'rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${feature.color}.main`,
                          width: 48,
                          height: 48,
                          boxShadow: `0 8px 32px ${theme.palette[feature.color]?.main}40`,
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Fade>
              ))}
            </Stack>
          </Box>
        </Slide>

        {/* Right Side - Login Form */}
        <Slide 
          in={mounted} 
          direction="left" 
          timeout={800}
          style={{ transitionDelay: '300ms' }}
        >
          <Box sx={{ flex: 1, maxWidth: 480, width: '100%' }}>
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: 4,
                boxShadow: '0 40px 120px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                                        background: theme.custom?.gradients?.primary,
                                      }
              }}
            >
              <CardContent sx={{ p: { xs: 4, sm: 6 } }}>
                {/* Mobile Logo */}
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    mb: 4,
                    display: { xs: 'block', md: 'none' }
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 3,
                                                background: theme.custom?.gradients?.primary,
                                                display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.8rem',
                      mx: 'auto',
                      mb: 2,
                      boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    S
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Sign In to Surge
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Access your documentation workspace
                  </Typography>
                </Box>

                {/* Desktop Title */}
                <Box 
                  sx={{ 
                    mb: 4,
                    display: { xs: 'none', md: 'block' }
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Sign In
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Welcome back! Please sign in to continue.
                  </Typography>
                </Box>

                {/* Error Alert */}
                <Fade in={!!error}>
                  <Box>
                    {error && (
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: 3,
                          borderRadius: 3,
                          '& .MuiAlert-icon': {
                            alignItems: 'center',
                          }
                        }}
                        onClose={() => setError('')}
                      >
                        {error}
                      </Alert>
                    )}
                  </Box>
                </Fade>

                {/* Login Form */}
                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    name="email"
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => handleFocus('email')}
                    onBlur={() => handleBlur('email')}
                    required
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: theme.shape.borderRadius,
                                                    backgroundColor: focused.email ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(37, 99, 235, 0.02)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(37, 99, 235, 0.05)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.15)',
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main',
                        fontWeight: 600,
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon 
                            sx={{ 
                              color: focused.email ? 'primary.main' : 'action.active',
                              transition: 'color 0.3s ease',
                            }} 
                          />
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Enter your email address"
                  />

                  <TextField
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => handleFocus('password')}
                    onBlur={() => handleBlur('password')}
                    required
                    sx={{ 
                      mb: 4,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: theme.shape.borderRadius,
                                                    backgroundColor: focused.password ? 'rgba(37, 99, 235, 0.02)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(37, 99, 235, 0.02)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(37, 99, 235, 0.05)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.15)',
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'primary.main',
                        fontWeight: 600,
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon 
                            sx={{ 
                              color: focused.password ? 'primary.main' : 'action.active',
                              transition: 'color 0.3s ease',
                            }} 
                          />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title={showPassword ? "Hide password" : "Show password"}>
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={handleTogglePasswordVisibility}
                              edge="end"
                              sx={{
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  backgroundColor: 'primary.50',
                                  color: 'primary.main',
                                }
                              }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Enter your password"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
                    sx={{
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: theme.shape.borderRadius,
                                                textTransform: 'none',
                                                background: theme.custom?.gradients?.primary,
                                                boxShadow: `0 8px 32px ${theme.palette.primary.main}4D`,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(37, 99, 235, 0.4)',
                        background: 'linear-gradient(135deg, #1d4ed8 0%, #6d28d9 100%)',
                      },
                      '&:active': {
                        transform: 'translateY(0px)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        transform: 'none',
                        boxShadow: 'none',
                      }
                    }}
                  >
                    {loading ? 'Signing In...' : 'Sign In to Surge'}
                  </Button>
                </Box>

                {/* Demo Access Section - Only show if demo mode is enabled */}
                {demoMode && (
                  <>
                    {/* Divider */}
                    <Divider sx={{ my: 4, opacity: 0.7 }}>
                      <Chip 
                        label="Demo Access" 
                        size="small" 
                        sx={{ 
                          backgroundColor: 'primary.50',
                          color: 'primary.main',
                          fontWeight: 600,
                          px: 2,
                        }}
                      />
                    </Divider>

                    {/* Demo Credentials */}
                    <Paper 
                      sx={{ 
                        p: 3, 
                        backgroundColor: 'grey.50', 
                        borderRadius: 3,
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        Try Demo Access
                      </Typography>
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Administrator Account:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="admin@surge.local"
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => handleDemoLogin({ email: 'admin@surge.local', password: 'admin123' })}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'primary.50', borderColor: 'primary.main' }
                          }}
                        />
                        <Chip
                          label="admin123"
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Standard User Account:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="user@surge.local"
                          size="small"
                          variant="outlined"
                          clickable
                          onClick={() => handleDemoLogin({ email: 'user@surge.local', password: 'user123' })}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'secondary.50', borderColor: 'secondary.main' }
                          }}
                        />
                        <Chip
                          label="user123"
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                  
                  <Alert 
                    severity="info" 
                    sx={{ 
                      mt: 2, 
                      borderRadius: 2,
                      '& .MuiAlert-message': { fontSize: '0.875rem' }
                    }}
                  >
                    Click on the email addresses above to auto-fill the login form
                  </Alert>
                </Paper>
                </>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography 
                variant="body2" 
                sx={{
                                      color: 'rgba(255, 255, 255, 0.8)',
                                      textShadow: `0 2px 10px ${theme.palette.grey[900]}4D`,
                                    }}
              >
                © 2025 Surge Documentation Platform.{' '}
                <Link 
                  href="#"
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  Built for modern teams.
                </Link>
              </Typography>
            </Box>
          </Box>
        </Slide>
      </Box>
    </Box>
  );
};

export default LoginPage;