import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  Slideshow as PresentationIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';

import { documentsAPI, workspacesAPI, handleApiError } from '../services/api';

const DocumentUpload = ({ workspaceId, parentFolder, onUploadComplete }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const getFileIcon = (file) => {
    const type = file.type || '';
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    // PDF files
    if (type.includes('pdf') || extension === 'pdf') {
      return <PdfIcon color="error" />;
    }
    
    // Image files
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      return <ImageIcon color="primary" />;
    }
    
    // Video files
    if (type.includes('video') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return <VideoIcon color="secondary" />;
    }
    
    // Audio files
    if (type.includes('audio') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
      return <AudioIcon color="info" />;
    }
    
    // Office documents
    if (type.includes('msword') || type.includes('wordprocessingml') || ['doc', 'docx'].includes(extension)) {
      return <DocIcon color="primary" />;
    }
    
    if (type.includes('sheet') || type.includes('spreadsheetml') || ['xls', 'xlsx'].includes(extension)) {
      return <SpreadsheetIcon color="success" />;
    }
    
    if (type.includes('presentation') || type.includes('presentationml') || ['ppt', 'pptx'].includes(extension)) {
      return <PresentationIcon color="warning" />;
    }
    
    // Plain text and other text files
    if (type.includes('text') || ['txt', 'rtf', 'csv'].includes(extension)) {
      return <FileIcon />;
    }
    
    // Default file icon
    return <FileIcon />;
  };

  const getFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    if (size < 1024 * 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
    return `${Math.round(size / (1024 * 1024 * 1024))} GB`;
  };

  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text files
      'text/plain',
      'text/csv',
      'application/rtf',
      
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/flac',
      
      // Video
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
      
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    if (file.size > maxSize) {
      return `File size exceeds 50MB limit`;
    }

    // Check by MIME type first, then by extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const commonExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'txt', 'rtf', 'csv',
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
      'mp3', 'wav', 'ogg', 'aac', 'flac',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
      'zip', 'rar', '7z'
    ];

    if (!allowedTypes.includes(file.type) && !commonExtensions.includes(extension)) {
      return `File type not supported`;
    }

    return null;
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error) => {
        enqueueSnackbar(`${file.name}: ${error.message}`, { variant: 'error' });
      });
    });

    // Validate and add accepted files
    const validFiles = [];
    acceptedFiles.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        enqueueSnackbar(`${file.name}: ${error}`, { variant: 'error' });
      } else {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          status: 'pending', // pending, uploading, success, error
          progress: 0,
          error: null,
        });
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, [enqueueSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (fileId) => {
    setFiles(files => files.filter(f => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const filesToUpload = files.filter(f => f.status === 'pending');
    
    for (const fileItem of filesToUpload) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'uploading' } : f
        ));

        // Create form data
        const formData = new FormData();
  formData.append('document', fileItem.file);
  formData.append('folder', fileItem.file.webkitRelativePath || '/');
  formData.append('title', fileItem.file.name);

        // Upload document
        const response = await documentsAPI.uploadDocument(
          formData,
          (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setFiles(prev => prev.map(f => 
              f.id === fileItem.id ? { ...f, progress } : f
            ));
          }
        );

        // Create bookmark in workspace
        if (workspaceId && response.data) {
          const bookmarkData = {
            title: fileItem.file.name,
            type: 'document',
            resourceId: response.data._id,
            parentFolder,
          };
          
          await workspacesAPI.createBookmark(workspaceId, bookmarkData);
        }

        // Update status to success
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
        ));

      } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = handleApiError(error);
        
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'error', 
            error: errorMessage,
            progress: 0 
          } : f
        ));
      }
    }

    setUploading(false);
    
    // Check if all files uploaded successfully
    const finalFiles = files.filter(f => f.status === 'pending' || f.status === 'uploading');
    if (finalFiles.every(f => f.status === 'success')) {
      enqueueSnackbar('All files uploaded successfully', { variant: 'success' });
      if (onUploadComplete) {
        onUploadComplete();
      }
    }
  };

  const hasFilesToUpload = files.some(f => f.status === 'pending');
  const hasFailedFiles = files.some(f => f.status === 'error');

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        
        {isDragActive ? (
          <Typography variant="h6" color="primary">
            Drop files here to upload
          </Typography>
        ) : (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Drag & drop files here, or click to select
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supports documents, images, videos, audio files and more
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Maximum file size: 50MB per file
            </Typography>
          </Box>
        )}
      </Paper>

      {/* File List */}
      {files.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Files ({files.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setFiles([])}
                disabled={uploading}
              >
                Clear All
              </Button>
              <Button
                variant="contained"
                onClick={uploadFiles}
                disabled={!hasFilesToUpload || uploading}
                startIcon={uploading ? <LinearProgress size={16} /> : <CloudUploadIcon />}
              >
                {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Files`}
              </Button>
            </Box>
          </Box>

          <List>
            {files.map((fileItem, index) => (
              <React.Fragment key={fileItem.id}>
                <ListItem>
                  <ListItemIcon>
                    {getFileIcon(fileItem.file)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {fileItem.file.name}
                        </Typography>
                        <Chip
                          label={fileItem.status}
                          size="small"
                          color={
                            fileItem.status === 'success' ? 'success' :
                            fileItem.status === 'error' ? 'error' :
                            fileItem.status === 'uploading' ? 'primary' : 'default'
                          }
                          icon={
                            fileItem.status === 'success' ? <CheckCircleIcon /> :
                            fileItem.status === 'error' ? <ErrorIcon /> : null
                          }
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {getFileSize(fileItem.file.size)}
                          {fileItem.file.type && ` • ${fileItem.file.type}`}
                        </Typography>
                        
                        {fileItem.status === 'uploading' && (
                          <Box sx={{ mt: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={fileItem.progress}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {fileItem.progress}% uploaded
                            </Typography>
                          </Box>
                        )}
                        
                        {fileItem.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {fileItem.error}
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => removeFile(fileItem.id)}
                      disabled={fileItem.status === 'uploading'}
                      size="small"
                    >
                      <CloseIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < files.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {/* Summary */}
          {files.length > 0 && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                Total: {files.length} files ({getFileSize(files.reduce((acc, f) => acc + f.file.size, 0))})
              </Typography>
              {hasFailedFiles && (
                <Typography variant="body2" color="error.main">
                  {files.filter(f => f.status === 'error').length} files failed to upload
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentUpload;