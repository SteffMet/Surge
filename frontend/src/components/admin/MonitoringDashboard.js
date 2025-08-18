import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Button,
  TextField,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  Search as SearchIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

import loggingService, { LOG_LEVELS, ERROR_CATEGORIES } from '../../services/loggingService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const MonitoringDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date()
  });
  const [logLevel, setLogLevel] = useState('ALL');
  const [logCategory, setLogCategory] = useState('ALL');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current session metrics
      const currentMetrics = loggingService.getPerformanceMetrics();
      
      // Fetch backend data
      const [logsResponse, metricsResponse] = await Promise.all([
        fetch(`/api/admin/logs?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}&level=${logLevel}&category=${logCategory}`),
        fetch(`/api/admin/metrics?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`)
      ]);

      if (!logsResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const [logsData, metricsData] = await Promise.all([
        logsResponse.json(),
        metricsResponse.json()
      ]);

      setLogs(logsData.logs || []);
      setMetrics({
        ...currentMetrics,
        backend: metricsData
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = async () => {
    try {
      const response = await fetch(`/api/admin/logs/download?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}&level=${logLevel}&category=${logCategory}`);
      
      if (!response.ok) {
        throw new Error('Failed to download logs');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `surge-logs-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading logs:', err);
      setError(err.message);
    }
  };

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'DEBUG': return 'default';
      case 'INFO': return 'info';
      case 'WARN': return 'warning';
      case 'ERROR': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'default';
    }
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'DEBUG': return <InfoIcon fontSize="small" />;
      case 'INFO': return <InfoIcon fontSize="small" />;
      case 'WARN': return <WarningIcon fontSize="small" />;
      case 'ERROR': return <ErrorIcon fontSize="small" />;
      case 'CRITICAL': return <ErrorIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  const renderOverviewTab = () => {
    if (!metrics) return null;

    const errorRate = metrics.errors.total > 0 ? 
      ((metrics.errors.total / (metrics.apiCalls.length || 1)) * 100).toFixed(2) : 0;

    const avgApiResponseTime = metrics.apiCalls.length > 0 ?
      (metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length).toFixed(2) : 0;

    return (
      <Grid container spacing={3}>
        {/* Key Metrics Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SpeedIcon color="primary" />
                <Typography variant="h6">Performance</Typography>
              </Stack>
              <Typography variant="h4" color="primary">
                {avgApiResponseTime}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg API Response Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ErrorIcon color="error" />
                <Typography variant="h6">Errors</Typography>
              </Stack>
              <Typography variant="h4" color="error">
                {metrics.errors.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last 24 Hours ({errorRate}% rate)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SearchIcon color="info" />
                <Typography variant="h6">Searches</Typography>
              </Stack>
              <Typography variant="h4" color="info">
                {metrics.searchQueries.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Search Queries
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PersonIcon color="success" />
                <Typography variant="h6">Session</Typography>
              </Stack>
              <Typography variant="h4" color="success">
                {Math.round(metrics.sessionDuration / 1000 / 60)}m
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Session
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>API Response Times</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.apiCalls.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`${value}ms`, 'Response Time']} />
                <Legend />
                <Line type="monotone" dataKey="duration" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Error Categories</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(metrics.errors.categories).map(([category, count]) => ({
                    name: category,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(metrics.errors.categories).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  const renderLogsTab = () => {
    return (
      <Box>
        {/* Log Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              select
              label="Log Level"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="ALL">All Levels</MenuItem>
              {Object.keys(LOG_LEVELS).map((level) => (
                <MenuItem key={level} value={level}>{level}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Category"
              value={logCategory}
              onChange={(e) => setLogCategory(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ALL">All Categories</MenuItem>
              {Object.values(ERROR_CATEGORIES).map((category) => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </TextField>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadLogs}
            >
              Download
            </Button>
          </Stack>
        </Paper>

        {/* Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getLogLevelIcon(log.level)}
                      label={log.level}
                      color={getLogLevelColor(log.level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.category || 'N/A'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.message}
                    </Typography>
                    {log.data && Object.keys(log.data).length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {JSON.stringify(log.data, null, 2).substring(0, 100)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.userId || 'Anonymous'}
                  </TableCell>
                  <TableCell>
                    {log.action || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderPerformanceTab = () => {
    if (!metrics) return null;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Search Query Performance</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.searchQueries.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`${value}ms`, 'Duration']} />
                <Legend />
                <Bar dataKey="duration" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Page Load Times</Typography>
            <List dense>
              {metrics.pageLoads.slice(-5).map((load, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={load.page}
                    secondary={`${load.loadTime.toFixed(2)}ms - ${new Date(load.timestamp).toLocaleTimeString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Recent API Calls</Typography>
            <List dense>
              {metrics.apiCalls.slice(-5).map((call, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={`${call.method} ${call.endpoint}`}
                    secondary={
                      <Stack direction="row" spacing={1}>
                        <Chip
                          label={call.status}
                          color={call.status < 400 ? 'success' : 'error'}
                          size="small"
                        />
                        <Typography variant="caption">
                          {call.duration.toFixed(2)}ms
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        System Monitoring Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Logs" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderLogsTab()}
        {activeTab === 2 && renderPerformanceTab()}
      </Box>
    </Box>
  );
};

export default MonitoringDashboard;
