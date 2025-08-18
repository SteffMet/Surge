import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import {
  HealthAndSafety as HealthIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  AutoFixHigh as AutoFixIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  PlayArrow as ExecuteIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import automationService from '../../services/automationService';

const WorkspaceHealthDashboard = ({ workspaceId, onClose }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [executeDialog, setExecuteDialog] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      loadHealthData();
    }
  }, [workspaceId]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await automationService.getWorkspaceHealthCheck(workspaceId);
      setHealthData(response.data);
    } catch (err) {
      setError('Failed to load workspace health data');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAutomation = async () => {
    try {
      setExecuting(true);
      await automationService.executeAutomatedTasks(workspaceId);
      setExecuteDialog(false);
      // Refresh data after execution
      await loadHealthData();
    } catch (err) {
      console.error('Automation execution error:', err);
    } finally {
      setExecuting(false);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getHealthScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Attention';
    return 'Poor';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <ErrorIcon />;
      case 'medium': return <WarningIcon />;
      case 'low': return <InfoIcon />;
      default: return <CheckIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={loadHealthData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealthIcon color="primary" />
          Workspace Health Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadHealthData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<ExecuteIcon />}
            onClick={() => setExecuteDialog(true)}
            disabled={executing}
          >
            Run Automation
          </Button>
        </Box>
      </Box>

      {/* Health Score Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={healthData?.healthScore || 0}
                  size={120}
                  thickness={4}
                  sx={{ color: getHealthScoreColor(healthData?.healthScore || 0) }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}
                >
                  <Typography variant="h3" component="div" color="text.primary">
                    {healthData?.healthScore || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Health Score
                  </Typography>
                </Box>
              </Box>
              <Typography 
                variant="h6" 
                sx={{ mt: 2, color: getHealthScoreColor(healthData?.healthScore || 0) }}
              >
                {getHealthScoreLabel(healthData?.healthScore || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall workspace health rating
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Content Freshness
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Freshness Score
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {healthData?.freshness?.score || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={healthData?.freshness?.score || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: automationService.getFreshnessScoreColor(healthData?.freshness?.score || 0)
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {automationService.getFreshnessScoreLabel(healthData?.freshness?.score || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Documents
              </Typography>
              <Typography variant="h3" color="primary.main">
                {healthData?.freshness?.total || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Documents in workspace
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Freshness Breakdown" />
          <Tab label="Workflow Suggestions" />
          <Tab label="Recommendations" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && healthData?.freshness?.breakdown && (
        <Grid container spacing={3}>
          {Object.entries(healthData.freshness.breakdown).map(([status, data]) => (
            <Grid item xs={12} md={4} key={status}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                    {status} Content
                  </Typography>
                  <Typography variant="h4" color={status === 'fresh' ? 'success.main' : status === 'aging' ? 'warning.main' : 'error.main'}>
                    {data.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {((data.count / healthData.freshness.total) * 100).toFixed(1)}% of total
                  </Typography>
                  
                  {data.documents && data.documents.length > 0 && (
                    <List dense>
                      {data.documents.slice(0, 3).map((doc, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" noWrap>
                                {doc.title}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                      {data.documents.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{data.documents.length - 3} more
                        </Typography>
                      )}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Workflow Suggestions
              </Typography>
              {healthData?.workflowSuggestions && healthData.workflowSuggestions.length > 0 ? (
                <List>
                  {healthData.workflowSuggestions.map((suggestion, index) => (
                    <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                      <ListItemIcon>
                        {getPriorityIcon(suggestion.priority)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {suggestion.title}
                            </Typography>
                            <Chip
                              label={suggestion.priority}
                              size="small"
                              color={getPriorityColor(suggestion.priority)}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {suggestion.description}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                              Action: {suggestion.action}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="success">
                  No workflow suggestions at this time. Your workspace is running smoothly!
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {healthData?.freshness?.recommendations && healthData.freshness.recommendations.length > 0 ? (
                <List>
                  {healthData.freshness.recommendations.map((rec, index) => (
                    <ListItem key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 2 }}>
                      <ListItemIcon>
                        {getPriorityIcon(rec.priority)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {rec.message}
                            </Typography>
                            <Chip
                              label={rec.priority}
                              size="small"
                              color={getPriorityColor(rec.priority)}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {rec.action}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="success">
                  No specific recommendations at this time. Keep up the good work!
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Execute Automation Dialog */}
      <Dialog open={executeDialog} onClose={() => setExecuteDialog(false)}>
        <DialogTitle>Execute Automated Tasks</DialogTitle>
        <DialogContent>
          <Typography>
            This will run automated maintenance tasks for your workspace, including:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckIcon /></ListItemIcon>
              <ListItemText primary="Detect and flag stale content" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon /></ListItemIcon>
              <ListItemText primary="Generate content improvement suggestions" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckIcon /></ListItemIcon>
              <ListItemText primary="Update analytics and insights" />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This process may take a few minutes depending on workspace size.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExecuteAutomation}
            disabled={executing}
            startIcon={executing ? <CircularProgress size={16} /> : <ExecuteIcon />}
          >
            {executing ? 'Running...' : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkspaceHealthDashboard;