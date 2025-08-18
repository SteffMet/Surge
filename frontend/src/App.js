import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';

import designSystem from './theme/designSystem';
import { AuthProvider } from './services/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AuthLayout from './components/AuthLayout';

// PWA and Offline components
import pwaService from './services/pwaService';
import OfflineStatus from './components/offline/OfflineStatus';
import PWAInstallPrompt from './components/offline/PWAInstallPrompt';

// Pages
import LoginPage from './pages/auth/LoginPage';
import Home from './pages/home/Home';
import SearchPage from './pages/search/SearchPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import WorkspacesPage from './pages/workspaces/WorkspacesPage';
import WorkspaceDashboard from './pages/workspaces/WorkspaceDashboard';
import DocumentEditor from './pages/documents/DocumentEditor';
import ProfilePage from './pages/user/ProfilePage';
import UsersPage from './pages/admin/UsersPage';
import SettingsPage from './pages/admin/SettingsPage';
// import ForcePasswordChange from './pages/auth/ForcePasswordChange';

// Accessibility utilities
import {
  SkipNavigation,
  LiveRegion,
  addFocusVisible,
  prefersReducedMotion
} from './utils/accessibility';

const PasswordChangeCheck = ({ children }) => {
  // const { user } = useAuth();
  // const location = useLocation();

  // if (user && user.passwordChangeRequired && location.pathname !== '/force-change-password') {
  //   return <Navigate to="/force-change-password" replace />;
  // }

  return children;
};

function App() {
  const [mode, setMode] = React.useState('light');

  const theme = React.useMemo(() => designSystem(mode), [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    // Initialize focus-visible behavior
    addFocusVisible();

    // Handle reduced motion preference
    if (prefersReducedMotion()) {
      document.documentElement.style.setProperty('--animation-duration', '0ms');
      document.documentElement.style.setProperty('--transition-duration', '0ms');
    }

    // Set app metadata for accessibility
    document.title = 'Surge - AI-Powered IT Documentation Platform';
    document.documentElement.lang = 'en';
    
    // Add viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
      document.head.appendChild(viewport);
    }

    // Add color-scheme meta tag for better dark mode support
    const colorScheme = document.createElement('meta');
    colorScheme.name = 'color-scheme';
    colorScheme.content = 'light dark';
    document.head.appendChild(colorScheme);

    // Initialize PWA service
    const initializePWA = async () => {
      try {
        await pwaService.init();
        console.log('PWA service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize PWA service:', error);
      }
    };

    initializePWA();

  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        dense
        preventDuplicate
        autoHideDuration={6000}
        sx={{
          '& .MuiSnackbarContent-root': {
            borderRadius: 3,
            fontWeight: 600,
          }
        }}
      >
        <AuthProvider>
          <Router>
            <SkipNavigation />
            <LiveRegion />
            <OfflineStatus />
            <PWAInstallPrompt />
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />

                            {/* Protected Routes */}
                            <Route element={<ProtectedRoute />}>
                                {/* Commented out for now
                                <Route
                                    path="/force-change-password"
                                    element={<AuthLayout><ForcePasswordChange /></AuthLayout>}
                                />
                                */}
                                <Route
                                    path="/*"
                                    element={
                                        <PasswordChangeCheck>
                                            <Layout mode={mode} toggleMode={toggleMode}>
                                                <Routes>
                                                    {/* Main Application Routes */}
                                                    <Route index element={<Navigate to="/home" replace />} />
                                                    <Route path="home" element={<main id="main-content" role="main" tabIndex="-1"><Home /></main>} />
                                                    <Route path="search" element={<main id="main-content" role="main" tabIndex="-1"><SearchPage /></main>} />
                                                    <Route path="documents" element={<main id="main-content" role="main" tabIndex="-1"><DocumentsPage /></main>} />
                                                    <Route path="documents/edit/:documentId" element={<main id="main-content" role="main" tabIndex="-1"><DocumentEditor /></main>} />
                                                    <Route path="documents/new" element={<main id="main-content" role="main" tabIndex="-1"><DocumentEditor /></main>} />
                                                    <Route path="workspaces" element={<main id="main-content" role="main" tabIndex="-1"><WorkspacesPage /></main>} />
                                                    <Route path="workspaces/:workspaceId" element={<main id="main-content" role="main" tabIndex="-1"><WorkspaceDashboard /></main>} />
                                                    <Route path="profile" element={<main id="main-content" role="main" tabIndex="-1"><ProfilePage /></main>} />

                                                    {/* Admin Routes */}
                                                    <Route path="admin/*" element={
                                                        <main id="main-content" role="main" tabIndex="-1">
                                                            <Routes>
                                                                <Route index element={<Navigate to="users" replace />} />
                                                                <Route path="users" element={<UsersPage />} />
                                                                <Route path="settings" element={<SettingsPage />} />
                                                            </Routes>
                                                        </main>
                                                    } />
                                                     <Route path="*" element={<Navigate to="/home" replace />} />
                                                </Routes>
                                            </Layout>
                                        </PasswordChangeCheck>
                                    }
                                />
                            </Route>

                            {/* Fallback Route */}
                            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;