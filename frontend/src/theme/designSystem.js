import { createTheme } from '@mui/material/styles';

// Enhanced Design System with Advanced Animations and Interactions
const baseTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      main: '#7c3aed',
      light: '#8b5cf6',
      dark: '#6d28d9',
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    info: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
      50: '#f0fdff',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
      neutral: '#f8fafc',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
    action: {
      hover: 'rgba(37, 99, 235, 0.04)',
      selected: 'rgba(37, 99, 235, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    }
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 800,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      lineHeight: 1.5,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
      lineHeight: 1.6,
    },
    subtitle2: {
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      lineHeight: 1.6,
      letterSpacing: '0.00938em',
    },
    body2: {
      lineHeight: 1.6,
      letterSpacing: '0.01071em',
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02857em',
      textTransform: 'none',
    },
    caption: {
      lineHeight: 1.4,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontWeight: 600,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    }
  },
  shape: {
    borderRadius: 4, // Reduced from 12 to 4 for more subtle rounded corners globally
  },
  spacing: 8,
});

// Enhanced Custom Properties with Advanced Animations
const designSystem = (mode) => createTheme({
  ...baseTheme,
  palette: {
    ...baseTheme.palette,
    mode,
    ...(mode === 'dark'
      ? {
          background: {
            default: '#111827',
            paper: '#1f2937',
            neutral: '#374151',
          },
          text: {
            primary: '#f9fafb',
            secondary: '#d1d5db',
            disabled: '#9ca3af',
          },
          divider: 'rgba(255, 255, 255, 0.12)',
        }
      : {
        background: {
          default: '#ffffff',
          paper: '#ffffff',
          neutral: '#f8fafc',
        },
        text: {
          primary: '#111827',
          secondary: '#6b7280',
          disabled: '#9ca3af',
        },
        divider: 'rgba(0, 0, 0, 0.08)',
      }
    ),
  },
  custom: {
    // Enhanced Animation System
    animations: {
      // Keyframe Animations
      keyframes: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(37, 99, 235, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(37, 99, 235, 0.6);
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }

        @keyframes morphing {
          0%, 100% {
            border-radius: 50% 50% 50% 50%;
          }
          25% {
            border-radius: 60% 40% 60% 40%;
          }
          50% {
            border-radius: 70% 30% 70% 30%;
          }
          75% {
            border-radius: 40% 60% 40% 60%;
          }
        }

        @keyframes typing {
          from { 
            width: 0; 
          }
          to { 
            width: 100%; 
          }
        }

        @keyframes blink {
          0%, 50% { 
            border-color: transparent; 
          }
          51%, 100% { 
            border-color: currentColor; 
          }
        }

        @keyframes heartbeat {
          0% {
            transform: scale(1);
          }
          14% {
            transform: scale(1.1);
          }
          28% {
            transform: scale(1);
          }
          42% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(1);
          }
        }
      `,
      // Transition Presets
      transitions: {
        // Standard transitions
        standard: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'all 0.4s cubic-bezier(0.2, 0, 0, 1)',
        decelerated: 'all 0.3s cubic-bezier(0, 0, 0.2, 1)',
        accelerated: 'all 0.2s cubic-bezier(0.4, 0, 1, 1)',
        
        // Specialized transitions
        bounce: 'all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        smooth: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
        snappy: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        elastic: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        
        // Property-specific transitions
        transform: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        shadow: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Duration Scale
      durations: {
        instant: '0ms',
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
        slower: '800ms',
        slowest: '1200ms',
      },
      // Easing Functions
      easings: {
        // Material Design
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerated: 'cubic-bezier(0, 0, 0.2, 1)',
        accelerated: 'cubic-bezier(0.4, 0, 1, 1)',
        
        // Custom
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
        snappy: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }
    },
    
    // Enhanced Gradients
    gradients: {
      primary: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
      secondary: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
      warning: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      error: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
      info: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
      
      // Specialty gradients
      rainbow: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
      ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      forest: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
      fire: 'linear-gradient(135deg, #ff512f 0%, #f09819 100%)',
      ice: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      
      // Glass effects
      glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      glassLight: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
      glassDark: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
    },

    // Enhanced Shadow System
    shadows: {
      // Elevation shadows
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      
      // Colored shadows
      primarySm: '0 4px 14px 0 rgba(37, 99, 235, 0.15)',
      primaryMd: '0 8px 25px rgba(37, 99, 235, 0.25)',
      primaryLg: '0 12px 40px rgba(37, 99, 235, 0.35)',
      
      secondarySm: '0 4px 14px 0 rgba(124, 58, 237, 0.15)',
      secondaryMd: '0 8px 25px rgba(124, 58, 237, 0.25)',
      secondaryLg: '0 12px 40px rgba(124, 58, 237, 0.35)',
      
      successSm: '0 4px 14px 0 rgba(16, 185, 129, 0.15)',
      successMd: '0 8px 25px rgba(16, 185, 129, 0.25)',
      
      warningSm: '0 4px 14px 0 rgba(245, 158, 11, 0.15)',
      warningMd: '0 8px 25px rgba(245, 158, 11, 0.25)',
      
      errorSm: '0 4px 14px 0 rgba(239, 68, 68, 0.15)',
      errorMd: '0 8px 25px rgba(239, 68, 68, 0.25)',
      
      // Inner shadows
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      innerLg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.1)',
      
      // Glow effects
      glow: '0 0 20px rgba(37, 99, 235, 0.3)',
      glowLg: '0 0 40px rgba(37, 99, 235, 0.4)',
    },

    // Enhanced Glassmorphism Effects
    glass: {
      // Light glass variations
      light: {
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      medium: {
        background: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
      },
      strong: {
        background: 'rgba(255, 255, 255, 0.35)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
      },
      
      // Dark glass variations
      darkLight: {
        background: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      darkMedium: {
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)',
      },
      darkStrong: {
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
      }
    },

    // Spacing System (8px base)
    spacing: {
      px: '1px',
      0: '0px',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      11: '44px',
      12: '48px',
      14: '56px',
      16: '64px',
      20: '80px',
      24: '96px',
      28: '112px',
      32: '128px',
      36: '144px',
      40: '160px',
      44: '176px',
      48: '192px',
      52: '208px',
      56: '224px',
      60: '240px',
      64: '256px',
      72: '288px',
      80: '320px',
      96: '384px',
    }
  },

  // Enhanced Component Overrides with Animations
  components: {
    // Global CssBaseline
    MuiCssBaseline: {
      styleOverrides: (theme) => `
        ${theme.custom.animations.keyframes}
        
        * {
          box-sizing: border-box;
        }
        
        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        body {
          margin: 0;
          overflow-x: hidden;
        }
        
        #root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        /* Enhanced scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${theme.palette.grey[100]};
          border-radius: 8px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${theme.palette.grey[300]};
          border-radius: 8px;
          transition: background-color 0.2s ease;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.palette.grey[400]};
        }
        
        /* Selection styles */
        ::selection {
          background-color: ${theme.palette.primary.main}20;
          color: ${theme.palette.primary.dark};
        }
        
        ::-moz-selection {
          background-color: ${theme.palette.primary.main}20;
          color: ${theme.palette.primary.dark};
        }
        
        /* Focus styles */
        *:focus {
          outline: 2px solid ${theme.palette.primary.main}40;
          outline-offset: 2px;
        }
        
        /* Smooth animations for route transitions */
        .page-enter {
          opacity: 0;
          transform: translateY(16px);
        }
        
        .page-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .page-exit {
          opacity: 1;
          transform: translateY(0);
        }
        
        .page-exit-active {
          opacity: 0;
          transform: translateY(-16px);
          transition: opacity 200ms cubic-bezier(0.4, 0, 1, 1), 
                      transform 200ms cubic-bezier(0.4, 0, 1, 1);
        }
      `,
    },

    // Enhanced Button Component
    MuiButton: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          borderRadius: 8, // Reduced from 12 to 8
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: theme.custom.animations.transitions.standard,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            transition: 'left 0.5s',
          },
          '&:hover::before': {
            left: '100%',
          },
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: theme.custom.shadows.md,
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 3px ${theme.palette.primary.main}40`,
          }
        }),
        contained: ({ theme, ownerState }) => ({
          ...(ownerState.color === 'primary' && {
            background: theme.custom.gradients.primary,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
              boxShadow: theme.custom.shadows.primaryMd,
            },
          }),
          ...(ownerState.color === 'secondary' && {
            background: theme.custom.gradients.secondary,
            '&:hover': {
              boxShadow: theme.custom.shadows.secondaryMd,
            },
          }),
        }),
        outlined: ({ theme }) => ({
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: `${theme.palette.primary.main}08`,
          },
        }),
      },
    },

    // Enhanced TextField Component
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiOutlinedInput-root': {
            borderRadius: 8, // Reduced from 12 to 8
            transition: theme.custom.animations.transitions.standard,
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            },
            '&.Mui-focused': {
              transform: 'none', // Removed translateY animation
              boxShadow: theme.custom.shadows.primarySm,
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px',
              },
            },
          },
          '& .MuiInputLabel-root': {
            '&.Mui-focused': {
              fontWeight: 600,
            },
          },
        }),
      },
    },

    // Enhanced Card Component
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12, // Reduced from 16 to 12
          border: `1px solid ${theme.palette.divider}`, // Use theme divider color
          transition: theme.custom.animations.transitions.standard,
          position: 'relative',
          outline: 'none', // Remove default outline
          '&:focus': {
            outline: 'none', // Remove focus outline
          },
          '&:hover': {
            transform: 'translateY(-2px)', // Reduced from -4px to -2px for subtlety
            boxShadow: theme.custom.shadows.lg,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          },
        }),
      },
    },

    // Enhanced CardActionArea for proper focus handling
    MuiCardActionArea: {
      styleOverrides: {
        root: ({ theme }) => ({
          outline: 'none',
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
          },
          '&.Mui-focusVisible': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}40`,
          },
        }),
      },
    },

    // Enhanced IconButton for proper focus handling
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          outline: 'none',
          '&:focus': {
            outline: 'none',
          },
          '&.Mui-focusVisible': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}40`,
          },
        }),
      },
    },

    // Enhanced Chip Component
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          fontWeight: 600,
          transition: theme.custom.animations.transitions.bounce,
          '&:hover': {
            transform: 'scale(1.05)',
          },
          '&.MuiChip-clickable:active': {
            transform: 'scale(0.95)',
          },
        }),
      },
    },

    // Enhanced Avatar Component
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: theme.custom.animations.transitions.elastic,
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: theme.custom.shadows.md,
          },
        }),
      },
    },

    // Enhanced ListItem Component
    MuiListItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          transition: theme.custom.animations.transitions.standard,
          '&.MuiListItem-button:hover': {
            backgroundColor: `${theme.palette.primary.main}08`,
            borderRadius: 8,
            transform: 'translateX(4px)',
          },
        }),
      },
    },

    // Enhanced IconButton Component
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          transition: theme.custom.animations.transitions.bounce,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 0,
            height: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'width 0.6s, height 0.6s',
          },
          '&:active::after': {
            width: '200%',
            height: '200%',
          },
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: `${theme.palette.action.hover}`,
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }),
      },
    },

    // Enhanced Tab Component
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px 8px 0 0',
          transition: theme.custom.animations.transitions.standard,
          '&:hover': {
            backgroundColor: `${theme.palette.primary.main}08`,
            transform: 'translateY(-2px)',
          },
          '&.Mui-selected': {
            background: theme.custom.gradients.glass,
            backdropFilter: 'blur(10px)',
          },
        }),
      },
    },

    // Enhanced Paper Component
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8, // Reduced from 16 to 8 for more subtle rounded corners
          transition: theme.custom.animations.transitions.standard,
          '&.MuiPaper-elevation1': {
            boxShadow: theme.custom.shadows.sm,
            '&:hover': {
              boxShadow: theme.custom.shadows.md,
            },
          },
          '&.MuiPaper-elevation2': {
            boxShadow: theme.custom.shadows.md,
            '&:hover': {
              boxShadow: theme.custom.shadows.lg,
            },
          },
        }),
      },
    },

    // Enhanced Dialog Component
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 12, // Reduced from 20 to 12
          border: `1px solid ${theme.palette.divider}`, // Use theme divider color
          boxShadow: theme.custom.shadows['2xl'],
          backgroundImage: 'none',
          '&.MuiDialog-paperFullScreen': {
            borderRadius: 0,
          },
        }),
      },
    },

    // Enhanced Menu Component
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 8, // Reduced from 12 to 8
          border: `1px solid ${theme.palette.divider}`, // Use theme divider color
          boxShadow: theme.custom.shadows.lg,
          marginTop: 4,
          '& .MuiMenuItem-root': {
            borderRadius: 6, // Reduced from 8 to 6
            margin: '2px 4px', // Reduced margins
            transition: theme.custom.animations.transitions.standard,
            '&:hover': {
              backgroundColor: `${theme.palette.primary.main}08`, // Reduced opacity for subtlety
              transform: 'none', // Removed translateX animation
            },
          },
        }),
      },
    },

    // Enhanced Snackbar Component
    MuiSnackbar: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiSnackbarContent-root': {
            borderRadius: 12,
            fontWeight: 500,
            boxShadow: theme.custom.shadows.lg,
          },
        }),
      },
    },

    // Alert Component - Remove rounded corners for notifications/messages
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Remove rounded corners from alerts
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        standardInfo: {
          borderRadius: 0,
        },
        standardSuccess: {
          borderRadius: 0,
        },
        standardWarning: {
          borderRadius: 0,
        },
        standardError: {
          borderRadius: 0,
        },
      },
    },

    // Box Component - Remove default rounded corners
    MuiBox: {
      styleOverrides: {
        root: {
          // Remove any default border radius unless explicitly set
          '&:not([class*="rounded"])': {
            borderRadius: 0,
          },
        },
      },
    },
  },
});

export default designSystem;