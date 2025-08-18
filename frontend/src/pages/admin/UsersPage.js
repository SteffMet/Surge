import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Upload as UploadIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import moment from 'moment';

import { useAuth } from '../../services/AuthContext';
import { usersAPI, handleApiError } from '../../services/api';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null });
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'basic',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    basicUpload: 0,
    basic: 0
  });

  useEffect(() => {
    loadUsers();
    loadStats();
  }, [page, rowsPerPage, searchQuery, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        role: roleFilter,
        status: statusFilter,
      };

      const response = await usersAPI.getUsers(params);
      const data = response.data;

      setUsers(data.users || []);
      setTotalUsers(data.total || 0);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await usersAPI.getUserStats();
      setStats(response.data);
    } catch (err) {
      console.warn('Could not load user stats:', err);
    }
  };

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleCreateUser = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'basic',
      isActive: true
    });
    setFormErrors({});
    setCreateDialog(true);
  };

  const handleEditUser = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    setFormErrors({});
    setEditDialog({ open: true, user });
    handleMenuClose();
  };

  const handleDeleteUser = (user) => {
    setDeleteDialog({ open: true, user });
    handleMenuClose();
  };

  const handleChangePassword = (user) => {
    setPasswordDialog({ open: true, user });
    handleMenuClose();
  };

  const validateForm = (isEdit = false) => {
    const errors = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!isEdit && !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (!isEdit && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) return;

    try {
      await usersAPI.createUser(formData);
      enqueueSnackbar('User created successfully', { variant: 'success' });
      setCreateDialog(false);
      loadUsers();
      loadStats();
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm(true)) return;

    try {
      const { password, ...updateData } = formData;
      await usersAPI.updateUser(editDialog.user._id, updateData);
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      setEditDialog({ open: false, user: null });
      loadUsers();
      loadStats();
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleSubmitDelete = async () => {
    try {
      await usersAPI.deleteUser(deleteDialog.user._id);
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      setDeleteDialog({ open: false, user: null });
      loadUsers();
      loadStats();
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const handleSubmitPasswordChange = async () => {
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword || newPassword.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters', { variant: 'error' });
      return;
    }

    try {
      await usersAPI.changePassword(passwordDialog.user._id, { password: newPassword });
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      setPasswordDialog({ open: false, user: null });
    } catch (err) {
      enqueueSnackbar(handleApiError(err), { variant: 'error' });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'basic-upload':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <AdminIcon />;
      case 'basic-upload':
        return <UploadIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'basic-upload':
        return 'Upload';
      default:
        return 'Basic';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 600 }}>
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user accounts, roles, and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
          size="large"
        >
          Add User
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Total Users"
            value={stats.total}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Active Users"
            value={stats.active}
            icon={<PersonIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Administrators"
            value={stats.admins}
            icon={<AdminIcon />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Upload Users"
            value={stats.basicUpload}
            icon={<UploadIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Basic Users"
            value={stats.basic}
            icon={<PersonIcon />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Role"
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="basic-upload">Upload</MenuItem>
                <MenuItem value="basic">Basic</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            user._id === currentUser?._id ? (
                              <Chip label="You" size="small" color="primary" />
                            ) : null
                          }
                        >
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.username.charAt(0).toUpperCase()}
                          </Avatar>
                        </Badge>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user._id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        {user.email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {moment(user.createdAt).format('MMM DD, YYYY')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {moment(user.createdAt).fromNow()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastLogin ? moment(user.lastLogin).format('MMM DD, YYYY') : 'Never'}
                      </Typography>
                      {user.lastLogin && (
                        <Typography variant="caption" color="text.secondary">
                          {moment(user.lastLogin).fromNow()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, user)}
                        disabled={user._id === currentUser?._id}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalUsers}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEditUser(selectedUser)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit User
        </MenuItem>
        <MenuItem onClick={() => handleChangePassword(selectedUser)}>
          <LockIcon sx={{ mr: 1 }} />
          Change Password
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDeleteUser(selectedUser)} 
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete User
        </MenuItem>
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                error={!!formErrors.username}
                helperText={formErrors.username}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={!!formErrors.password}
                helperText={formErrors.password}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="basic-upload">Basic + Upload</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitCreate} variant="contained">
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, user: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                error={!!formErrors.username}
                helperText={formErrors.username}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="basic-upload">Basic + Upload</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value })}
                  label="Status"
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, user: null })}>Cancel</Button>
          <Button onClick={handleSubmitEdit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, user: null })}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{deleteDialog.user?.username}"? 
            This action cannot be undone and will remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button onClick={handleSubmitDelete} color="error" variant="contained">
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog.open} onClose={() => setPasswordDialog({ open: false, user: null })}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Change password for user "{passwordDialog.user?.username}"
          </Typography>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            id="new-password"
            helperText="Password must be at least 6 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog({ open: false, user: null })}>
            Cancel
          </Button>
          <Button onClick={handleSubmitPasswordChange} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;