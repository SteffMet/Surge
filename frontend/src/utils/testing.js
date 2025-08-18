// Comprehensive Testing Utilities for Responsive Design and Cross-Browser Compatibility
import { useEffect, useState } from 'react';

// Device Detection and Responsive Testing
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    pixelRatio: 1,
    orientation: 'portrait',
    touchSupport: false,
    browserName: 'unknown',
    browserVersion: 'unknown',
    operatingSystem: 'unknown',
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: width > height ? 'landscape' : 'portrait',
        touchSupport: 'ontouchstart' in window,
        browserName: getBrowserName(),
        browserVersion: getBrowserVersion(),
        operatingSystem: getOperatingSystem(),
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};

// Browser Detection Utilities
const getBrowserName = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome';
  if (userAgent.includes('firefox')) return 'Firefox';
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
  if (userAgent.includes('edg')) return 'Edge';
  if (userAgent.includes('opr') || userAgent.includes('opera')) return 'Opera';
  if (userAgent.includes('trident') || userAgent.includes('msie')) return 'Internet Explorer';
  
  return 'Unknown';
};

const getBrowserVersion = () => {
  const userAgent = navigator.userAgent;
  let match = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  
  if (/trident/i.test(match[1])) {
    const temp = /\brv[ :]+(\d+)/g.exec(userAgent) || [];
    return `IE ${temp[1] || ''}`;
  }
  
  if (match[1] === 'Chrome') {
    const temp = userAgent.match(/\bOPR|Edge\/(\d+)/);
    if (temp !== null) return temp.replace('OPR', 'Opera').replace('Edge', 'Edge');
  }
  
  match = match[2] ? [match[1], match[2]] : [navigator.appName, navigator.appVersion, '-?'];
  const temp = userAgent.match(/version\/(\d+)/i);
  if (temp !== null) match.splice(1, 1, temp[1]);
  
  return match.join(' ');
};

const getOperatingSystem = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  if (/windows phone/i.test(userAgent)) return 'Windows Phone';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'iOS';
  if (/Win32|Win64|Windows|WinCE/.test(userAgent)) return 'Windows';
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(userAgent)) return 'macOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  
  return 'Unknown';
};

// Responsive Breakpoint Testing
export const breakpointTesting = {
  // Standard breakpoints
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
  
  // Test viewport sizes
  testViewports: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 },
    { name: 'Desktop Small', width: 1024, height: 768 },
    { name: 'Desktop Medium', width: 1440, height: 900 },
    { name: 'Desktop Large', width: 1920, height: 1080 },
    { name: 'Desktop XL', width: 2560, height: 1440 },
  ],
  
  // Simulate viewport changes
  simulateViewport: (width, height) => {
    if (window.chrome && window.chrome.runtime) {
      // Chrome DevTools
      console.log(`Simulating viewport: ${width}x${height}`);
      // In real testing, you would use DevTools API
    } else {
      // Fallback: resize window (only works in development)
      if (window.resizeTo) {
        window.resizeTo(width, height);
      }
    }
  },
  
  // Test all breakpoints
  testAllBreakpoints: (testFunction) => {
    return breakpointTesting.testViewports.map(viewport => ({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      result: testFunction(viewport.width, viewport.height),
    }));
  },
};

// Performance Testing
export const performanceTesting = {
  // Measure component render time
  measureRenderTime: (componentName, renderFunction) => {
    const startTime = performance.now();
    const result = renderFunction();
    const endTime = performance.now();
    
    console.log(`${componentName} render time: ${endTime - startTime} milliseconds`);
    return {
      component: componentName,
      renderTime: endTime - startTime,
      result,
    };
  },
  
  // Monitor Core Web Vitals
  getCoreWebVitals: () => {
    return new Promise((resolve) => {
      const vitals = {
        LCP: null, // Largest Contentful Paint
        FID: null, // First Input Delay
        CLS: null, // Cumulative Layout Shift
        FCP: null, // First Contentful Paint
        TTFB: null, // Time to First Byte
      };
      
      // Use Web Vitals library if available
      if (window.webVitals) {
        window.webVitals.getLCP((metric) => {
          vitals.LCP = metric.value;
        });
        
        window.webVitals.getFID((metric) => {
          vitals.FID = metric.value;
        });
        
        window.webVitals.getCLS((metric) => {
          vitals.CLS = metric.value;
        });
        
        window.webVitals.getFCP((metric) => {
          vitals.FCP = metric.value;
        });
        
        window.webVitals.getTTFB((metric) => {
          vitals.TTFB = metric.value;
        });
        
        setTimeout(() => resolve(vitals), 1000);
      } else {
        // Fallback measurements
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          vitals.TTFB = navigation.responseStart - navigation.requestStart;
          vitals.FCP = navigation.loadEventStart - navigation.fetchStart;
        }
        resolve(vitals);
      }
    });
  },
  
  // Memory usage monitoring
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  },
};

// Cross-Browser Compatibility Testing
export const compatibilityTesting = {
  // Feature detection
  detectFeatures: () => {
    return {
      // CSS Features
      cssGrid: CSS.supports('display', 'grid'),
      cssFlexbox: CSS.supports('display', 'flex'),
      cssCustomProperties: CSS.supports('--custom', 'property'),
      cssBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
      cssClipPath: CSS.supports('clip-path', 'circle(50%)'),
      cssAspectRatio: CSS.supports('aspect-ratio', '16/9'),
      
      // JavaScript Features
      es6Classes: typeof class {} === 'function',
      arrowFunctions: (() => typeof (() => {}) === 'function')(),
      templateLiterals: (() => { try { eval('`test`'); return true; } catch { return false; } })(),
      promises: typeof Promise !== 'undefined',
      asyncAwait: (() => { try { eval('async () => {}'); return true; } catch { return false; } })(),
      modules: typeof import !== 'undefined',
      
      // Browser APIs
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      fetch: 'fetch' in window,
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,
      webWorkers: 'Worker' in window,
      serviceWorkers: 'serviceWorker' in navigator,
      geolocation: 'geolocation' in navigator,
      pushNotifications: 'Notification' in window,
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
        } catch { return false; }
      })(),
    };
  },
  
  // Polyfill recommendations
  getPolyfillRecommendations: () => {
    const features = compatibilityTesting.detectFeatures();
    const recommendations = [];
    
    if (!features.fetch) {
      recommendations.push('whatwg-fetch');
    }
    
    if (!features.promises) {
      recommendations.push('es6-promise');
    }
    
    if (!features.intersectionObserver) {
      recommendations.push('intersection-observer');
    }
    
    if (!features.resizeObserver) {
      recommendations.push('resize-observer-polyfill');
    }
    
    if (!features.cssCustomProperties) {
      recommendations.push('css-vars-ponyfill');
    }
    
    return recommendations;
  },
  
  // Browser-specific workarounds
  getBrowserWorkarounds: () => {
    const browser = getBrowserName();
    const workarounds = [];
    
    switch (browser) {
      case 'Safari':
        workarounds.push('Add -webkit- prefixes for newer CSS features');
        workarounds.push('Use fixed heights instead of min-height for flex items');
        workarounds.push('Add transform: translateZ(0) for hardware acceleration');
        break;
        
      case 'Internet Explorer':
        workarounds.push('Use Flexbox fallbacks for IE11');
        workarounds.push('Avoid CSS Grid, use Flexbox instead');
        workarounds.push('Include fetch and Promise polyfills');
        workarounds.push('Use object-fit polyfill for images');
        break;
        
      case 'Edge':
        workarounds.push('Test CSS Grid thoroughly - older versions had bugs');
        workarounds.push('Use viewport units with caution');
        break;
        
      case 'Firefox':
        workarounds.push('Test backdrop-filter fallbacks');
        workarounds.push('Check scroll-behavior support');
        break;
        
      default:
        workarounds.push('Test across multiple browsers for consistency');
    }
    
    return workarounds;
  },
};

// Accessibility Testing
export const accessibilityTesting = {
  // ARIA validation
  validateAria: (element) => {
    const issues = [];
    
    // Check for required ARIA attributes
    const requiredAttributes = {
      button: ['aria-label', 'aria-labelledby'],
      input: ['aria-label', 'aria-labelledby'],
      img: ['alt'],
    };
    
    Object.entries(requiredAttributes).forEach(([tag, attributes]) => {
      const elements = element.querySelectorAll(tag);
      elements.forEach(el => {
        const hasRequiredAttribute = attributes.some(attr => 
          el.hasAttribute(attr) && el.getAttribute(attr).trim()
        );
        
        if (!hasRequiredAttribute) {
          issues.push({
            element: el,
            issue: `Missing required accessibility attribute: ${attributes.join(' or ')}`,
            severity: 'error',
          });
        }
      });
    });
    
    return issues;
  },
  
  // Color contrast testing
  testColorContrast: (element) => {
    const contrastIssues = [];
    const textElements = element.querySelectorAll('*');
    
    textElements.forEach(el => {
      if (el.textContent.trim()) {
        const styles = window.getComputedStyle(el);
        const textColor = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Simple contrast check (would need proper implementation)
        if (textColor && backgroundColor) {
          const contrastRatio = calculateContrastRatio(textColor, backgroundColor);
          
          if (contrastRatio < 4.5) {
            contrastIssues.push({
              element: el,
              textColor,
              backgroundColor,
              contrastRatio,
              severity: contrastRatio < 3 ? 'error' : 'warning',
            });
          }
        }
      }
    });
    
    return contrastIssues;
  },
  
  // Keyboard navigation testing
  testKeyboardNavigation: (container) => {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    
    return {
      totalFocusableElements: focusableElements.length,
      elementsWithTabIndex: container.querySelectorAll('[tabindex]').length,
      elementsWithNegativeTabIndex: container.querySelectorAll('[tabindex="-1"]').length,
      recommendations: focusableElements.length === 0 ? 
        ['Add focusable elements for keyboard navigation'] : 
        ['Ensure logical tab order', 'Add visible focus indicators'],
    };
  },
};

// Helper function for contrast calculation (simplified)
const calculateContrastRatio = (color1, color2) => {
  // This is a simplified version - would need proper color parsing and luminance calculation
  return 4.5; // Placeholder
};

// Comprehensive Testing Suite
export const runComprehensiveTests = (rootElement = document.body) => {
  const testResults = {
    timestamp: new Date().toISOString(),
    deviceInfo: null,
    performance: null,
    compatibility: null,
    accessibility: null,
    responsive: null,
  };
  
  // Device detection
  testResults.deviceInfo = {
    userAgent: navigator.userAgent,
    browser: getBrowserName(),
    browserVersion: getBrowserVersion(),
    os: getOperatingSystem(),
    screen: {
      width: screen.width,
      height: screen.height,
      pixelRatio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
  
  // Performance tests
  performanceTesting.getCoreWebVitals().then(vitals => {
    testResults.performance = {
      coreWebVitals: vitals,
      memoryUsage: performanceTesting.getMemoryUsage(),
    };
  });
  
  // Compatibility tests
  testResults.compatibility = {
    features: compatibilityTesting.detectFeatures(),
    polyfillRecommendations: compatibilityTesting.getPolyfillRecommendations(),
    browserWorkarounds: compatibilityTesting.getBrowserWorkarounds(),
  };
  
  // Accessibility tests
  testResults.accessibility = {
    ariaIssues: accessibilityTesting.validateAria(rootElement),
    contrastIssues: accessibilityTesting.testColorContrast(rootElement),
    keyboardNavigation: accessibilityTesting.testKeyboardNavigation(rootElement),
  };
  
  // Responsive tests
  testResults.responsive = breakpointTesting.testAllBreakpoints((width, height) => ({
    isLayoutBroken: checkLayoutBreakage(width, height),
    hasHorizontalScroll: checkHorizontalScroll(width, height),
    areButtonsAccessible: checkButtonAccessibility(width, height),
  }));
  
  return testResults;
};

// Helper functions for responsive testing
const checkLayoutBreakage = (width, height) => {
  // Implementation would check for common layout issues
  return false; // Placeholder
};

const checkHorizontalScroll = (width, height) => {
  return document.body.scrollWidth > width;
};

const checkButtonAccessibility = (width, height) => {
  // Check if buttons are large enough for touch on mobile
  const buttons = document.querySelectorAll('button');
  const minTouchTarget = 44; // 44px minimum touch target
  
  return Array.from(buttons).every(button => {
    const rect = button.getBoundingClientRect();
    return rect.width >= minTouchTarget && rect.height >= minTouchTarget;
  });
};

export default {
  useDeviceDetection,
  breakpointTesting,
  performanceTesting,
  compatibilityTesting,
  accessibilityTesting,
  runComprehensiveTests,
};