import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  InsertDriveFile as FileIcon,
  Description as DocIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import moment from 'moment';

import { documentsAPI, workspacesAPI, handleApiError } from '../services/api';

const DocumentPreview = ({ 
  open, 
  onClose, 
  bookmark, 
  workspaceId, 
  onBookmarkUpdate 
}) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState(null);
  const [previewError, setPreviewError] = useState('');

  useEffect(() => {
    if (open && bookmark && bookmark.type === 'document' && bookmark.resourceId) {
      loadDocument();
    }
  }, [open, bookmark]);

  const loadDocument = async () => {
    setLoading(true);
    setPreviewError('');
    
    try {
      const response = await documentsAPI.getDocument(bookmark.resourceId);
      setDocument(response.data);
    } catch (err) {
      console.error('Error loading document:', err);
      setPreviewError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await documentsAPI.downloadDocument(bookmark.resourceId);
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document?.originalName || bookmark.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('Download started', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const toggleFavorite = async () => {
    try {
      await workspacesAPI.updateBookmark(workspaceId, bookmark._id, {
        isFavorite: !bookmark.isFavorite
      });
      
      if (onBookmarkUpdate) {
        onBookmarkUpdate();
      }
      
      enqueueSnackbar(
        bookmark.isFavorite ? 'Removed from favorites' : 'Added to favorites',
        { variant: 'success' }
      );
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const getFileIcon = () => {
    if (!document) return <FileIcon />;
    
    const mimeType = document.mimeType || '';
    
    if (mimeType.includes('pdf')) return <PdfIcon color="error" />;
    if (mimeType.includes('image')) return <ImageIcon color="primary" />;
    if (mimeType.includes('video')) return <VideoIcon color="secondary" />;
    if (mimeType.includes('audio')) return <AudioIcon color="info" />;
    if (mimeType.includes('msword') || mimeType.includes('wordprocessingml')) {
      return <DocIcon color="primary" />;
    }
    
    return <FileIcon />;
  };

  const getFileSize = (size) => {
    if (!size) return 'Unknown size';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    if (size < 1024 * 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
    return `${Math.round(size / (1024 * 1024 * 1024))} GB`;
  };

  const canPreviewInBrowser = () => {
    if (!document) return false;
    
    const mimeType = document.mimeType || '';
    
    // These types can be previewed directly in browser
    return (
      mimeType.includes('pdf') ||
      mimeType.includes('image') ||
      mimeType.includes('text/plain')
    );
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (previewError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {previewError}
        </Alert>
      );
    }

    if (!document) {
      return (
        <Alert severity="warning" sx={{ m: 2 }}>
          Document information not available
        </Alert>
      );
    }

    const mimeType = document.mimeType || '';

    if (mimeType.includes('pdf')) {
      // For PDFs, show an embed or iframe
      const downloadUrl = `/api/documents/${document._id}/download`;
      
      return (
        <Box sx={{ height: 600, border: '1px solid', borderColor: 'grey.300' }}>
          <embed
            src={downloadUrl}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        </Box>
      );
    }

    if (mimeType.includes('image')) {
      // For images, show the image
      const downloadUrl = `/api/documents/${document._id}/download`;
      
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <img
            src={downloadUrl}
            alt={document.originalName}
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              objectFit: 'contain'
            }}
          />
        </Box>
      );
    }

    if (mimeType.includes('text/plain') && document.extractedText) {
      // For text files, show the content
      return (
        <Box
          sx={{
            p: 2,
            backgroundColor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 1,
            maxHeight: 600,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {document.extractedText}
          </pre>
        </Box>
      );
    }

    // For other file types, show info card
    return (
      <Card sx={{ m: 2 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 3 }}>
            {getFileIcon()}
          </Box>
          
          <Typography variant="h6" gutterBottom>
            {document.originalName}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {mimeType} • {getFileSize(document.size)}
          </Typography>
          
          <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
            <Typography variant="body2">
              This file type cannot be previewed in the browser. 
              You can download it to view the content.
            </Typography>
          </Alert>
          
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{ mt: 2 }}
          >
            Download to View
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (!bookmark) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
            {getFileIcon()}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h6" noWrap>
                {bookmark.title}
              </Typography>
              {bookmark.description && (
                <Typography variant="body2" color="text.secondary" noWrap>
                  {bookmark.description}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={bookmark.isFavorite ? "Remove from favorites" : "Add to favorites"}>
              <IconButton onClick={toggleFavorite}>
                {bookmark.isFavorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
            
            {document && (
              <Tooltip title="Download">
                <IconButton onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 0 }}>
        {renderPreview()}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
          {bookmark.tags && bookmark.tags.length > 0 && (
            <Stack direction="row" spacing={1}>
              {bookmark.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {document && (
            <>
              <Typography variant="caption" color="text.secondary">
                {getFileSize(document.size)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Modified {moment(bookmark.updatedAt).fromNow()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                by {bookmark.createdBy?.username}
              </Typography>
            </>
          )}
          
          <Button onClick={onClose}>
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreview;