const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');

class DocumentProcessor {
  constructor() {
    this.supportedTypes = {
      'application/pdf': this.processPDF,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processDocx,
      'application/msword': this.processDoc,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': this.processXlsx,
      'application/vnd.ms-excel': this.processXls,
      'text/plain': this.processText,
      'text/markdown': this.processText,
      'image/jpeg': this.processImage,
      'image/png': this.processImage,
      'image/tiff': this.processImage,
      'image/bmp': this.processImage
    };
  }

  /**
   * Process a document and extract text content
   * @param {string} filePath - Path to the file
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<{text: string, metadata: object}>}
   */
  async processDocument(filePath, mimeType) {
    try {
      logger.info(`Processing document: ${filePath} (${mimeType})`);
      
      const processor = this.supportedTypes[mimeType];
      if (!processor) {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const result = await processor.call(this, filePath);
      logger.info(`Successfully processed document: ${filePath}`);
      
      return {
        text: result.text || '',
        metadata: result.metadata || {},
        ocrApplied: result.ocrApplied || false
      };
    } catch (error) {
      logger.error(`Error processing document ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process PDF files
   */
  async processPDF(filePath) {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    };
  }

  /**
   * Process DOCX files
   */
  async processDocx(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      metadata: {
        messages: result.messages
      }
    };
  }

  /**
   * Process DOC files (legacy Word format)
   */
  async processDoc(filePath) {
    // For legacy DOC files, we'll use mammoth as well
    // In production, you might want to use a more specialized library
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      metadata: {
        messages: result.messages,
        format: 'legacy-doc'
      }
    };
  }

  /**
   * Process XLSX files
   */
  async processXlsx(filePath) {
    const workbook = xlsx.readFile(filePath);
    let text = '';
    const sheets = [];

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetText = xlsx.utils.sheet_to_txt(worksheet);
      text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      sheets.push(sheetName);
    });

    return {
      text: text.trim(),
      metadata: {
        sheets,
        sheetCount: workbook.SheetNames.length
      }
    };
  }

  /**
   * Process XLS files (legacy Excel format)
   */
  async processXls(filePath) {
    // Same as XLSX, the xlsx library handles both formats
    return this.processXlsx(filePath);
  }

  /**
   * Process plain text files
   */
  async processText(filePath) {
    const text = await fs.readFile(filePath, 'utf-8');
    
    return {
      text,
      metadata: {
        encoding: 'utf-8',
        size: text.length
      }
    };
  }

  /**
   * Process image files using OCR
   */
  async processImage(filePath) {
    try {
      logger.info(`Starting OCR processing for: ${filePath}`);
      
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      return {
        text: text.trim(),
        metadata: {
          ocrEngine: 'tesseract',
          language: 'eng'
        },
        ocrApplied: true
      };
    } catch (error) {
      logger.error(`OCR processing failed for ${filePath}:`, error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Check if a file type is supported
   */
  isSupported(mimeType) {
    return this.supportedTypes.hasOwnProperty(mimeType);
  }

  /**
   * Get list of supported MIME types
   */
  getSupportedTypes() {
    return Object.keys(this.supportedTypes);
  }
}

module.exports = new DocumentProcessor();