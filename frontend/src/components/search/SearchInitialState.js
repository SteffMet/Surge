import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
  Fade,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Search as SearchIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';

const SearchInitialState = ({ recentSearches, popularTerms, handleSearch, setQuery, onClearRecent }) => {
  return (
    <Grid container spacing={4}>
      {recentSearches.length > 0 && (
        <Grid item xs={12} md={6}>
          <Fade in timeout={1000}>
            <Card sx={{ height: '100%', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Recent Searches
                  </Typography>
                  </Box>
                  {onClearRecent && (
                    <Tooltip title="Clear recent searches">
                      <IconButton size="small" onClick={onClearRecent} aria-label="clear recent searches">
                        <DeleteSweepIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <List sx={{ py: 0 }}>
                  {recentSearches.map((search, index) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => {
                        setQuery(search.query);
                        handleSearch(search.query);
                      }}
                      sx={{
                        borderRadius: 3,
                        mb: 1,
                        '&:hover': {
                          bgcolor: 'primary.50',
                          transform: 'translateX(8px)',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.100', color: 'primary.main', width: 32, height: 32 }}>
                          <SearchIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={search.query}
                        secondary={new Date(search.timestamp).toLocaleDateString()}
                        primaryTypographyProps={{ fontWeight: 500 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      )}

      {popularTerms.length > 0 && (
        <Grid item xs={12} md={6}>
          <Fade in timeout={1200}>
            <Card sx={{ height: '100%', borderRadius: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <TrendingIcon color="secondary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Popular Topics
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {popularTerms.map((term, index) => (
                    <Chip
                      key={index}
                      label={term.query || term}
                      onClick={() => {
                        setQuery(term.query || term);
                        handleSearch(term.query || term);
                      }}
                      sx={{
                        cursor: 'pointer',
                        mb: 1,
                        borderRadius: 3,
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
                        },
                      }}
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      )}
    </Grid>
  );
};

export default SearchInitialState;