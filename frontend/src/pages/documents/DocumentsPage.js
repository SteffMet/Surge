import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Breadcrumbs,
  Link,
  Stack,
  InputAdornment,
  useTheme,
  Fade,
  Zoom,
  CardActionArea,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as DocumentIcon,
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ViewList as ListViewIcon,
  NavigateNext as NavigateNextIcon,
  Visibility as PreviewIcon,
  CreateNewFolder as CreateFolderIcon,
  FileDownload as FileDownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  Sort as SortIcon,
  Description as DescriptionIcon,
  ViewModule as ViewModuleIcon,
  ViewComfy as ViewComfyIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import moment from 'moment';
import { Drawer, Tabs, Tab } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useAuth } from '../../services/AuthContext';
import { documentsAPI, downloadFile } from '../../services/api';
import { DocumentsPageSkeleton } from '../../components/common/SkeletonLoaders';
import ExportDialog from '../../components/export/ExportDialog';
import WordLikeEditor from '../../components/editor/WordLikeEditor';

// Document templates organized by category
const documentTemplates = [
  // Business Templates
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for capturing meeting discussions',
    category: 'Business',
    icon: '📝',
    content: '# Meeting Notes\n\n**Date:** \n**Attendees:** \n**Location:** \n\n## Agenda\n\n1. \n2. \n3. \n\n## Discussion Points\n\n### Topic 1\n\n### Topic 2\n\n## Decisions Made\n\n- \n- \n\n## Action Items\n\n- [ ] Task 1 - Assigned to: \n- [ ] Task 2 - Assigned to: \n\n## Next Meeting\n\n**Date:** \n**Time:** \n**Location:** \n'
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Comprehensive project planning document',
    category: 'Business',
    icon: '📊',
    content: '# Project Plan\n\n## Project Overview\n\n**Project Name:** \n**Start Date:** \n**End Date:** \n**Project Manager:** \n\n## Objectives\n\n- \n- \n\n## Scope\n\n### In Scope\n\n- \n\n### Out of Scope\n\n- \n\n## Timeline\n\n| Phase | Start Date | End Date | Deliverables |\n|-------|------------|----------|-------------|\n|       |            |          |             |\n|       |            |          |             |\n\n## Resources\n\n### Team Members\n\n- \n\n### Budget\n\n- \n\n## Milestones\n\n- [ ] Milestone 1 - Due: \n- [ ] Milestone 2 - Due: \n\n## Risks and Mitigation\n\n| Risk | Impact | Probability | Mitigation Strategy |\n|------|--------|------------|---------------------|\n|      |        |            |                     |\n'
  },
  {
    id: 'business-proposal',
    name: 'Business Proposal',
    description: 'Template for business proposals and pitches',
    category: 'Business',
    icon: '💼',
    content: '# Business Proposal\n\n## Executive Summary\n\n## Company/Team Overview\n\n## Market Analysis\n\n## Product/Service Description\n\n## Marketing Strategy\n\n## Financial Projections\n\n## Funding Requirements\n\n## Implementation Timeline\n\n## Conclusion\n'
  },
  
  // Technical Templates
  {
    id: 'technical-doc',
    name: 'Technical Documentation',
    description: 'Detailed technical documentation template',
    category: 'Technical',
    icon: '⚙️',
    content: '# Technical Documentation\n\n## Overview\n\n## System Architecture\n\n## Requirements\n\n### Functional Requirements\n\n- \n\n### Non-Functional Requirements\n\n- \n\n## Implementation Details\n\n### Technologies Used\n\n- \n\n### Key Components\n\n- \n\n## API Documentation\n\n### Endpoints\n\n| Endpoint | Method | Description | Parameters |\n|----------|--------|-------------|------------|\n|          |        |             |            |\n\n## Testing\n\n### Test Cases\n\n- \n\n## Deployment\n\n## Maintenance\n'
  },
  {
    id: 'api-spec',
    name: 'API Specification',
    description: 'Template for API documentation',
    category: 'Technical',
    icon: '🔌',
    content: '# API Specification\n\n## Overview\n\n## Base URL\n\n## Authentication\n\n## Endpoints\n\n### Endpoint 1\n\n**URL:** \n**Method:** \n**Description:** \n\n#### Request Parameters\n\n| Parameter | Type | Required | Description |\n|-----------|------|----------|-------------|\n|           |      |          |             |\n\n#### Response\n\n```json\n{\n  "status": "success",\n  "data": {}\n}\n```\n\n#### Error Codes\n\n| Code | Description |\n|------|-------------|\n|      |             |\n\n## Rate Limiting\n\n## Versioning\n'
  },
  {
    id: 'code-review',
    name: 'Code Review Template',
    description: 'Structured template for code reviews',
    category: 'Technical',
    icon: '🔍',
    content: '# Code Review\n\n## Pull Request Information\n\n**PR Number:** \n**Author:** \n**Reviewer:** \n**Date:** \n\n## Overview\n\n## Changes Review\n\n### Architecture/Design\n\n- [ ] The code follows the agreed architecture\n- [ ] The design is appropriate for the requirements\n\n### Code Quality\n\n- [ ] Code follows project style guidelines\n- [ ] Code is well-structured and readable\n- [ ] No unnecessary complexity\n\n### Functionality\n\n- [ ] Code implements the requirements correctly\n- [ ] Edge cases are handled\n\n### Testing\n\n- [ ] Tests are comprehensive\n- [ ] Tests pass\n\n### Security\n\n- [ ] No security vulnerabilities introduced\n\n## Comments\n\n## Recommendations\n'
  },
  
  // Research Templates
  {
    id: 'research-paper',
    name: 'Research Paper',
    description: 'Academic research paper template',
    category: 'Research',
    icon: '🔬',
    content: '# Research Paper\n\n## Abstract\n\n## Introduction\n\n## Literature Review\n\n## Methodology\n\n## Results\n\n## Discussion\n\n## Conclusion\n\n## References\n'
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Template for detailed case studies',
    category: 'Research',
    icon: '📋',
    content: '# Case Study\n\n## Executive Summary\n\n## Background\n\n## Challenge/Problem\n\n## Solution\n\n## Implementation\n\n## Results\n\n## Lessons Learned\n'
  },
  
  // Personal Templates
  {
    id: 'weekly-planner',
    name: 'Weekly Planner',
    description: 'Template for weekly planning and organization',
    category: 'Personal',
    icon: '📅',
    content: '# Weekly Planner\n\n**Week of:** \n\n## Goals for the Week\n\n- [ ] \n- [ ] \n- [ ] \n\n## Monday\n\n- [ ] \n\n## Tuesday\n\n- [ ] \n\n## Wednesday\n\n- [ ] \n\n## Thursday\n\n- [ ] \n\n## Friday\n\n- [ ] \n\n## Weekend\n\n- [ ] \n\n## Notes\n\n## Review\n\n**Achievements:** \n\n**Challenges:** \n\n**Next Week Focus:** \n'
  },
  {
    id: 'decision-matrix',
    name: 'Decision Matrix',
    description: 'Template for evaluating options and making decisions',
    category: 'Personal',
    icon: '⚖️',
    content: '# Decision Matrix\n\n## Decision to Make\n\n## Options\n\n## Criteria\n\n| Criteria | Weight | Option 1 | Option 2 | Option 3 |\n|----------|--------|----------|----------|----------|\n|          |        |          |          |          |\n|          |        |          |          |          |\n|          |        |          |          |          |\n| **Total** |        |          |          |          |\n\n## Analysis\n\n## Decision\n\n## Implementation Plan\n'
  }
];

const DocumentsPage = () => {
  const theme = useTheme();
  const { canUpload } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'compact'
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('');
  const [templateContent, setTemplateContent] = useState('');

  // Dialog states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, document: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, document: null });
  const [exportDialog, setExportDialog] = useState({ open: false, mode: 'single', documentId: null, documentIds: [] });
  const [templateDialog, setTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [templateName, setTemplateName] = useState('');
  
  const [editorDialog, setEditorDialog] = useState({ open: false, document: null });
  const [editorContent, setEditorContent] = useState('');
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

  // Pagination
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewTab, setPreviewTab] = useState(0);
  const [recentTemplateDocuments, setRecentTemplateDocuments] = useState([]);
  
  // Folder management
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [draggedDocument, setDraggedDocument] = useState(null);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    loadDocuments();
    loadFolders();
  }, [sortBy, sortOrder, selectedFolder, filterType, searchQuery]); // Removed page dependency

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        limit: 20,
        sort: sortBy,
        order: sortOrder,
        search: searchQuery,
        folder: selectedFolder,
        type: filterType,
      };

      const response = await documentsAPI.getDocuments(params);
      const data = response.data;

      const docs = data.documents || [];
      const mapped = docs.map(d => ({
        ...d,
        title: d.originalName || d.title,
        type: (d.mimeType || '').split('/')[1] || d.type,
        description: d.description || d.metadata?.description || '',
        isFavorite: favorites.has(d._id),
        isFromTemplate: d.metadata?.templateId ? true : false,
        templateCategory: d.metadata?.templateId ?
          documentTemplates.find(t => t.id === d.metadata.templateId)?.category || 'Unknown' : null
      }));
      
      setDocuments(mapped);
      setTotalDocuments(data.pagination?.total || data.total || mapped.length);
      
      // Filter out recent documents created from templates (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentFromTemplates = mapped
        .filter(doc =>
          doc.isFromTemplate &&
          new Date(doc.createdAt) > oneWeekAgo
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5); // Limit to 5 most recent
      
      setRecentTemplateDocuments(recentFromTemplates);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, searchQuery, selectedFolder, filterType, favorites]);

  const loadFolders = async () => {
    try {
      const response = await documentsAPI.getFolders();
      setFolders(response.data || []);
    } catch (err) {
      console.warn('Could not load folders:', err);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!canUpload()) {
      enqueueSnackbar('You do not have permission to upload files', { variant: 'error' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('document', file);
        if (selectedFolder) {
          formData.append('folder', selectedFolder);
        }

        await documentsAPI.uploadDocument(formData, (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        });
      }

      enqueueSnackbar(`Successfully uploaded ${acceptedFiles.length} file(s)`, { variant: 'success' });
      loadDocuments();
      setUploadDialog(false);
    } catch (err) {
      console.error('Upload error:', err);
      enqueueSnackbar('Upload failed. Please try again.', { variant: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [canUpload, selectedFolder, enqueueSnackbar, loadDocuments]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  });

  const handleMenuOpen = (event, document) => {
    event.stopPropagation(); // Prevent event propagation
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDownload = async (document) => {
    try {
      const result = await downloadFile(document._id, document.originalName || document.title);
      if (result.success) {
        enqueueSnackbar('Download started', { variant: 'success' });
      } else {
        enqueueSnackbar(result.error, { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar('Download failed', { variant: 'error' });
    }
    handleMenuClose();
  };

  const handleEdit = (document) => {
    setEditDialog({ open: true, document });
    handleMenuClose();
  };

  const handleEditDocument = (document) => {
    setEditorContent(document.content || '');
    setEditorDialog({ open: true, document });
    handleMenuClose();
  };

  const handleDelete = (document) => {
    setDeleteDialog({ open: true, document });
    handleMenuClose();
  };

  const handleShare = (document) => {
    // TODO: Implement sharing functionality
    enqueueSnackbar('Sharing feature coming soon!', { variant: 'info' });
    handleMenuClose();
  };

  const handleExport = (document) => {
    setExportDialog({
      open: true,
      mode: 'single',
      documentId: document._id,
      documentIds: []
    });
    handleMenuClose();
  };

  const toggleFavorite = (document) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(document._id)) {
      newFavorites.delete(document._id);
    } else {
      newFavorites.add(document._id);
    }
    setFavorites(newFavorites);
    enqueueSnackbar(
      newFavorites.has(document._id) ? 'Added to favorites' : 'Removed from favorites',
      { variant: 'success' }
    );
  };

  const confirmDelete = async () => {
    try {
      await documentsAPI.deleteDocument(deleteDialog.document._id);
      enqueueSnackbar('Document deleted successfully', { variant: 'success' });
      loadDocuments();
      setDeleteDialog({ open: false, document: null });
    } catch (err) {
      enqueueSnackbar('Failed to delete document', { variant: 'error' });
    }
  };

  const handleEditSave = async (updatedData) => {
    try {
      await documentsAPI.updateDocument(editDialog.document._id, updatedData);
      enqueueSnackbar('Document updated successfully', { variant: 'success' });
      loadDocuments();
      setEditDialog({ open: false, document: null });
    } catch (err) {
      enqueueSnackbar('Failed to update document', { variant: 'error' });
    }
  };

  const handleCreateFolder = async (folderName) => {
    if (!folderName || !folderName.trim()) {
      enqueueSnackbar('Folder name is required', { variant: 'error' });
      return;
    }
    
    try {
      // Check if folder already exists
      if (folders.includes(folderName.trim())) {
        enqueueSnackbar('Folder already exists', { variant: 'warning' });
        return;
      }
      
      // Create a temporary document in the folder to ensure it exists
      // This is a workaround since the backend doesn't have a dedicated folder creation API
      const tempContent = `# Folder: ${folderName}\n\nThis is a temporary file to create the folder structure. You can delete this file once you've added other documents to this folder.`;
      const blob = new Blob([tempContent], { type: 'text/markdown' });
      const tempFile = new File([blob], `.folder_${folderName.replace(/[^a-zA-Z0-9]/g, '_')}.md`, { type: 'text/markdown' });
      
      const formData = new FormData();
      formData.append('document', tempFile);
      formData.append('folder', folderName.trim());
      
      const metadata = {
        title: `Folder: ${folderName}`,
        description: `Temporary file to create folder structure for ${folderName}`,
        tags: ['folder-marker', 'system'],
        isHidden: true
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      await documentsAPI.uploadDocument(formData);
      
      enqueueSnackbar(`Folder "${folderName}" created successfully`, { variant: 'success' });
      
      // Refresh folders and documents
      await loadFolders();
      await loadDocuments();
      
      setCreateFolderDialog(false);
    } catch (err) {
      console.error('Folder creation error:', err);
      enqueueSnackbar('Failed to create folder', { variant: 'error' });
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const tpl = documentTemplates.find(t => t.id === selectedTemplate);
      if (!tpl) {
        enqueueSnackbar('Template not found', { variant: 'error' });
        return;
      }
      
      // Use custom name if provided, otherwise use template name
      const documentName = templateName.trim()
        ? templateName.trim()
        : `${tpl.name} - ${new Date().toLocaleDateString()}`;
      
      // Create enhanced template data with fallback storage
      const templateData = {
        id: tpl.id,
        name: tpl.name,
        title: documentName,
        content: templateContent || tpl.content,
        category: tpl.category,
        tags: ['template', tpl.category.toLowerCase()],
        templateId: tpl.id,
        description: tpl.description,
        fromTemplate: true,
        createdAt: new Date().toISOString()
      };
      
      // Store in sessionStorage as fallback for page refresh
      try {
        sessionStorage.setItem('pendingTemplateData', JSON.stringify(templateData));
        sessionStorage.setItem('templateCreationTime', Date.now().toString());
      } catch (storageError) {
        console.warn('Failed to store template data in sessionStorage:', storageError);
      }
      
      // Reset dialog state
      setTemplateDialog(false);
      setSelectedTemplate(null);
      setTemplateName('');
      setTemplateContent('');
      setSelectedCategory('All');
      
      // Navigate with multiple fallback mechanisms
      const searchParams = new URLSearchParams({
        template: tpl.id,
        title: encodeURIComponent(documentName),
        fromTemplate: 'true'
      });
      
      // Navigate to editor with comprehensive state management
      navigate(`/documents/new?${searchParams.toString()}`, {
        state: {
          fromTemplate: true,
          templateData: templateData,
          // Add timestamp for validation
          navigationTime: Date.now()
        }
      });
      
    } catch (err) {
      console.error('Template creation failed:', err);
      enqueueSnackbar('Failed to open template', { variant: 'error' });
    }
  };

  const handleMoveToFolder = async (document, targetFolder) => {
    try {
      await documentsAPI.updateDocument(document._id, { folder: targetFolder });
      enqueueSnackbar(`Moved "${document.title}" to "${targetFolder || 'Root'}"`, { variant: 'success' });
      loadDocuments();
    } catch (err) {
      enqueueSnackbar('Failed to move document', { variant: 'error' });
    }
  };

  const getFileIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📃';
      case 'md':
        return '📋';
      case 'zip':
        return '🗜️';
      default:
        return '📄';
    }
  };

  const getFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    // Search filter
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (doc.title && doc.title.toLowerCase().includes(q)) ||
      (doc.originalName && doc.originalName.toLowerCase().includes(q)) ||
      (doc.description && doc.description.toLowerCase().includes(q)) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(q)));
    
    // Template filter
    const matchesTemplateFilter = filterType !== 'template' || doc.isFromTemplate === true;
    
    return matchesSearch && matchesTemplateFilter;
  });

  const openPreview = (doc) => setPreviewDoc(doc);
  const closePreview = () => { setPreviewDoc(null); setPreviewTab(0); };

  const DocumentCard = ({ document, index }) => (
    <Zoom in timeout={400 + (index * 50)}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
            borderColor: 'primary.main',
            '& .document-actions': {
              opacity: 1,
              transform: 'translateY(0)',
            }
          }
        }}
        draggable
        onDragStart={(e) => {
          setDraggedDocument(document);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDraggedDocument(null)}
      >
        <CardActionArea onClick={() => openPreview(document)} sx={{ flexGrow: 1 }}>
          <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with icon and title */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: theme.palette.mode === 'dark' ? 'primary.900' : 'primary.50',
                    color: 'primary.main',
                    border: `2px solid ${theme.palette.primary.main}20`,
                    fontSize: '1.5rem',
                  }}
                >
                  {getFileIcon(document.type)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {document.title}
                    </Typography>
                    {document.isFromTemplate && (
                      <Tooltip title={`Created from ${document.templateCategory} template`}>
                        <Chip
                          label="Template"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            '& .MuiChip-label': { px: 0.8 }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip
                      label={document.type?.toUpperCase()}
                      size="small"
                      sx={{ 
                        fontSize: '0.7rem',
                        height: 20,
                        bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {getFileSize(document.size)}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
              
              {/* Action buttons */}
              <Box 
                className="document-actions"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  opacity: 0,
                  transform: 'translateY(-8px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Tooltip title={document.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(document);
                    }}
                    sx={{ 
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { bgcolor: 'warning.50', color: 'warning.main' }
                    }}
                  >
                    {document.isFavorite ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="More actions">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, document);
                    }}
                    sx={{ 
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Description */}
            {document.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 2, 
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {document.description}
              </Typography>
            )}

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
                {document.tags.slice(0, 3).map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.65rem', 
                      height: 18,
                      borderRadius: 2,
                    }}
                  />
                ))}
                {document.tags.length > 3 && (
                  <Chip
                    label={`+${document.tags.length - 3}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 18 }}
                  />
                )}
              </Box>
            )}

            {/* Footer */}
            <Box sx={{ mt: 'auto', pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                    {document.uploadedBy?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {document.uploadedBy?.username || 'Unknown'}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {moment(document.createdAt).fromNow()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Zoom>
  );

  const DocumentListItem = ({ document }) => (
    <ListItem 
      sx={{ 
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        mb: 1,
        bgcolor: 'background.paper',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateX(4px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'primary.light' }}>
          <DocumentIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {document.title || document.originalName}
            </Typography>
            {document.isFavorite && <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
          </Box>
        }
        secondary={
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {document.type?.toUpperCase()} • {getFileSize(document.size)} • 
              Uploaded {moment(document.createdAt).fromNow()}
            </Typography>
            {document.description && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {document.description.length > 150 
                  ? `${document.description.substring(0, 150)}...` 
                  : document.description}
              </Typography>
            )}
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Preview">
            <IconButton 
              onClick={() => openPreview(document)}
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              <PreviewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download">
            <IconButton 
              onClick={() => handleDownload(document)}
              sx={{ '&:hover': { color: 'success.main' } }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => handleMenuOpen(e, document)}>
            <MoreVertIcon />
          </IconButton>
        </Stack>
      </ListItemSecondaryAction>
    </ListItem>
  );

  // Show loading skeleton
  if (loading && !documents.length) {
    return <DocumentsPageSkeleton />;
  }

  return (
  <Box sx={{ py: 0 }}>
      {/* Enhanced Header */}
      <Fade in timeout={600}>
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  mb: 1,
                  background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Document Management
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                Upload, organize, and manage your documentation files with ease
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<CreateFolderIcon />}
                onClick={() => setCreateFolderDialog(true)}
                size="large"
                sx={{ 
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                New Folder
              </Button>
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
                onClick={() => setTemplateDialog(true)}
                size="large"
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 14px 0 rgba(124, 58, 237, 0.39)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Create from Template
              </Button>
              {canUpload() && (
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialog(true)}
                  size="large"
                  sx={{ 
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  }}
                >
                  Upload Documents
                </Button>
              )}
            </Stack>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                title: 'Total Documents', 
                value: totalDocuments, 
                icon: <StorageIcon />, 
                color: 'primary',
                trend: '+12%'
              },
              { 
                title: 'Folders', 
                value: folders.length, 
                icon: <FolderIcon />, 
                color: 'secondary',
                trend: '+3'
              },
              { 
                title: 'Favorites', 
                value: favorites.size, 
                icon: <StarIcon />, 
                color: 'warning',
                trend: '+5'
              },
              { 
                title: 'This Month', 
                value: documents.filter(d => moment(d.createdAt).isAfter(moment().startOf('month'))).length, 
                icon: <TrendingUpIcon />, 
                color: 'success',
                trend: '+8'
              },
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Zoom in timeout={600 + (index * 100)}>
                  <Card 
                    sx={{ 
                      p: 3, 
                      borderRadius: 4,
                      background: theme.palette.mode === 'dark' 
                        ? `linear-gradient(135deg, ${theme.palette[stat.color].dark}15 0%, ${theme.palette[stat.color].main}08 100%)`
                        : `linear-gradient(135deg, ${theme.palette[stat.color].main}08 0%, ${theme.palette[stat.color].light}15 100%)`,
                      border: `1px solid ${theme.palette[stat.color].main}20`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: `${stat.color}.main` }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {stat.title}
                        </Typography>
                      </Box>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${stat.color}.main`, 
                          width: 56, 
                          height: 56,
                          boxShadow: `0 8px 32px ${theme.palette[stat.color].main}30`,
                        }}
                      >
                        {stat.icon}
                      </Avatar>
                    </Box>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
          
          {/* Recent Template Documents Section */}
          {recentTemplateDocuments.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Recently Created from Templates
              </Typography>
              
              <Grid container spacing={3}>
                {recentTemplateDocuments.map((doc, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={doc._id}>
                    <Zoom in timeout={400 + (index * 50)}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 3,
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
                            borderColor: 'primary.main',
                          }
                        }}
                        onClick={() => openPreview(doc)}
                      >
                        <Box sx={{
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          background: `linear-gradient(135deg, ${theme.palette.primary.light}15 0%, ${theme.palette.primary.main}05 100%)`,
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: 'primary.main',
                                color: 'white',
                                fontSize: '1.2rem',
                                mr: 1.5
                              }}
                            >
                              {doc.templateCategory ? documentTemplates.find(t => t.category === doc.templateCategory)?.icon || '📄' : '📄'}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}>
                                {doc.title.length > 20 ? `${doc.title.substring(0, 20)}...` : doc.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Created {moment(doc.createdAt).fromNow()}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {doc.templateCategory && (
                            <Chip
                              label={doc.templateCategory}
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                mt: 'auto',
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                      </Card>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </Fade>

      {/* Breadcrumbs */}
      {selectedFolder && (
        <Fade in>
          <Box sx={{ mb: 3 }}>
            <Breadcrumbs 
              separator={<NavigateNextIcon fontSize="small" />} 
              sx={{ 
                p: 2,
                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Link
                component="button"
                variant="body1"
                onClick={() => setSelectedFolder('')}
                sx={{ 
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': { color: 'primary.main' }
                }}
              >
                📁 All Documents
              </Link>
              <Typography color="text.primary" sx={{ fontWeight: 600 }}>
                📁 {selectedFolder}
              </Typography>
            </Breadcrumbs>
          </Box>
        </Fade>
      )}

      {/* Enhanced Filters and Search */}
      <Zoom in timeout={800}>
        <Paper 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 4,
            border: `1px solid ${theme.palette.divider}`,
            background: theme.palette.mode === 'dark' 
              ? 'rgba(30, 41, 59, 0.7)' 
              : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search documents, descriptions, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                  }
                }}
              />
            </Grid>
            
            {/* Filters Row */}
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="medium">
                <InputLabel>Folder</InputLabel>
                <Select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  label="Folder"
                  sx={{ 
                    borderRadius: 3,
                    '& .MuiMenuItem-root': {
                      '&:hover': {
                        backgroundColor: 'primary.50'
                      }
                    }
                  }}
                >
                  <MenuItem value="">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                      <Typography color="text.secondary">All Folders</Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  {folders.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No folders available
                      </Typography>
                    </MenuItem>
                  ) : (
                    folders.map((folder) => (
                      <MenuItem
                        key={folder}
                        value={folder}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (draggedDocument) {
                            handleMoveToFolder(draggedDocument, folder);
                            setDraggedDocument(null);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.backgroundColor = theme.palette.primary.light;
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.style.backgroundColor = '';
                        }}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          },
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <FolderIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                          <Typography>{folder || 'Root'}</Typography>
                          {draggedDocument && (
                            <Chip 
                              size="small" 
                              label="Drop here" 
                              sx={{ 
                                ml: 'auto', 
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                                fontSize: '0.7rem'
                              }} 
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="medium">
                <InputLabel>File Type</InputLabel>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="File Type"
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="docx">Word</MenuItem>
                  <MenuItem value="txt">Text</MenuItem>
                  <MenuItem value="md">Markdown</MenuItem>
                  <MenuItem value="zip">Archive</MenuItem>
                  <Divider />
                  <MenuItem value="template">Template Documents</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort and View Controls */}
            <Grid item xs={12} md={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Sort options">
                  <IconButton
                    onClick={(e) => setSortMenuAnchor(e.currentTarget)}
                    sx={{ 
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                    }}
                  >
                    <SortIcon />
                  </IconButton>
                </Tooltip>
                
                <Box sx={{ display: 'flex', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  {[
                    { mode: 'grid', icon: <ViewModuleIcon />, tooltip: 'Grid View' },
                    { mode: 'list', icon: <ListViewIcon />, tooltip: 'List View' },
                    { mode: 'compact', icon: <ViewComfyIcon />, tooltip: 'Compact View' }
                  ].map(({ mode, icon, tooltip }) => (
                    <Tooltip key={mode} title={tooltip}>
                      <IconButton
                        onClick={() => setViewMode(mode)}
                        sx={{
                          bgcolor: viewMode === mode ? 'primary.main' : 'transparent',
                          color: viewMode === mode ? 'white' : 'text.primary',
                          borderRadius: 1.5,
                          '&:hover': {
                            bgcolor: viewMode === mode ? 'primary.dark' : 'action.hover',
                          }
                        }}
                      >
                        {icon}
                      </IconButton>
                    </Tooltip>
                  ))}
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Zoom>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
          }
        }}
      >
        {[
          { value: 'createdAt', label: '📅 Date Created' },
          { value: 'title', label: '📝 Name' },
          { value: 'size', label: '📊 File Size' },
          { value: 'type', label: '🏷️ File Type' },
        ].map((option) => (
          <MenuItem 
            key={option.value}
            onClick={() => {
              setSortBy(option.value);
              setSortMenuAnchor(null);
            }}
            selected={sortBy === option.value}
          >
            {option.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? '⬆️ Ascending' : '⬇️ Descending'}
        </MenuItem>
      </Menu>

      {/* Error */}
      {error && (
        <Fade in>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Documents Count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          {loading ? 'Loading...' : `${filteredDocuments.length} document(s) ${searchQuery ? `found for "${searchQuery}"` : 'available'}`}
        </Typography>
      </Box>

      {/* Documents Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : filteredDocuments.length > 0 ? (
        <>
          {viewMode === 'grid' && (
            <Grid container spacing={3}>
              {filteredDocuments.map((document, index) => (
                <Grid item xs={12} sm={6} md={4} xl={3} key={document._id}>
                  <DocumentCard document={document} index={index} />
                </Grid>
              ))}
            </Grid>
          )}
          
          {viewMode === 'list' && (
            <Paper sx={{ borderRadius: 4 }}>
              <List sx={{ p: 2 }}>
                {filteredDocuments.map((document, index) => (
                  <React.Fragment key={document._id}>
                    <DocumentListItem document={document} />
                    {index < filteredDocuments.length - 1 && <Divider sx={{ my: 1 }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {viewMode === 'compact' && (
            <Paper sx={{ p: 2, borderRadius: 4 }}>
              <Grid container spacing={1}>
                {filteredDocuments.map((document) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={document._id}>
                    <Box
                      sx={{
                        p: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'primary.50',
                        }
                      }}
                      onClick={() => openPreview(document)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '1.2rem' }}>
                          {getFileIcon(document.type)}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {document.title}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </>
      ) : (
        <Fade in>
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 4 }}>
            <DocumentIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
              {searchQuery ? 'No matching documents' : 'No documents yet'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              {searchQuery 
                ? 'Try different search terms or adjust your filters to find what you\'re looking for.'
                : 'Upload your first document to get started with organizing your documentation.'}
            </Typography>
            {canUpload() && (
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setUploadDialog(true)}
                size="large"
                sx={{ 
                  borderRadius: 3,
                  px: 4,
                  background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                }}
              >
                Upload Your First Document
              </Button>
            )}
          </Paper>
        </Fade>
      )}

      {/* Enhanced Upload Dialog */}
      <Dialog 
        open={uploadDialog} 
        onClose={() => setUploadDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UploadIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Upload Documents
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box
            {...getRootProps()}
            sx={{
              border: '3px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 4,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'primary.50' : 'grey.50',
              mb: 3,
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                borderColor: 'primary.light',
                bgcolor: 'primary.25',
              }
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
              {isDragActive ? 'Drop files here!' : 'Drag & drop your files'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              or click to browse and select files
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              {['PDF', 'DOC', 'DOCX', 'TXT', 'MD', 'ZIP'].map((format) => (
                <Chip 
                  key={format} 
                  label={format} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Box>

          {uploading && (
            <Fade in>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Uploading files...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {uploadProgress}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress}
                  sx={{ 
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                    }
                  }}
                />
              </Box>
            </Fade>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
          }
        }}
      >
        <MenuItem onClick={() => handleDownload(selectedDocument)}>
          <DownloadIcon sx={{ mr: 2 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => handleShare(selectedDocument)}>
          <ShareIcon sx={{ mr: 2 }} />
          Share
        </MenuItem>
        <MenuItem onClick={() => handleExport(selectedDocument)}>
          <FileDownloadIcon sx={{ mr: 2 }} />
          Export
        </MenuItem>
        <MenuItem onClick={() => handleEdit(selectedDocument)}>
          <EditIcon sx={{ mr: 2 }} />
          Edit Details
        </MenuItem>
        <MenuItem onClick={() => handleEditDocument(selectedDocument)}>
          <EditNoteIcon sx={{ mr: 2 }} />
          Edit Content
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDelete(selectedDocument)} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, document: null })}
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deleteDialog.document?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, document: null })}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, document: null })} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle>Edit Document Details</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            defaultValue={editDialog.document?.title}
            sx={{ mb: 3, mt: 1 }}
            id="edit-title"
          />
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            defaultValue={editDialog.document?.description}
            id="edit-description"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, document: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const title = document.getElementById('edit-title').value;
              const description = document.getElementById('edit-description').value;
              handleEditSave({ title, description });
            }}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog
        open={editorDialog.open}
        onClose={() => setEditorDialog({ open: false, document: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditNoteIcon color="primary" />
            Edit Document
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <WordLikeEditor
            initialValue={editorDialog.document?.content || ''}
            onEditorChange={(content) => {
              setEditorContent(content);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorDialog({ open: false, document: null })}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await documentsAPI.updateDocument(editorDialog.document._id, {
                content: editorContent,
              });
              setEditorDialog({ open: false, document: null });
              loadDocuments();
            }}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Drawer */}
      <Drawer 
        anchor="right" 
        open={Boolean(previewDoc)} 
        onClose={closePreview} 
        PaperProps={{ 
          sx: { 
            width: { xs: '100%', sm: 500, lg: 600 }, 
            p: 3,
            borderRadius: '20px 0 0 20px',
          } 
        }}
      >
        {previewDoc && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {previewDoc.title || previewDoc.originalName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Chip
                  label={previewDoc.type?.toUpperCase()}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {getFileSize(previewDoc.size)}
                </Typography>
              </Box>
            </Box>
            
            <Tabs 
              value={previewTab} 
              onChange={(_, v) => setPreviewTab(v)} 
              sx={{ mb: 3 }}
              variant="fullWidth"
            >
              <Tab label="Overview" />
              <Tab label="Content" />
              <Tab label="Metadata" />
            </Tabs>
            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {previewTab === 0 && (
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Description
                    </Typography>
                    <Typography variant="body2">
                      {previewDoc.description || 'No description provided'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Tags
                    </Typography>
                    {previewDoc.tags?.length ? (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {previewDoc.tags.map((tag, i) => (
                          <Chip key={i} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No tags assigned
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Upload Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Uploaded {moment(previewDoc.createdAt).format('LLL')} by {previewDoc.uploadedBy?.username || 'Unknown'}
                    </Typography>
                  </Box>
                </Stack>
              )}
              
              {previewTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Extracted Content
                  </Typography>
                  {previewDoc.extractedText ? (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2,
                        maxHeight: 400,
                        overflow: 'auto',
                      }}
                    >
                      {previewDoc.extractedText.substring(0, 10000)}
                      {previewDoc.extractedText.length > 10000 && '\n\n... (truncated)'}
                    </Typography>
                  ) : (
                    <Alert severity="info">
                      No extracted text available yet. This might take a moment to process.
                    </Alert>
                  )}
                </Box>
              )}
              
              {previewTab === 2 && (
                <Box>
                  <Typography variant="subtitle6" sx={{ fontWeight: 600, mb: 2 }}>
                    Technical Metadata
                  </Typography>
                  <SyntaxHighlighter 
                    language="json" 
                    style={tomorrow} 
                    customStyle={{ 
                      fontSize: '0.8rem', 
                      borderRadius: 12,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {JSON.stringify(previewDoc.metadata || {}, null, 2)}
                  </SyntaxHighlighter>
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={closePreview} 
                fullWidth
                sx={{ borderRadius: 3 }}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleDownload(previewDoc)} 
                fullWidth
                startIcon={<DownloadIcon />}
                sx={{ borderRadius: 3 }}
              >
                Download
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Create Folder Dialog */}
      <Dialog 
        open={createFolderDialog} 
        onClose={() => setCreateFolderDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreateFolderIcon color="primary" />
            Create New Folder
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Folder Name"
            placeholder="Enter a descriptive folder name..."
            sx={{ mt: 2 }}
            id="folder-name"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const folderName = document.getElementById('folder-name').value.trim();
              if (folderName) {
                handleCreateFolder(folderName);
              }
            }}
            variant="contained"
          >
            Create Folder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialog.open}
        onClose={() => setExportDialog({ open: false, mode: 'single', documentId: null, documentIds: [] })}
        documentId={exportDialog.documentId}
        documentIds={exportDialog.documentIds}
        mode={exportDialog.mode}
      />

      {/* Enhanced Template Creation Dialog */}
      <Dialog
        open={templateDialog}
        onClose={() => {
          setTemplateDialog(false);
          setSelectedTemplate(null);
          setTemplateName('');
          setSelectedCategory('All');
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DescriptionIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Create Document from Template
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Left side - Template selection */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Select a Template
                </Typography>
                
                {/* Category filter */}
                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      label="Category"
                    >
                      <MenuItem value="All">All Categories</MenuItem>
                      {Array.from(new Set(documentTemplates.map(t => t.category))).map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                {/* Template list */}
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <List sx={{ '& .MuiListItem-root': { borderRadius: 2 } }}>
                    {documentTemplates
                      .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
                      .map(tpl => (
                        <ListItem
                          key={tpl.id}
                          button
                          selected={selectedTemplate === tpl.id}
                          onClick={() => {
                            setSelectedTemplate(tpl.id);
                            setTemplateContent(tpl.content);
                            if (!templateName) {
                              setTemplateName(`${tpl.name} - ${new Date().toLocaleDateString()}`);
                            }
                          }}
                          sx={{
                            mb: 1,
                            border: '1px solid',
                            borderColor: selectedTemplate === tpl.id ? 'primary.main' : 'divider',
                            bgcolor: selectedTemplate === tpl.id ? 'primary.50' : 'background.paper',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'primary.50'
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: 'primary.light', fontSize: '1.2rem' }}>
                              {tpl.icon || '📄'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {tpl.name}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  {tpl.description}
                                </Typography>
                                <Chip
                                  label={tpl.category}
                                  size="small"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                  </List>
                </Box>
              </Paper>
            </Grid>
            
            {/* Right side - Template preview and customization */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {selectedTemplate ? (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <TextField
                        fullWidth
                        label="Document Name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter a name for your document"
                        variant="outlined"
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Save to Folder</InputLabel>
                        <Select
                          value={selectedFolder}
                          onChange={(e) => setSelectedFolder(e.target.value)}
                          label="Save to Folder"
                        >
                          <MenuItem value="">Root</MenuItem>
                          {folders.map((folder) => (
                            <MenuItem key={folder} value={folder}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FolderIcon sx={{ fontSize: '1rem' }} />
                                {folder}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                    
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      Preview & Edit Content
                    </Typography>
                    
                    <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                      <WordLikeEditor
                        initialValue={templateContent}
                        onEditorChange={(content) => setTemplateContent(content)}
                      />
                    </Box>
                  </>
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    p: 4
                  }}>
                    <DescriptionIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, textAlign: 'center' }}>
                      Select a template to get started
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                      Choose from our collection of pre-designed templates to quickly create professional documents
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setTemplateDialog(false);
              setSelectedTemplate(null);
              setTemplateName('');
              setSelectedCategory('All');
            }}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateFromTemplate}
            disabled={!selectedTemplate}
            startIcon={<DescriptionIcon />}
            sx={{ borderRadius: 2 }}
          >
            Create Document
          </Button>
        </DialogActions>
      </Dialog>
  </Box>
  );
};

export default DocumentsPage;