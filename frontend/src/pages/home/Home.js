import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
  Paper,
  TextField,
  InputAdornment,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
  Zoom,
  Slide,
} from '@mui/material';
import {
  Description as DocumentIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AIIcon,
  History as HistoryIcon,
  Folder as FolderIcon,
  TrendingUp as TrendingUpIcon,
  Lightbulb as LightbulbIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../services/AuthContext';
import { documentsAPI, usersAPI, searchAPI } from '../../services/api';
import Logo from '../../assets/images/logo.svg';

const Home = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularTerms, setPopularTerms] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    recentSearches: 0,
    totalWorkspaces: 0,
  });
  const [mounted, setMounted] = useState(false);
  const clearRecentSearches = async () => {
    try {
      await searchAPI.clearRecentSearches?.();
      setRecentSearches([]);
    } catch (e) {
      console.warn('Failed to clear recent searches', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadInitialData();
  }, []); // Adding loadInitialData to dependencies would cause infinite re-renders

  const loadInitialData = async () => {
    try {
      const [recentResponse, popularResponse, documentsResponse] = await Promise.allSettled([
        searchAPI.getRecentSearches(),
        searchAPI.getPopularTerms(),
        documentsAPI.getDocuments({ limit: 1 })
      ]);

      if (recentResponse.status === 'fulfilled') {
        setRecentSearches(recentResponse.value.data.slice(0, 5));
      }

      if (popularResponse.status === 'fulfilled') {
        setPopularTerms(popularResponse.value.data.slice(0, 6));
      }

      if (documentsResponse.status === 'fulfilled') {
        const docData = documentsResponse.value.data;
        const totalDocuments = docData?.pagination?.total ?? docData?.total ?? (docData?.documents?.length || 0);
        setStats(prev => ({
          ...prev,
          totalDocuments
        }));
      }

      // Load user stats if admin
      if (isAdmin()) {
        try {
          const userStats = await usersAPI.getUserStats();
          setStats(prev => ({
            ...prev,
            totalUsers: userStats.data.totalUsers || 0
          }));
        } catch (err) {
          console.warn('Could not load user stats:', err);
        }
      }
    } catch (err) {
      console.warn('Could not load initial data:', err);
    }
  };

  const handleSearch = (query = searchQuery) => {
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await searchAPI.getSuggestions(searchQuery);
          setSuggestions(response.data.slice(0, 4));
        } catch (err) {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const quickActions = [
    {
      title: 'Advanced Search',
      description: 'Find documents with filters',
      icon: <SearchIcon />,
      color: 'primary',
      action: () => navigate('/search'),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Browse Documents',
      description: 'View all available documents',
      icon: <DocumentIcon />,
      color: 'secondary',
      action: () => navigate('/documents'),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'My Workspaces',
      description: 'Manage collaborative spaces',
      icon: <FolderIcon />,
      color: 'info',
      action: () => navigate('/workspaces'),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    ...(isAdmin() ? [{
      title: 'Admin Panel',
      description: 'Manage users and system',
      icon: <PeopleIcon />,
      color: 'warning',
      action: () => navigate('/admin/users'),
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }] : []),
  ];

  const statsCards = [
    {
      title: 'Total Documents',
      value: stats.totalDocuments,
      icon: <DocumentIcon />,
      color: 'primary',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Recent Searches',
      value: recentSearches.length,
      icon: <SearchIcon />,
      color: 'secondary',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    ...(isAdmin() ? [{
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <PeopleIcon />,
      color: 'success',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }] : []),
    {
      title: 'Saved Searches',
      value: popularTerms.length,
      icon: <BookmarkIcon />,
      color: 'warning',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
  ];

  return (
  <Box sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Hero Section */}
      <Fade in={mounted} timeout={800}>
        <Box sx={{ 
          textAlign: 'center', 
          mb: { xs: 4, md: 6 },
          px: { xs: 1, sm: 2 }
        }}>
          {/* Logo and Brand */}
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Slide in={mounted} direction="down" timeout={1000}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, mb: 2 }}>
                <Box 
                  component="img" 
                  src={Logo} 
                  alt="Surge" 
                  sx={{ 
                    width: { xs: 48, sm: 64, md: 80 }, 
                    height: { xs: 48, sm: 64, md: 80 }, 
                    borderRadius: theme.shape.borderRadius,
                    boxShadow: theme.custom.shadows.primaryMd,
                    border: `3px solid ${theme.palette.common.white}E6`,
                  }} 
                />
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                    fontWeight: 800,
                    background: theme.custom?.gradients?.primary,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 0
                  }}
                >
                  Surge
                </Typography>
              </Box>
            </Slide>
            
            <Slide in={mounted} direction="up" timeout={1000} style={{ transitionDelay: '200ms' }}>
              <Typography
                variant={isMobile ? "h6" : "h5"}
                color="text.secondary"
                sx={{
                  fontWeight: 400,
                  maxWidth: { xs: 280, sm: 500, md: 600 },
                  mx: 'auto',
                  mb: { xs: 3, md: 4 },
                  px: { xs: 2, sm: 0 }
                }}
              >
                Your AI-powered IT documentation assistant
              </Typography>
            </Slide>
          </Box>

          {/* Main Search Box */}
          <Zoom in={mounted} timeout={1000} style={{ transitionDelay: '400ms' }}>
            <Paper
              component="form"
              onSubmit={handleSearchSubmit}
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                maxWidth: { xs: '100%', sm: 600, md: 700 },
                mx: 'auto',
                mb: { xs: 3, md: 4 },
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: theme.palette.primary.main + '55',
                }
              }}
            >
              <TextField
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you want to know?"
                variant="outlined"
                size={isMobile ? "medium" : "large"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AIIcon sx={{ 
                        color: 'primary.main', 
                        fontSize: { xs: 24, sm: 28 },
                        animation: searchQuery ? 'pulse 2s infinite' : 'none',
                      }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <Button
                        type="submit"
                        variant="contained"
                        size={isMobile ? "medium" : "large"}
                        disabled={!searchQuery.trim()}
                        sx={{
                          borderRadius: theme.shape.borderRadius,
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1, sm: 1.5 },
                          minWidth: { xs: 80, sm: 100 },
                          background: theme.custom?.gradients?.primary,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 8px 25px ${theme.palette.primary.main}66`,
                          }
                        }}
                      >
                        Search
                      </Button>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: 'none'
                    },
                    '& input': {
                      '&::placeholder': {
                        fontSize: { xs: '0.95rem', sm: '1.1rem' },
                        opacity: 0.7,
                      }
                    }
                  }
                }}
              />

              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    zIndex: 10,
                    maxHeight: 250,
                    overflow: 'auto',
                    borderRadius: theme.shape.borderRadius,
                    boxShadow: theme.custom.shadows.lg,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <List dense>
                    {suggestions.map((suggestion, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => {
                          setSearchQuery(suggestion);
                          handleSearch(suggestion);
                        }}
                        sx={{
                          py: { xs: 1, sm: 1.5 },
                          '&:hover': {
                            bgcolor: 'primary.50',
                          }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                            <SearchIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={suggestion}
                          primaryTypographyProps={{
                            fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Paper>
          </Zoom>
        </Box>
      </Fade>

      {/* Stats Cards */}
      <Fade in={mounted} timeout={1000} style={{ transitionDelay: '600ms' }}>
        <Box sx={{ mb: { xs: 4, md: 6 } }}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            {statsCards.map((stat, index) => (
              <Grid item xs={6} sm={6} md={3} key={index}>
                <Zoom 
                  in={mounted} 
                  timeout={800}
                  style={{ transitionDelay: `${800 + (index * 100)}ms` }}
                >
                  <Card 
                    sx={{ 
                      height: '100%',
                      background: stat.gradient,
                      color: 'white',
                      borderRadius: theme.shape.borderRadius,
                      border: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-8px) scale(1.02)',
                        boxShadow: theme.custom.shadows.xl,
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }
                    }}
                  >
                    <CardContent sx={{ 
                      p: { xs: 2, sm: 3 },
                      position: 'relative',
                      zIndex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box>
                          <Typography 
                            variant={isMobile ? "h4" : "h3"} 
                            sx={{ 
                              fontWeight: 800, 
                              mb: 0.5,
                              fontSize: { xs: '1.8rem', sm: '2.5rem' }
                            }}
                          >
                            {stat.value}
                          </Typography>
                          <Typography 
                            variant={isMobile ? "caption" : "subtitle1"} 
                            sx={{ 
                              fontWeight: 600, 
                              opacity: 0.9,
                              fontSize: { xs: '0.75rem', sm: '1rem' }
                            }}
                          >
                            {stat.title}
                          </Typography>
                        </Box>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            width: { xs: 40, sm: 60 }, 
                            height: { xs: 40, sm: 60 },
                            color: 'white',
                          }}
                        >
                          {stat.icon}
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Fade>

      {/* Content Sections */}
      <Grid container spacing={{ xs: 3, md: 4 }}>
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Grow in={mounted} timeout={1000} style={{ transitionDelay: '1000ms' }}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.custom.shadows.md,
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                        <HistoryIcon sx={{ fontSize: 20 }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Recent Searches
                      </Typography>
                    </Box>
                    {user && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={clearRecentSearches}
                        sx={{ textTransform: 'none' }}
                      >
                        Clear Recent Searches
                      </Button>
                    )}
                  </Box>
                  <List sx={{ p: 0 }}>
                    {recentSearches.map((search, index) => (
                      <ListItem
                        key={index}
                        button
                        onClick={() => handleSearch(search.query)}
                        sx={{
                          borderRadius: theme.shape.borderRadius,
                          mb: 1,
                          p: { xs: 1.5, sm: 2 },
                          '&:hover': { 
                            bgcolor: 'primary.50',
                            transform: 'translateX(8px)',
                          },
                          '&:last-child': { mb: 0 }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
                            <SearchIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={search.query}
                          secondary={new Date(search.timestamp).toLocaleDateString()}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            fontSize: { xs: '0.95rem', sm: '1rem' }
                          }}
                          secondaryTypographyProps={{
                            fontSize: { xs: '0.8rem', sm: '0.875rem' }
                          }}
                        />
                        <ArrowForwardIcon sx={{ color: 'text.secondary', ml: 1 }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        )}

        {/* Popular Terms */}
        {popularTerms.length > 0 && (
          <Grid item xs={12} lg={recentSearches.length > 0 ? 6 : 12}>
            <Grow in={mounted} timeout={1200} style={{ transitionDelay: '1200ms' }}>
              <Card 
                sx={{ 
                  height: '100%',
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: theme.custom.shadows.md,
                }}
              >
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                      <TrendingUpIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Popular Topics
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                    {popularTerms.map((term, index) => (
                      <Chip
                        key={index}
                        label={term.query || term}
                        onClick={() => handleSearch(term.query || term)}
                        sx={{
                          cursor: 'pointer',
                          mb: { xs: 1, sm: 1.5 },
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.5, sm: 1 },
                          fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          fontWeight: 600,
                          borderRadius: theme.shape.borderRadius,
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white',
                            transform: 'translateY(-2px)',
                            boxShadow: theme.custom.shadows.primaryMd,
                          }
                        }}
                        variant="outlined"
                        color="primary"
                        clickable
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        )}

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Grow in={mounted} timeout={1400} style={{ transitionDelay: '1400ms' }}>
            <Card 
              sx={{ 
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.custom.shadows.md,
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 3, sm: 4 } }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 36, height: 36 }}>
                    <LightbulbIcon sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Quick Actions
                  </Typography>
                </Box>
                
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  {quickActions.map((action, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Zoom 
                        in={mounted} 
                        timeout={600}
                        style={{ transitionDelay: `${1600 + (index * 100)}ms` }}
                      >
                        <Card
                          onClick={action.action}
                          sx={{
                            cursor: 'pointer',
                            height: '100%',
                            background: action.gradient,
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.shape.borderRadius,
                            position: 'relative',
                            overflow: 'hidden',
                            '&:hover': {
                              transform: 'translateY(-8px) scale(1.05)',
                              boxShadow: theme.custom.shadows.xl,
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(255, 255, 255, 0.1)',
                              backdropFilter: 'blur(10px)',
                            }
                          }}
                        >
                          <CardContent sx={{ 
                            p: { xs: 2, sm: 3 },
                            position: 'relative',
                            zIndex: 1,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                          }}>
                            <Avatar
                              sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                width: { xs: 48, sm: 56 },
                                height: { xs: 48, sm: 56 },
                                mx: 'auto',
                                mb: 2,
                              }}
                            >
                              {action.icon}
                            </Avatar>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 700, 
                                mb: 1,
                                fontSize: { xs: '1rem', sm: '1.25rem' }
                              }}
                            >
                              {action.title}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                opacity: 0.9,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' }
                              }}
                            >
                              {action.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Zoom>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>
  </Box>
  );
};

export default Home;