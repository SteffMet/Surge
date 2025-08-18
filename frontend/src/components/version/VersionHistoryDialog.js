import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Typography,
  Chip,
  Box,
  IconButton,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  History as HistoryIcon,
  Restore as RestoreIcon,
  Visibility as ViewIcon,
  Compare as CompareIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Schedule as TimeIcon,
  Edit as EditIcon,
  AutoMode as AutoSaveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import moment from 'moment';

const VersionHistoryDialog = ({ open, onClose, documentId, onRestoreVersion }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [compareMode, setCompareMode] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    if (open && documentId) {
      loadVersionHistory();
    }
  }, [open, documentId]);

  const loadVersionHistory = async () => {
    try {
      setLoading(true);
      // This would use a versioning API service
      const response = await fetch(`/api/versions/document/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load version history');
      }
      
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Error loading version history:', error);
      enqueueSnackbar('Failed to load version history', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleVersionSelect = (version) => {
    if (compareMode) {
      if (selectedVersions.includes(version._id)) {
        setSelectedVersions(selectedVersions.filter(id => id !== version._id));
      } else if (selectedVersions.length < 2) {
        setSelectedVersions([...selectedVersions, version._id]);
      } else {
        enqueueSnackbar('You can only compare two versions at a time', { variant: 'info' });
      }
    }
  };

  const handleRestoreVersion = async (version) => {
    try {
      const response = await fetch(`/api/versions/document/${documentId}/restore/${version.version}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to restore version');
      }

      enqueueSnackbar(`Restored to version ${version.version}`, { variant: 'success' });
      onRestoreVersion(version);
      onClose();
    } catch (error) {
      console.error('Error restoring version:', error);
      enqueueSnackbar('Failed to restore version', { variant: 'error' });
    }
  };

  const handleCompareVersions = () => {
    if (selectedVersions.length === 2) {
      // This would open a comparison view
      console.log('Comparing versions:', selectedVersions);
      enqueueSnackbar('Version comparison coming soon!', { variant: 'info' });
    }
  };

  const handleMenuOpen = (event, version) => {
    setAnchorEl(event.currentTarget);
    setSelectedVersion(version);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVersion(null);
  };

  const getVersionIcon = (version) => {
    if (version.isAutoSave) {
      return <AutoSaveIcon color="action" />;
    }
    return <EditIcon color="primary" />;
  };

  const formatChangeSummary = (version) => {
    if (!version.metadata) return 'No changes recorded';
    
    const { wordsAdded = 0, wordsRemoved = 0, charactersAdded = 0, charactersRemoved = 0 } = version.metadata;
    const totalWords = wordsAdded + wordsRemoved;
    const totalChars = charactersAdded + charactersRemoved;
    
    if (totalWords === 0 && totalChars === 0) {
      return 'Minor changes';
    }
    
    const parts = [];
    if (wordsAdded > 0) parts.push(`+${wordsAdded} words`);
    if (wordsRemoved > 0) parts.push(`-${wordsRemoved} words`);
    
    return parts.join(', ') || 'Changes made';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon />
            <Typography variant="h6">Version History</Typography>
          </Box>
          <Box>
            <Button
              variant={compareMode ? "contained" : "outlined"}
              size="small"
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedVersions([]);
              }}
              startIcon={<CompareIcon />}
            >
              Compare
            </Button>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : versions.length === 0 ? (
          <Alert severity="info">
            No version history available for this document.
          </Alert>
        ) : (
          <List>
            {versions.map((version, index) => (
              <React.Fragment key={version._id}>
                <ListItem
                  button={compareMode}
                  selected={compareMode && selectedVersions.includes(version._id)}
                  onClick={() => handleVersionSelect(version)}
                  sx={{
                    bgcolor: compareMode && selectedVersions.includes(version._id) 
                      ? 'action.selected' 
                      : 'transparent'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {getVersionIcon(version)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Version {version.version}
                        </Typography>
                        {version.isAutoSave && (
                          <Chip 
                            label="Auto-save" 
                            size="small" 
                            color="default" 
                            variant="outlined" 
                          />
                        )}
                        {index === 0 && (
                          <Chip 
                            label="Current" 
                            size="small" 
                            color="primary" 
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {version.changesSummary || formatChangeSummary(version)}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <PersonIcon fontSize="small" />
                            <Typography variant="caption">
                              {version.author?.username || 'Unknown'}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <TimeIcon fontSize="small" />
                            <Typography variant="caption">
                              {moment(version.createdAt).fromNow()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                  
                  {!compareMode && (
                    <ListItemSecondaryAction>
                      <Tooltip title="More actions">
                        <IconButton 
                          size="small"
                          onClick={(e) => handleMenuOpen(e, version)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  )}
                </ListItem>
                {index < versions.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        {compareMode && selectedVersions.length === 2 && (
          <Button
            variant="contained"
            onClick={handleCompareVersions}
            startIcon={<CompareIcon />}
          >
            Compare Selected
          </Button>
        )}
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          // View version functionality
          handleMenuClose();
          enqueueSnackbar('View version coming soon!', { variant: 'info' });
        }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          View Version
        </MenuItem>
        {selectedVersion && selectedVersion.version > 1 && (
          <MenuItem onClick={() => {
            handleRestoreVersion(selectedVersion);
            handleMenuClose();
          }}>
            <RestoreIcon fontSize="small" sx={{ mr: 1 }} />
            Restore to This Version
          </MenuItem>
        )}
      </Menu>
    </Dialog>
  );
};

export default VersionHistoryDialog;
