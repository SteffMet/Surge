import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Stack,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Lightbulb as LightbulbIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import ErrorBoundary from '../../components/common/ErrorBoundary';
import LoadingStates from '../../components/ui/LoadingStates';
import FeedbackSystem from '../../components/ui/FeedbackSystem';

import WordLikeEditor from '../../components/editor/WordLikeEditor';
import VersionHistoryDialog from '../../components/version/VersionHistoryDialog';
import ContentSuggestions from '../../components/automation/ContentSuggestions';
import { documentsAPI } from '../../services/api';
import versionService from '../../services/versionService';

const DocumentEditor = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Check if this is a new document from template
  const isNewFromTemplate = location.state?.fromTemplate || 
                            new URLSearchParams(location.search).get('fromTemplate') === 'true';
  const templateData = location.state?.templateData;

  useEffect(() => {
    const initializeDocument = async () => {
      try {
        if (documentId && documentId !== 'new') {
          await loadDocument();
        } else if (isNewFromTemplate) {
          // Multiple fallback mechanisms for template data
          let finalTemplateData = templateData;
          
          // Fallback 1: Check URL parameters
          if (!finalTemplateData) {
            const urlParams = new URLSearchParams(location.search);
            const templateId = urlParams.get('template');
            const templateTitle = urlParams.get('title');
            
            if (templateId) {
              // Try to reconstruct template data from URL
              finalTemplateData = {
                id: templateId,
                title: decodeURIComponent(templateTitle || 'Untitled Document'),
                content: '',
                tags: ['template'],
                fromTemplate: true
              };
            }
          }
          
          // Fallback 2: Check sessionStorage
          if (!finalTemplateData) {
            try {
              const storedData = sessionStorage.getItem('pendingTemplateData');
              const creationTime = sessionStorage.getItem('templateCreationTime');
              
              if (storedData && creationTime) {
                const timeDiff = Date.now() - parseInt(creationTime);
                // Only use stored data if it's less than 5 minutes old
                if (timeDiff < 5 * 60 * 1000) {
                  finalTemplateData = JSON.parse(storedData);
                  console.log('Recovered template data from sessionStorage');
                }
              }
            } catch (storageError) {
              console.warn('Failed to recover template data from sessionStorage:', storageError);
            }
          }
          
          // Initialize with template data
          if (finalTemplateData) {
            setTitle(finalTemplateData.title || 'Untitled Document');
            setContent(finalTemplateData.content || '');
            setTags(finalTemplateData.tags || []);
            
            // Clean up sessionStorage after successful initialization
            try {
              sessionStorage.removeItem('pendingTemplateData');
              sessionStorage.removeItem('templateCreationTime');
            } catch (cleanupError) {
              console.warn('Failed to cleanup sessionStorage:', cleanupError);
            }
            
            console.log('Successfully initialized document from template:', finalTemplateData.title);
          } else {
            console.warn('No template data available, initializing blank document');
            setTitle('Untitled Document');
            setContent('');
            setTags([]);
          }
        } else {
          // New blank document
          setTitle('Untitled Document');
          setContent('');
          setTags([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Document initialization error:', error);
        setError('Failed to initialize document. Please try again.');
        setLoading(false);
      }
    };

    initializeDocument();
  }, [documentId, isNewFromTemplate, templateData, location.search]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getDocument(documentId);
      const doc = response.data;
      
      setDocument(doc);
      setTitle(doc.title || doc.originalName || 'Untitled Document');
      setContent(doc.content || '');
      setTags(doc.tags || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load document:', err);
      setError('Failed to load document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async (saveAsVersion = false) => {
    try {
      setSaving(true);
      
      const documentData = {
        title,
        content,
        tags
      };

      let response;
      if (documentId && documentId !== 'new') {
        // Update existing document
        response = await documentsAPI.updateDocument(documentId, documentData);
        
        // Create version if requested or significant changes
        if (saveAsVersion || unsavedChanges) {
          try {
            const version = await versionService.saveAsVersion(
              documentId,
              title,
              content,
              tags,
              !saveAsVersion // isAutoSave if not explicitly saving as version
            );
            setCurrentVersion(version);
          } catch (versionError) {
            console.warn('Failed to create version:', versionError);
            // Don't fail the save if versioning fails
          }
        }
      } else {
        // Create new document
        // Create a blob and file for upload
        const blob = new Blob([content], { type: 'text/html' });
        const fileName = `${title.replace(/[^a-zA-Z0-9\s\-_]/g, '_')}.html`;
        const file = new File([blob], fileName, { type: 'text/html' });
        
        const formData = new FormData();
        formData.append('document', file);
        formData.append('metadata', JSON.stringify({
          title,
          tags,
          ...(isNewFromTemplate && { fromTemplate: true })
        }));
        
        response = await documentsAPI.uploadDocument(formData);
        
        // Update URL to the new document ID
        const newDocId = response.data.document?._id || response.data._id;
        if (newDocId) {
          window.history.replaceState(null, '', `/documents/edit/${newDocId}`);
          setDocument(response.data.document || response.data);
          
          // Create initial version
          try {
            const version = await versionService.saveAsVersion(
              newDocId,
              title,
              content,
              tags,
              false
            );
            setCurrentVersion(version);
          } catch (versionError) {
            console.warn('Failed to create initial version:', versionError);
          }
        }
      }

      setUnsavedChanges(false);
      setLastSaved(new Date());
      enqueueSnackbar(
        saveAsVersion 
          ? 'Document saved as new version' 
          : 'Document saved successfully', 
        { variant: 'success' }
      );
      
    } catch (err) {
      console.error('Failed to save document:', err);
      enqueueSnackbar('Failed to save document. Please try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }, [documentId, title, content, tags, isNewFromTemplate, unsavedChanges, enqueueSnackbar]);

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setUnsavedChanges(true);
  }, []);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setUnsavedChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    setUnsavedChanges(true);
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    setUnsavedChanges(true);
  };

  const handleBack = () => {
    if (unsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/documents');
      }
    } else {
      navigate('/documents');
    }
  };

  const handleRestoreVersion = async (version) => {
    try {
      setTitle(version.title);
      setContent(version.content);
      setTags(version.tags || []);
      setUnsavedChanges(true);
      setCurrentVersion(version);
      enqueueSnackbar(`Restored to version ${version.version}`, { variant: 'success' });
    } catch (error) {
      console.error('Failed to restore version:', error);
      enqueueSnackbar('Failed to restore version', { variant: 'error' });
    }
  };

  const handleSaveAsVersion = () => {
    handleSave(true);
  };
  // Auto-save functionality
  useEffect(() => {
    if (unsavedChanges && title && content) {
      const autoSaveTimer = setTimeout(() => {
        handleSave();
      }, 30000); // Auto-save after 30 seconds of inactivity

      return () => clearTimeout(autoSaveTimer);
    }
  }, [unsavedChanges, title, content, handleSave]);

  if (loading) {
    return <LoadingStates.DocumentSkeleton />;
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Tooltip title="Back to Documents">
              <IconButton onClick={handleBack}>
                <BackIcon />
              </IconButton>
            </Tooltip>
            
            <Breadcrumbs>
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleBack();
                }}
              >
                Documents
              </Link>
              <Typography color="text.primary">
                {isNewFromTemplate ? 'New from Template' : 'Edit Document'}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            {lastSaved && (
              <Typography variant="caption" color="text.secondary">
                Last saved: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
            
            {unsavedChanges && (
              <Chip
                label="Unsaved changes"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={() => handleSave()}
              disabled={saving || (!title.trim() || !content.trim())}
              size="small"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>

            <Button
              variant="outlined"
              onClick={handleSaveAsVersion}
              disabled={saving || (!title.trim() || !content.trim())}
              size="small"
            >
              Save as Version
            </Button>

            <Tooltip title="Document History">
              <IconButton 
                size="small"
                onClick={() => setVersionHistoryOpen(true)}
                disabled={!documentId || documentId === 'new'}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="AI Content Suggestions">
              <IconButton 
                size="small"
                onClick={() => setSuggestionsOpen(true)}
                disabled={!documentId || documentId === 'new'}
              >
                <LightbulbIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Share Document">
              <IconButton size="small">
                <ShareIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Download">
              <IconButton size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Document Title and Tags */}
      <Paper elevation={0} sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
        <TextField
          fullWidth
          variant="outlined"
          value={title}
          onChange={handleTitleChange}
          placeholder="Document Title"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              fontSize: '1.5rem',
              fontWeight: 600,
            }
          }}
        />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
            <TextField
              size="small"
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              sx={{ minWidth: 100 }}
            />
          </Stack>
        </Box>
      </Paper>

      {/* Editor */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <WordLikeEditor
          initialValue={content}
          onEditorChange={handleContentChange}
        />
      </Box>

      {/* Version History Dialog */}
      <VersionHistoryDialog
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        documentId={documentId}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* Content Suggestions Dialog */}
      {suggestionsOpen && (
        <ContentSuggestions
          documentId={documentId}
          content={content}
          onApplySuggestion={(suggestion) => {
            setContent(prev => prev + '\n\n' + suggestion);
            setUnsavedChanges(true);
          }}
          onClose={() => setSuggestionsOpen(false)}
        />
      )}
    </Box>
  );
};

const DocumentEditorWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Document Editor Error"
      message="There was a problem loading the document editor. This might be due to corrupted template data or a browser issue."
    >
      <DocumentEditor />
    </ErrorBoundary>
  );
};

export default DocumentEditorWithErrorBoundary;
