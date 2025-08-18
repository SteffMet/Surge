import React from 'react';
import { Box, Skeleton, Card, CardContent, Grid, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Enhanced skeleton component with shimmer animation
export const ShimmerSkeleton = ({ width, height, variant = 'rectangular', sx = {}, ...props }) => {
  const theme = useTheme();
  
  return (
    <Skeleton
      variant={variant}
      width={width}
      height={height}
      sx={{
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.05)',
        '&::after': {
          background: `linear-gradient(
            90deg,
            transparent,
            ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.8)'
            },
            transparent
          )`,
          animation: `${theme.custom.animations.shimmer} 2s infinite`,
        },
        ...sx
      }}
      {...props}
    />
  );
};

// Search page skeleton loader
export const SearchPageSkeleton = () => {
  return (
    <Box>
      {/* Header skeleton */}
      <Box sx={{ mb: 4 }}>
        <ShimmerSkeleton width="40%" height={40} sx={{ mb: 1 }} />
        <ShimmerSkeleton width="60%" height={24} />
      </Box>

      {/* Search form skeleton */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <ShimmerSkeleton width="100%" height={56} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map((i) => (
            <ShimmerSkeleton key={i} width={80} height={32} variant="rounded" />
          ))}
        </Box>
      </Paper>

      {/* Results skeleton */}
      <Box sx={{ mb: 2 }}>
        <ShimmerSkeleton width="30%" height={32} />
      </Box>
      
      {[1, 2, 3].map((i) => (
        <Card key={i} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <ShimmerSkeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <ShimmerSkeleton width="70%" height={24} sx={{ mb: 1 }} />
                <ShimmerSkeleton width="40%" height={20} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3].map((j) => (
                  <ShimmerSkeleton key={j} variant="circular" width={32} height={32} />
                ))}
              </Box>
            </Box>
            <ShimmerSkeleton width="100%" height={60} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

// Documents page skeleton loader
export const DocumentsPageSkeleton = () => {
  return (
    <Box>
      {/* Header skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <ShimmerSkeleton width={300} height={40} sx={{ mb: 1 }} />
          <ShimmerSkeleton width={400} height={24} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ShimmerSkeleton width={140} height={48} variant="rounded" />
          <ShimmerSkeleton width={160} height={48} variant="rounded" />
        </Box>
      </Box>

      {/* Filters skeleton */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <ShimmerSkeleton width="100%" height={40} variant="rounded" />
          </Grid>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={2} key={i}>
              <ShimmerSkeleton width="100%" height={40} variant="rounded" />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Document grid skeleton */}
      <Grid container spacing={3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <ShimmerSkeleton width={24} height={24} />
                    <Box sx={{ flex: 1 }}>
                      <ShimmerSkeleton width="80%" height={20} sx={{ mb: 0.5 }} />
                      <ShimmerSkeleton width="60%" height={16} />
                    </Box>
                  </Box>
                  <ShimmerSkeleton variant="circular" width={24} height={24} />
                </Box>
                
                <ShimmerSkeleton width="100%" height={40} sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[1, 2].map((j) => (
                    <ShimmerSkeleton key={j} width={60} height={24} variant="rounded" />
                  ))}
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ShimmerSkeleton width="60%" height={16} />
                  <ShimmerSkeleton width={80} height={32} variant="rounded" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Workspaces page skeleton loader
export const WorkspacesPageSkeleton = () => {
  return (
    <Box>
      {/* Header skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <ShimmerSkeleton width={200} height={40} sx={{ mb: 1 }} />
          <ShimmerSkeleton width={350} height={24} />
        </Box>
        <ShimmerSkeleton width={180} height={48} variant="rounded" />
      </Box>

      {/* Workspace cards skeleton */}
      <Grid container spacing={3}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <ShimmerSkeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1 }}>
                      <ShimmerSkeleton width="90%" height={24} sx={{ mb: 0.5 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShimmerSkeleton width={60} height={20} variant="rounded" />
                        <ShimmerSkeleton width={80} height={16} />
                      </Box>
                    </Box>
                  </Box>
                  <ShimmerSkeleton variant="circular" width={24} height={24} />
                </Box>

                <ShimmerSkeleton width="100%" height={60} sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ShimmerSkeleton width={16} height={16} />
                  <ShimmerSkeleton width="40%" height={16} />
                  <Box sx={{ display: 'flex', ml: 1 }}>
                    {[1, 2, 3].map((j) => (
                      <ShimmerSkeleton 
                        key={j} 
                        variant="circular" 
                        width={20} 
                        height={20} 
                        sx={{ ml: j > 1 ? -0.5 : 0 }} 
                      />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                  {[1, 2].map((j) => (
                    <ShimmerSkeleton key={j} width={50} height={18} variant="rounded" />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ShimmerSkeleton width="40%" height={16} />
                  <ShimmerSkeleton width="35%" height={16} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// Dashboard skeleton loader
export const DashboardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ py: 4, maxWidth: 'lg', mx: 'auto' }}>
      {/* Hero section skeleton */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
          <ShimmerSkeleton variant="rounded" width={80} height={80} />
          <ShimmerSkeleton width={200} height={64} />
        </Box>
        <ShimmerSkeleton width={400} height={32} sx={{ mx: 'auto', mb: 4 }} />
        
        {/* Search box skeleton */}
        <Paper sx={{ p: 2, maxWidth: 700, mx: 'auto', mb: 3 }}>
          <ShimmerSkeleton width="100%" height={56} variant="rounded" />
        </Paper>

        {/* Stats skeleton */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          {[1, 2].map((i) => (
            <Box key={i} sx={{ textAlign: 'center' }}>
              <ShimmerSkeleton width={60} height={40} sx={{ mb: 1 }} />
              <ShimmerSkeleton width={80} height={20} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Content sections skeleton */}
      <Grid container spacing={4}>
        {[1, 2].map((i) => (
          <Grid item xs={12} md={6} key={i}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <ShimmerSkeleton variant="circular" width={24} height={24} />
                  <ShimmerSkeleton width={150} height={24} />
                </Box>
                {i === 1 ? (
                  // Recent searches skeleton
                  <Box>
                    {[1, 2, 3].map((j) => (
                      <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <ShimmerSkeleton variant="circular" width={32} height={32} />
                        <Box sx={{ flex: 1 }}>
                          <ShimmerSkeleton width="70%" height={20} sx={{ mb: 0.5 }} />
                          <ShimmerSkeleton width="40%" height={16} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  // Popular terms skeleton
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <ShimmerSkeleton key={j} width={80} height={32} variant="rounded" />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {/* Quick actions skeleton */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <ShimmerSkeleton variant="circular" width={24} height={24} />
                <ShimmerSkeleton width={120} height={24} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {[1, 2, 3].map((i) => (
                  <ShimmerSkeleton key={i} width={140} height={48} variant="rounded" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Generic card skeleton
export const CardSkeleton = ({ 
  showAvatar = false, 
  showActions = false, 
  contentLines = 2,
  ...props 
}) => {
  return (
    <Card {...props}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          {showAvatar && <ShimmerSkeleton variant="circular" width={40} height={40} />}
          <Box sx={{ flex: 1 }}>
            <ShimmerSkeleton width="70%" height={24} sx={{ mb: 1 }} />
            <ShimmerSkeleton width="50%" height={20} />
          </Box>
          {showActions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <ShimmerSkeleton variant="circular" width={32} height={32} />
              <ShimmerSkeleton variant="circular" width={32} height={32} />
            </Box>
          )}
        </Box>
        
        {Array.from({ length: contentLines }).map((_, i) => (
          <ShimmerSkeleton 
            key={i}
            width={i === contentLines - 1 ? "80%" : "100%"} 
            height={20} 
            sx={{ mb: 1 }} 
          />
        ))}
      </CardContent>
    </Card>
  );
};

// List item skeleton
export const ListItemSkeleton = ({ showAvatar = true, showSecondary = true }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1 }}>
      {showAvatar && <ShimmerSkeleton variant="circular" width={40} height={40} />}
      <Box sx={{ flex: 1 }}>
        <ShimmerSkeleton width="60%" height={20} sx={{ mb: showSecondary ? 0.5 : 0 }} />
        {showSecondary && <ShimmerSkeleton width="40%" height={16} />}
      </Box>
      <ShimmerSkeleton variant="circular" width={24} height={24} />
    </Box>
  );
};

export default ShimmerSkeleton;