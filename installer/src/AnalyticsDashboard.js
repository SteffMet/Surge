import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Download as DownloadIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (err) {
      setError(err.message);
      // Mock data for development
      setData({
        last7Days: [
          { date: '2025-08-13', totalEvents: 45, uniqueSessions: 8, completedInstallations: 3 },
          { date: '2025-08-14', totalEvents: 62, uniqueSessions: 12, completedInstallations: 5 },
          { date: '2025-08-15', totalEvents: 38, uniqueSessions: 6, completedInstallations: 2 },
          { date: '2025-08-16', totalEvents: 71, uniqueSessions: 15, completedInstallations: 7 },
          { date: '2025-08-17', totalEvents: 89, uniqueSessions: 18, completedInstallations: 9 },
          { date: '2025-08-18', totalEvents: 56, uniqueSessions: 11, completedInstallations: 4 },
          { date: '2025-08-19', totalEvents: 34, uniqueSessions: 7, completedInstallations: 3 }
        ],
        totals: { totalEvents: 395, uniqueSessions: 77, completedInstallations: 33 },
        aiProviders: { google: 25, 'self-hosted': 6, openai: 2 },
        conversionRate: '42.9'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Analytics Dashboard</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Analytics Unavailable</AlertTitle>
          Unable to load analytics data. Showing sample data for demonstration.
        </Alert>
      </Box>
    );
  }

  const MetricCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: `${color}.main`, mr: 1 }}>{icon}</Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" color={`${color}.main`} gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          BitSurge Installer Analytics
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Installation wizard usage metrics for the last 7 days
        </Typography>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Visitors"
            value={data.totals.uniqueSessions}
            subtitle="Unique sessions"
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Installations"
            value={data.totals.completedInstallations}
            subtitle="Completed setups"
            icon={<DownloadIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Conversion Rate"
            value={`${data.conversionRate}%`}
            subtitle="Visitors who completed"
            icon={<TrendingUpIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Events"
            value={data.totals.totalEvents}
            subtitle="All interactions"
            icon={<PsychologyIcon />}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Daily Breakdown */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Daily Activity (Last 7 Days)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Visitors</TableCell>
                    <TableCell align="right">Events</TableCell>
                    <TableCell align="right">Installations</TableCell>
                    <TableCell align="right">Conversion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.last7Days.map((day) => {
                    const conversion = day.uniqueSessions > 0 ? 
                      ((day.completedInstallations / day.uniqueSessions) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <TableRow key={day.date}>
                        <TableCell>
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell align="right">{day.uniqueSessions}</TableCell>
                        <TableCell align="right">{day.totalEvents}</TableCell>
                        <TableCell align="right">{day.completedInstallations}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${conversion}%`} 
                            size="small" 
                            color={parseFloat(conversion) > 40 ? 'success' : 
                                   parseFloat(conversion) > 20 ? 'warning' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* AI Provider Preferences */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Provider Choices
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Object.entries(data.aiProviders).map(([provider, count]) => {
                const total = Object.values(data.aiProviders).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                
                const providerNames = {
                  google: 'Google Gemini',
                  'self-hosted': 'Self-Hosted Ollama',
                  openai: 'OpenAI',
                  anthropic: 'Anthropic Claude'
                };

                return (
                  <Box key={provider} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {providerNames[provider] || provider}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count} ({percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(percentage)} 
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Footer Info */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Analytics are collected to improve the installation experience. No personal data or API keys are stored.
          Data is aggregated and anonymized for privacy protection.
        </Typography>
      </Box>
    </Box>
  );
};

export default AnalyticsDashboard;