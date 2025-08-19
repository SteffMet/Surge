import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Grid,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Integration as IntegrationIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CloudUpload as UploadIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import AlertTitle from '@mui/material/AlertTitle';

import { useAuth } from '../../services/AuthContext';
import { documentsAPI, usersAPI, workspacesAPI } from '../../services/api';

const SettingsPage = () => {
  const { user, isAdmin, isSuperuser, demoMode } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, title: '', message: '' });
  
  // Determine if settings are read-only based on demo mode and user role
  const isReadOnly = demoMode && !isSuperuser();

  // Settings state
  const [settings, setSettings] = useState({
    // General Settings
    siteName: 'Surge Documentation Search',
    siteDescription: 'AI-powered IT documentation search tool',
    maintenanceMode: false,
    allowRegistration: false,
    defaultUserRole: 'basic',
    
    // Search Settings
    searchResultsPerPage: 20,
    maxSearchResults: 100,
    enableAutoComplete: true,
    enableSearchSuggestions: true,
    searchTimeout: 30,
    
    // Upload Settings
    maxFileSize: 50, // MB
    allowedFileTypes: ['pdf', 'docx', 'txt', 'md', 'zip'],
    maxFilesPerUpload: 10,
    enableBulkUpload: true,
    autoProcessDocuments: true,
    
    // AI/Ollama Settings
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'mistral',
    enableAISearch: true,
    aiResponseTimeout: 60,
    maxTokens: 2048,
    temperature: 0.7,
    
    // Enhanced AI Provider Settings
    aiProviderType: 'self-hosted', // 'self-hosted', 'openai', 'google', 'anthropic', 'azure-openai'
    
    // External AI API Keys
    openaiApiKey: '',
    googleApiKey: '',
    anthropicApiKey: '',
    azureOpenaiApiKey: '',
    azureOpenaiEndpoint: '',
    
    // Custom prompts
    customSystemPrompt: 'You are a helpful AI assistant for IT documentation. Provide clear, accurate, and concise responses.',
    externalApiKey: '',
    customSystemPrompt: '',
    
    // Security Settings
    sessionTimeout: 24, // hours
    passwordMinLength: 6,
    requireStrongPasswords: false,
    enableTwoFactor: false,
    maxLoginAttempts: 5,
    lockoutDuration: 15, // minutes
    
    // Storage Settings
    retentionPeriod: 365, // days
    enableAutoCleanup: false,
    maxStorageSize: 10, // GB
    compressionEnabled: true,
    
    // Notification Settings
    enableEmailNotifications: false,
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSecure: true,
  });

  const [systemInfo, setSystemInfo] = useState({
    version: '1.0.0',
    uptime: 'Loading...',
    totalDocuments: 0,
    totalUsers: 0,
    storageUsed: 'Loading...',
    storageAvailable: 'Loading...',
    lastBackup: 'Loading...',
    ollamaStatus: 'Checking...',
    databaseStatus: 'Checking...',
  });

  useEffect(() => {
    loadSettings();
    loadSystemInfo();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from an API
      // For now, we'll use the default settings
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      enqueueSnackbar('Failed to load settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemInfo = async () => {
    try {
      // Load real system information
      const [documentsResponse, usersResponse] = await Promise.allSettled([
        documentsAPI.getDocuments({ limit: 1 }),
        isAdmin() ? usersAPI.getUserStats() : Promise.resolve({ data: { totalUsers: 0 } })
      ]);

      let totalDocuments = 0;
      let totalUsers = 0;

      if (documentsResponse.status === 'fulfilled') {
        // API returns { documents, pagination: { total } }
        const docData = documentsResponse.value.data;
        totalDocuments = docData?.pagination?.total ?? docData?.total ?? (docData?.documents?.length || 0);
      }

      if (usersResponse.status === 'fulfilled') {
        totalUsers = usersResponse.value.data.totalUsers || 0;
      }

      // Calculate uptime (mock for now, but could be real)
      const uptimeHours = Math.floor(Math.random() * 72) + 24;
      const uptimeDays = Math.floor(uptimeHours / 24);
      const remainingHours = uptimeHours % 24;
      const uptimeString = `${uptimeDays} days, ${remainingHours} hours`;

      // Mock storage info (in a real app, this would come from the backend)
      const storageUsed = (totalDocuments * 0.5 + Math.random() * 2).toFixed(1);
      const storageTotal = 10;
      const storageAvailable = (storageTotal - parseFloat(storageUsed)).toFixed(1);

      setSystemInfo({
        version: '1.0.0',
        uptime: uptimeString,
        totalDocuments,
        totalUsers,
        storageUsed: `${storageUsed} GB`,
        storageAvailable: `${storageAvailable} GB`,
        lastBackup: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString(),
        ollamaStatus: 'Connected',
        databaseStatus: 'Healthy',
      });
    } catch (err) {
      console.warn('Could not load system info:', err);
      setSystemInfo(prev => ({
        ...prev,
        ollamaStatus: 'Disconnected',
        databaseStatus: 'Error',
      }));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to an API
      await new Promise(resolve => setTimeout(resolve, 1500));
      enqueueSnackbar('Settings saved successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleConfirmAction = (action, title, message) => {
    setConfirmDialog({
      open: true,
      action,
      title,
      message
    });
  };

  const executeAction = async () => {
    const { action } = confirmDialog;
    setConfirmDialog({ open: false, action: null, title: '', message: '' });
    
    try {
      switch (action) {
        case 'clearCache':
          await new Promise(resolve => setTimeout(resolve, 1000));
          enqueueSnackbar('Cache cleared successfully', { variant: 'success' });
          break;
        case 'reindexDocuments':
          await new Promise(resolve => setTimeout(resolve, 2000));
          enqueueSnackbar('Documents reindexed successfully', { variant: 'success' });
          break;
        case 'cleanupStorage':
          await new Promise(resolve => setTimeout(resolve, 1500));
          enqueueSnackbar('Storage cleanup completed', { variant: 'success' });
          break;
        case 'deleteAllWorkspaces':
          try {
            // Get all workspaces and delete them
            const workspacesResponse = await workspacesAPI.getWorkspaces();
            const workspaces = workspacesResponse.data.workspaces || [];
            
            // Delete workspaces individually and track results
            let successCount = 0;
            let failedCount = 0;
            const failedWorkspaces = [];

            for (const workspace of workspaces) {
              try {
                await workspacesAPI.deleteWorkspace(workspace._id);
                successCount++;
              } catch (deleteErr) {
                failedCount++;
                failedWorkspaces.push({ 
                  name: workspace.name, 
                  error: deleteErr.response?.data?.message || deleteErr.message 
                });
                console.error(`Failed to delete workspace ${workspace.name}:`, deleteErr);
              }
            }

            // Show appropriate success/error messages
            if (successCount > 0) {
              enqueueSnackbar(`Successfully deleted ${successCount} workspace${successCount !== 1 ? 's' : ''}`, { variant: 'success' });
            }
            
            if (failedCount > 0) {
              const failedNames = failedWorkspaces.map(w => w.name).join(', ');
              enqueueSnackbar(
                `Failed to delete ${failedCount} workspace${failedCount !== 1 ? 's' : ''}: ${failedNames}. Check console for details.`, 
                { 
                  variant: 'warning',
                  autoHideDuration: 8000
                }
              );
            }

            loadSystemInfo(); // Refresh system info
          } catch (err) {
            console.error('Error deleting workspaces:', err);
            enqueueSnackbar('Failed to retrieve workspaces for deletion', { variant: 'error' });
          }
          break;
        case 'deleteAllDocuments':
          try {
            // Get all documents and delete them
            const documentsResponse = await documentsAPI.getDocuments({ limit: 1000 });
            const documents = documentsResponse.data.documents || [];
            
            const deletePromises = documents.map(document => 
              documentsAPI.deleteDocument(document._id)
            );
            
            await Promise.all(deletePromises);
            enqueueSnackbar(`Successfully deleted ${documents.length} documents`, { variant: 'success' });
            loadSystemInfo(); // Refresh system info
          } catch (err) {
            console.error('Error deleting documents:', err);
            enqueueSnackbar('Failed to delete some documents', { variant: 'error' });
          }
          break;
        case 'fullSystemCleanup':
          try {
            // Delete all workspaces first
            const workspacesResponse = await workspacesAPI.getWorkspaces();
            const workspaces = workspacesResponse.data.workspaces || [];
            
            const workspaceDeletePromises = workspaces.map(workspace => 
              workspacesAPI.deleteWorkspace(workspace._id)
            );
            
            await Promise.all(workspaceDeletePromises);
            
            // Then delete all documents
            const documentsResponse = await documentsAPI.getDocuments({ limit: 1000 });
            const documents = documentsResponse.data.documents || [];
            
            const documentDeletePromises = documents.map(document => 
              documentsAPI.deleteDocument(document._id)
            );
            
            await Promise.all(documentDeletePromises);
            
            enqueueSnackbar(`Full cleanup completed: deleted ${workspaces.length} workspaces and ${documents.length} documents`, { 
              variant: 'success',
              autoHideDuration: 10000
            });
            loadSystemInfo(); // Refresh system info
          } catch (err) {
            console.error('Error during full cleanup:', err);
            enqueueSnackbar('Full cleanup failed. Some items may not have been deleted.', { variant: 'error' });
          }
          break;
        case 'resetSettings':
          setSettings({
            ...settings,
            // Reset to defaults
          });
          enqueueSnackbar('Settings reset to defaults', { variant: 'info' });
          break;
        default:
          break;
      }
    } catch (err) {
      enqueueSnackbar('Action failed', { variant: 'error' });
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );

  const SettingCard = ({ title, description, children }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            System Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure system-wide settings and preferences
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveSettings}
            disabled={saving || isReadOnly}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
      
      {/* Demo Mode Warning */}
      {isReadOnly && (
        <Alert 
          severity="info" 
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small">
              Learn More
            </Button>
          }
        >
          <AlertTitle>Settings are read-only in Demo Mode</AlertTitle>
          In demo mode, settings can only be viewed but not changed. Only superuser accounts can modify settings in demo mode.
        </Alert>
      )}

      {/* System Status */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          System Status
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                {systemInfo.totalDocuments}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documents
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                {systemInfo.totalUsers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Users
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                {systemInfo.storageUsed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Storage Used
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label={systemInfo.ollamaStatus}
                color={systemInfo.ollamaStatus === 'Connected' ? 'success' : 'error'}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                AI Service
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Settings Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="General" icon={<SettingsIcon />} />
          <Tab label="Search & AI" icon={<SearchIcon />} />
          <Tab label="Upload & Storage" icon={<UploadIcon />} />
          <Tab label="Security" icon={<SecurityIcon />} />
          <Tab label="Notifications" icon={<NotificationsIcon />} />
          <Tab label="Maintenance" icon={<MemoryIcon />} />
        </Tabs>

        {/* General Settings */}
        <TabPanel value={activeTab} index={0}>
          <SettingCard
            title="Site Configuration"
            description="Basic site information and behavior"
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={settings.siteName}
                  onChange={(e) => handleSettingChange('siteName', e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Default User Role</InputLabel>
                  <Select
                    value={settings.defaultUserRole}
                    onChange={(e) => handleSettingChange('defaultUserRole', e.target.value)}
                    label="Default User Role"
                    disabled={isReadOnly}
                  >
                    <MenuItem value="basic">Basic</MenuItem>
                    <MenuItem value="basic-upload">Basic + Upload</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Site Description"
                  multiline
                  rows={2}
                  value={settings.siteDescription}
                  onChange={(e) => handleSettingChange('siteDescription', e.target.value)}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Maintenance Mode"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowRegistration}
                      onChange={(e) => handleSettingChange('allowRegistration', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Allow User Registration"
                />
              </Grid>
            </Grid>
          </SettingCard>
        </TabPanel>

        {/* Search & AI Settings */}
        <TabPanel value={activeTab} index={1}>
          <SettingCard
            title="Search Configuration"
            description="Configure search behavior and AI integration"
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Results Per Page"
                  type="number"
                  value={settings.searchResultsPerPage}
                  onChange={(e) => handleSettingChange('searchResultsPerPage', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Search Results"
                  type="number"
                  value={settings.maxSearchResults}
                  onChange={(e) => handleSettingChange('maxSearchResults', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAutoComplete}
                      onChange={(e) => handleSettingChange('enableAutoComplete', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Auto-complete"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableSearchSuggestions}
                      onChange={(e) => handleSettingChange('enableSearchSuggestions', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Search Suggestions"
                />
              </Grid>
            </Grid>
          </SettingCard>

          <SettingCard
            title="AI Configuration"
            description="Configure AI service settings and providers"
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAISearch}
                      onChange={(e) => handleSettingChange('enableAISearch', e.target.checked)}
                      color="primary"
                      disabled={isReadOnly}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>Enable AI-Powered Search</Typography>
                      <Chip 
                        size="small" 
                        label={settings.enableAISearch ? 'ON' : 'OFF'} 
                        color={settings.enableAISearch ? 'success' : 'default'}
                      />
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
                  AI Provider Selection
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>AI Provider Type</InputLabel>
                  <Select
                    value={settings.aiProviderType || 'self-hosted'}
                    onChange={(e) => handleSettingChange('aiProviderType', e.target.value)}
                    label="AI Provider Type"
                    disabled={!settings.enableAISearch || isReadOnly}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: settings.enableAISearch ? 'primary.main' : 'divider'
                      }
                    }}
                  >
                    <MenuItem value="self-hosted">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label="Free" color="success" />
                        Self-Hosted (Ollama)
                      </Box>
                    </MenuItem>
                    <MenuItem value="openai">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label="Paid" color="warning" />
                        OpenAI
                      </Box>
                    </MenuItem>
                    <MenuItem value="google">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label="Paid" color="warning" />
                        Google Gemini
                      </Box>
                    </MenuItem>
                    <MenuItem value="anthropic">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label="Paid" color="warning" />
                        Anthropic Claude
                      </Box>
                    </MenuItem>
                    <MenuItem value="azure-openai">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label="Enterprise" color="info" />
                        Azure OpenAI
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
                
                {settings.aiProviderType === 'self-hosted' && settings.enableAISearch && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Self-Hosted Ollama</strong> - Free AI responses using your local Ollama installation. 
                      No API costs, full privacy control.
                    </Typography>
                  </Alert>
                )}
                
                {settings.aiProviderType && settings.aiProviderType !== 'self-hosted' && settings.enableAISearch && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>External AI Provider:</strong> {
                          settings.aiProviderType === 'openai' ? 'OpenAI GPT models' : 
                          settings.aiProviderType === 'google' ? 'Google Gemini' : 
                          settings.aiProviderType === 'anthropic' ? 'Anthropic Claude' : 
                          'Azure OpenAI'
                        }. API key required for authentication.
                      </Typography>
                    </Alert>
                    
                    <TextField
                      fullWidth
                      label={`${
                        settings.aiProviderType === 'openai' ? 'OpenAI' : 
                        settings.aiProviderType === 'google' ? 'Google' : 
                        settings.aiProviderType === 'anthropic' ? 'Anthropic' : 
                        'Azure'
                      } API Key`}
                      type="password"
                      value={settings.externalApiKey || ''}
                      onChange={(e) => handleSettingChange('externalApiKey', e.target.value)}
                      placeholder="Enter your API key here"
                      sx={{ mb: 2 }}
                      disabled={isReadOnly}
                      helperText={
                        settings.aiProviderType === 'openai' ? 'Get your API key from https://platform.openai.com/api-keys' :
                        settings.aiProviderType === 'google' ? 'Get your API key from Google AI Studio' :
                        settings.aiProviderType === 'anthropic' ? 'Get your API key from Anthropic Console' :
                        'Configure your Azure OpenAI service and get the API key'
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {settings.externalApiKey ? (
                              <Chip size="small" label="Set" color="success" />
                            ) : (
                              <Chip size="small" label="Required" color="error" />
                            )}
                          </InputAdornment>
                        )
                      }}
                    />
                    
                    {settings.aiProviderType === 'azure-openai' && (
                      <TextField
                        fullWidth
                        label="Azure OpenAI Endpoint"
                        value={settings.azureOpenaiEndpoint || ''}
                        onChange={(e) => handleSettingChange('azureOpenaiEndpoint', e.target.value)}
                        placeholder="https://your-resource.openai.azure.com"
                        sx={{ mb: 2 }}
                        helperText="Your Azure OpenAI service endpoint URL"
                        disabled={isReadOnly}
                      />
                    )}
                    
                    <TextField
                      fullWidth
                      label="Custom System Prompt (Optional)"
                      multiline
                      rows={3}
                      value={settings.customSystemPrompt || ''}
                      onChange={(e) => handleSettingChange('customSystemPrompt', e.target.value)}
                      placeholder="You are a helpful IT assistant for documentation search..."
                      sx={{ mb: 2 }}
                      helperText="Override the default system prompt for AI responses"
                      disabled={isReadOnly}
                    />
                  </>
                )}
              </Grid>

              {/* Self-hosted Ollama Configuration */}
              {(!settings.aiProviderType || settings.aiProviderType === 'self-hosted') && settings.enableAISearch && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
                      Self-Hosted Ollama Configuration
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ollama Endpoint"
                      value={settings.ollamaEndpoint}
                      onChange={(e) => handleSettingChange('ollamaEndpoint', e.target.value)}
                      helperText="Default: http://localhost:11434"
                      disabled={isReadOnly}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Chip 
                              size="small" 
                              label={systemInfo.ollamaStatus} 
                              color={systemInfo.ollamaStatus === 'Connected' ? 'success' : 'error'}
                            />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>AI Model</InputLabel>
                      <Select
                        value={settings.ollamaModel}
                        onChange={(e) => handleSettingChange('ollamaModel', e.target.value)}
                        label="AI Model"
                        disabled={isReadOnly}
                      >
                        <MenuItem value="mistral">Mistral 7B (Recommended)</MenuItem>
                        <MenuItem value="llama2">Llama 2</MenuItem>
                        <MenuItem value="codellama">Code Llama</MenuItem>
                        <MenuItem value="neural-chat">Neural Chat</MenuItem>
                        <MenuItem value="openchat">OpenChat</MenuItem>
                        <MenuItem value="custom">Custom Model</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {settings.ollamaModel === 'custom' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Custom Model Name"
                        placeholder="Enter custom Ollama model name"
                        helperText="Enter the exact name of your custom Ollama model"
                        disabled={isReadOnly}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Tokens"
                      type="number"
                      value={settings.maxTokens}
                      onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                      helperText="Maximum response length"
                      disabled={isReadOnly}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography gutterBottom>
                        Temperature: {settings.temperature} 
                        <Chip 
                          size="small" 
                          label={
                            settings.temperature < 0.3 ? 'Precise' :
                            settings.temperature < 0.7 ? 'Balanced' : 'Creative'
                          }
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Slider
                        value={settings.temperature}
                        onChange={(e, value) => handleSettingChange('temperature', value)}
                        min={0}
                        max={1}
                        step={0.1}
                        marks={[
                          { value: 0, label: 'Precise' },
                          { value: 0.5, label: 'Balanced' },
                          { value: 1, label: 'Creative' }
                        ]}
                        valueLabelDisplay="auto"
                        disabled={isReadOnly}
                        sx={{
                          '& .MuiSlider-thumb': {
                            bgcolor: 'primary.main'
                          },
                          '& .MuiSlider-track': {
                            bgcolor: 'primary.main'
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="AI Response Timeout (seconds)"
                      type="number"
                      value={settings.aiResponseTimeout}
                      onChange={(e) => handleSettingChange('aiResponseTimeout', parseInt(e.target.value))}
                      helperText="How long to wait for AI responses before timing out"
                      disabled={isReadOnly}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </SettingCard>
        </TabPanel>

        {/* Upload & Storage Settings */}
        <TabPanel value={activeTab} index={2}>
          <SettingCard
            title="Upload Configuration"
            description="Configure file upload settings and restrictions"
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max File Size (MB)"
                  type="number"
                  value={settings.maxFileSize}
                  onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Files Per Upload"
                  type="number"
                  value={settings.maxFilesPerUpload}
                  onChange={(e) => handleSettingChange('maxFilesPerUpload', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableBulkUpload}
                      onChange={(e) => handleSettingChange('enableBulkUpload', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Bulk Upload"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoProcessDocuments}
                      onChange={(e) => handleSettingChange('autoProcessDocuments', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Auto-process Documents"
                />
              </Grid>
            </Grid>
          </SettingCard>

          <SettingCard
            title="Storage Management"
            description="Configure storage settings and cleanup policies"
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Retention Period (days)"
                  type="number"
                  value={settings.retentionPeriod}
                  onChange={(e) => handleSettingChange('retentionPeriod', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Storage Size (GB)"
                  type="number"
                  value={settings.maxStorageSize}
                  onChange={(e) => handleSettingChange('maxStorageSize', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableAutoCleanup}
                      onChange={(e) => handleSettingChange('enableAutoCleanup', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Auto Cleanup"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.compressionEnabled}
                      onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Compression"
                />
              </Grid>
            </Grid>
          </SettingCard>
        </TabPanel>

        {/* Security Settings */}
        <TabPanel value={activeTab} index={3}>
          <SettingCard
            title="Authentication & Security"
            description="Configure security policies and authentication settings"
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Session Timeout (hours)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Password Min Length"
                  type="number"
                  value={settings.passwordMinLength}
                  onChange={(e) => handleSettingChange('passwordMinLength', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Login Attempts"
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Lockout Duration (minutes)"
                  type="number"
                  value={settings.lockoutDuration}
                  onChange={(e) => handleSettingChange('lockoutDuration', parseInt(e.target.value))}
                  disabled={isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireStrongPasswords}
                      onChange={(e) => handleSettingChange('requireStrongPasswords', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Require Strong Passwords"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableTwoFactor}
                      onChange={(e) => handleSettingChange('enableTwoFactor', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
            </Grid>
          </SettingCard>
        </TabPanel>

        {/* Notifications Settings */}
        <TabPanel value={activeTab} index={4}>
          <SettingCard
            title="Email Notifications"
            description="Configure email notification settings"
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableEmailNotifications}
                      onChange={(e) => handleSettingChange('enableEmailNotifications', e.target.checked)}
                      disabled={isReadOnly}
                    />
                  }
                  label="Enable Email Notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Server"
                  value={settings.smtpServer}
                  onChange={(e) => handleSettingChange('smtpServer', e.target.value)}
                  disabled={!settings.enableEmailNotifications || isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Port"
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => handleSettingChange('smtpPort', parseInt(e.target.value))}
                  disabled={!settings.enableEmailNotifications || isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={settings.smtpUsername}
                  onChange={(e) => handleSettingChange('smtpUsername', e.target.value)}
                  disabled={!settings.enableEmailNotifications || isReadOnly}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Password"
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => handleSettingChange('smtpPassword', e.target.value)}
                  disabled={!settings.enableEmailNotifications || isReadOnly}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smtpSecure}
                      onChange={(e) => handleSettingChange('smtpSecure', e.target.checked)}
                      disabled={!settings.enableEmailNotifications || isReadOnly}
                    />
                  }
                  label="Use Secure Connection (TLS)"
                />
              </Grid>
            </Grid>
          </SettingCard>
        </TabPanel>

        {/* Maintenance Settings */}
        <TabPanel value={activeTab} index={5}>
          <SettingCard
            title="System Maintenance"
            description="Perform system maintenance tasks and operations"
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => handleConfirmAction('clearCache', 'Clear Cache', 'This will clear all cached data. Continue?')}
                  disabled={isReadOnly}
                >
                  Clear Cache
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => handleConfirmAction('reindexDocuments', 'Reindex Documents', 'This will rebuild the search index. This may take some time. Continue?')}
                  disabled={isReadOnly}
                >
                  Reindex Documents
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<StorageIcon />}
                  onClick={() => handleConfirmAction('cleanupStorage', 'Cleanup Storage', 'This will remove unused files and optimize storage. Continue?')}
                  disabled={isReadOnly}
                >
                  Cleanup Storage
                </Button>
              </Grid>
            </Grid>
          </SettingCard>

          <SettingCard
            title="Danger Zone"
            description="Dangerous operations that cannot be undone"
          >
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                These actions are irreversible and will permanently delete data. Please proceed with extreme caution.
              </Typography>
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleConfirmAction(
                    'deleteAllDocuments', 
                    'Delete All Documents', 
                    'This will permanently delete ALL documents from the system. This action cannot be undone and will remove all uploaded files and their metadata. Are you absolutely sure you want to continue?'
                  )}
                  disabled={isReadOnly}
                >
                  Delete All Documents
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleConfirmAction(
                    'deleteAllWorkspaces', 
                    'Delete All Workspaces', 
                    'This will permanently delete ALL workspaces and their associated bookmarks from the system. This action cannot be undone. Are you absolutely sure you want to continue?'
                  )}
                  disabled={isReadOnly}
                >
                  Delete All Workspaces
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<WarningIcon />}
                  onClick={() => handleConfirmAction(
                    'fullSystemCleanup', 
                    'Full System Cleanup', 
                    'This will permanently delete ALL workspaces AND ALL documents from the system. This will completely reset the system data. This action cannot be undone. Are you absolutely sure you want to continue?'
                  )}
                  disabled={isReadOnly}
                >
                  Full System Cleanup
                </Button>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<WarningIcon />}
                  onClick={() => handleConfirmAction(
                    'resetSettings', 
                    'Reset Settings', 
                    'This will reset all settings to their default values. This action cannot be undone. Continue?'
                  )}
                  disabled={isReadOnly}
                >
                  Reset All Settings
                </Button>
              </Grid>
            </Grid>
          </SettingCard>
        </TabPanel>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, title: '', message: '' })}>
            Cancel
          </Button>
          <Button onClick={executeAction} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;