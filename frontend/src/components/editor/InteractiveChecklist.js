import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  IconButton,
  LinearProgress,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  MoreVert,
  Add,
  Delete,
  Edit,
  Schedule,
  Person,
  Flag,
  CheckCircle
} from '@mui/icons-material';

const InteractiveChecklist = ({
  title,
  items = [],
  onUpdate,
  editable = false,
  showProgress = true,
  allowAssignment = false,
  users = [],
  onAssign,
  completedColor = 'success'
}) => {
  const [checkedItems, setCheckedItems] = useState(() => {
    const checked = {};
    items.forEach((item, index) => {
      checked[index] = item.completed || false;
    });
    return checked;
  });

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const handleItemToggle = useCallback((index) => {
    const newCheckedItems = {
      ...checkedItems,
      [index]: !checkedItems[index]
    };
    setCheckedItems(newCheckedItems);

    // Update the items array with completion status
    const updatedItems = items.map((item, i) => ({
      ...item,
      completed: newCheckedItems[i] || false,
      completedAt: newCheckedItems[i] ? new Date().toISOString() : null
    }));

    if (onUpdate) {
      onUpdate(updatedItems);
    }
  }, [checkedItems, items, onUpdate]);

  const handleMenuOpen = (event, index) => {
    setMenuAnchor(event.currentTarget);
    setSelectedItemIndex(index);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedItemIndex(null);
  };

  const handleEditItem = () => {
    const item = items[selectedItemIndex];
    setEditingItem({ ...item, index: selectedItemIndex });
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteItem = () => {
    if (selectedItemIndex !== null) {
      const updatedItems = items.filter((_, index) => index !== selectedItemIndex);
      const newCheckedItems = {};
      updatedItems.forEach((_, index) => {
        const originalIndex = index >= selectedItemIndex ? index + 1 : index;
        newCheckedItems[index] = checkedItems[originalIndex] || false;
      });
      setCheckedItems(newCheckedItems);
      
      if (onUpdate) {
        onUpdate(updatedItems);
      }
    }
    handleMenuClose();
  };

  const handleAssignItem = () => {
    setAssignDialogOpen(true);
    handleMenuClose();
  };

  const handleSaveEdit = () => {
    if (editingItem && editingItem.text.trim()) {
      const updatedItems = items.map((item, index) => 
        index === editingItem.index 
          ? { ...item, text: editingItem.text, priority: editingItem.priority }
          : item
      );
      
      if (onUpdate) {
        onUpdate(updatedItems);
      }
    }
    setEditDialogOpen(false);
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (newItemText.trim()) {
      const newItem = {
        text: newItemText,
        completed: false,
        priority: 'normal',
        createdAt: new Date().toISOString()
      };
      
      const updatedItems = [...items, newItem];
      setCheckedItems({
        ...checkedItems,
        [items.length]: false
      });
      
      if (onUpdate) {
        onUpdate(updatedItems);
      }
      
      setNewItemText('');
    }
  };

  const handleAssignment = (userId) => {
    if (selectedItemIndex !== null && onAssign) {
      onAssign(selectedItemIndex, userId);
    }
    setAssignDialogOpen(false);
  };

  // Calculate progress
  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {showProgress && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {completedCount}/{totalCount}
            </Typography>
            {totalCount === completedCount && totalCount > 0 && (
              <CheckCircle color="success" />
            )}
          </Box>
        )}
      </Box>

      {/* Progress bar */}
      {showProgress && totalCount > 0 && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage}
            color={completedCount === totalCount ? completedColor : 'primary'}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {Math.round(progressPercentage)}% complete
          </Typography>
        </Box>
      )}

      {/* Checklist items */}
      <Box sx={{ mb: editable ? 2 : 0 }}>
        {items.map((item, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              py: 1,
              px: 1,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              },
              opacity: checkedItems[index] ? 0.7 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            <Checkbox
              checked={checkedItems[index] || false}
              onChange={() => handleItemToggle(index)}
              sx={{ mr: 1, mt: -0.5 }}
            />
            
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="body1"
                sx={{
                  textDecoration: checkedItems[index] ? 'line-through' : 'none',
                  wordBreak: 'break-word'
                }}
              >
                {item.text}
              </Typography>
              
              {/* Item metadata */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {item.priority && item.priority !== 'normal' && (
                  <Chip
                    label={item.priority}
                    size="small"
                    color={getPriorityColor(item.priority)}
                    variant="outlined"
                  />
                )}
                
                {item.assignedTo && (
                  <Chip
                    icon={<Person />}
                    label={item.assignedTo.username || item.assignedTo}
                    size="small"
                    variant="outlined"
                  />
                )}
                
                {item.dueDate && (
                  <Chip
                    icon={<Schedule />}
                    label={new Date(item.dueDate).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                    color={new Date(item.dueDate) < new Date() ? 'error' : 'default'}
                  />
                )}
                
                {checkedItems[index] && item.completedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Completed {new Date(item.completedAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Box>

            {editable && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, index)}
                sx={{ ml: 1 }}
              >
                <MoreVert />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>

      {/* Add new item */}
      {editable && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Add new item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              }
            }}
            sx={{ flexGrow: 1 }}
          />
          <IconButton
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            color="primary"
          >
            <Add />
          </IconButton>
        </Box>
      )}

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditItem}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {allowAssignment && (
          <MenuItem onClick={handleAssignItem}>
            <Person sx={{ mr: 1 }} />
            Assign
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteItem} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Edit item dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={editingItem?.text || ''}
            onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            select
            label="Priority"
            value={editingItem?.priority || 'normal'}
            onChange={(e) => setEditingItem({ ...editingItem, priority: e.target.value })}
            fullWidth
            variant="outlined"
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Assignment dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Choose a user to assign this item to:
          </Typography>
          {users.map((user) => (
            <MenuItem key={user.id} onClick={() => handleAssignment(user.id)}>
              <Person sx={{ mr: 1 }} />
              {user.username}
            </MenuItem>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default InteractiveChecklist;