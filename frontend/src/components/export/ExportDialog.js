import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Description as PdfIcon,
  Article as WordIcon,
  Code as MarkdownIcon,
  Info as InfoIcon,
  Settings as OptionsIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import exportService from '../../services/exportService';

const ExportDialog = ({ 
  open, 
  onClose, 
  documentId, 
  documentIds = [], 
  workspaceId,
  mode = 'single' // 'single', 'bulk', 'workspace'
}) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [exportOptions, setExportOptions] = useState({});
  const [availableFormats, setAvailableFormats] = useState({});
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Load available formats and preview on dialog open
  useEffect(() => {
    if (open) {
      loadFormatsAndPreview();
    }
  }, [open, documentId, workspaceId, mode]);

  const loadFormatsAndPreview = async () => {
    try {
      setLoading(true);
      
      // Load available formats
      const formats = await exportService.getExportFormats();
      setAvailableFormats(formats);
      
      // Set default options for selected format
      if (formats[selectedFormat]?.options) {
        const defaultOptions = {};
        Object.entries(formats[selectedFormat].options).forEach(([key, option]) => {
          defaultOptions[key] = option.default;
        });
        setExportOptions(defaultOptions);
      }

      // Load preview based on mode
      let previewData = null;
      if (mode === 'single' && documentId) {
        previewData = await exportService.getDocumentExportPreview(documentId);
      } else if (mode === 'workspace' && workspaceId) {
        previewData = await exportService.getWorkspaceExportPreview(workspaceId);
      } else if (mode === 'bulk' && documentIds.length > 0) {
        // For bulk, we'll create a simple preview
        previewData = {
          title: `${documentIds.length} Documents`,
          documentCount: documentIds.length,
          supportedFormats: ['pdf', 'word', 'markdown']
        };
      }
      
      setPreview(previewData);
    } catch (error) {
      console.error('Failed to load export data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (format) => {
    setSelectedFormat(format);
    
    // Update default options for new format
    if (availableFormats[format]?.options) {
      const defaultOptions = {};
      Object.entries(availableFormats[format].options).forEach(([key, option]) => {
        defaultOptions[key] = option.default;
      });
      setExportOptions(defaultOptions);
    } else {
      setExportOptions({});
    }
  };

  const handleOptionChange = (key, value) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setProgress(0);
      setError(null);

      let result;
      
      if (mode === 'single' && documentId) {
        result = await exportService.exportWithProgress(
          () => exportService.exportDocument(documentId, selectedFormat, exportOptions),
          setProgress
        );
      } else if (mode === 'bulk' && documentIds.length > 0) {
        result = await exportService.exportWithProgress(
          () => exportService.exportDocumentsBulk(documentIds, selectedFormat, exportOptions),
          setProgress
        );
      } else if (mode === 'workspace' && workspaceId) {
        result = await exportService.exportWithProgress(
          () => exportService.exportWorkspace(workspaceId, selectedFormat, exportOptions),
          setProgress
        );
      }

      if (result) {
        const success = exportService.downloadFile(result.blob, result.filename, result.contentType);
        if (success) {
          onClose();
        } else {
          setError('Failed to download file');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const formatIcons = {
    pdf: <PdfIcon color="error" />,
    word: <WordIcon color="primary" />,
    docx: <WordIcon color="primary" />,
    markdown: <MarkdownIcon color="action" />,
    md: <MarkdownIcon color="action" />
  };

  const estimatedFileSize = preview ? exportService.formatFileSize(
    exportService.estimateFileSize(preview.wordCount || preview.totalWordCount || 1000, selectedFormat)
  ) : 'Unknown';

  const tabLabels = ['Format', 'Options', 'Preview'];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DownloadIcon />
          Export {mode === 'single' ? 'Document' : mode === 'bulk' ? 'Documents' : 'Workspace'}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
          {tabLabels.map((label, index) => (
            <Tab key={index} label={label} />
          ))}
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress variant={progress > 0 ? "determinate" : "indeterminate"} value={progress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress > 0 ? `${progress}% complete` : 'Loading...'}
            </Typography>
          </Box>
        )}

        {/* Format Selection Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Export Format
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(availableFormats).map(([format, config]) => (
                <Grid item xs={12} md={4} key={format}>
                  <Card 
                    variant={selectedFormat === format ? "elevated" : "outlined"}
                    sx={{ 
                      cursor: 'pointer',
                      border: selectedFormat === format ? 2 : 1,
                      borderColor: selectedFormat === format ? 'primary.main' : 'divider'
                    }}
                    onClick={() => handleFormatChange(format)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        {formatIcons[format]}
                        <Typography variant="h6">
                          {config.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {config.description}
                      </Typography>
                      <Box mt={1}>
                        {config.features.slice(0, 3).map((feature, index) => (
                          <Chip 
                            key={index} 
                            label={feature} 
                            size="small" 
                            sx={{ mr: 0.5, mb: 0.5 }} 
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        File size: ~{estimatedFileSize}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Options Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Export Options
            </Typography>
            {availableFormats[selectedFormat]?.options ? (
              <Grid container spacing={2}>
                {Object.entries(availableFormats[selectedFormat].options).map(([key, option]) => (
                  <Grid item xs={12} md={6} key={key}>
                    {option.type === 'boolean' ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={exportOptions[key] || false}
                            onChange={(e) => handleOptionChange(key, e.target.checked)}
                          />
                        }
                        label={option.label}
                      />
                    ) : option.type === 'select' ? (
                      <FormControl fullWidth>
                        <InputLabel>{option.label}</InputLabel>
                        <Select
                          value={exportOptions[key] || option.default || ''}
                          onChange={(e) => handleOptionChange(key, e.target.value)}
                          label={option.label}
                        >
                          {option.options.map((opt) => (
                            <MenuItem key={opt} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <Typography variant="body2">
                        {option.label}: {exportOptions[key] || option.default || 'Default'}
                      </Typography>
                    )}
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info" icon={<InfoIcon />}>
                No additional options available for {availableFormats[selectedFormat]?.name || selectedFormat} format.
              </Alert>
            )}
          </Box>
        )}

        {/* Preview Tab */}
        {activeTab === 2 && preview && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Export Preview
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {preview.title || preview.name}
              </Typography>
              
              {preview.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {preview.description}
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Content:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {preview.wordCount || preview.totalWordCount || 0} words
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ~{preview.estimatedPages || Math.ceil((preview.wordCount || preview.totalWordCount || 0) / 250)} pages
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Documents:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {preview.documentCount || 1} document{(preview.documentCount || 1) !== 1 ? 's' : ''}
                  </Typography>
                </Grid>

                {preview.tags && preview.tags.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Tags:</strong>
                    </Typography>
                    <Box>
                      {preview.tags.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  </Grid>
                )}

                {preview.author && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Author:</strong> {preview.author.username}
                    </Typography>
                  </Grid>
                )}

                {preview.workspace && (
                  <Grid item xs={12}>
                    <Typography variant="body2">
                      <strong>Workspace:</strong> {preview.workspace.name}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2">
                <strong>Export Details:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Format: {availableFormats[selectedFormat]?.name || selectedFormat.toUpperCase()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Estimated file size: {estimatedFileSize}
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading || !selectedFormat}
          startIcon={<DownloadIcon />}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;