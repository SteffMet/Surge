import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Badge,
  Tooltip,
  Paper,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  WorkspacesOutlined as WorkspacesIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Notifications as NotificationsIcon,
  KeyboardArrowRight as ArrowRightIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

import { useAuth } from '../services/AuthContext';
import { useOffline } from '../hooks/useOffline';
import OfflineStorageManager from './offline/OfflineStorageManager';
import Logo from '../assets/images/logo.svg';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Updated to render passed children (for internal <Routes> pattern used in App.js)
// while preserving <Outlet /> fallback for conventional nested routing.
const Layout = ({ toggleMode, mode, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [storageManagerOpen, setStorageManagerOpen] = useState(false);

  // Offline hooks
  const { isOffline } = useOffline();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const menuItems = [
    {
      text: 'Home',
      icon: <DashboardIcon />,
      path: '/home',
      show: true,
      badge: null,
    },
    {
      text: 'AI Search',
      icon: <SearchIcon />,
      path: '/search',
      show: true,
      badge: null,
    },
    {
      text: 'Documents',
      icon: <FolderIcon />,
      path: '/documents',
      show: true,
      badge: null,
    },
    {
      text: 'Workspaces',
      icon: <WorkspacesIcon />,
      path: '/workspaces',
      show: true,
      badge: null,
    },
  ];

  const adminMenuItems = [
    {
      text: 'Users',
      icon: <PeopleIcon />,
      path: '/admin/users',
      show: isAdmin(),
      badge: null,
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      show: isAdmin(),
      badge: null,
    },
  ];

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
        return 'Admin';
      case 'basic-upload':
        return 'Upload';
      default:
        return 'Basic';
    }
  };

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.paper',
      borderRight: `1px solid ${theme.palette.divider}`,
    }}>
      {/* Logo/Brand */}
      <Box sx={{ 
        p: sidebarCollapsed ? 2 : 3, 
        display: 'flex', 
        alignItems: 'center', 
        gap: sidebarCollapsed ? 0 : 2, 
        cursor: 'pointer',
        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
        minHeight: 80,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} onClick={() => handleNavigation('/home')}>
        <Box 
          component="img" 
          src={Logo} 
          alt="Surge" 
          sx={{ 
            width: sidebarCollapsed ? 36 : 42, 
            height: sidebarCollapsed ? 36 : 42, 
            borderRadius: theme.shape.borderRadius,
                        boxShadow: theme.custom.shadows.primaryMd,
          }} 
        />
        {!sidebarCollapsed && (
          <Fade in={!sidebarCollapsed} timeout={200}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '-0.5px', 
                background: theme.custom.gradients.primary,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SURGE
            </Typography>
          </Fade>
        )}
      </Box>

      <Divider sx={{ mx: sidebarCollapsed ? 1 : 2 }} />

      {/* Main Navigation */}
      <List sx={{ px: sidebarCollapsed ? 1 : 2, py: 1, flex: 1 }}>
        {menuItems
          .filter(item => item.show)
          .map((item, index) => (
            <Slide 
              key={item.text} 
              direction="right" 
              in 
              timeout={300 + (index * 100)}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <ListItem disablePadding sx={{ mb: 1 }}>
                <Tooltip 
                  title={sidebarCollapsed ? item.text : ''} 
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      borderRadius: theme.shape.borderRadius,
                      minHeight: 48,
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                      px: sidebarCollapsed ? 1.5 : 2,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      // Remove default blue outline / focus ring while providing subtle accessible focus style
                      '&:focus-visible': {
                        outline: 'none',
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(37, 99, 235, 0.12)'
                          : 'rgba(37, 99, 235, 0.05)',
                      },
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        backgroundColor: 'primary.main',
                        transform: location.pathname === item.path ? 'scaleY(1)' : 'scaleY(0)',
                        transformOrigin: 'center',
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(37, 99, 235, 0.15)' 
                          : 'rgba(37, 99, 235, 0.08)',
                        color: 'primary.main',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(37, 99, 235, 0.25)' 
                            : 'rgba(37, 99, 235, 0.12)',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.main',
                        },
                        '& .MuiTypography-root': { 
                          color: 'primary.main',
                          fontWeight: 600,
                        }
                      },
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: sidebarCollapsed ? 0 : 40,
                      justifyContent: 'center',
                      color: location.pathname === item.path ? 'primary.main' : 'inherit',
                    }}>
                      {item.badge ? (
                        <Badge 
                          badgeContent={item.badge} 
                          color="error" 
                          variant={typeof item.badge === 'number' ? 'standard' : 'dot'}
                        >
                          {item.icon}
                        </Badge>
                      ) : (
                        item.icon
                      )}
                    </ListItemIcon>
                    {!sidebarCollapsed && (
                      <Fade in={!sidebarCollapsed} timeout={150}>
                        <ListItemText 
                          primary={item.text}
                          primaryTypographyProps={{ 
                            fontWeight: location.pathname === item.path ? 600 : 500,
                            fontSize: '0.875rem',
                          }}
                        />
                      </Fade>
                    )}
                    {!sidebarCollapsed && location.pathname === item.path && (
                      <ArrowRightIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            </Slide>
          ))}
      </List>

      {/* Admin Section */}
      {isAdmin() && (
        <>
          <Divider sx={{ mx: sidebarCollapsed ? 1 : 2, my: 1 }} />
          {!sidebarCollapsed && (
            <Typography
              variant="overline"
              sx={{ px: 3, py: 1, color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
            >
              Administration
            </Typography>
          )}
          <List sx={{ px: sidebarCollapsed ? 1 : 2 }}>
            {adminMenuItems
              .filter(item => item.show)
              .map((item, index) => (
                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                  <Tooltip 
                    title={sidebarCollapsed ? item.text : ''} 
                    placement="right"
                    arrow
                  >
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      selected={location.pathname === item.path}
                      sx={{
                        borderRadius: theme.shape.borderRadius,
                        minHeight: 48,
                        justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        px: sidebarCollapsed ? 1.5 : 2,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:focus-visible': {
                          outline: 'none',
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(37, 99, 235, 0.12)'
                            : 'rgba(37, 99, 235, 0.05)',
                        },
                        '&.Mui-selected': {
                          backgroundColor: theme.palette.mode === 'dark' 
                            ? 'rgba(37, 99, 235, 0.15)' 
                            : 'rgba(37, 99, 235, 0.08)',
                          color: 'primary.main',
                          '& .MuiListItemIcon-root': { color: 'primary.main' },
                          '& .MuiTypography-root': { color: 'primary.main', fontWeight: 600 }
                        },
                        '&:hover': { 
                          backgroundColor: 'action.hover',
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: sidebarCollapsed ? 0 : 40,
                        justifyContent: 'center',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      {!sidebarCollapsed && (
                        <Fade in={!sidebarCollapsed} timeout={150}>
                          <ListItemText 
                            primary={item.text}
                            primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                          />
                        </Fade>
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              ))}
          </List>
        </>
      )}

      {/* Coming Soon Section - Only show if not collapsed */}
      {!sidebarCollapsed && (
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: theme.shape.borderRadius,
                            bgcolor: theme.palette.mode === 'dark'
                              ? 'rgba(37, 99, 235, 0.08)'
                              : 'rgba(37, 99, 235, 0.04)',
                            border: `1px solid ${theme.palette.mode === 'dark'
                              ? 'rgba(37, 99, 235, 0.2)'
                              : 'rgba(37, 99, 235, 0.1)'}`,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
              Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
              • Office 365 Integration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              • SharePoint Integration
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { 
            md: `calc(100% - ${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px)` 
          },
          ml: { 
            md: `${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px` 
          },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar sx={{ minHeight: 80 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop sidebar toggle */}
          <IconButton
            color="inherit"
            onClick={handleSidebarToggle}
            sx={{ 
              mr: 2, 
              display: { xs: 'none', md: 'flex' },
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'scale(1.1)',
              }
            }}
          >
            <ChevronLeftIcon 
              sx={{ 
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} 
            />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          {/* Theme toggle */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton 
              onClick={toggleMode} 
              color="inherit" 
              sx={{ 
                mr: 1,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'rotate(180deg) scale(1.1)',
                }
              }}
            >
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Offline Storage Manager */}
          <Tooltip title="Offline Storage">
            <IconButton
              color="inherit"
              onClick={() => setStorageManagerOpen(true)}
              sx={{
                mr: 1,
                color: isOffline ? 'warning.main' : 'inherit'
              }}
            >
              <Badge
                badgeContent={isOffline ? '!' : null}
                color="warning"
                variant="dot"
              >
                <StorageIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationOpen}
              sx={{ mr: 1 }}
            >
              <Badge badgeContent={0} color="error" variant="dot">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={getRoleLabel(user?.role)}
              color={getRoleColor(user?.role)}
              size="small"
              variant="outlined"
              sx={{ 
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.05)',
                }
              }}
            />
            <Tooltip title="Account settings">
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="primary-search-account-menu"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
                sx={{
                  // Avoid hover scaling to keep the anchor stable and avoid visual jitter
                  transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&:active': {
                    transform: 'none',
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'primary.main',
                    border: `2px solid ${theme.palette.divider}`,
                    fontWeight: 600,
                    // Prevent the general Avatar hover scale override from affecting this specific avatar
                    '&:hover': {
                      transform: 'none',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2, // Use consistent borderRadius
            minWidth: 200,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.custom.shadows.md, // Reduced shadow
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {user?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
        
        <MenuItem 
          onClick={() => { handleNavigation('/profile'); handleProfileMenuClose(); }}
          sx={{ py: 1.5, borderRadius: 2, mx: 1, my: 0.5 }}
        >
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile Settings
        </MenuItem>
        
        <Divider sx={{ my: 1 }} />
        
        <MenuItem 
          onClick={handleLogout}
          sx={{ py: 1.5, borderRadius: 2, mx: 1, my: 0.5, color: 'error.main' }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Sign Out
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: theme.shape.borderRadius,
                        minWidth: 320,
                        maxWidth: 400,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.custom.shadows.lg,
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
        </Box>
        
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No new notifications
          </Typography>
        </Box>
      </Menu>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ 
          width: { md: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth }, 
          flexShrink: { md: 0 },
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Offline Storage Manager Dialog */}
      <OfflineStorageManager
        isOpen={storageManagerOpen}
        onClose={() => setStorageManagerOpen(false)}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: `calc(100% - ${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px)`
          },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar sx={{ minHeight: 80 }} />
        <Container
          maxWidth={false}
          sx={{
            py: 4,
            px: { xs: 2, sm: 3, md: 4 },
            minHeight: 'calc(100vh - 160px)', // Ensure content area has proper height
            width: '100%', // Ensure full width usage
          }}
        >
          {children || <Outlet />}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;