// Accessibility Utilities and Helpers
import React from 'react';

// ARIA Live Region Hook for Screen Reader Announcements
export const useAriaLive = () => {
  const announce = (message, priority = 'polite') => {
    const liveRegion = document.getElementById(`aria-live-${priority}`);
    if (liveRegion) {
      liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  };

  return { announce };
};

// Keyboard Navigation Hook
export const useKeyboardNavigation = (onEnter, onEscape, onArrowKeys) => {
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          event.preventDefault();
          onEnter(event);
        }
        break;
      case 'Escape':
        if (onEscape) {
          event.preventDefault();
          onEscape(event);
        }
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (onArrowKeys) {
          event.preventDefault();
          onArrowKeys(event.key, event);
        }
        break;
    }
  };

  return { handleKeyDown };
};

// Focus Management Hook
export const useFocusManagement = () => {
  const focusFirst = (container) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  };

  const focusLast = (container) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  };

  const trapFocus = (container, event) => {
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  return { focusFirst, focusLast, trapFocus };
};

// Skip Navigation Component
export const SkipNavigation = () => (
  <a
    href="#main-content"
    className="skip-navigation"
    style={{
      position: 'absolute',
      top: '-40px',
      left: '6px',
      background: '#000',
      color: '#fff',
      padding: '8px',
      borderRadius: '4px',
      textDecoration: 'none',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: '600',
      transition: 'top 0.2s ease',
    }}
    onFocus={(e) => {
      e.target.style.top = '6px';
    }}
    onBlur={(e) => {
      e.target.style.top = '-40px';
    }}
  >
    Skip to main content
  </a>
);

// Live Region Component for Screen Reader Announcements
export const LiveRegion = () => (
  <>
    <div
      id="aria-live-polite"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
    <div
      id="aria-live-assertive"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  </>
);

// Enhanced Button Component with Better Accessibility
export const AccessibleButton = React.forwardRef(({
  children,
  onClick,
  disabled,
  ariaLabel,
  ariaDescribedBy,
  variant = 'contained',
  size = 'medium',
  startIcon,
  endIcon,
  fullWidth,
  loading,
  loadingText = 'Loading...',
  ...props
}, ref) => {
  const { announce } = useAriaLive();
  const { handleKeyDown } = useKeyboardNavigation(
    (event) => {
      if (!disabled && !loading && onClick) {
        onClick(event);
      }
    }
  );

  const handleClick = (event) => {
    if (!disabled && !loading && onClick) {
      onClick(event);
      
      // Announce action completion for screen readers
      if (ariaLabel) {
        announce(`${ariaLabel} activated`, 'polite');
      }
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...props}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...props.style,
      }}
    >
      {loading && (
        <span className="sr-only" aria-live="polite">
          {loadingText}
        </span>
      )}
      {startIcon && <span className="button-start-icon">{startIcon}</span>}
      {children}
      {endIcon && <span className="button-end-icon">{endIcon}</span>}
    </button>
  );
});

// Enhanced Input Component with Better Accessibility
export const AccessibleInput = React.forwardRef(({
  label,
  error,
  helperText,
  required,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled,
  ariaDescribedBy,
  ...props
}, ref) => {
  const inputId = id || `input-${name || Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperTextId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperTextId, ariaDescribedBy].filter(Boolean).join(' ');

  return (
    <div className="accessible-input-container">
      {label && (
        <label 
          htmlFor={inputId}
          className={`input-label ${required ? 'required' : ''}`}
        >
          {label}
          {required && (
            <span aria-label="required" className="required-indicator">
              *
            </span>
          )}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {error && (
        <div 
          id={errorId}
          className="input-error" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}
      {helperText && !error && (
        <div 
          id={helperTextId}
          className="input-helper-text"
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

// Color Contrast Utilities
export const checkColorContrast = (foreground, background) => {
  // Simple contrast ratio calculation
  const getLuminance = (color) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  
  return {
    ratio,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
  };
};

// Screen Reader Only Text Component
export const ScreenReaderOnly = ({ children }) => (
  <span 
    className="sr-only"
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    }}
  >
    {children}
  </span>
);

// Focus Visible Utility
export const addFocusVisible = () => {
  // Add focus-visible polyfill behavior
  let hadKeyboardEvent = true;
  let keyboardThrottleId = 0;

  const pointerEvents = ['mousedown', 'pointerdown', 'touchstart'];
  const keyboardEvents = ['keydown'];

  function onPointerDown() {
    hadKeyboardEvent = false;
  }

  function onKeyDown(e) {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;
    }
    hadKeyboardEvent = true;
  }

  function onFocus(e) {
    if (hadKeyboardEvent || focusTriggersKeyboardModality(e.target)) {
      e.target.classList.add('focus-visible');
    }
  }

  function onBlur(e) {
    e.target.classList.remove('focus-visible');
  }

  function focusTriggersKeyboardModality(node) {
    return (
      node.type === 'range' ||
      node.contentEditable === 'true' ||
      (node.tagName === 'INPUT' && node.type !== 'checkbox' && node.type !== 'radio') ||
      node.tagName === 'TEXTAREA'
    );
  }

  // Add event listeners
  pointerEvents.forEach(event => {
    document.addEventListener(event, onPointerDown, true);
  });

  keyboardEvents.forEach(event => {
    document.addEventListener(event, onKeyDown, true);
  });

  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
};

// Reduced Motion Preference
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// High Contrast Mode Detection
export const prefersHighContrast = () => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// Dark Mode Preference
export const prefersDarkMode = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Accessibility Validation
export const validateAccessibility = (element) => {
  const issues = [];

  // Check for missing alt text on images
  const images = element.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && img.alt !== '') {
      issues.push({
        type: 'missing-alt',
        element: img,
        message: 'Image missing alt attribute',
      });
    }
  });

  // Check for buttons without accessible names
  const buttons = element.querySelectorAll('button');
  buttons.forEach(button => {
    const hasAccessibleName = 
      button.textContent.trim() ||
      button.getAttribute('aria-label') ||
      button.getAttribute('aria-labelledby');
    
    if (!hasAccessibleName) {
      issues.push({
        type: 'button-no-name',
        element: button,
        message: 'Button has no accessible name',
      });
    }
  });

  // Check for form inputs without labels
  const inputs = element.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const hasLabel = 
      input.labels?.length > 0 ||
      input.getAttribute('aria-label') ||
      input.getAttribute('aria-labelledby');
    
    if (!hasLabel) {
      issues.push({
        type: 'input-no-label',
        element: input,
        message: 'Form control has no associated label',
      });
    }
  });

  return issues;
};

export default {
  useAriaLive,
  useKeyboardNavigation,
  useFocusManagement,
  SkipNavigation,
  LiveRegion,
  AccessibleButton,
  AccessibleInput,
  checkColorContrast,
  ScreenReaderOnly,
  addFocusVisible,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  validateAccessibility,
};