import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { Edit, Fullscreen, Download } from '@mui/icons-material';
import mermaid from 'mermaid';

const MermaidDiagram = ({ 
  code, 
  editable = false, 
  onEdit, 
  title,
  theme = 'default'
}) => {
  const diagramRef = useRef(null);
  const [isError, setIsError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  useEffect(() => {
    // Initialize Mermaid with configuration
    mermaid.initialize({
      startOnLoad: true,
      theme: theme,
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        fontFamily: '"Open-Sans", "sans-serif"',
        fontSize: 11,
        fontWeight: 'normal',
        gridLineStartPadding: 35,
        bottomPadding: 5,
        leftPadding: 75,
        topPadding: 50,
        topAxis: false
      }
    });

    renderDiagram();
  }, [code, theme]);

  const renderDiagram = async () => {
    if (!diagramRef.current || !code) return;

    try {
      setIsError(false);
      setErrorMessage('');

      // Clear previous diagram
      diagramRef.current.innerHTML = '';

      // Generate unique ID for this diagram
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Render the diagram
      const { svg } = await mermaid.render(diagramId, code);
      
      // Insert the SVG into the container
      diagramRef.current.innerHTML = svg;

      // Make the diagram responsive
      const svgElement = diagramRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
      }

    } catch (error) {
      console.error('Mermaid rendering error:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to render diagram');
      
      // Show error in the container
      diagramRef.current.innerHTML = `
        <div style="
          padding: 20px; 
          background-color: #fee; 
          border: 1px solid #fcc; 
          border-radius: 4px;
          color: #c33;
        ">
          <strong>Diagram Error:</strong><br/>
          ${error.message || 'Failed to render diagram'}
          <br/><br/>
          <code style="background: #f9f9f9; padding: 4px;">${code}</code>
        </div>
      `;
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(code);
    }
  };

  const handleFullscreen = () => {
    const element = diagramRef.current;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  const handleDownload = () => {
    const svgElement = diagramRef.current.querySelector('svg');
    if (!svgElement) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    canvas.width = svgRect.width;
    canvas.height = svgRect.height;

    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      
      // Download the image
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    };
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        '&:hover .diagram-controls': {
          opacity: 1
        }
      }}
    >
      {title && (
        <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
        </Box>
      )}
      
      {/* Controls overlay */}
      <Box
        className="diagram-controls"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
          opacity: 0,
          transition: 'opacity 0.2s',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 1,
          padding: 0.5
        }}
      >
        {editable && onEdit && (
          <Tooltip title="Edit Diagram">
            <IconButton size="small" onClick={handleEdit}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Fullscreen">
          <IconButton size="small" onClick={handleFullscreen}>
            <Fullscreen fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Download">
          <IconButton size="small" onClick={handleDownload}>
            <Download fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Diagram container */}
      <Box
        ref={diagramRef}
        sx={{
          p: 2,
          textAlign: 'center',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& svg': {
            maxWidth: '100%',
            height: 'auto'
          }
        }}
      />

      {/* Code preview (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ p: 1, backgroundColor: '#f5f5f5', fontSize: '0.75rem' }}>
          <Typography variant="caption" component="pre" sx={{ margin: 0 }}>
            {code}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default MermaidDiagram;