import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
  Tabs,
  Tab,
  Paper,
  Rating,
  Avatar,
  Stack,
  Divider,
  CircularProgress,
  Tooltip,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as DuplicateIcon,
  GetApp as ExportIcon,
  CloudUpload as ImportIcon,
  Star as StarIcon,
  Visibility as PreviewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import templateService from '../../services/templateService';
import { documentsAPI } from '../../services/api';
import RichTextEditor from '../editor/RichTextEditor';
import WordLikeEditor from '../editor/WordLikeEditor';

const TemplateDialog = ({ open, onClose, onSave, template }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: 'DOCUMENTATION',
    content: null,
    tags: [],
    variables: []
  });
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
    workspace: workspaceId || '',
    variables: {}
  });
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (open) {
      loadTemplates();
      loadCategories();
      if (templateId && mode === 'edit') {
        loadTemplate(templateId);
      }
    }
  }, [open, templateId, mode, workspaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        ...(workspaceId && { workspace: workspaceId }),
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory && { category: selectedCategory })
      };
      
      const response = await templateService.getTemplates(params);
      setTemplates(response.templates.map(template => 
        templateService.formatTemplate(template)
      ));
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await templateService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadTemplate = async (id) => {
    try {
      const template = await templateService.getTemplate(id);
      setSelectedTemplate(template);
      setTemplateForm({
        name: template.name,
        description: template.description || '',
        category: template.category,
        content: template.content,
        tags: template.tags || [],
        variables: template.variables || []
      });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    if (mode === 'use') {
      setDocumentForm({
        ...documentForm,
        title: template.name,
        variables: template.variables?.reduce((acc, variable) => {
          acc[variable.key] = variable.defaultValue || '';
          return acc;
        }, {}) || {}
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const errors = templateService.validateTemplate(templateForm);
      if (errors.length > 0) {
        enqueueSnackbar(errors.join(', '), { variant: 'error' });
        return;
      }

      setLoading(true);
      const template = await templateService.createTemplate({
        ...templateForm,
        workspace: workspaceId
      });
      
      enqueueSnackbar('Template created successfully', { variant: 'success' });
      onClose();
      if (onTemplateSelect) onTemplateSelect(template);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      setLoading(true);
      const template = await templateService.updateTemplate(templateId, templateForm);
      enqueueSnackbar('Template updated successfully', { variant: 'success' });
      onClose();
      if (onTemplateSelect) onTemplateSelect(template);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async () => {
    try {
      if (!selectedTemplate) {
        enqueueSnackbar('Please select a template', { variant: 'error' });
        return;
      }

      setLoading(true);
      const document = await templateService.createDocumentFromTemplate(
        selectedTemplate._id,
        {
          title: documentForm.title,
          description: documentForm.description,
          workspace: documentForm.workspace
        },
        documentForm.variables
      );
      
      enqueueSnackbar('Document created from template', { variant: 'success' });
      onClose();
      if (onDocumentCreate) onDocumentCreate(document);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRateTemplate = async (templateId, newRating) => {
    try {
      await templateService.rateTemplate(templateId, newRating);
      enqueueSnackbar('Template rated successfully', { variant: 'success' });
      loadTemplates();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const duplicated = await templateService.duplicateTemplate(template._id, {
        name: `${template.name} (Copy)`,
        workspace: workspaceId
      });
      enqueueSnackbar('Template duplicated successfully', { variant: 'success' });
      loadTemplates();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  const TemplateCard = ({ template }) => (
    <Card 
      sx={{ 
        height: '100%',
        border: selectedTemplate?._id === template._id ? 2 : 1,
        borderColor: selectedTemplate?._id === template._id ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardActionArea onClick={() => handleTemplateSelect(template)} sx={{ height: '100%', p: 0 }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.light' }}>
              <Typography variant="h6">{template.categoryIcon}</Typography>
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }} noWrap>
                {template.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip 
                  label={template.categoryName}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Rating 
                  value={template.rating?.average || 0} 
                  precision={0.1} 
                  size="small" 
                  readOnly 
                />
              </Box>
            </Box>
          </Box>
          
          {template.description && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {template.description}
            </Typography>
          )}

          {template.tags && template.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2, flexWrap: 'wrap' }}>
              {template.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
              {template.tags.length > 3 && (
                <Chip label={`+${template.tags.length - 3}`} size="small" variant="outlined" />
              )}
            </Box>
          )}

          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Used {template.usageCount} times
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Duplicate">
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateTemplate(template);
                  }}
                >
                  <DuplicateIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rate Template">
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRating(0);
                  }}
                >
                  <StarIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  const getDialogTitle = () => {
    switch (mode) {
      case 'create': return 'Create Template';
      case 'edit': return 'Edit Template';
      case 'use': return 'Use Template';
      default: return 'Browse Templates';
    }
  };

  const getTabLabel = (index) => {
    const labels = mode === 'use' 
      ? ['Select Template', 'Configure Document']
      : mode === 'create' || mode === 'edit'
      ? ['Basic Info', 'Content & Variables']
      : ['Browse Templates', 'Template Details'];
    return labels[index] || `Tab ${index + 1}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {getDialogTitle()}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab label={getTabLabel(0)} />
            <Tab label={getTabLabel(1)} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {/* Browse Templates Tab */}
          {activeTab === 0 && (mode === 'browse' || mode === 'use') && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.key} value={category.key}>
                        {category.icon} {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button 
                  variant="outlined" 
                  onClick={loadTemplates}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Search'}
                </Button>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {templates.map((template) => (
                    <Grid item xs={12} md={6} lg={4} key={template._id}>
                      <TemplateCard template={template} />
                    </Grid>
                  ))}
                </Grid>
              )}

              {templates.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    No templates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search criteria
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Template Details/Document Configuration */}
          {activeTab === 1 && mode === 'use' && selectedTemplate && (
            <Box sx={{ pt: 2 }}>
            <WordLikeEditor
              initialValue={content}
              onEditorChange={(newContent) => setContent(newContent)}
            />
          </Box>
          )}

          {/* Create/Edit Template Form */}
          {(mode === 'create' || mode === 'edit') && (
            <Box>
              {activeTab === 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Template Name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                        label="Category"
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.key} value={category.key}>
                            {category.icon} {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                      multiline
                      rows={4}
                    />
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">
                  Template content and variable configuration would be implemented with a rich text editor component.
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {mode === 'use' && (
          <Button 
            variant="contained" 
            onClick={handleUseTemplate}
            disabled={!selectedTemplate || loading}
          >
            Create Document
          </Button>
        )}
        {mode === 'create' && (
          <Button variant="contained" onClick={handleCreateTemplate} disabled={loading}>
            Create Template
          </Button>
        )}
        {mode === 'edit' && (
          <Button variant="contained" onClick={handleUpdateTemplate} disabled={loading}>
            Update Template
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TemplateDialog;