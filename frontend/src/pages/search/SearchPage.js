import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  IconButton,
  InputAdornment,
  Chip,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  useTheme,
  useMediaQuery,
  Fade,
  Zoom,
  Container,
  Stack,
  Tooltip,
  CircularProgress,
  Menu,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FolderOpen as FolderOpenIcon,
  Clear as ClearIcon,
  AutoAwesome as AIIcon,
  SearchRounded as SearchRoundedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { keyframes } from '@mui/system';

import { searchAPI, documentsAPI } from '../../services/api';
import { downloadFile } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import LoadingStates from '../../components/ui/LoadingStates';
import FeedbackSystem from '../../components/ui/FeedbackSystem';
import SearchFilters from '../../components/search/SearchFilters';
import SearchResults from '../../components/search/SearchResults';
import AIResponse from '../../components/search/AIResponse';
import SearchInitialState from '../../components/search/SearchInitialState';

const ReembedButton = () => {
  const { isAdmin, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [running, setRunning] = useState(false);
  if (!isAdmin()) return null;
  return (
    <Box sx={{ mt: 4, textAlign: 'center' }}>
      <Button
        variant="contained"
        color="secondary"
        disabled={running}
        onClick={async () => {
          const limitStr = prompt('Re-embed how many documents? (default 100)', '100');
          if (limitStr === null) return;
          const limit = parseInt(limitStr, 10) || 100;
          setRunning(true);
          try {
            const res = await documentsAPI.reembed(limit);
            enqueueSnackbar(`Re-embedded ${res.data.updated} documents`, { variant: 'success' });
          } catch (e) {
            enqueueSnackbar('Re-embedding failed', { variant: 'error' });
          } finally {
            setRunning(false);
          }
        }}
      >
        {running ? 'Re-embedding...' : 'Re-embed Documents'}
      </Button>
    </Box>
  );
};

const SearchPage = () => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  console.log('SearchPage: Component rendering, location:', location.pathname);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularTerms, setPopularTerms] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    dateRange: '',
    minScore: 0.5
  });
  const [feedbackDialog, setFeedbackDialog] = useState({ open: false, result: null });
  const [expandedResults, setExpandedResults] = useState(new Set());
  const [showDebugScores, setShowDebugScores] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [infinite, setInfinite] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Folder filtering and AI-only UX
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [folderMenuAnchor, setFolderMenuAnchor] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Search mode tracking for better UX
  const [searchMode, setSearchMode] = useState('documents'); // 'documents' or 'ai'
  const [lastSearchMode, setLastSearchMode] = useState('documents');

  // AI icon spin animation
  const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  `;

  // Pulse animation for AI thinking
  const pulse = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  `;

  // Get query from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlQuery = urlParams.get('q');
    const urlPage = parseInt(urlParams.get('page') || '1', 10);
    const urlMinScore = parseFloat(urlParams.get('minScore') || '');
    const urlPageSize = parseInt(urlParams.get('pageSize') || '20', 10);
    const urlFolder = urlParams.get('folder') || '';
    if (urlMinScore >= 0 && urlMinScore <= 1) {
      setFilters(f => ({ ...f, minScore: urlMinScore }));
    }
    if (urlPageSize) setPageSize(urlPageSize);
    if (urlFolder) setSelectedFolder(urlFolder);
    if (urlQuery) {
      setQuery(urlQuery);
      setPage(urlPage);
      handleSearch(urlQuery, urlPage, urlPageSize, urlMinScore, urlFolder || undefined);
    }
  }, [location.search]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [recentResponse, popularResponse, foldersResponse] = await Promise.allSettled([
        searchAPI.getRecentSearches(),
        searchAPI.getPopularTerms(),
        documentsAPI.getFolders()
      ]);

      if (recentResponse.status === 'fulfilled') {
        setRecentSearches(recentResponse.value.data.slice(0, 5));
      }

      if (popularResponse.status === 'fulfilled') {
        setPopularTerms(popularResponse.value.data.slice(0, 8));
      }

      if (foldersResponse.status === 'fulfilled') {
        setFolders(foldersResponse.value.data || []);
      }
    } catch (err) {
      console.warn('Could not load initial search data:', err);
    }
  };

  const handleClearRecent = async () => {
    try {
      await searchAPI.clearRecentSearches();
      setRecentSearches([]);
    } catch (e) {
      console.warn('Failed to clear recent searches', e);
    }
  };

  const handleSearch = async (searchQuery = query, newPage = page, newPageSize = pageSize, forcedMinScore, folderOverride, retryCount = 0) => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      console.warn('Empty search query attempted');
      return;
    }
    
    // Start performance timer
    const searchStartTime = performance.now();
    
    // Set search mode to documents
    setSearchMode('documents');
    setLastSearchMode('documents');
    
    const effMinScore = forcedMinScore !== undefined ? forcedMinScore : filters.minScore;
    if (newPage === 1) {
      setResults([]);
      setAiResponse(null);
    }
    const append = infinite && newPage > 1;
    setLoading(newPage === 1);
    setLoadingMore(newPage > 1);
    setError('');
    
    try {
      console.debug('Starting document search', {
        query: searchQuery.substring(0, 100),
        page: newPage,
        pageSize: newPageSize,
        filters: effMinScore,
        retryCount
      });

      // Perform search - get documents first, AI response will come async
      const response = await searchAPI.search(searchQuery, {
        ...filters,
        folder: (folderOverride !== undefined ? folderOverride : selectedFolder) || undefined,
        limit: newPageSize,
        page: newPage,
        minScore: effMinScore
      });
      
      const searchDuration = performance.now() - searchStartTime;
      const docs = response.data.documents || [];
      
      // Immediately show document results
      const mapped = docs.map(d => ({
        _id: d.id || d._id,
        id: d.id || d._id,
        title: d.originalName,
        originalName: d.originalName,
        type: (d.mimeType || '').split('/')[1] || d.mimeType || 'document',
        createdAt: d.createdAt,
        excerpt: d.extractedText,
        content: d.extractedText,
        score: (d.relevanceScore || 0),
        rawScore: d.relevanceScore || 0,
        baseScore: d.baseScore,
        llmScore: d.llmScore,
        semanticScore: d.semanticScore,
        tags: d.tags || [],
        documentId: d.id || d._id,
        uploadedBy: d.uploadedBy,
      }));
      
      // Update results immediately with document data
      setResults(prev => append ? [...prev, ...mapped] : mapped);
      setTotal(response.data.totalDocuments || docs.length);
      setPage(response.data.page || newPage);
      setPageSize(response.data.pageSize || newPageSize);
      setLoading(false);
      setLoadingMore(false);
      
      // Log successful search
      console.info('Document search completed', {
        resultsCount: docs.length,
        duration: searchDuration,
        page: newPage,
        query: searchQuery.substring(0, 100)
      });

      // Show AI response if it's available immediately, otherwise it will update async
      if (response.data.aiResponse) {
        setAiResponse(response.data.aiResponse);
      } else {
        // Indicate AI is still thinking if no response yet
        setAiThinking(true);
        // AI response will be handled by backend's async processing
      }
      
      if ((append ? [...results, ...mapped] : mapped).length === 0) {
        setError('No results found. Try different keywords or check your spelling.');
      }
      
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('q', searchQuery);
      newUrl.searchParams.set('page', String(response.data.page || newPage));
      newUrl.searchParams.set('pageSize', String(response.data.pageSize || newPageSize));
      newUrl.searchParams.set('minScore', String(effMinScore));
      const folderForUrl = folderOverride !== undefined ? folderOverride : selectedFolder;
      if (folderForUrl) { newUrl.searchParams.set('folder', folderForUrl); } else { newUrl.searchParams.delete('folder'); }
      navigate(newUrl.pathname + newUrl.search, { replace: true });
      loadInitialData();
    } catch (err) {
      const searchDuration = performance.now() - searchStartTime;
      console.error('Search error:', err);
      
      // Enhanced error classification for better user experience
      const isNetworkError = !err.response || err.code === 'NETWORK_ERROR';
      const isServerError = err.response?.status >= 500;
      const isTimeoutError = err.response?.status === 408 || err.code === 'TIMEOUT';
      const isRateLimitError = err.response?.status === 429;
      const isAuthError = err.response?.status === 401 || err.response?.status === 403;
      
      // Implement intelligent retry mechanism
      const maxRetries = 4; // Increased from 3
      const shouldRetry = retryCount < maxRetries && 
                         (isNetworkError || isServerError || isTimeoutError) &&
                         !isAuthError;
      
      if (shouldRetry) {
        // Exponential backoff with jitter to avoid thundering herd
        const baseDelay = 1000;
        const maxDelay = 8000;
        const jitter = Math.random() * 500; // Add randomness
        const retryDelay = Math.min(baseDelay * Math.pow(2, retryCount) + jitter, maxDelay);
        
        // Different retry messages based on error type
        let retryMessage;
        if (isNetworkError) {
          retryMessage = `Connection issue detected. Retrying in ${Math.ceil(retryDelay/1000)} seconds... (Attempt ${retryCount + 1}/${maxRetries + 1})`;
        } else if (isServerError) {
          retryMessage = `Server temporarily unavailable. Retrying in ${Math.ceil(retryDelay/1000)} seconds... (Attempt ${retryCount + 1}/${maxRetries + 1})`;
        } else if (isTimeoutError) {
          retryMessage = `Search timed out. Retrying with optimized query... (Attempt ${retryCount + 1}/${maxRetries + 1})`;
        } else {
          retryMessage = `Retrying search in ${Math.ceil(retryDelay/1000)} seconds... (Attempt ${retryCount + 1}/${maxRetries + 1})`;
        }
        
        setError(retryMessage);
        
        setTimeout(() => {
          // For timeout errors, try with a simpler query
          if (isTimeoutError && retryCount > 1) {
            const simplifiedQuery = searchQuery.split(' ').slice(0, 3).join(' ');
            handleSearch(simplifiedQuery, newPage, newPageSize, forcedMinScore, folderOverride, retryCount + 1);
          } else {
            handleSearch(searchQuery, newPage, newPageSize, forcedMinScore, folderOverride, retryCount + 1);
          }
        }, retryDelay);
        return;
      }
      
      // Generate user-friendly error messages with actionable advice
      let errorMessage;
      let actionAdvice = '';
      
      if (isRateLimitError) {
        errorMessage = 'Too many search requests. Please wait a moment before searching again.';
        actionAdvice = 'Try using more specific search terms to get better results faster.';
      } else if (isAuthError) {
        errorMessage = 'Authentication required. Please log in again.';
        actionAdvice = 'Your session may have expired. Please refresh the page and try again.';
      } else if (isServerError) {
        errorMessage = 'Search service is temporarily unavailable. Please try again in a few moments.';
        actionAdvice = 'If this persists, try browsing documents directly or contact support.';
      } else if (isTimeoutError) {
        errorMessage = 'Search timed out. Try using fewer or more specific search terms.';
        actionAdvice = 'Break complex queries into simpler terms for faster results.';
      } else if (isNetworkError) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
        actionAdvice = 'Ensure you have a stable internet connection and try again.';
      } else {
        errorMessage = 'Search failed unexpectedly. Please try again.';
        actionAdvice = 'If this continues, try refreshing the page or contact support.';
      }
      
      // Combine error message with advice
      const fullErrorMessage = actionAdvice ? `${errorMessage}\n\n💡 ${actionAdvice}` : errorMessage;
      setError(fullErrorMessage);
      
      // Offer manual retry for failed searches with enhanced feedback
      if (retryCount >= maxRetries) {
        enqueueSnackbar(
          `Search failed after ${maxRetries + 1} attempts. You can try again with the retry button.`,
          { 
            variant: 'error',
            autoHideDuration: 8000, // Longer duration for important errors
            action: (snackbarId) => (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  enqueueSnackbar.closeSnackbar(snackbarId);
                  // Reset retry count and try again
                  handleSearch(searchQuery, newPage, newPageSize, forcedMinScore, folderOverride, 0);
                }}
              >
                Retry Now
              </Button>
            )
          }
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSuggestionSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) return;

    try {
      const response = await searchAPI.getSuggestions(searchQuery);
      // Backend returns { suggestions: [] }
      const list = Array.isArray(response.data) ? response.data : response.data.suggestions;
      setSuggestions((list || []).slice(0, 5));
    } catch (err) {
      console.warn('Could not load suggestions:', err);
      setSuggestions([]);
    }
  }, []);

  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        handleSuggestionSearch(query);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSuggestionSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    handleSearch(query, 1, pageSize);
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setSuggestions([]);
    navigate('/search', { replace: true });
  };

  const handleDownload = async (result) => {
    try {
      const downloadResult = await downloadFile(result.documentId, result.title);
      if (downloadResult.success) {
        enqueueSnackbar('Download started', { variant: 'success' });
      } else {
        enqueueSnackbar(downloadResult.error, { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Download failed', { variant: 'error' });
    }
  };

  const handleFeedback = async (result, isPositive) => {
    try {
      await searchAPI.submitFeedback({
        query,
        helpful: isPositive,
        comment: `Feedback on document: ${result.title} (ID: ${result.documentId})`
      });
      enqueueSnackbar('Thank you for your feedback!', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Could not submit feedback', { variant: 'error' });
    }
  };

  const toggleResultExpansion = (resultId) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ 
          backgroundColor: theme.palette.primary.main + '20',
          padding: '0 4px',
          borderRadius: '4px',
          fontWeight: 600
        }}>
          {part}
        </mark>
      ) : part
    );
  };

  const formatScore = (score) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  // Show loading skeleton
  if (loading && !results.length && !query) {
    return <LoadingStates.SearchLoading />;
  }

  return (
  <Box
    sx={{
      py: 0,
      minHeight: 'calc(100vh - 160px)', // Ensure minimum height for content visibility
      width: '100%'
    }}
  >
      {/* Modern Search Header */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800, 
                mb: 2,
                background: theme.custom.gradients.primary,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI-Powered Search
            </Typography>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              sx={{ fontWeight: 400, maxWidth: 600, mx: 'auto' }}
            >
              Discover insights across your documentation with intelligent AI assistance
            </Typography>
          </Box>
        </Box>
      </Fade>

      {/* Enhanced Search Form */}
      <Zoom in timeout={800}>
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 4 }, 
            mb: 4, 
            borderRadius: theme.shape.borderRadius,
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 41, 59, 0.75)'
              : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(14px)',
            border: `1px solid ${theme.palette.divider}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ position: 'relative', mb: 3 }}>
              <TextField
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Ask me anything about your documentation..."
                variant="outlined"
                size="large"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon 
                        sx={{ 
                          color: searchFocused ? 'primary.main' : 'text.secondary',
                          transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontSize: 28
                        }} 
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Stack direction="row" spacing={1} alignItems="center">
                        {selectedFolder && (
                          <Chip
                            label={`📁 ${selectedFolder}`}
                            size="small"
                            onDelete={() => setSelectedFolder('')}
                            sx={{ 
                              bgcolor: theme.palette.primary.main + '20',
                              color: 'primary.main',
                              '& .MuiChip-deleteIcon': {
                                color: 'primary.main',
                                '&:hover': { color: 'primary.dark' }
                              }
                            }}
                          />
                        )}
                        
                        <Tooltip title="Browse folders">
                          <IconButton 
                            size="small" 
                            onClick={(e) => setFolderMenuAnchor(e.currentTarget)}
                            sx={{ 
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              '&:hover': { transform: 'scale(1.1)' }
                            }}
                          >
                            <FolderOpenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              AI-Powered Search
                            </Typography>
                            <Typography variant="body2">
                              Get intelligent answers and insights from your documents using AI.
                              {!query.trim() && <br />}
                              {!query.trim() && <em>Enter a question to activate AI search</em>}
                            </Typography>
                          </Box>
                        } placement="top">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!query.trim() || aiThinking}
                              onClick={async () => {
                                if (!query.trim()) return;
                                
                                // Set AI search mode
                                setSearchMode('ai');
                                setLastSearchMode('ai');
                                
                                setAiThinking(true);
                                setError('');
                                setResults([]);
                                setPage(1);
                                
                                // Visual feedback for AI search mode
                                enqueueSnackbar(
                                  '🤖 AI is analyzing your question and searching through documents...',
                                  { 
                                    variant: 'info',
                                    autoHideDuration: 3000
                                  }
                                );
                                
                                try {
                                  const response = await searchAPI.search(query, {
                                    ...filters,
                                    aiOnly: true,
                                    folder: selectedFolder || undefined,
                                    limit: pageSize,
                                    page: 1,
                                    minScore: filters.minScore
                                  });
                                  setAiResponse(response.data.aiResponse || null);
                                  setTotal(0);
                                  
                                  // Update URL to reflect AI search
                                  const newUrl = new URL(window.location);
                                  newUrl.searchParams.set('q', query);
                                  newUrl.searchParams.set('mode', 'ai');
                                  newUrl.searchParams.set('page', '1');
                                  newUrl.searchParams.set('pageSize', String(pageSize));
                                  newUrl.searchParams.set('minScore', String(filters.minScore));
                                  if (selectedFolder) { 
                                    newUrl.searchParams.set('folder', selectedFolder); 
                                  } else { 
                                    newUrl.searchParams.delete('folder'); 
                                  }
                                  navigate(newUrl.pathname + newUrl.search, { replace: true });
                                  
                                  // Success feedback
                                  if (response.data.aiResponse) {
                                    enqueueSnackbar(
                                      '✨ AI has analyzed your question and provided insights!',
                                      { variant: 'success', autoHideDuration: 2000 }
                                    );
                                  }
                                } catch (err) {
                                  console.error('AI-only search error:', err);
                                  const errorMsg = err.response?.status === 503 
                                    ? '🤖 AI service is temporarily unavailable. Try document search instead.'
                                    : '❌ AI search failed. Falling back to document search...';
                                  
                                  setError('AI search failed. Please try again or use regular document search.');
                                  enqueueSnackbar(errorMsg, { variant: 'warning' });
                                  
                                  // Auto-fallback to regular search after AI failure
                                  setTimeout(() => {
                                    handleSearch(query, 1, pageSize, filters.minScore, selectedFolder, 0);
                                  }, 1500);
                                } finally {
                                  setAiThinking(false);
                                }
                              }}
                              sx={{
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: aiThinking ? 
                                  'linear-gradient(45deg, #FFD700, #FFA500)' : 
                                  query.trim() ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'transparent',
                                '&:hover': { 
                                  transform: 'scale(1.1)',
                                  background: query.trim() ? 'linear-gradient(45deg, #764ba2, #667eea)' : 'rgba(0,0,0,0.04)'
                                },
                                '&:disabled': { 
                                  opacity: 0.3,
                                  background: 'transparent'
                                },
                                borderRadius: '50%',
                                width: 32,
                                height: 32
                              }}
                            >
                              <AIIcon
                                sx={{
                                  color: aiThinking ? '#fff' : query.trim() ? '#fff' : 'text.secondary',
                                  fontSize: 20,
                                  ...(aiThinking ? { 
                                    animation: `${pulse} 2s ease-in-out infinite`,
                                    filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))'
                                  } : {})
                                }}
                              />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        {query && (
                          <Tooltip title="Clear search">
                            <IconButton 
                              onClick={handleClearSearch} 
                              size="small"
                              sx={{ 
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': { transform: 'scale(1.1)' }
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={loading || !query.trim()}
                          startIcon={loading ? <LoadingStates.InlineLoading size={18} /> : <AIIcon />}
                          sx={{ 
                            ml: 1,
                            px: 3,
                            borderRadius: theme.shape.borderRadius,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        background: theme.custom.gradients.primary,
                                                        '&:hover': {
                                                          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
                                                          transform: 'translateY(-1px)',
                                                          boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
                                                        }
                          }}
                        >
                          {loading ? 'Searching...' : 'Search'}
                        </Button>
                      </Stack>
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: '1.1rem',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderWidth: '2px',
                      borderColor: 'divider',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.300',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                      borderWidth: '2px',
                    },
                    '& .MuiInputBase-input': {
                      py: 2,
                    }
                  }
                }}
              />

              {/* Search Suggestions Dropdown */}
              {suggestions.length > 0 && searchFocused && (
                <Fade in timeout={200}>
                  <Paper
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      mt: 1,
                      zIndex: 10,
                      borderRadius: theme.shape.borderRadius,
                                            border: `1px solid ${theme.palette.divider}`,
                                            boxShadow: theme.custom.shadows.lg,
                      overflow: 'hidden',
                    }}
                  >
                    <List dense sx={{ py: 0 }}>
                      {suggestions.map((suggestion, index) => (
                        <ListItem
                          key={index}
                          button
                          onClick={() => {
                            setQuery(suggestion);
                            handleSearch(suggestion);
                            setSearchFocused(false);
                          }}
                          sx={{
                            py: 1.5,
                            px: 3,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              bgcolor: theme.palette.primary.main + '08',
                              transform: 'translateX(4px)',
                            }
                          }}
                        >
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2">{suggestion}</Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Fade>
              )}
            </Box>

            <SearchFilters showFilters={showFilters} filters={filters} setFilters={setFilters} />
          </Box>

          {/* Folder Menu */}
          <Menu
            anchorEl={folderMenuAnchor}
            open={Boolean(folderMenuAnchor)}
            onClose={() => setFolderMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.custom.shadows.lg,
                minWidth: 200,
              },
            }}
          >
            <MenuItem onClick={() => { setSelectedFolder(''); setFolderMenuAnchor(null); }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpenIcon fontSize="small" />
                All folders
              </Box>
            </MenuItem>
            {folders.map((f, idx) => (
              <MenuItem key={idx} onClick={() => { setSelectedFolder(f); setFolderMenuAnchor(null); }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderOpenIcon fontSize="small" />
                  {f || '/'}
                </Box>
              </MenuItem>
            ))}
          </Menu>
        </Paper>
      </Zoom>

      {/* Search Mode Indicator */}
      {(searchMode === 'ai' || (results.length > 0 && lastSearchMode === 'ai')) && (
        <Fade in timeout={400}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Chip
              icon={<AIIcon sx={{ fontSize: 16 }} />}
              label={searchMode === 'ai' && aiThinking ? 'AI is thinking...' : 'AI-Powered Results'}
              variant="outlined"
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                backgroundColor: theme.palette.primary.main + '08',
                '& .MuiChip-icon': {
                  color: 'primary.main'
                },
                ...(aiThinking && {
                  animation: `${pulse} 2s ease-in-out infinite`,
                })
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Regular Search Mode Indicator */}
      {results.length > 0 && lastSearchMode === 'documents' && (
        <Fade in timeout={400}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Chip
              icon={<SearchIcon sx={{ fontSize: 16 }} />}
              label={`Found ${total} document${total !== 1 ? 's' : ''}`}
              variant="outlined"
              sx={{
                borderColor: 'text.secondary',
                color: 'text.secondary',
                backgroundColor: theme.palette.grey[50],
              }}
            />
          </Box>
        </Fade>
      )}

      {/* Error Display with Retry */}
      {error && (
        <Fade in>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: theme.shape.borderRadius,
              border: `1px solid ${theme.palette.error.light}`,
            }}
            action={
              error.includes('retry') || error.includes('failed') ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setError('');
                    handleSearch(query, 1, pageSize);
                  }}
                  startIcon={<RefreshIcon />}
                >
                  Retry
                </Button>
              ) : null
            }
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* AI Response Panel */}
      <AIResponse aiResponse={aiResponse} />

      {/* Results */}
      {results.length > 0 && (
        <SearchResults
          results={results}
          total={total}
          page={page}
          pageSize={pageSize}
          loading={loading}
          query={query}
          expandedResults={expandedResults}
          toggleResultExpansion={toggleResultExpansion}
          handleFeedback={handleFeedback}
          handleDownload={handleDownload}
          highlightText={highlightText}
          formatScore={formatScore}
          getScoreColor={getScoreColor}
          showDebugScores={showDebugScores}
          handleSearch={handleSearch}
        />
      )}

      {/* Admin Tools */}
      <ReembedButton />

      {/* No Results State */}
      {!loading && !error && results.length === 0 && query && (
        <Fade in>
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: theme.shape.borderRadius }}>
            <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              No results found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              We couldn't find any documents matching your search. Try different keywords or check your spelling.
            </Typography>
            <Button
              variant="contained"
              onClick={handleClearSearch}
              sx={{ borderRadius: 3, px: 4 }}
            >
              Clear Search
            </Button>
          </Paper>
        </Fade>
      )}

      {/* Initial State - Recent Searches and Popular Terms */}
      {!query && !loading && (
        <SearchInitialState
          recentSearches={recentSearches}
          popularTerms={popularTerms}
          handleSearch={handleSearch}
          setQuery={setQuery}
          onClearRecent={user ? handleClearRecent : undefined}
        />
      )}
  </Box>
  );
};

export default SearchPage;