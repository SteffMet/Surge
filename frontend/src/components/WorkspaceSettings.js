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
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Grid,
  Paper,
  Stack,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

import { workspacesAPI, handleApiError } from '../services/api';

const WorkspaceSettings = ({ open, onClose, workspace, onWorkspaceUpdate }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  
  const [generalSettings, setGeneralSettings] = useState({
    name: '',
    description: '',
    tags: [],
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    allowPublicBookmarks: false,
    defaultBookmarkPrivacy: 'workspace',
    requireApprovalForBookmarks: false,
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (workspace) {
      setGeneralSettings({
        name: workspace.name || '',
        description: workspace.description || '',
        tags: workspace.tags || [],
      });
      
      setPrivacySettings({
        allowPublicBookmarks: workspace.settings?.allowPublicBookmarks || false,
        defaultBookmarkPrivacy: workspace.settings?.defaultBookmarkPrivacy || 'workspace',
        requireApprovalForBookmarks: workspace.settings?.requireApprovalForBookmarks || false,
      });
    }
  }, [workspace]);

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: generalSettings.name,
        description: generalSettings.description,
        tags: generalSettings.tags,
      };

      await workspacesAPI.updateWorkspace(workspace._id, updateData);
      enqueueSnackbar('General settings updated successfully', { variant: 'success' });
      
      if (onWorkspaceUpdate) {
        onWorkspaceUpdate();
      }
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const updateData = {
        settings: privacySettings,
      };

      await workspacesAPI.updateWorkspace(workspace._id, updateData);
      enqueueSnackbar('Privacy settings updated successfully', { variant: 'success' });
      
      if (onWorkspaceUpdate) {
        onWorkspaceUpdate();
      }
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !generalSettings.tags.includes(tagInput.trim())) {
      setGeneralSettings({
        ...generalSettings,
        tags: [...generalSettings.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setGeneralSettings({
      ...generalSettings,
      tags: generalSettings.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleDeleteWorkspace = async () => {
    if (window.confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone and will remove all bookmarks and collaborators.`)) {
      try {
        await workspacesAPI.deleteWorkspace(workspace._id);
        enqueueSnackbar('Workspace deleted successfully', { variant: 'success' });
        onClose();
        // Navigate back to workspaces list
        window.location.href = '/workspaces';
      } catch (err) {
        enqueueSnackbar(handleApiError(err), { variant: 'error' });
      }
    }
  };

  if (!workspace) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Workspace Settings
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={4}>
          {/* General Settings */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <PaletteIcon color="primary" />
              <Typography variant="h6">General Settings</Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Workspace Name"
                  value={generalSettings.name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, name: e.target.value })}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={generalSettings.description}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Tags</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {generalSettings.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button onClick={handleAddTag} variant="outlined">
                    Add
                  </Button>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleSaveGeneral}
                variant="contained"
                disabled={loading || !generalSettings.name.trim()}
              >
                Save General Settings
              </Button>
            </Box>
          </Paper>

          {/* Privacy & Security Settings */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Privacy & Security</Typography>
            </Box>
            
            <Stack spacing={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={privacySettings.allowPublicBookmarks}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      allowPublicBookmarks: e.target.checked
                    })}
                  />
                }
                label="Allow public bookmarks"
              />
              
              <FormControl fullWidth>
                <InputLabel>Default bookmark privacy</InputLabel>
                <Select
                  value={privacySettings.defaultBookmarkPrivacy}
                  onChange={(e) => setPrivacySettings({
                    ...privacySettings,
                    defaultBookmarkPrivacy: e.target.value
                  })}
                  label="Default bookmark privacy"
                >
                  <MenuItem value="private">Private - Only creator can see</MenuItem>
                  <MenuItem value="workspace">Workspace - All members can see</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={privacySettings.requireApprovalForBookmarks}
                    onChange={(e) => setPrivacySettings({
                      ...privacySettings,
                      requireApprovalForBookmarks: e.target.checked
                    })}
                  />
                }
                label="Require approval for new bookmarks"
              />
            </Stack>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleSavePrivacy}
                variant="contained"
                disabled={loading}
              >
                Save Privacy Settings
              </Button>
            </Box>
          </Paper>

          {/* Storage Information */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <StorageIcon color="primary" />
              <Typography variant="h6">Storage & Usage</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Total Bookmarks</Typography>
                <Typography variant="h6">{workspace.bookmarkCount || 0}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Collaborators</Typography>
                <Typography variant="h6">{(workspace.collaboratorCount || 0) + 1}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Workspace Type</Typography>
                <Chip 
                  label={workspace.type === 'collaborative' ? 'Team' : 'Private'} 
                  color={workspace.type === 'collaborative' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body2">{new Date(workspace.createdAt).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Danger Zone */}
          <Paper sx={{ p: 3, borderColor: 'error.main', border: '1px solid' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <WarningIcon color="error" />
              <Typography variant="h6" color="error.main">Danger Zone</Typography>
            </Box>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              Deleting a workspace will permanently remove all bookmarks, folders, and collaborator access. 
              This action cannot be undone.
            </Alert>
            
            <Button
              onClick={handleDeleteWorkspace}
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={loading}
            >
              Delete Workspace
            </Button>
          </Paper>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkspaceSettings;