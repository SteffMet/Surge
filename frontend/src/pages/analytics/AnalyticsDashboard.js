import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Description as DocumentIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import analyticsService from '../../services/analyticsService';

const AnalyticsDashboard = ({ workspaceId }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart colors
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main
  ];

  useEffect(() => {
    loadDashboardData();
  }, [workspaceId, timeRange, startDate, endDate]);

  const loadDashboardData = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);
      
      const params = {
        timeRange,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      const response = await analyticsService.getDashboardData(workspaceId, params);
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event) => {
    const range = event.target.value;
    setTimeRange(range);
    
    // Update dates based on range
    const now = new Date();
    switch (range) {
      case '7':
        setStartDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case '30':
        setStartDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case '90':
        setStartDate(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
        break;
      case '365':
        setStartDate(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
        break;
      default:
        break;
    }
    setEndDate(now);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !dashboardData) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
        <Button onClick={loadDashboardData} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon color="primary" />
          Analytics Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
              <MenuItem value="custom">Custom range</MenuItem>
            </Select>
          </FormControl>

          {timeRange === 'custom' && (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <Box sx={{ width: 150 }} />}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <Box sx={{ width: 150 }} />}
                slotProps={{ textField: { size: 'small' } }}
              />
            </LocalizationProvider>
          )}

          <Tooltip title="Refresh Data">
            <IconButton onClick={loadDashboardData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Views
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData?.overview?.totalViews)}
                  </Typography>
                </Box>
                <ViewIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="success.main">
                +{dashboardData?.overview?.viewsGrowth || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Users
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData?.overview?.activeUsers)}
                  </Typography>
                </Box>
                <PeopleIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="success.main">
                +{dashboardData?.overview?.usersGrowth || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Documents
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData?.overview?.totalDocuments)}
                  </Typography>
                </Box>
                <DocumentIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="success.main">
                +{dashboardData?.overview?.documentsGrowth || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Searches
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData?.overview?.totalSearches)}
                  </Typography>
                </Box>
                <SearchIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="body2" color="success.main">
                +{dashboardData?.overview?.searchesGrowth || 0}% from last period
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Activity Overview" />
          <Tab label="Document Performance" />
          <Tab label="User Analytics" />
          <Tab label="Search Analytics" />
          <Tab label="Content Insights" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Activity Timeline */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Over Time
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData?.activityTimeline || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stackId="1"
                      stroke={chartColors[0]}
                      fill={chartColors[0]}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="edits"
                      stackId="1"
                      stroke={chartColors[1]}
                      fill={chartColors[1]}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="searches"
                      stackId="1"
                      stroke={chartColors[2]}
                      fill={chartColors[2]}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Top Activities */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Activity Distribution
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.activityDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashboardData?.activityDistribution?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Document Performance */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Performing Documents
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.topDocuments || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="views" fill={chartColors[0]} name="Views" />
                    <Bar dataKey="edits" fill={chartColors[1]} name="Edits" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Document Statistics */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Document Statistics
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Average Views per Document:</Typography>
                  <Typography fontWeight="bold">
                    {dashboardData?.documentStats?.avgViews?.toFixed(1) || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Most Active Hour:</Typography>
                  <Typography fontWeight="bold">
                    {dashboardData?.documentStats?.peakHour || 'N/A'}:00
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Documents Created:</Typography>
                  <Typography fontWeight="bold">
                    {dashboardData?.documentStats?.created || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Documents Updated:</Typography>
                  <Typography fontWeight="bold">
                    {dashboardData?.documentStats?.updated || 0}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* User Activity */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Activity Patterns
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData?.userActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="active_users"
                      stroke={chartColors[0]}
                      strokeWidth={3}
                      name="Active Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Top Users */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Most Active Users
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {dashboardData?.topUsers?.map((user, index) => (
                  <Box
                    key={user.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      mb: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Box>
                      <Typography fontWeight="medium">
                        #{index + 1} {user.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.actions} actions
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary.main">
                      {user.score}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          {/* Search Trends */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Search Trends
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData?.searchTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="searches"
                      stroke={chartColors[2]}
                      strokeWidth={3}
                      name="Total Searches"
                    />
                    <Line
                      type="monotone"
                      dataKey="unique_queries"
                      stroke={chartColors[3]}
                      strokeWidth={3}
                      name="Unique Queries"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Popular Search Terms */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Popular Search Terms
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {dashboardData?.popularSearches?.map((search, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      mb: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1
                    }}
                  >
                    <Typography>
                      "{search.query}"
                    </Typography>
                    <Typography fontWeight="bold" color="primary.main">
                      {search.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={3}>
          {/* Content Performance */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Content Performance Matrix
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData?.contentInsights || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="engagement_score" fill={chartColors[4]} name="Engagement Score" />
                    <Bar dataKey="quality_score" fill={chartColors[5]} name="Quality Score" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box
</Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;