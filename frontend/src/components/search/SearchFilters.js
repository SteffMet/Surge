import React from 'react';
import {
  Collapse,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Slider,
  useTheme,
} from '@mui/material';

const SearchFilters = ({ showFilters, filters, setFilters }) => {
  const theme = useTheme();

  return (
    <Collapse in={showFilters}>
      <Paper
        sx={{
          p: 3,
          mt: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Document Type</InputLabel>
              <Select
                label="Document Type"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="docx">Word Document</MenuItem>
                <MenuItem value="txt">Text File</MenuItem>
                <MenuItem value="md">Markdown</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                label="Date Range"
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              >
                <MenuItem value="">Any Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
              Minimum Relevance: {Math.round(filters.minScore * 100)}%
            </Typography>
            <Slider
              size="small"
              value={filters.minScore}
              onChange={(_, v) => setFilters({ ...filters, minScore: v })}
              min={0}
              max={1}
              step={0.05}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' },
              ]}
            />
          </Grid>
        </Grid>
      </Paper>
    </Collapse>
  );
};

export default SearchFilters;