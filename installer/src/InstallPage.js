import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  FormControlLabel,
  Switch,
  MenuItem,
  InputLabel,
  Select,
  Stepper,
  Step,
  StepLabel,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Divider,
  Chip,
  Link
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const InstallPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [config, setConfig] = useState({
    // Basic Configuration
    siteName: 'BitSurge Documentation Search',
    siteDescription: 'AI-powered IT documentation search tool',
    demoMode: true,
    allowRegistration: false,
    
    // Superuser Configuration
    superuserEmail: 'admin@bitsurge.io',
    superuserPassword: '',
    superuserName: 'System Administrator',
    
    // AI Configuration
    aiProvider: 'google', // Default to Google Gemini as requested
    googleApiKey: '',
    ollamaEndpoint: 'http://localhost:11434',
    
    // Network Configuration
    backendPort: '3000',
    frontendPort: '80',
    mongoPort: '27017',
    ollamaPort: '11434',
    
    // Security
    jwtSecret: '',
    sessionTimeout: 24
  });

  // Analytics tracking
  const trackEvent = async (eventName, properties = {}) => {
    try {
      const payload = {
        sessionId,
        event: eventName,
        timestamp: new Date().toISOString(),
        properties: {
          ...properties,
          step: activeStep,
          aiProvider: config.aiProvider,
          demoMode: config.demoMode,
          userAgent: navigator.userAgent,
          referrer: document.referrer,
          url: window.location.href
        }
      };

      // Send to your analytics endpoint
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Fallback to console for development
        console.log('Analytics Event:', payload);
      });
    } catch (error) {
      // Silent fail for analytics
      console.log('Analytics tracking failed:', error);
    }
  };

  // Track page load
  useEffect(() => {
    trackEvent('installer_loaded');
  }, []);

  // Track step changes
  useEffect(() => {
    if (activeStep > 0) {
      trackEvent('step_viewed', { stepName: steps[activeStep] });
    }
  }, [activeStep]);

  const steps = [
    'Basic Setup',
    'Administrator Account',
    'AI Configuration',
    'Network & Ports',
    'Review & Deploy'
  ];

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Track configuration changes
    trackEvent('config_changed', { 
      configKey: key, 
      configValue: key.includes('password') || key.includes('secret') || key.includes('key') ? '[REDACTED]' : value 
    });
  };

  const handleNext = () => {
    trackEvent('step_completed', { 
      stepName: steps[activeStep],
      stepNumber: activeStep 
    });
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    trackEvent('step_back', { 
      stepName: steps[activeStep],
      stepNumber: activeStep 
    });
    setActiveStep(prev => prev - 1);
  };

  const generateJWTSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleConfigChange('jwtSecret', result);
    trackEvent('jwt_secret_generated');
  };

  const generateDockerCompose = () => {
    return `services:
  mongodb:
    image: mongo:latest
    container_name: bitsurge-mongodb
    volumes:
      - bitsurge-mongo-data:/data/db
    ports:
      - "${config.mongoPort}:27017"
    networks:
      - bitsurge-network
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    container_name: bitsurge-ollama
    volumes:
      - bitsurge-ollama-models:/root/.ollama
    ports:
      - "${config.ollamaPort}:11434"
    networks:
      - bitsurge-network
    restart: unless-stopped
    environment:
      OLLAMA_KEEP_ALIVE: 1s
      NUM_THREAD: 8
    deploy:
      resources:
        limits:
          memory: 8G

  backend:
    image: steffmet/surge-backend:latest
    container_name: bitsurge-backend
    volumes:
      - bitsurge-document-storage:/app/storage
    ports:
      - "${config.backendPort}:3000"
    depends_on:
      - mongodb
      - ollama
    networks:
      - bitsurge-network
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGO_URI: mongodb://mongodb:27017/bitsurge
      JWT_SECRET: ${config.jwtSecret}
      JWT_EXPIRATION: ${config.sessionTimeout}h
      OLLAMA_HOST: http://ollama:11434
      DEMO_MODE: "${config.demoMode}"
      SUPERUSER_EMAIL: ${config.superuserEmail}
      SUPERUSER_PASSWORD: ${config.superuserPassword}
      SUPERUSER_NAME: "${config.superuserName}"
      DEFAULT_AI_PROVIDER: ${config.aiProvider}
      ${config.aiProvider === 'google' ? `GOOGLE_API_KEY: ${config.googleApiKey}` : ''}
      STORAGE_PATH: /app/storage

  frontend:
    image: steffmet/surge-frontend:latest
    container_name: bitsurge-frontend
    ports:
      - "${config.frontendPort}:80"
    depends_on:
      - backend
    networks:
      - bitsurge-network
    restart: unless-stopped

networks:
  bitsurge-network:
    driver: bridge

volumes:
  bitsurge-mongo-data:
  bitsurge-ollama-models:
  bitsurge-document-storage:`;
  };

  const downloadDockerCompose = () => {
    trackEvent('docker_compose_downloaded', {
      aiProvider: config.aiProvider,
      demoMode: config.demoMode,
      frontendPort: config.frontendPort,
      backendPort: config.backendPort
    });
    
    const content = generateDockerCompose();
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StepContent = ({ step }) => {
    switch (step) {
      case 0: // Basic Setup
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Configuration
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Site Name"
                value={config.siteName}
                onChange={(e) => handleConfigChange('siteName', e.target.value)}
                helperText="The name that will appear in the application header"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.demoMode}
                    onChange={(e) => handleConfigChange('demoMode', e.target.checked)}
                  />
                }
                label="Enable Demo Mode"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Site Description"
                multiline
                rows={3}
                value={config.siteDescription}
                onChange={(e) => handleConfigChange('siteDescription', e.target.value)}
                helperText="Brief description of your documentation search system"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.allowRegistration}
                    onChange={(e) => handleConfigChange('allowRegistration', e.target.checked)}
                  />
                }
                label="Allow User Registration"
              />
            </Grid>
            {config.demoMode && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <AlertTitle>Demo Mode Enabled</AlertTitle>
                  In demo mode, certain features like file uploads, user creation, and password changes are restricted. 
                  Only the superuser account will have full access.
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 1: // Administrator Account
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Create Superuser Account
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The superuser account has full system access, including the ability to modify settings in demo mode.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Administrator Name"
                value={config.superuserName}
                onChange={(e) => handleConfigChange('superuserName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Administrator Email"
                type="email"
                value={config.superuserEmail}
                onChange={(e) => handleConfigChange('superuserEmail', e.target.value)}
                helperText="This will be used for login"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Administrator Password"
                type="password"
                value={config.superuserPassword}
                onChange={(e) => handleConfigChange('superuserPassword', e.target.value)}
                helperText="Minimum 8 characters recommended"
                error={config.superuserPassword.length > 0 && config.superuserPassword.length < 8}
              />
            </Grid>
          </Grid>
        );

      case 2: // AI Configuration
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                AI Provider Configuration
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>AI Provider</InputLabel>
                <Select
                  value={config.aiProvider}
                  onChange={(e) => handleConfigChange('aiProvider', e.target.value)}
                  label="AI Provider"
                >
                  <MenuItem value="google">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label="Recommended" color="success" />
                      Google Gemini (Fast & Free Tier Available)
                    </Box>
                  </MenuItem>
                  <MenuItem value="self-hosted">Self-Hosted Ollama (Free)</MenuItem>
                  <MenuItem value="openai">OpenAI (Paid)</MenuItem>
                  <MenuItem value="anthropic">Anthropic Claude (Paid)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {config.aiProvider === 'google' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <AlertTitle>Google Gemini - Recommended Choice</AlertTitle>
                    Google Gemini Flash offers excellent performance with generous free tier limits. 
                    Get your free API key from <Link href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</Link>.
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Google API Key"
                    type="password"
                    value={config.googleApiKey}
                    onChange={(e) => handleConfigChange('googleApiKey', e.target.value)}
                    helperText="Get your free API key from Google AI Studio"
                    placeholder="AIza..."
                  />
                </Grid>
              </>
            )}
            
            {config.aiProvider === 'self-hosted' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <AlertTitle>Self-Hosted Ollama</AlertTitle>
                    Free AI responses using your local Ollama installation. Requires more system resources but offers complete privacy.
                  </Alert>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ollama Endpoint"
                    value={config.ollamaEndpoint}
                    onChange={(e) => handleConfigChange('ollamaEndpoint', e.target.value)}
                    helperText="URL where Ollama service is running"
                  />
                </Grid>
              </>
            )}
            
            {(config.aiProvider === 'openai' || config.aiProvider === 'anthropic') && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <AlertTitle>Paid Service</AlertTitle>
                  This AI provider requires payment per API call. Make sure you have billing configured and monitor usage.
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 3: // Network & Ports
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Network Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure the ports that BitSurge will use. Make sure these ports are available on your system.
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Frontend Port"
                type="number"
                value={config.frontendPort}
                onChange={(e) => handleConfigChange('frontendPort', e.target.value)}
                helperText="Port for web interface (usually 80 or 8080)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Backend API Port"
                type="number"
                value={config.backendPort}
                onChange={(e) => handleConfigChange('backendPort', e.target.value)}
                helperText="Port for backend API"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="MongoDB Port"
                type="number"
                value={config.mongoPort}
                onChange={(e) => handleConfigChange('mongoPort', e.target.value)}
                helperText="Port for MongoDB database"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ollama Port"
                type="number"
                value={config.ollamaPort}
                onChange={(e) => handleConfigChange('ollamaPort', e.target.value)}
                helperText="Port for Ollama AI service"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="JWT Secret Key"
                  type="password"
                  value={config.jwtSecret}
                  onChange={(e) => handleConfigChange('jwtSecret', e.target.value)}
                  helperText="Secret key for JWT token encryption"
                />
                <Button
                  variant="outlined"
                  onClick={generateJWTSecret}
                  sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
                >
                  Generate
                </Button>
              </Box>
            </Grid>
          </Grid>
        );

      case 4: // Review & Deploy
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Review your configuration and download the docker-compose.yml file to deploy BitSurge.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Basic Settings
                  </Typography>
                  <Typography variant="body2"><strong>Site Name:</strong> {config.siteName}</Typography>
                  <Typography variant="body2"><strong>Demo Mode:</strong> {config.demoMode ? 'Enabled' : 'Disabled'}</Typography>
                  <Typography variant="body2"><strong>User Registration:</strong> {config.allowRegistration ? 'Allowed' : 'Disabled'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Administrator
                  </Typography>
                  <Typography variant="body2"><strong>Name:</strong> {config.superuserName}</Typography>
                  <Typography variant="body2"><strong>Email:</strong> {config.superuserEmail}</Typography>
                  <Typography variant="body2"><strong>Password:</strong> {'•'.repeat(config.superuserPassword.length)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    AI Provider
                  </Typography>
                  <Typography variant="body2"><strong>Provider:</strong> {
                    config.aiProvider === 'google' ? 'Google Gemini' :
                    config.aiProvider === 'self-hosted' ? 'Self-Hosted Ollama' :
                    config.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic Claude'
                  }</Typography>
                  {config.aiProvider === 'google' && (
                    <Typography variant="body2"><strong>API Key:</strong> {config.googleApiKey ? 'Configured' : 'Not set'}</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Ports
                  </Typography>
                  <Typography variant="body2"><strong>Frontend:</strong> {config.frontendPort}</Typography>
                  <Typography variant="body2"><strong>Backend:</strong> {config.backendPort}</Typography>
                  <Typography variant="body2"><strong>MongoDB:</strong> {config.mongoPort}</Typography>
                  <Typography variant="body2"><strong>Ollama:</strong> {config.ollamaPort}</Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Alert severity="success">
                <AlertTitle>Ready to Deploy!</AlertTitle>
                Your configuration is complete. Download the docker-compose.yml file and run `docker-compose up -d` to start BitSurge.
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={downloadDockerCompose}
                  startIcon={<CheckIcon />}
                >
                  Download docker-compose.yml
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.open('https://github.com/steffmet/surge', '_blank')}
                >
                  View Source Code
                </Button>
              </Box>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          BitSurge Setup
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Configure your AI-powered documentation search system
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Powered by <Link href="https://bitsurge.io" target="_blank" sx={{ fontWeight: 600 }}>bitsurge.io</Link>
        </Typography>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step Content */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <StepContent step={activeStep} />
      </Paper>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
        >
          Back
        </Button>
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={
              (activeStep === 1 && (!config.superuserEmail || !config.superuserPassword)) ||
              (activeStep === 2 && config.aiProvider === 'google' && !config.googleApiKey) ||
              (activeStep === 3 && !config.jwtSecret)
            }
          >
            Next
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default InstallPage;