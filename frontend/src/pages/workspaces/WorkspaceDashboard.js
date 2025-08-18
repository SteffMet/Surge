import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tab,
  Tabs,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Menu,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Folder as FolderIcon,
  Description as DocumentIcon,
  Upload as UploadIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Bookmark as BookmarkIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  FilterList as FilterListIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Home as HomeIcon,
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import moment from 'moment';

import { useAuth } from '../../services/AuthContext';
import LoadingStates from '../../components/ui/LoadingStates';
import FeedbackSystem, { FeedbackTypes, FeedbackMessages } from '../../components/ui/FeedbackSystem';
import { workspacesAPI, documentsAPI, handleApiError } from '../../services/api';
import DocumentUpload from '../../components/DocumentUpload';
import WorkspaceSettings from '../../components/WorkspaceSettings';
import DocumentPreview from '../../components/DocumentPreview';
import WorkspaceHealthDashboard from '../../components/automation/WorkspaceHealthDashboard';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workspace-tabpanel-${index}`}
      aria-labelledby={`workspace-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const WorkspaceDashboard = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Document management state
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Dialog states
  const [uploadDialog, setUploadDialog] = useState(false);
  const [createFolderDialog, setCreateFolderDialog] = useState(false);
  const [collaboratorDialog, setCollaboratorDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState({ open: false, bookmark: null });

  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [folderForm, setFolderForm] = useState({ name: '', description: '' });
  const [collaboratorForm, setCollaboratorForm] = useState({ email: '', role: 'viewer' });
  
  // Health dashboard state
  const [healthDashboardOpen, setHealthDashboardOpen] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadWorkspace();
      loadBookmarks();
    }
  }, [workspaceId]);

  const loadWorkspace = async (retryCount = 0) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await workspacesAPI.getWorkspace(workspaceId);
      
      if (!response.data) {
        throw new Error('Invalid response from server');
      }
      
      setWorkspace(response.data);
    } catch (err) {
      console.error('Error loading workspace:', err);
      
      // Enhanced error handling with specific messages
      let errorMessage = '';
      let showRetry = false;
      
      if (err.response?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view this workspace.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Workspace not found. It may have been deleted or you may not have access.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
        showRetry = true;
      } else if (!err.response) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
        showRetry = true;
      } else {
        errorMessage = handleApiError(err);
        showRetry = true;
      }
      
      setError(errorMessage);
      
      // Implement retry for server errors and network issues
      const maxRetries = 3;
      if (showRetry && retryCount < maxRetries && (err.response?.status >= 500 || !err.response)) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        
        setTimeout(() => {
          loadWorkspace(retryCount + 1);
        }, retryDelay);
        return;
      }
      
      // Show snackbar with action for certain errors
      if (err.response?.status === 403 || err.response?.status === 404) {
        enqueueSnackbar(errorMessage, { 
          variant: 'error',
          autoHideDuration: 10000,
          action: (snackbarId) => (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                enqueueSnackbar.closeSnackbar(snackbarId);
                navigate('/workspaces');
              }}
            >
              Back to Workspaces
            </Button>
          )
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async (parentFolder = null) => {
    setBookmarksLoading(true);
    
    try {
      const params = {
        ...(parentFolder && { parentFolder }),
        ...(searchQuery && { search: searchQuery }),
        ...(filterType !== 'all' && { type: filterType }),
      };
      
      const response = await workspacesAPI.getBookmarks(workspaceId, params);
      setBookmarks(response.data.bookmarks);
    } catch (err) {
      console.error('Error loading bookmarks:', err);
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    } finally {
      setBookmarksLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackToWorkspaces = () => {
    navigate('/workspaces');
  };

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder);
    setBreadcrumbs([...breadcrumbs, folder]);
    loadBookmarks(folder._id);
  };

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Root folder
      setCurrentFolder(null);
      setBreadcrumbs([]);
      loadBookmarks();
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1] || null);
      loadBookmarks(newBreadcrumbs[newBreadcrumbs.length - 1]?._id);
    }
  };

  const handleMenuOpen = (event, item) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleCreateFolder = async () => {
    if (!folderForm.name.trim()) {
      enqueueSnackbar('Folder name is required', { variant: 'error' });
      return;
    }

    try {
      const folderData = {
        title: folderForm.name,
        description: folderForm.description,
        type: 'folder',
        parentFolder: currentFolder?._id,
      };

      await workspacesAPI.createBookmark(workspaceId, folderData);
      enqueueSnackbar('Folder created successfully', { variant: 'success' });
      setCreateFolderDialog(false);
      setFolderForm({ name: '', description: '' });
      loadBookmarks(currentFolder?._id);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorForm.email.trim()) {
      enqueueSnackbar('Email is required', { variant: 'error' });
      return;
    }

    try {
      await workspacesAPI.addCollaborator(workspaceId, collaboratorForm);
      enqueueSnackbar('Collaborator added successfully', { variant: 'success' });
      setCollaboratorDialog(false);
      setCollaboratorForm({ email: '', role: 'viewer' });
      loadWorkspace(); // Refresh workspace data
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const toggleBookmarkFavorite = async (bookmark) => {
    try {
      await workspacesAPI.updateBookmark(workspaceId, bookmark._id, {
        isFavorite: !bookmark.isFavorite
      });
      loadBookmarks(currentFolder?._id);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const deleteBookmark = async (bookmark) => {
    try {
      await workspacesAPI.deleteBookmark(workspaceId, bookmark._id);
      enqueueSnackbar('Item deleted successfully', { variant: 'success' });
      loadBookmarks(currentFolder?._id);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleDragStart = (e, bookmark) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: bookmark._id,
      title: bookmark.title,
      type: bookmark.type,
      sourceFolder: currentFolder?._id || null
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      // Don't allow dropping on the same folder or dropping a folder onto itself
      if (dragData.sourceFolder === (targetFolder?._id || null) ||
          dragData.id === targetFolder?._id) {
        return;
      }
      
      // Update the bookmark's parent folder
      await workspacesAPI.updateBookmark(workspaceId, dragData.id, {
        parentFolder: targetFolder?._id || null
      });
      
      enqueueSnackbar(
        `Moved "${dragData.title}" to ${targetFolder ? targetFolder.title : 'root folder'}`,
        { variant: 'success' }
      );
      
      // Refresh the current folder view
      loadBookmarks(currentFolder?._id);
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const getFileIcon = (bookmark) => {
    switch (bookmark.type) {
      case 'folder':
        return <FolderIcon />;
      case 'document':
        const mimeType = bookmark.metadata?.documentInfo?.mimeType || '';
        if (mimeType.includes('pdf')) return <PdfIcon />;
        if (mimeType.includes('image')) return <ImageIcon />;
        if (mimeType.includes('video')) return <VideoIcon />;
        if (mimeType.includes('audio')) return <AudioIcon />;
        return <FileIcon />;
      case 'external_link':
        return <ShareIcon />;
      default:
        return <BookmarkIcon />;
    }
  };

  const getFileSize = (size) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    if (size < 1024 * 1024 * 1024) return `${Math.round(size / (1024 * 1024))} MB`;
    return `${Math.round(size / (1024 * 1024 * 1024))} GB`;
  };

  const getUserRole = () => {
    if (!workspace || !user) return null;
    if (workspace.owner._id === user.id) return 'admin';
    const collaborator = workspace.collaborators?.find(c => c.user._id === user.id);
    return collaborator?.role || null;
  };

  const canManageWorkspace = () => {
    const role = getUserRole();
    return role === 'admin';
  };

  const canEditContent = () => {
    const role = getUserRole();
    return ['admin', 'editor'].includes(role);
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return bookmark.title.toLowerCase().includes(searchLower) ||
             (bookmark.description && bookmark.description.toLowerCase().includes(searchLower)) ||
             (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchLower)));
    }
    return true;
  });

  const DocumentGrid = ({ bookmarks }) => (
    <Grid container spacing={2}>
      {bookmarks.map((bookmark) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={bookmark._id}>
          <Card
            sx={{
              height: '100%',
              cursor: bookmark.type === 'folder' || bookmark.type === 'document' ? 'pointer' : 'default',
              '&:hover': { transform: 'translateY(-2px)' },
              transition: 'transform 0.2s ease-in-out'
            }}
            draggable={canEditContent()}
            onDragStart={(e) => canEditContent() && handleDragStart(e, bookmark)}
            onDragOver={bookmark.type === 'folder' ? handleDragOver : undefined}
            onDrop={bookmark.type === 'folder' ? (e) => handleDrop(e, bookmark) : undefined}
            onClick={(e) => {
              // Don't trigger click during drag operations
              if (e.defaultPrevented) return;
              
              if (bookmark.type === 'folder') {
                handleFolderClick(bookmark);
              } else if (bookmark.type === 'document') {
                setPreviewDialog({ open: true, bookmark });
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Avatar sx={{ bgcolor: bookmark.type === 'folder' ? 'primary.main' : 'secondary.main' }}>
                  {getFileIcon(bookmark)}
                </Avatar>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {bookmark.isFavorite && (
                    <StarIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                  )}
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, bookmark);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }} noWrap>
                {bookmark.title}
              </Typography>
              {bookmark.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.4 }}>
                  {bookmark.description.length > 80 
                    ? `${bookmark.description.substring(0, 80)}...`
                    : bookmark.description}
                </Typography>
              )}
              {bookmark.metadata?.documentInfo?.size && (
                <Typography variant="caption" color="text.secondary">
                  {getFileSize(bookmark.metadata.documentInfo.size)}
                </Typography>
              )}
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {moment(bookmark.updatedAt).fromNow()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {bookmark.createdBy?.username}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const DocumentList = ({ bookmarks }) => (
    <List>
      {bookmarks.map((bookmark) => (
        <ListItem
          key={bookmark._id}
          button={bookmark.type === 'folder' || bookmark.type === 'document'}
          draggable={canEditContent()}
          onDragStart={(e) => canEditContent() && handleDragStart(e, bookmark)}
          onDragOver={bookmark.type === 'folder' ? handleDragOver : undefined}
          onDrop={bookmark.type === 'folder' ? (e) => handleDrop(e, bookmark) : undefined}
          onClick={(e) => {
            // Don't trigger click during drag operations
            if (e.defaultPrevented) return;
            
            if (bookmark.type === 'folder') {
              handleFolderClick(bookmark);
            } else if (bookmark.type === 'document') {
              setPreviewDialog({ open: true, bookmark });
            }
          }}
          sx={{
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 1,
            mb: 1,
            '&:hover': { backgroundColor: 'grey.50' }
          }}
        >
          <ListItemIcon>
            {getFileIcon(bookmark)}
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {bookmark.title}
                {bookmark.isFavorite && <StarIcon sx={{ color: 'warning.main', fontSize: 16 }} />}
                {bookmark.tags && bookmark.tags.map(tag => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            }
            secondary={
              <Box>
                {bookmark.description && <Typography variant="body2">{bookmark.description}</Typography>}
                <Typography variant="caption" color="text.secondary">
                  Modified {moment(bookmark.updatedAt).fromNow()} by {bookmark.createdBy?.username}
                  {bookmark.metadata?.documentInfo?.size && ` • ${getFileSize(bookmark.metadata.documentInfo.size)}`}
                </Typography>
              </Box>
            }
          />
          <ListItemSecondaryAction>
            <IconButton onClick={(e) => handleMenuOpen(e, bookmark)}>
              <MoreVertIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );

  const CollaboratorsPanel = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Team Members</Typography>
        {canManageWorkspace() && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCollaboratorDialog(true)}
          >
            Add Member
          </Button>
        )}
      </Box>
      
      <List>
        {/* Owner */}
        <ListItem>
          <ListItemIcon>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {workspace?.owner?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={workspace?.owner?.username}
            secondary="Owner"
          />
          <Chip label="Admin" color="error" size="small" />
        </ListItem>
        
        {/* Collaborators */}
        {workspace?.collaborators?.map((collaborator) => (
          <ListItem key={collaborator.user._id}>
            <ListItemIcon>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                {collaborator.user.username?.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={collaborator.user.username}
              secondary={`Added ${moment(collaborator.addedAt).fromNow()}`}
            />
            <Chip 
              label={collaborator.role} 
              color={collaborator.role === 'admin' ? 'error' : collaborator.role === 'editor' ? 'warning' : 'default'}
              size="small" 
            />
            {canManageWorkspace() && (
              <IconButton sx={{ ml: 1 }}>
                <MoreVertIcon />
              </IconButton>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const AnalyticsPanel = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Storage Usage</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress variant="determinate" value={65} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                65%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              1.2 GB of 2 GB used
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Activity Overview</Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Total Bookmarks</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {workspace?.bookmarkCount || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Team Members</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {(workspace?.collaboratorCount || 0) + 1}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Created</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {moment(workspace?.createdAt).format('MMM DD, YYYY')}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return <LoadingStates.WorkspaceLoading />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            error.includes('Server error') || error.includes('Network connection') ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => loadWorkspace()}
                startIcon={<ArrowBackIcon />}
              >
                Retry
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            onClick={handleBackToWorkspaces} 
            startIcon={<ArrowBackIcon />}
          >
            Back to Workspaces
          </Button>
          {(error.includes('Server error') || error.includes('Network connection')) && (
            <Button 
              variant="outlined" 
              onClick={() => loadWorkspace()}
            >
              Try Again
            </Button>
          )}
        </Stack>
      </Box>
    );
  }

  if (!workspace) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Workspace not found</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBackToWorkspaces}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {workspace.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {workspace.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Workspace Health">
            <Button
              variant="outlined"
              size="small"
              startIcon={<HealthIcon />}
              onClick={() => setHealthDashboardOpen(true)}
            >
              Health
            </Button>
          </Tooltip>
          {canManageWorkspace() && (
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setSettingsDialog(true)}
            >
              Settings
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<PeopleIcon />}
            onClick={() => setCollaboratorDialog(true)}
          >
            Collaborators
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab icon={<FolderIcon />} label="Documents & Folders" />
          <Tab icon={<PeopleIcon />} label="Collaborators" />
          <Tab icon={<AnalyticsIcon />} label="Analytics" />
          <Tab icon={<HealthIcon />} label="Health" />
        </Tabs>
      </Paper>

      {/* Documents & Folders Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs>
              <Link
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(-1)}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                Root
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <Link
                  key={crumb._id}
                  component="button"
                  variant="body2"
                  onClick={() => handleBreadcrumbClick(index)}
                >
                  {crumb.title}
                </Link>
              ))}
            </Breadcrumbs>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Search */}
            <TextField
              size="small"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ width: 200 }}
            />

            {/* Filter */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Filter"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="folder">Folders</MenuItem>
                <MenuItem value="document">Documents</MenuItem>
                <MenuItem value="external_link">Links</MenuItem>
              </Select>
            </FormControl>

            {/* View Mode */}
            <IconButton
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              color={viewMode === 'grid' ? 'primary' : 'default'}
            >
              {viewMode === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>

            {/* Actions */}
            {canEditContent() && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={() => setCreateFolderDialog(true)}
                >
                  New Folder
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialog(true)}
                >
                  Upload
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Content */}
        <Box
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, currentFolder)}
          sx={{ minHeight: 200 }}
        >
          {bookmarksLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredBookmarks.length > 0 ? (
            viewMode === 'grid' ? (
              <DocumentGrid bookmarks={filteredBookmarks} />
            ) : (
              <DocumentList bookmarks={filteredBookmarks} />
            )
          ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {searchQuery ? 'No results found' : 'This folder is empty'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Start by uploading documents or creating folders'}
            </Typography>
            {canEditContent() && !searchQuery && (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<FolderIcon />}
                  onClick={() => setCreateFolderDialog(true)}
                >
                  Create Folder
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploadDialog(true)}
                >
                  Upload Documents
                </Button>
              </Box>
            )}
          </Paper>
        )}
        </Box>
      </TabPanel>

      {/* Collaborators Tab */}
      <TabPanel value={tabValue} index={1}>
        <CollaboratorsPanel />
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <AnalyticsPanel />
      </TabPanel>

      {/* Health Tab */}
      <TabPanel value={tabValue} index={3}>
        <WorkspaceHealthDashboard 
          workspaceId={workspaceId}
          workspaceName={workspace.name}
        />
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => toggleBookmarkFavorite(selectedItem)}>
          {selectedItem?.isFavorite ? <StarBorderIcon sx={{ mr: 1 }} /> : <StarIcon sx={{ mr: 1 }} />}
          {selectedItem?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuItem>
        {selectedItem?.type === 'document' && (
          <MenuItem onClick={() => {}}>
            <DownloadIcon sx={{ mr: 1 }} />
            Download
          </MenuItem>
        )}
        {canEditContent() && (
          <>
            <MenuItem onClick={() => {}}>
              <EditIcon sx={{ mr: 1 }} />
              Rename
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => deleteBookmark(selectedItem)} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Documents</DialogTitle>
        <DialogContent>
          <DocumentUpload
            workspaceId={workspaceId}
            parentFolder={currentFolder?._id}
            onUploadComplete={() => {
              setUploadDialog(false);
              loadBookmarks(currentFolder?._id);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialog} onClose={() => setCreateFolderDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Folder Name"
            value={folderForm.name}
            onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={folderForm.description}
            onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateFolderDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateFolder} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Collaborator Dialog */}
      <Dialog open={collaboratorDialog} onClose={() => setCollaboratorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Collaborator</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            value={collaboratorForm.email}
            onChange={(e) => setCollaboratorForm({ ...collaboratorForm, email: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={collaboratorForm.role}
              onChange={(e) => setCollaboratorForm({ ...collaboratorForm, role: e.target.value })}
              label="Role"
            >
              <MenuItem value="viewer">Viewer - Can view documents</MenuItem>
              <MenuItem value="editor">Editor - Can add and edit documents</MenuItem>
              <MenuItem value="admin">Admin - Can manage workspace</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollaboratorDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddCollaborator} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workspace Settings Dialog */}
      <WorkspaceSettings
        open={settingsDialog}
        onClose={() => setSettingsDialog(false)}
        workspace={workspace}
        onWorkspaceUpdate={loadWorkspace}
      />

      {/* Document Preview Dialog */}
      <DocumentPreview
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, bookmark: null })}
        bookmark={previewDialog.bookmark}
        workspaceId={workspaceId}
        onBookmarkUpdate={() => loadBookmarks(currentFolder?._id)}
      />

      {/* Health Dashboard Dialog */}
      <Dialog 
        open={healthDashboardOpen} 
        onClose={() => setHealthDashboardOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HealthIcon />
            Workspace Health Dashboard
          </Box>
        </DialogTitle>
        <DialogContent>
          <WorkspaceHealthDashboard 
            workspaceId={workspaceId}
            workspaceName={workspace.name}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHealthDashboardOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceDashboard;