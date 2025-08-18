import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  Collapse,
  IconButton,
  CircularProgress,
  Tooltip,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoFixHigh as AutoFixIcon,
  TrendingUp as TrendingUpIcon,
  Link as LinkIcon,
  Warning as WarningIcon,
  Lightbulb as LightbulbIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import automationService from '../../services/automationService';
import './ContentSuggestions.css';

const ContentSuggestions = ({ 
  documentId, 
  content, 
  workspaceId,
  onApplySuggestion,
  isVisible = true,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    quality: true,
    improvements: true,
    related: false,
    linking: false,
    outdated: false
  });

  useEffect(() => {
    if (isVisible && documentId && content) {
      analyzePage();
    }
  }, [documentId, isVisible]);

  useEffect(() => {
    if (content && content.length > 50) {
      // Debounced analysis for content changes
      automationService.analyzeContentDebounced(
        content,
        documentId || 'temp',
        handleAnalysisResult,
        3000 // 3 second delay
      );
    }
  }, [content, documentId]);

  const analyzePage = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await automationService.getContentSuggestions(documentId);
      setSuggestions(result.data.suggestions);
    } catch (err) {
      setError('Failed to get content suggestions');
      console.error('Error getting suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisResult = (result) => {
    if (result.suggestions) {
      setSuggestions(result.suggestions);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleApplyImprovement = (improvement) => {
    if (onApplySuggestion) {
      onApplySuggestion('improvement', improvement);
    }
  };

  const handleApplyLinking = (linkSuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion('linking', linkSuggestion);
    }
  };

  const getQualityScoreColor = (score) => {
    return automationService.getQualityScoreColor(score);
  };

  const getQualityScoreLabel = (score) => {
    return automationService.getQualityScoreLabel(score);
  };

  if (!isVisible) return null;

  return (
    <Paper 
      className="content-suggestions-panel"
      elevation={3}
      sx={{ 
        width: 350,
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixIcon color="primary" />
            Smart Suggestions
          </Typography>
          <Box>
            <IconButton size="small" onClick={analyzePage} disabled={loading}>
              <RefreshIcon />
            </IconButton>
            {onClose && (
              <IconButton size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Analyzing content...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {suggestions && (
        <Box>
          {/* Quality Score */}
          <Card sx={{ m: 2, mb: 1 }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Content Quality
                  </Typography>
                  <Typography variant="h4" sx={{ color: getQualityScoreColor(suggestions.qualityScore) }}>
                    {suggestions.qualityScore}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getQualityScoreLabel(suggestions.qualityScore)}
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative' }}>
                  <CircularProgress
                    variant="determinate"
                    value={suggestions.qualityScore}
                    size={60}
                    thickness={4}
                    sx={{ color: getQualityScoreColor(suggestions.qualityScore) }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUpIcon color="action" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Improvements Section */}
          {suggestions.improvements && suggestions.improvements.length > 0 && (
            <Box sx={{ mx: 2, mb: 1 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={expandedSections.improvements ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => toggleSection('improvements')}
                sx={{ justifyContent: 'flex-start', mb: 1 }}
              >
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle1">
                    Improvements ({suggestions.improvements.length})
                  </Typography>
                </Box>
              </Button>
              
              <Collapse in={expandedSections.improvements}>
                <List dense>
                  {suggestions.improvements.slice(0, 5).map((improvement, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        borderLeft: 4,
                        borderColor: automationService.getImprovementColor(improvement.severity),
                        mb: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 1
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <span style={{ fontSize: '16px' }}>
                          {automationService.getImprovementIcon(improvement.type)}
                        </span>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {improvement.message}
                            </Typography>
                            <Chip
                              label={improvement.severity}
                              size="small"
                              color={improvement.severity === 'high' ? 'error' : 
                                     improvement.severity === 'medium' ? 'warning' : 'info'}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {improvement.suggestion}
                            </Typography>
                            <Button
                              size="small"
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                              onClick={() => handleApplyImprovement(improvement)}
                            >
                              Apply Fix
                            </Button>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Related Documents */}
          {suggestions.relatedDocuments && suggestions.relatedDocuments.length > 0 && (
            <Box sx={{ mx: 2, mb: 1 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={expandedSections.related ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => toggleSection('related')}
                sx={{ justifyContent: 'flex-start', mb: 1 }}
              >
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle1">
                    Related Documents ({suggestions.relatedDocuments.length})
                  </Typography>
                </Box>
              </Button>
              
              <Collapse in={expandedSections.related}>
                <List dense>
                  {suggestions.relatedDocuments.slice(0, 3).map((doc, index) => (
                    <ListItem key={index} sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <ListItemIcon>
                        <LinkIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {doc.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {doc.preview}
                            </Typography>
                            <Chip
                              label={`${Math.round(doc.relevanceScore * 100)}% match`}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Missing Links */}
          {suggestions.missingLinks && suggestions.missingLinks.length > 0 && (
            <Box sx={{ mx: 2, mb: 1 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={expandedSections.linking ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => toggleSection('linking')}
                sx={{ justifyContent: 'flex-start', mb: 1 }}
              >
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle1">
                    Smart Linking ({suggestions.missingLinks.length})
                  </Typography>
                </Box>
              </Button>
              
              <Collapse in={expandedSections.linking}>
                <List dense>
                  {suggestions.missingLinks.slice(0, 3).map((link, index) => (
                    <ListItem key={index} sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <ListItemIcon>
                        <LinkIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            Link "{link.title}"
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {link.mentions} mention{link.mentions > 1 ? 's' : ''} found
                            </Typography>
                            <Button
                              size="small"
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                              onClick={() => handleApplyLinking(link)}
                            >
                              Add Links
                            </Button>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* Outdated Content */}
          {suggestions.outdatedContent && suggestions.outdatedContent.length > 0 && (
            <Box sx={{ mx: 2, mb: 2 }}>
              <Button
                fullWidth
                variant="text"
                startIcon={expandedSections.outdated ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => toggleSection('outdated')}
                sx={{ justifyContent: 'flex-start', mb: 1 }}
              >
                <Box sx={{ flex: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle1">
                    Outdated Content ({suggestions.outdatedContent.length})
                  </Typography>
                </Box>
              </Button>
              
              <Collapse in={expandedSections.outdated}>
                <List dense>
                  {suggestions.outdatedContent.slice(0, 3).map((item, index) => (
                    <ListItem key={index} sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <ListItemIcon>
                        <WarningIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            "{item.text}"
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {item.message}
                            </Typography>
                            <Chip
                              label={item.severity}
                              size="small"
                              color={item.severity === 'medium' ? 'warning' : 'info'}
                              variant="outlined"
                              sx={{ ml: 1, fontSize: '0.6rem', height: 16 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          )}

          {/* No Suggestions */}
          {suggestions.improvements.length === 0 && 
           suggestions.relatedDocuments.length === 0 && 
           suggestions.missingLinks.length === 0 && 
           suggestions.outdatedContent.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <LightbulbIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body1" color="success.main" fontWeight="medium">
                Great work!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No improvements needed right now.
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ContentSuggestions;