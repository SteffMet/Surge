import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Tooltip,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Button,
  Fade,
  Zoom,
  useTheme,
} from '@mui/material';
import {
  Description as DocumentIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SearchResults = ({
  results,
  total,
  page,
  pageSize,
  loading,
  query,
  expandedResults,
  toggleResultExpansion,
  handleFeedback,
  handleDownload,
  highlightText,
  formatScore,
  getScoreColor,
  showDebugScores,
  handleSearch,
}) => {
  const theme = useTheme();

  return (
    <Fade in timeout={800}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Search Results
          </Typography>
          <Chip
            label={`${total} documents found`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        <Stack spacing={3}>
          {results.map((result, index) => (
            <Zoom key={result._id || index} in timeout={400 + index * 100}>
              <Card
                sx={{
                  borderRadius: theme.shape.borderRadius,
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.custom.shadows.lg,
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'primary.main',
                            border: `2px solid ${theme.palette.primary.light}`,
                          }}
                        >
                          <DocumentIcon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {highlightText(result.title || result.originalName, query)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              label={`${formatScore(result.score)}% match`}
                              size="small"
                              color={getScoreColor(result.score)}
                              sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {result.type?.toUpperCase()} • {new Date(result.createdAt).toLocaleDateString()}
                            </Typography>
                            {showDebugScores && (
                              <Chip
                                label={`lex:${Math.round(result.baseScore * 100)} sem:${Math.round(
                                  (result.semanticScore || 0) * 100
                                )}${result.llmScore !== null ? ` llm:${result.llmScore}` : ''}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>

                      <Typography
                        variant="body1"
                        sx={{
                          mb: 2,
                          lineHeight: 1.7,
                          color: 'text.primary',
                        }}
                      >
                        {highlightText(
                          result.excerpt?.substring(0, 400) + (result.excerpt && result.excerpt.length > 400 ? '…' : ''),
                          query
                        )}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                      <Tooltip title="Helpful">
                        <IconButton
                          size="small"
                          onClick={() => handleFeedback(result, true)}
                          sx={{
                            '&:hover': {
                              transform: 'scale(1.1)',
                              color: 'success.main',
                            },
                          }}
                        >
                          <ThumbUpIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Not helpful">
                        <IconButton
                          size="small"
                          onClick={() => handleFeedback(result, false)}
                          sx={{
                            '&:hover': {
                              transform: 'scale(1.1)',
                              color: 'error.main',
                            },
                          }}
                        >
                          <ThumbDownIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(result)}
                          sx={{
                            '&:hover': {
                              transform: 'scale(1.1)',
                              color: 'primary.main',
                            },
                          }}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {result.content && (
                    <Accordion
                      expanded={expandedResults.has(result._id)}
                      onChange={() => toggleResultExpansion(result._id)}
                      sx={{
                        boxShadow: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          borderRadius: theme.shape.borderRadius,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          View full content
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ maxHeight: 400, overflow: 'auto', p: 2 }}>
                          {result.type === 'code' ? (
                            <SyntaxHighlighter
                              language={result.language || 'text'}
                              style={tomorrow}
                              customStyle={{
                                fontSize: '0.875rem',
                                borderRadius: '12px',
                                border: `1px solid ${theme.palette.divider}`,
                              }}
                            >
                              {result.content}
                            </SyntaxHighlighter>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.6,
                              }}
                            >
                              {highlightText(result.content, query)}
                            </Typography>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </Zoom>
          ))}
        </Stack>

        {total > pageSize && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                disabled={page === 1 || loading}
                onClick={() => {
                  const newPage = page - 1;
                  handleSearch(query, newPage);
                }}
                startIcon={<ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />}
                sx={{ borderRadius: theme.shape.borderRadius }}
              >
                Previous
              </Button>

              <Chip
                label={`Page ${page} of ${Math.ceil(total / pageSize)}`}
                variant="outlined"
                sx={{ mx: 2, fontWeight: 600 }}
              />

              <Button
                variant="outlined"
                disabled={page >= Math.ceil(total / pageSize) || loading}
                onClick={() => {
                  const newPage = page + 1;
                  handleSearch(query, newPage);
                }}
                endIcon={<ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />}
                sx={{ borderRadius: theme.shape.borderRadius }}
              >
                Next
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Fade>
  );
};

export default SearchResults;