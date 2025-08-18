import api from './api';

class ExportService {
  /**
   * Export a single document
   */
  async exportDocument(documentId, format, options = {}) {
    try {
      const response = await api.post(`/export/document/${documentId}/${format}`, options, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `document.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        blob: response.data,
        filename,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Export document error:', error);
      throw new Error(error.response?.data?.error || 'Export failed');
    }
  }

  /**
   * Export multiple documents as ZIP
   */
  async exportDocumentsBulk(documentIds, format, options = {}) {
    try {
      const response = await api.post('/export/documents/bulk', {
        documentIds,
        format,
        options
      }, {
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `documents_export.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        blob: response.data,
        filename,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Bulk export error:', error);
      throw new Error(error.response?.data?.error || 'Bulk export failed');
    }
  }

  /**
   * Export entire workspace
   */
  async exportWorkspace(workspaceId, format, options = {}) {
    try {
      const response = await api.post(`/export/workspace/${workspaceId}/${format}`, options, {
        responseType: 'blob'
      });

      const contentDisposition = response.headers['content-disposition'];
      let filename = `workspace_export.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        blob: response.data,
        filename,
        contentType: response.headers['content-type']
      };
    } catch (error) {
      console.error('Workspace export error:', error);
      throw new Error(error.response?.data?.error || 'Workspace export failed');
    }
  }

  /**
   * Get export preview for a document
   */
  async getDocumentExportPreview(documentId) {
    try {
      const response = await api.get(`/export/preview/document/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Export preview error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get export preview');
    }
  }

  /**
   * Get export preview for a workspace
   */
  async getWorkspaceExportPreview(workspaceId) {
    try {
      const response = await api.get(`/export/preview/workspace/${workspaceId}`);
      return response.data;
    } catch (error) {
      console.error('Workspace export preview error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get workspace export preview');
    }
  }

  /**
   * Get available export formats
   */
  async getExportFormats() {
    try {
      const response = await api.get('/export/formats');
      return response.data.formats;
    } catch (error) {
      console.error('Export formats error:', error);
      throw new Error('Failed to get export formats');
    }
  }

  /**
   * Download a file from blob data
   */
  downloadFile(blob, filename, contentType) {
    try {
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(new Blob([blob], { type: contentType }));
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Download error:', error);
      return false;
    }
  }

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Estimate export file size based on content
   */
  estimateFileSize(wordCount, format) {
    // Rough estimates based on typical file sizes
    const baseSize = wordCount * 6; // ~6 bytes per word on average
    
    const multipliers = {
      pdf: 1.5, // PDFs are typically larger due to formatting
      word: 2.0, // Word docs include lots of metadata
      docx: 2.0,
      markdown: 0.8, // Markdown is more compact
      md: 0.8
    };
    
    const multiplier = multipliers[format.toLowerCase()] || 1.0;
    return Math.round(baseSize * multiplier);
  }

  /**
   * Validate export options
   */
  validateExportOptions(format, options) {
    const errors = [];
    
    if (!format) {
      errors.push('Export format is required');
    }
    
    if (format === 'pdf' && options.format && !['A4', 'Letter', 'A3', 'Legal'].includes(options.format)) {
      errors.push('Invalid PDF format specified');
    }
    
    return errors;
  }

  /**
   * Get export status (for async exports)
   */
  async getExportStatus(jobId) {
    try {
      const response = await api.get(`/export/status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Export status error:', error);
      throw new Error('Failed to get export status');
    }
  }

  /**
   * Handle export with progress tracking
   */
  async exportWithProgress(exportFn, onProgress) {
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 20, 90);
      if (onProgress) onProgress(Math.round(progress));
    }, 500);

    try {
      const result = await exportFn();
      clearInterval(progressInterval);
      if (onProgress) onProgress(100);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }
}

export default new ExportService();