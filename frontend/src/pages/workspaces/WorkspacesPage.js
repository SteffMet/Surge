import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Divider,
  CardActionArea,
  Tooltip,
  Stack,
  Fade,
  Zoom,
  useTheme,
  Badge,
  AvatarGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Bookmark as BookmarkIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Business as CollaborativeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as AIIcon,
  Visibility as ViewIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Group as GroupIcon,
  Storage as StorageIcon,
  Description as DocumentIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

import { useAuth } from '../../services/AuthContext';
import { workspacesAPI, handleApiError } from '../../services/api';
import { WorkspacesPageSkeleton } from '../../components/common/SkeletonLoaders';
import ExportDialog from '../../components/export/ExportDialog';
import exportService from '../../services/exportService';

const WorkspacesPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, hasMore: false });
  const [favorites, setFavorites] = useState(new Set());
  const [bookmarkedWorkspaces, setBookmarkedWorkspaces] = useState([]);
  const [bookmarksExpanded, setBookmarksExpanded] = useState(true);
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, workspace: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, workspace: null });
  const [shareDialog, setShareDialog] = useState({ open: false, workspace: null });
  const [exportDialog, setExportDialog] = useState({ open: false, workspaceId: null });
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'private',
    tags: []
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    tags: []
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    // Update bookmarked workspaces whenever workspaces or favorites change
    const bookmarked = workspaces.filter(ws => ws.isFavorite);
    setBookmarkedWorkspaces(bookmarked);
  }, [workspaces, favorites]);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await workspacesAPI.getWorkspaces();
      const workspacesData = response.data.workspaces.map(ws => ({
        ...ws,
        isFavorite: favorites.has(ws._id),
      }));
      setWorkspaces(workspacesData);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error loading workspaces:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, workspace) => {
    event.stopPropagation(); // Prevent event propagation
    setAnchorEl(event.currentTarget);
    setSelectedWorkspace(workspace);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkspace(null);
  };

  const handleCreate = () => {
    setCreateForm({
      name: '',
      description: '',
      type: 'private',
      tags: []
    });
    setCreateDialog(true);
  };

  const handleEdit = (workspace) => {
    setEditForm({
      name: workspace.name,
      description: workspace.description || '',
      tags: workspace.tags || []
    });
    setEditDialog({ open: true, workspace });
    handleMenuClose();
  };

  const handleDelete = (workspace) => {
    setDeleteDialog({ open: true, workspace });
    handleMenuClose();
  };

  const handleShare = (workspace) => {
    setShareDialog({ open: true, workspace });
    handleMenuClose();
  };

  const handleExport = (workspace) => {
    setExportDialog({ open: true, workspaceId: workspace._id });
    handleMenuClose();
  };

  const toggleFavorite = (workspace) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(workspace._id)) {
      newFavorites.delete(workspace._id);
    } else {
      newFavorites.add(workspace._id);
    }
    setFavorites(newFavorites);
    
    // Update workspace in list
    setWorkspaces(prev => prev.map(ws => 
      ws._id === workspace._id ? { ...ws, isFavorite: newFavorites.has(workspace._id) } : ws
    ));
    
    enqueueSnackbar(
      newFavorites.has(workspace._id) ? 'Added to favorites' : 'Removed from favorites',
      { variant: 'success' }
    );
  };

  const handleWorkspaceClick = (workspace) => {
    navigate(`/workspaces/${workspace._id}`);
  };

  const confirmDelete = async () => {
    if (!deleteDialog.workspace) return;
    
    try {
      await workspacesAPI.deleteWorkspace(deleteDialog.workspace._id);
      enqueueSnackbar('Workspace deleted successfully', { variant: 'success' });
      loadWorkspaces();
      setDeleteDialog({ open: false, workspace: null });
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleDeleteAllWorkspaces = () => {
    setDeleteAllDialog(true);
  };

  const confirmDeleteAllWorkspaces = async () => {
    try {
      // Filter to only delete workspaces where the user is the owner
      const ownedWorkspaces = workspaces.filter(workspace => workspace.owner?._id === user?.id);
      
      if (ownedWorkspaces.length === 0) {
        enqueueSnackbar('No workspaces to delete - you can only delete workspaces you own', { variant: 'warning' });
        setDeleteAllDialog(false);
        return;
      }
      
      // Delete only owned workspaces
      const deletePromises = ownedWorkspaces.map(workspace => 
        workspacesAPI.deleteWorkspace(workspace._id)
      );
      
      await Promise.all(deletePromises);
      
      const skippedCount = workspaces.length - ownedWorkspaces.length;
      const successMessage = skippedCount > 0 
        ? `${ownedWorkspaces.length} owned workspaces deleted successfully (${skippedCount} collaborative workspaces skipped)`
        : `All ${ownedWorkspaces.length} workspaces deleted successfully`;
      
      enqueueSnackbar(successMessage, { variant: 'success' });
      loadWorkspaces();
      setDeleteAllDialog(false);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleCreateSave = async () => {
    if (!createForm.name.trim()) {
      enqueueSnackbar('Workspace name is required', { variant: 'error' });
      return;
    }

    setCreateLoading(true);
    try {
      const response = await workspacesAPI.createWorkspace(createForm);
      
      if (!response.data || !response.data._id) {
        throw new Error('Invalid response from server - workspace creation failed');
      }
      
      const newWorkspaceId = response.data._id;
      enqueueSnackbar('Workspace created successfully', { variant: 'success' });

      // Reset dialog state first
      setCreateDialog(false);
      setCreateForm({ name: '', description: '', type: 'private', tags: [] });

      // Add a small delay to ensure the workspace is fully created on the backend
      setTimeout(async () => {
        try {
          // Verify the workspace exists before navigating
          await workspacesAPI.getWorkspace(newWorkspaceId);
          
          // Navigate to the new workspace
          navigate(`/workspaces/${newWorkspaceId}`);
        } catch (verifyErr) {
          console.error('Error verifying workspace after creation:', verifyErr);
          enqueueSnackbar('Workspace created but there was an issue accessing it. Please refresh the page.', { 
            variant: 'warning',
            autoHideDuration: 8000,
            action: (snackbarId) => (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  enqueueSnackbar.closeSnackbar(snackbarId);
                  loadWorkspaces();
                }}
              >
                Refresh
              </Button>
            )
          });
          
          // Fallback: just reload the workspaces list
          loadWorkspaces();
        }
      }, 1000);
      
    } catch (err) {
      console.error('Workspace creation error:', err);
      const errorMessage = err.response?.status === 403 
        ? 'You do not have permission to create workspaces'
        : err.response?.status === 429
        ? 'Too many requests. Please wait before creating another workspace.'
        : handleApiError(err);
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 8000,
        action: (snackbarId) => (
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => {
              enqueueSnackbar.closeSnackbar(snackbarId);
              handleCreateSave();
            }}
          >
            Retry
          </Button>
        )
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      enqueueSnackbar('Workspace name is required', { variant: 'error' });
      return;
    }

    setEditLoading(true);
    try {
      await workspacesAPI.updateWorkspace(editDialog.workspace._id, editForm);
      enqueueSnackbar('Workspace updated successfully', { variant: 'success' });
      loadWorkspaces();
      setEditDialog({ open: false, workspace: null });
      setEditForm({ name: '', description: '', tags: [] });
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const getWorkspaceIcon = (type) => {
    switch (type) {
      case 'collaborative':
        return <CollaborativeIcon />;
      case 'private':
      default:
        return <FolderIcon />;
    }
  };

  const getWorkspaceTypeColor = (type) => {
    switch (type) {
      case 'collaborative':
        return 'secondary';
      case 'private':
      default:
        return 'primary';
    }
  };

  const getWorkspaceGradient = (type, isDark = false) => {
    switch (type) {
      case 'collaborative':
        return isDark 
          ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(99, 102, 241, 0.1) 100%)';
      case 'private':
      default:
        return isDark 
          ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%)';
    }
  };

  const WorkspaceCard = ({ workspace, index }) => {
    const canUserManage = workspace.owner?._id === user?.id ||
      workspace.collaborators?.some(collab =>
        collab.user._id === user?.id && ['admin'].includes(collab.role)
      );

    return (
      <Zoom in timeout={400 + (index * 100)}>
        <Card
          className="workspace-card"
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            borderRadius: theme.shape.borderRadius,
                        border: `1px solid ${theme.palette.divider}`,
                        background: getWorkspaceGradient(workspace.type, theme.palette.mode === 'dark'),
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: theme.custom.shadows.xl,
                          borderColor: `${getWorkspaceTypeColor(workspace.type)}.main`,
              '& .workspace-actions': {
                opacity: 1,
                transform: 'translateY(0)',
              },
              '& .workspace-overlay': {
                opacity: 1,
              }
            }
          }}
        >
          {/* Background Pattern */}
          <Box
            className="workspace-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 100,
              height: 100,
              opacity: 0,
              background: `radial-gradient(circle, ${theme.palette[getWorkspaceTypeColor(workspace.type)].main}20 0%, transparent 70%)`,
              transition: 'opacity 0.3s ease-in-out',
            }}
          />

          <CardActionArea 
            onClick={() => handleWorkspaceClick(workspace)} 
            sx={{ flexGrow: 1, p: 0 }}
          >
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: `${getWorkspaceTypeColor(workspace.type)}.main`,
                      width: 56,
                      height: 56,
                      boxShadow: `0 8px 32px ${theme.palette[getWorkspaceTypeColor(workspace.type)].main}4D`,
                                            border: `3px solid ${theme.palette[getWorkspaceTypeColor(workspace.type)].main}33`,
                    }}
                  >
                    {getWorkspaceIcon(workspace.type)}
                  </Avatar>
                  
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 700, 
                          fontSize: '1.1rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }} 
                        noWrap
                      >
                        {workspace.name}
                      </Typography>
                      {workspace.isFavorite && (
                        <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                      )}
                    </Box>
                    
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip
                        size="small"
                        label={workspace.type === 'collaborative' ? '👥 Team' : '🔒 Private'}
                        color={getWorkspaceTypeColor(workspace.type)}
                        variant="filled"
                        sx={{ 
                          fontSize: '0.7rem', 
                          height: 24,
                          fontWeight: 600,
                          '& .MuiChip-label': {
                            px: 1.5,
                          }
                        }}
                      />
                      
                      <Badge
                        badgeContent={workspace.bookmarkCount || 0}
                        color="info"
                        showZero={false}
                        max={99}
                      >
                        <Chip
                          size="small"
                          label="📑 Bookmarks"
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.65rem',
                            height: 22,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                      </Badge>
                    </Stack>
                  </Box>
                </Box>
                
                {/* Action Buttons */}
                <Box 
                  className="workspace-actions"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    opacity: 0,
                    transform: 'translateY(-8px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <Tooltip title={workspace.isFavorite ? "Remove from favorites" : "Add to favorites"}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(workspace);
                      }}
                      sx={{ 
                        bgcolor: 'background.paper',
                        boxShadow: 2,
                        width: 36,
                        height: 36,
                        '&:hover': { 
                          bgcolor: 'warning.50', 
                          color: 'warning.main',
                          transform: 'scale(1.1)',
                        }
                      }}
                    >
                      {workspace.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  
                  {canUserManage && (
                    <Tooltip title="More options">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, workspace);
                        }}
                        sx={{ 
                          bgcolor: 'background.paper',
                          boxShadow: 2,
                          width: 36,
                          height: 36,
                          '&:hover': { 
                            bgcolor: 'action.hover',
                            transform: 'scale(1.1)',
                          }
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              {/* Description */}
              {workspace.description && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 3, 
                    lineHeight: 1.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {workspace.description}
                </Typography>
              )}

              {/* Team Members */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {(workspace.collaboratorCount || 0) + 1} member{(workspace.collaboratorCount || 0) + 1 !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                
                {workspace.type === 'collaborative' && workspace.collaborators?.length > 0 && (
                  <AvatarGroup 
                    max={4} 
                    sx={{
                      '& .MuiAvatar-root': {
                        width: 28,
                        height: 28,
                        fontSize: '0.75rem',
                        border: `2px solid ${theme.palette.background.paper}`,
                      }
                    }}
                  >
                    {workspace.collaborators.map((collab) => (
                      <Tooltip key={collab.user._id} title={collab.user.username} arrow>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            color: 'white',
                            fontWeight: 600,
                          }}
                        >
                          {collab.user.username?.charAt(0).toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                )}
              </Box>

              {/* Tags */}
              {workspace.tags && workspace.tags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mb: 3, flexWrap: 'wrap' }}>
                  {workspace.tags.slice(0, 3).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        fontSize: '0.65rem', 
                        height: 20,
                        borderRadius: theme.shape.borderRadius,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  ))}
                  {workspace.tags.length > 3 && (
                    <Chip
                      label={`+${workspace.tags.length - 3} more`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  )}
                </Box>
              )}

              {/* Footer */}
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Divider sx={{ mb: 2, opacity: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24, 
                        fontSize: '0.7rem',
                        bgcolor: 'primary.main',
                      }}
                    >
                      {workspace.owner?.username?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {workspace.owner?.username || 'Unknown'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      {moment(workspace.updatedAt).fromNow()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Zoom>
    );
  };

  // Show loading skeleton
  if (loading && !workspaces.length) {
    return <WorkspacesPageSkeleton />;
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
                Workspaces
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 600 }}>
                Organize and collaborate on document collections with your team
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {workspaces.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteAllWorkspaces}
                  size="large"
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Delete All
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreate}
                size="large"
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  background: theme.custom?.gradients?.primary || 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(37, 99, 235, 0.4)',
                  }
                }}
              >
                Create Workspace
              </Button>
            </Box>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { 
                title: 'Total Workspaces', 
                value: workspaces.length, 
                icon: <StorageIcon />, 
                color: 'primary',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              { 
                title: 'Team Workspaces', 
                value: workspaces.filter(w => w.type === 'collaborative').length, 
                icon: <GroupIcon />, 
                color: 'secondary',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              { 
                title: 'Private Workspaces', 
                value: workspaces.filter(w => w.type === 'private').length, 
                icon: <LockIcon />, 
                color: 'info',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              },
              { 
                title: 'Favorites', 
                value: favorites.size, 
                icon: <StarIcon />, 
                color: 'warning',
                gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
              },
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Zoom in timeout={600 + (index * 100)}>
                  <Card 
                    sx={{ 
                      p: 3, 
                      borderRadius: theme.shape.borderRadius,
                                            background: stat.gradient,
                      color: 'white',
                      border: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                      }
                    }}
                  >
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h3" sx={{ fontWeight: 800, mb: 0.5 }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, opacity: 0.9 }}>
                            {stat.title}
                          </Typography>
                        </Box>
                        <Avatar 
                          sx={{ 
                            bgcolor: 'rgba(255, 255, 255, 0.2)', 
                            width: 60, 
                            height: 60,
                            color: 'white',
                          }}
                        >
                          {stat.icon}
                        </Avatar>
                      </Box>
                    </Box>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Fade>

      {/* Error */}
      {error && (
        <Fade in>
          <Alert severity="error" sx={{ mb: 3, borderRadius: theme.shape.borderRadius }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Workspaces Display */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
        </Box>
      ) : workspaces.length > 0 ? (
        <Grid container spacing={4}>
          {workspaces.map((workspace, index) => (
            <Grid item xs={12} sm={6} md={4} xl={3} key={workspace._id}>
              <WorkspaceCard workspace={workspace} index={index} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Fade in>
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: theme.shape.borderRadius }}>
            <FolderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
              No workspaces found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
              Create your first workspace to organize documents and collaborate with your team effectively.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              size="large"
              sx={{
                borderRadius: theme.shape.borderRadius,
                                px: 4,
                                background: theme.custom.gradients.primary,
                              }}
            >
              Create Your First Workspace
            </Button>
          </Paper>
        </Fade>
      )}

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
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            minWidth: 200,
            boxShadow: theme.custom.shadows.xl,
          }
        }}
      >
        <MenuItem onClick={() => handleEdit(selectedWorkspace)}>
          <EditIcon sx={{ mr: 2 }} />
          Edit Workspace
        </MenuItem>
        <MenuItem onClick={() => handleShare(selectedWorkspace)}>
          <ShareIcon sx={{ mr: 2 }} />
          Share & Collaborate
        </MenuItem>
        <MenuItem onClick={() => handleExport(selectedWorkspace)}>
          <ExportIcon sx={{ mr: 2 }} />
          Export Documents
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDelete(selectedWorkspace)} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 2 }} />
          Delete Workspace
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog 
        open={createDialog} 
        onClose={() => setCreateDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: theme.shape.borderRadius } }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Create New Workspace
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Workspace Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            sx={{ mb: 3, mt: 1 }}
            required
            error={!createForm.name.trim()}
            helperText={!createForm.name.trim() ? 'Name is required' : 'Choose a descriptive name for your workspace'}
          />
          <TextField
            fullWidth
            label="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 3 }}
            helperText="Describe the purpose and scope of this workspace"
          />
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Workspace Type</InputLabel>
            <Select
              value={createForm.type}
              onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
              label="Workspace Type"
            >
              <SelectMenuItem value="private">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LockIcon sx={{ fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Private Workspace
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Only you can access this workspace
                    </Typography>
                  </Box>
                </Box>
              </SelectMenuItem>
              <SelectMenuItem value="collaborative">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CollaborativeIcon sx={{ fontSize: 20 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Team Workspace
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Invite team members to collaborate
                    </Typography>
                  </Box>
                </Box>
              </SelectMenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={createForm.tags.join(', ')}
            onChange={(e) => setCreateForm({
              ...createForm,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            })}
            helperText="Add tags to organize and find your workspace easily"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setCreateDialog(false)} disabled={createLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSave}
            variant="contained"
            disabled={createLoading || !createForm.name.trim()}
            startIcon={createLoading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ px: 3 }}
          >
            {createLoading ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, workspace: null })} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: theme.shape.borderRadius } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            Edit Workspace
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Workspace Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            sx={{ mb: 3, mt: 1 }}
            required
            error={!editForm.name.trim()}
            helperText={!editForm.name.trim() ? 'Name is required' : ''}
          />
          <TextField
            fullWidth
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            multiline
            rows={3}
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={editForm.tags.join(', ')}
            onChange={(e) => setEditForm({
              ...editForm,
              tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
            })}
            helperText="Add tags to organize and find your workspace easily"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, workspace: null })} disabled={editLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editLoading || !editForm.name.trim()}
            startIcon={editLoading ? <CircularProgress size={16} /> : <EditIcon />}
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete All Workspaces Confirmation Dialog */}
      <Dialog 
        open={deleteAllDialog} 
        onClose={() => setDeleteAllDialog(false)}
        PaperProps={{ sx: { borderRadius: theme.shape.borderRadius } }}
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon />
            Delete All Workspaces
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Warning! This action cannot be undone. All owned workspaces, bookmarks, and collaborations will be permanently deleted.
          </Alert>
          <Typography>
            {(() => {
              const ownedCount = workspaces.filter(workspace => workspace.owner?._id === user?.id).length;
              const collaborativeCount = workspaces.length - ownedCount;
              
              if (ownedCount === 0) {
                return 'You don\'t own any workspaces to delete. You can only delete workspaces you own.';
              } else if (collaborativeCount === 0) {
                return `Are you sure you want to delete all ${ownedCount} workspaces?`;
              } else {
                return `Are you sure you want to delete all ${ownedCount} owned workspaces? (${collaborativeCount} collaborative workspaces will be preserved)`;
              }
            })()}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteAllWorkspaces} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
            disabled={workspaces.filter(workspace => workspace.owner?._id === user?.id).length === 0}
          >
            Delete Owned Workspaces
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, workspace: null })}
        PaperProps={{ sx: { borderRadius: theme.shape.borderRadius } }}
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteIcon />
            Delete Workspace
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. All bookmarks and collaborations will be permanently deleted.
          </Alert>
          <Typography>
            Are you sure you want to delete <strong>"{deleteDialog.workspace?.name}"</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, workspace: null })}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" startIcon={<DeleteIcon />}>
            Delete Workspace
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialog.open}
        onClose={() => setExportDialog({ open: false, workspaceId: null })}
        workspaceId={exportDialog.workspaceId}
        mode="workspace"
      />
  </Box>
  );
};

export default WorkspacesPage;
