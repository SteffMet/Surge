// Enhanced Typography System with Accessibility Features
import { css } from '@emotion/react';

// Typography Scale Generator
export const createTypographyScale = (baseSize = 16, ratio = 1.25) => {
  const sizes = [];
  for (let i = -3; i <= 6; i++) {
    sizes.push(Math.round(baseSize * Math.pow(ratio, i)));
  }
  return sizes;
};

// Responsive Typography Hook
export const useResponsiveTypography = (baseSize, screenSizes) => {
  const generateResponsiveSizes = () => {
    const scale = createTypographyScale(baseSize);
    return {
      xs: scale[2], // Small mobile
      sm: scale[3], // Large mobile
      md: scale[4], // Tablet
      lg: scale[5], // Desktop
      xl: scale[6], // Large desktop
    };
  };

  return generateResponsiveSizes();
};

// Typography Utilities
export const typographyUtils = {
  // Line Height Calculator
  getOptimalLineHeight: (fontSize) => {
    if (fontSize <= 12) return 1.6;
    if (fontSize <= 16) return 1.5;
    if (fontSize <= 24) return 1.4;
    if (fontSize <= 32) return 1.3;
    return 1.2;
  },

  // Letter Spacing Calculator
  getOptimalLetterSpacing: (fontSize, fontWeight) => {
    const baseSpacing = fontSize * -0.01;
    const weightMultiplier = fontWeight >= 600 ? 0.5 : 1;
    return `${baseSpacing * weightMultiplier}em`;
  },

  // Reading Width Calculator (45-75 characters)
  getOptimalReadingWidth: (fontSize) => {
    const averageCharWidth = fontSize * 0.5;
    return {
      min: averageCharWidth * 45,
      max: averageCharWidth * 75,
      optimal: averageCharWidth * 66,
    };
  },

  // Accessibility Contrast Helpers
  ensureReadability: (textColor, backgroundColor, minContrast = 4.5) => {
    // This would integrate with a color contrast checker
    return {
      isReadable: true, // Placeholder
      contrastRatio: 7.2, // Placeholder
      suggestion: null,
    };
  },
};

// Enhanced Typography Styles
export const typographyStyles = {
  // Display Typography
  display: {
    1: css`
      font-size: clamp(2.5rem, 8vw, 6rem);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.04em;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    `,
    2: css`
      font-size: clamp(2rem, 6vw, 4.5rem);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.035em;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    `,
    3: css`
      font-size: clamp(1.75rem, 5vw, 3.5rem);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.03em;
      font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    `,
  },

  // Heading Typography
  heading: {
    1: css`
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.025em;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
    2: css`
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
    3: css`
      font-size: clamp(1.25rem, 2.5vw, 1.75rem);
      font-weight: 600;
      line-height: 1.35;
      letter-spacing: -0.015em;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
    4: css`
      font-size: clamp(1.125rem, 2vw, 1.5rem);
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
    5: css`
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      font-weight: 600;
      line-height: 1.45;
      letter-spacing: -0.005em;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
    6: css`
      font-size: clamp(0.875rem, 1.25vw, 1.125rem);
      font-weight: 600;
      line-height: 1.5;
      letter-spacing: 0;
      font-feature-settings: 'kern' 1, 'liga' 1;
    `,
  },

  // Body Typography
  body: {
    large: css`
      font-size: clamp(1.125rem, 1.5vw, 1.25rem);
      font-weight: 400;
      line-height: 1.6;
      letter-spacing: 0.01em;
      font-feature-settings: 'kern' 1, 'liga' 1;
      max-width: 75ch;
    `,
    regular: css`
      font-size: clamp(0.875rem, 1.25vw, 1rem);
      font-weight: 400;
      line-height: 1.6;
      letter-spacing: 0.01em;
      font-feature-settings: 'kern' 1, 'liga' 1;
      max-width: 70ch;
    `,
    small: css`
      font-size: clamp(0.75rem, 1vw, 0.875rem);
      font-weight: 400;
      line-height: 1.5;
      letter-spacing: 0.02em;
      font-feature-settings: 'kern' 1, 'liga' 1;
      max-width: 65ch;
    `,
  },

  // Interface Typography
  interface: {
    button: css`
      font-size: clamp(0.875rem, 1.125vw, 1rem);
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: 0.025em;
      font-feature-settings: 'kern' 1;
      text-transform: none;
    `,
    label: css`
      font-size: clamp(0.75rem, 1vw, 0.875rem);
      font-weight: 500;
      line-height: 1.4;
      letter-spacing: 0.02em;
      font-feature-settings: 'kern' 1;
    `,
    caption: css`
      font-size: clamp(0.65rem, 0.875vw, 0.75rem);
      font-weight: 400;
      line-height: 1.35;
      letter-spacing: 0.03em;
      font-feature-settings: 'kern' 1;
    `,
    overline: css`
      font-size: clamp(0.625rem, 0.75vw, 0.6875rem);
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-feature-settings: 'kern' 1;
    `,
  },

  // Code Typography
  code: {
    inline: css`
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
      font-size: 0.875em;
      font-weight: 500;
      line-height: 1.4;
      background-color: rgba(0, 0, 0, 0.04);
      padding: 0.125em 0.25em;
      border-radius: 0.25em;
      font-feature-settings: 'kern' 0, 'liga' 0;
    `,
    block: css`
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.6;
      background-color: rgba(0, 0, 0, 0.04);
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      font-feature-settings: 'kern' 0, 'liga' 0;
    `,
  },
};

// Accessibility Typography Helpers
export const accessibilityTypography = {
  // Focus Typography
  focusStyles: css`
    outline: 2px solid currentColor;
    outline-offset: 2px;
    border-radius: 0.25rem;
    transition: outline-color 0.15s ease-in-out;
  `,

  // High Contrast Mode
  highContrastStyles: css`
    @media (prefers-contrast: high) {
      color: CanvasText;
      background-color: Canvas;
      border-color: ButtonBorder;
    }
  `,

  // Reduced Motion Typography
  reducedMotionStyles: css`
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      animation: none;
    }
  `,

  // Screen Reader Optimized
  screenReaderOptimized: css`
    font-weight: 400;
    line-height: 1.6;
    word-spacing: 0.1em;
    font-variant-numeric: oldstyle-nums;
    hyphens: auto;
    text-align: left;
  `,

  // Dyslexia Friendly
  dyslexiaFriendly: css`
    font-family: 'OpenDyslexic', 'Comic Sans MS', -apple-system, BlinkMacSystemFont, sans-serif;
    letter-spacing: 0.12em;
    word-spacing: 0.16em;
    line-height: 1.8;
    font-weight: 400;
  `,
};

// Typography Component Factory
export const createTypographyComponent = (variant, element = 'p') => {
  const Component = ({ children, className, ...props }) => {
    const Element = element;
    return (
      <Element 
        css={typographyStyles[variant]} 
        className={className}
        {...props}
      >
        {children}
      </Element>
    );
  };
  
  Component.displayName = `Typography${variant.charAt(0).toUpperCase() + variant.slice(1)}`;
  return Component;
};

// Font Loading Optimization
export const optimizeFontLoading = () => {
  // Preload critical fonts
  const preloadFont = (fontPath, fontType = 'woff2') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = fontPath;
    link.as = 'font';
    link.type = `font/${fontType}`;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  };

  // Font display optimization
  const optimizeFontDisplay = () => {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 400;
        font-display: swap;
        src: local('Inter Regular'), local('Inter-Regular'), url('/fonts/inter-v12-latin-regular.woff2') format('woff2');
      }
      
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 600;
        font-display: swap;
        src: local('Inter SemiBold'), local('Inter-SemiBold'), url('/fonts/inter-v12-latin-600.woff2') format('woff2');
      }
      
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 700;
        font-display: swap;
        src: local('Inter Bold'), local('Inter-Bold'), url('/fonts/inter-v12-latin-700.woff2') format('woff2');
      }
    `;
    document.head.appendChild(style);
  };

  return { preloadFont, optimizeFontDisplay };
};

// Text Truncation Utilities
export const textUtils = {
  truncate: (lines = 1) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    ${lines === 1 ? 'white-space: nowrap;' : `
      display: -webkit-box;
      -webkit-line-clamp: ${lines};
      -webkit-box-orient: vertical;
      white-space: normal;
    `}
  `,
  
  balance: css`
    text-wrap: balance;
  `,
  
  pretty: css`
    text-wrap: pretty;
  `,
};

export default {
  createTypographyScale,
  useResponsiveTypography,
  typographyUtils,
  typographyStyles,
  accessibilityTypography,
  createTypographyComponent,
  optimizeFontLoading,
  textUtils,
};