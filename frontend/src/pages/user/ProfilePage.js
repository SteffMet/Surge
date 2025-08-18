import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Slide,
  Hidden,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
  Shield as ShieldIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import moment from 'moment';

import { useAuth } from '../../services/AuthContext';
import { authAPI, searchAPI, documentsAPI, handleApiError } from '../../services/api';
import AiProviderSettings from '../../components/user/AiProviderSettings';

const ProfilePage = () => {
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Profile form data
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    website: '',
  });

  // Password change data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Preferences
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    searchNotifications: false,
    documentNotifications: true,
    darkMode: false,
    compactView: false,
    autoSave: true,
    language: 'en',
    timezone: 'UTC',
  });

  // AI Provider Settings
  const [aiProviderSettings, setAiProviderSettings] = useState({
    enabled: false,
    apiKey: '',
    systemPrompt: '',
  });

  // Activity data
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);

  // Dialog states
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState(false);

  // Form errors
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    setMounted(true);
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
      });
    }
    loadUserActivity();
  }, [user]);

  const loadUserActivity = async () => {
    setLoading(true);
    try {
      const [searchResponse, uploadsResponse] = await Promise.allSettled([
        searchAPI.getRecentSearches(),
        documentsAPI.getDocuments({ limit: 10, uploadedBy: user?._id }),
      ]);

      if (searchResponse.status === 'fulfilled') {
        setSearchHistory(searchResponse.value.data.slice(0, 10));
      }

      if (uploadsResponse.status === 'fulfilled') {
        setUploadHistory(uploadsResponse.value.data.documents || []);
      }

      // Mock login history - in real app this would come from API
      setLoginHistory([
        { timestamp: new Date(), ip: '192.168.1.100', userAgent: 'Chrome 120.0.0.0' },
        { timestamp: new Date(Date.now() - 86400000), ip: '192.168.1.100', userAgent: 'Chrome 120.0.0.0' },
        { timestamp: new Date(Date.now() - 172800000), ip: '10.0.0.50', userAgent: 'Firefox 121.0' },
      ]);

    } catch (err) {
      console.warn('Could not load user activity:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    if (!profileData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Email is invalid';
    }

    if (profileData.website && !profileData.website.match(/^https?:\/\/.+/)) {
      errors.website = 'Website must be a valid URL';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    setSaving(true);
    try {
      // In a real app, this would call an API to update the profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the user context
      updateUser({ ...user, ...profileData });
      
      enqueueSnackbar('Profile updated successfully! 🎉', { variant: 'success' });
      setEditMode(false);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setSaving(true);
    try {
      // In a real app, this would call an API to change the password
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      enqueueSnackbar('Password changed successfully! 🔐', { variant: 'success' });
      setPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      // In a real app, this would save preferences to API
      await new Promise(resolve => setTimeout(resolve, 500));
      enqueueSnackbar('Preferences saved successfully! ⚙️', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to save preferences', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      username: user.username || '',
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      bio: user.bio || '',
      location: user.location || '',
      website: user.website || '',
    });
    setProfileErrors({});
    setEditMode(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'basic-upload':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'basic-upload':
        return 'Basic + Upload';
      default:
        return 'Basic User';
    }
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Fade in={mounted} timeout={600}>
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            sx={{ 
              fontWeight: 800, 
              mb: 1,
              background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            My Profile
          </Typography>
          <Typography 
            variant={isMobile ? "body2" : "body1"} 
            color="text.secondary"
            sx={{ maxWidth: 600 }}
          >
            Manage your account settings, preferences, and view your activity across the platform
          </Typography>
        </Box>
      </Fade>

      {/* Profile Overview Card */}
      <Slide in={mounted} direction="up" timeout={800}>
        <Card 
          sx={{ 
            mb: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={{ xs: 2, sm: 3 }}
              alignItems={{ xs: 'center', sm: 'flex-start' }}
              textAlign={{ xs: 'center', sm: 'left' }}
            >
              {/* Avatar with Upload Button */}
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  sx={{
                    width: { xs: 80, sm: 100 },
                    height: { xs: 80, sm: 100 },
                    bgcolor: 'primary.main',
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                    fontWeight: 'bold',
                    boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                    border: '4px solid rgba(255, 255, 255, 0.9)',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <IconButton
                  size="small"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'secondary.main',
                    color: 'white',
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    '&:hover': {
                      bgcolor: 'secondary.dark',
                      transform: 'scale(1.1)',
                    },
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <PhotoCameraIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Box>

              {/* User Info */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography 
                  variant={isMobile ? "h6" : "h5"} 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    wordBreak: 'break-word',
                  }}
                >
                  {profileData.firstName && profileData.lastName 
                    ? `${profileData.firstName} ${profileData.lastName}`
                    : user?.username}
                </Typography>
                <Typography 
                  variant={isMobile ? "body2" : "body1"} 
                  color="text.secondary" 
                  sx={{ mb: 2, wordBreak: 'break-all' }}
                >
                  {user?.email}
                </Typography>
                
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'center', sm: 'flex-start' }}
                >
                  <Chip
                    label={getRoleLabel(user?.role)}
                    color={getRoleColor(user?.role)}
                    size={isMobile ? "small" : "medium"}
                    variant="outlined"
                    icon={<ShieldIcon />}
                  />
                  <Chip
                    label={user?.isActive ? '✅ Active' : '⛔ Inactive'}
                    color={user?.isActive ? 'success' : 'default'}
                    size={isMobile ? "small" : "medium"}
                    variant="outlined"
                  />
                </Stack>
              </Box>

              {/* Member Since */}
              <Box 
                sx={{ 
                  textAlign: { xs: 'center', sm: 'right' },
                  minWidth: { xs: 'auto', sm: 120 }
                }}
              >
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Member since
                </Typography>
                <Typography 
                  variant={isMobile ? "body2" : "body1"} 
                  sx={{ fontWeight: 600 }}
                >
                  {moment(user?.createdAt).format('MMM YYYY')}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Slide>

      {/* Tabs */}
      <Zoom in={mounted} timeout={1000}>
        <Paper 
          sx={{ 
            borderRadius: 4,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            sx={{
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              '& .MuiTab-root': {
                minHeight: { xs: 48, sm: 64 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 600,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: 'primary.main',
                }
              }
            }}
          >
            <Tab 
              label={isMobile ? "Profile" : "Profile Info"} 
              icon={<PersonIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Security" 
              icon={<SecurityIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={isMobile ? "Settings" : "Preferences"} 
              icon={<NotificationsIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Activity" 
              icon={<HistoryIcon />} 
              iconPosition="start"
            />
          </Tabs>

          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'stretch', sm: 'center' }, 
                gap: 2,
                mb: 3 
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Profile Information
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                    size={isMobile ? "small" : "medium"}
                    fullWidth={isMobile}
                    sx={{
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={1}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancelEdit}
                      disabled={saving}
                      size={isMobile ? "small" : "medium"}
                      sx={{ borderRadius: 3, textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      onClick={handleSaveProfile}
                      disabled={saving}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        borderRadius: 3,
                        textTransform: 'none',
                        background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Stack>
                )}
              </Box>

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    disabled={!editMode}
                    error={!!profileErrors.username}
                    helperText={profileErrors.username}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    disabled={!editMode}
                    error={!!profileErrors.email}
                    helperText={profileErrors.email}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    disabled={!editMode}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    disabled={!editMode}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    disabled={!editMode}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={profileData.website}
                    onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                    disabled={!editMode}
                    error={!!profileErrors.website}
                    helperText={profileErrors.website}
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    multiline
                    rows={isMobile ? 3 : 4}
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    disabled={!editMode}
                    helperText="Tell us a bit about yourself and your role"
                    size={isMobile ? "small" : "medium"}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { borderRadius: 3 }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={{ xs: 2, sm: 4 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Password Security
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                        Keep your account secure with a strong password. We recommend using at least 8 characters with a mix of letters, numbers, and symbols.
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<LockIcon />}
                        onClick={() => setPasswordDialog(true)}
                        fullWidth
                        size={isMobile ? "small" : "medium"}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Account Status
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">Status:</Typography>
                          <Chip
                            label={user?.isActive ? 'Active' : 'Inactive'}
                            color={user?.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">Role:</Typography>
                          <Chip
                            label={getRoleLabel(user?.role)}
                            color={getRoleColor(user?.role)}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">Last Login:</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            {user?.lastLogin ? moment(user.lastLogin).fromNow() : 'Never'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                        Recent Login Activity
                      </Typography>
                      <TableContainer sx={{ 
                        maxHeight: { xs: 300, md: 400 },
                        '& .MuiTable-root': {
                          minWidth: { xs: 'auto', sm: 650 }
                        }
                      }}>
                        <Table size={isMobile ? "small" : "medium"}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Browser</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {loginHistory.map((login, index) => (
                              <TableRow key={index} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                                <TableCell sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {moment(login.timestamp).format('MMM DD, YYYY HH:mm')}
                                </TableCell>
                                <TableCell sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {login.ip}
                                </TableCell>
                                <TableCell sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                  {login.userAgent}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'stretch', sm: 'center' }, 
                gap: 2,
                mb: 3 
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Preferences & Settings
                </Typography>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSavePreferences}
                  disabled={saving}
                  size={isMobile ? "small" : "medium"}
                  fullWidth={isMobile}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </Box>

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <NotificationsIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Notifications
                        </Typography>
                      </Box>
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.emailNotifications}
                              onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Email Notifications
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Receive important updates via email
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.searchNotifications}
                              onChange={(e) => setPreferences({ ...preferences, searchNotifications: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Search Notifications
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Get notified about search result updates
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.documentNotifications}
                              onChange={(e) => setPreferences({ ...preferences, documentNotifications: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Document Notifications
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Updates on document uploads and changes
                              </Typography>
                            </Box>
                          }
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PaletteIcon color="secondary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Interface
                        </Typography>
                      </Box>
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.darkMode}
                              onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Dark Mode
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Switch to dark theme for better viewing
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.compactView}
                              onChange={(e) => setPreferences({ ...preferences, compactView: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Compact View
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Show more content in less space
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={preferences.autoSave}
                              onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                              color="primary"
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Auto-save Changes
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Automatically save your work
                              </Typography>
                            </Box>
                          }
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <AiProviderSettings
                    settings={aiProviderSettings}
                    onSettingsChange={setAiProviderSettings}
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={{ xs: 2, sm: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SearchIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Recent Searches
                        </Typography>
                      </Box>
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : searchHistory.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {searchHistory.slice(0, 5).map((search, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'secondary.light', width: 32, height: 32 }}>
                                  <SearchIcon sx={{ fontSize: 16 }} />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={search.query}
                                secondary={moment(search.timestamp).fromNow()}
                                primaryTypographyProps={{
                                  fontSize: { xs: '0.9rem', sm: '1rem' }
                                }}
                                secondaryTypographyProps={{
                                  fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          No recent searches
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <UploadIcon color="info" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Recent Uploads
                        </Typography>
                      </Box>
                      {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : uploadHistory.length > 0 ? (
                        <List sx={{ p: 0 }}>
                          {uploadHistory.slice(0, 5).map((upload, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 1 }}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                                  <UploadIcon sx={{ fontSize: 16 }} />
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={upload.title}
                                secondary={moment(upload.createdAt).fromNow()}
                                primaryTypographyProps={{
                                  fontSize: { xs: '0.9rem', sm: '1rem' }
                                }}
                                secondaryTypographyProps={{
                                  fontSize: { xs: '0.75rem', sm: '0.8rem' }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                          No recent uploads
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </Paper>
      </Zoom>

      {/* Change Password Dialog */}
      <Dialog 
        open={passwordDialog} 
        onClose={() => setPasswordDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            margin: isMobile ? 0 : 2,
          }
        }}
      >
        <DialogTitle sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            Change Password
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2 } }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                error={!!passwordErrors.currentPassword}
                helperText={passwordErrors.currentPassword}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: 3 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                error={!!passwordErrors.newPassword}
                helperText={passwordErrors.newPassword}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: 3 }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                error={!!passwordErrors.confirmPassword}
                helperText={passwordErrors.confirmPassword}
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { borderRadius: 3 }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: 1 }}>
          <Button 
            onClick={() => setPasswordDialog(false)} 
            disabled={saving}
            fullWidth={isMobile}
            sx={{ borderRadius: 3, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={saving}
            fullWidth={isMobile}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            }}
          >
            {saving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
  </Box>
  );
};

export default ProfilePage;