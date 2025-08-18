import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { Edit, ContentCopy } from '@mui/icons-material';

// Math rendering using KaTeX (we'll need to install katex)
const MathEquation = ({ 
  expression, 
  displayMode = false, 
  editable = false, 
  onEdit,
  title 
}) => {
  const mathRef = useRef(null);
  const [isError, setIsError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  useEffect(() => {
    if (!mathRef.current || !expression) return;

    try {
      setIsError(false);
      setErrorMessage('');

      // Try to use KaTeX if available, otherwise fallback to MathJax
      if (window.katex) {
        window.katex.render(expression, mathRef.current, {
          displayMode,
          throwOnError: true,
          errorColor: '#cc0000',
          macros: {
            "\\RR": "\\mathbb{R}",
            "\\NN": "\\mathbb{N}",
            "\\ZZ": "\\mathbb{Z}",
            "\\QQ": "\\mathbb{Q}",
            "\\CC": "\\mathbb{C}"
          }
        });
      } else if (window.MathJax) {
        // Fallback to MathJax
        mathRef.current.innerHTML = displayMode 
          ? `\\[${expression}\\]`
          : `\\(${expression}\\)`;
        
        window.MathJax.typesetPromise([mathRef.current]).catch((err) => {
          console.error('MathJax error:', err);
          setIsError(true);
          setErrorMessage(err.message);
        });
      } else {
        // No math library available, show raw LaTeX
        mathRef.current.innerHTML = `<code>${expression}</code>`;
      }

    } catch (error) {
      console.error('Math rendering error:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to render equation');
      
      // Show error with raw expression
      mathRef.current.innerHTML = `
        <div style="color: #cc0000; font-family: monospace; padding: 8px; background: #fee;">
          <strong>Math Error:</strong> ${error.message || 'Invalid expression'}<br/>
          <code>${expression}</code>
        </div>
      `;
    }
  }, [expression, displayMode]);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(expression);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy expression:', err);
    }
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        position: 'relative',
        display: displayMode ? 'block' : 'inline-block',
        margin: displayMode ? '16px 0' : '0 4px',
        '&:hover .math-controls': {
          opacity: 1
        }
      }}
    >
      {title && displayMode && (
        <Box sx={{ p: 1, pb: 0.5, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" component="h4">
            {title}
          </Typography>
        </Box>
      )}

      {/* Controls overlay */}
      <Box
        className="math-controls"
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          padding: 0.25
        }}
      >
        {editable && onEdit && (
          <Tooltip title="Edit Equation">
            <IconButton size="small" onClick={handleEdit}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Copy LaTeX">
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Math content */}
      <Box
        ref={mathRef}
        sx={{
          p: displayMode ? 2 : 1,
          textAlign: displayMode ? 'center' : 'left',
          minHeight: displayMode ? 60 : 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: displayMode ? 'center' : 'flex-start',
          fontFamily: 'KaTeX_Main, "Times New Roman", serif',
          fontSize: displayMode ? '1.2em' : '1em',
          lineHeight: 1.2
        }}
      />

      {/* Raw expression preview (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ 
          p: 0.5, 
          backgroundColor: '#f5f5f5', 
          fontSize: '0.75rem',
          borderTop: '1px solid #e0e0e0'
        }}>
          <Typography variant="caption" component="code">
            {expression}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Hook to load KaTeX dynamically
export const useKaTeX = () => {
  const [loaded, setLoaded] = React.useState(false);

  useEffect(() => {
    // Check if KaTeX is already loaded
    if (window.katex) {
      setLoaded(true);
      return;
    }

    // Load KaTeX CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css';
    cssLink.integrity = 'sha384-Xi8rHCmBmhbuyyhbI88391ZKP2dmfnOl4rT9ZfRI7mLTdk1wblIUnrIq35nqwEvC';
    cssLink.crossOrigin = 'anonymous';
    document.head.appendChild(cssLink);

    // Load KaTeX JavaScript
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js';
    script.integrity = 'sha384-X/XCfMm41VSsqRNQgDerQczD69XqmjOOOwYQvr/uuC+j4OPoNhVgjdGFwhvN02Ja';
    script.crossOrigin = 'anonymous';
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      console.warn('Failed to load KaTeX, falling back to MathJax');
      loadMathJax();
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const loadMathJax = () => {
    if (window.MathJax) {
      setLoaded(true);
      return;
    }

    // Configure MathJax
    window.MathJax = {
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'a']
      }
    };

    // Load MathJax
    const script = document.createElement('script');
    script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6';
    script.onload = () => {
      const mathJaxScript = document.createElement('script');
      mathJaxScript.id = 'MathJax-script';
      mathJaxScript.async = true;
      mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      mathJaxScript.onload = () => setLoaded(true);
      document.head.appendChild(mathJaxScript);
    };
    document.head.appendChild(script);
  };

  return loaded;
};

export default MathEquation;