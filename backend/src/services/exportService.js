const puppeteer = require('puppeteer');
const officegen = require('officegen');
const markdownIt = require('markdown-it');
const markdownItKatex = require('markdown-it-katex');
const fs = require('fs').promises;
const path = require('path');
const { Document } = require('../models/Document');
const { Workspace } = require('../models/Workspace');

// Initialize markdown processor with math support
const md = markdownIt({ html: true, linkify: true, typographer: true })
  .use(markdownItKatex);

class ExportService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch (error) {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Export document to PDF format
   */
  async exportToPdf(documentId, options = {}) {
    try {
      const document = await Document.findById(documentId)
        .populate('workspace', 'name branding')
        .populate('createdBy', 'username email');

      if (!document) {
        throw new Error('Document not found');
      }

      const htmlContent = await this.generateHtmlContent(document, options);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Configure PDF options
      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: this.generatePdfHeader(document, options),
        footerTemplate: this.generatePdfFooter(document, options),
        ...options.pdfOptions
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      await browser.close();

      return {
        buffer: pdfBuffer,
        filename: `${this.sanitizeFilename(document.title)}.pdf`,
        contentType: 'application/pdf'
      };

    } catch (error) {
      console.error('PDF export error:', error);
      throw new Error(`PDF export failed: ${error.message}`);
    }
  }

  /**
   * Export document to Word format
   */
  async exportToWord(documentId, options = {}) {
    try {
      const document = await Document.findById(documentId)
        .populate('workspace', 'name branding')
        .populate('createdBy', 'username email');

      if (!document) {
        throw new Error('Document not found');
      }

      return new Promise((resolve, reject) => {
        const docx = officegen('docx');

        // Set document properties
        docx.setDocTitle(document.title);
        docx.setDocSubject(document.description || '');
        docx.setDocKeywords(document.tags ? document.tags.join(', ') : '');
        docx.setDocCategory('Documentation');
        docx.setCreator(document.createdBy?.username || 'Surge Platform');

        // Add header if branding is enabled
        if (document.workspace?.branding?.logo || options.includeBranding) {
          this.addWordHeader(docx, document, options);
        }

        // Add document content
        this.addWordContent(docx, document, options);

        // Add footer
        this.addWordFooter(docx, document, options);

        // Generate document buffer
        const chunks = [];
        docx.on('data', (chunk) => chunks.push(chunk));
        docx.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            filename: `${this.sanitizeFilename(document.title)}.docx`,
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          });
        });
        docx.on('error', reject);

        docx.generate();
      });

    } catch (error) {
      console.error('Word export error:', error);
      throw new Error(`Word export failed: ${error.message}`);
    }
  }

  /**
   * Export document to Markdown format
   */
  async exportToMarkdown(documentId, options = {}) {
    try {
      const document = await Document.findById(documentId)
        .populate('workspace', 'name branding')
        .populate('createdBy', 'username email');

      if (!document) {
        throw new Error('Document not found');
      }

      let markdownContent = '';

      // Add frontmatter if requested
      if (options.includeFrontmatter) {
        markdownContent += this.generateMarkdownFrontmatter(document);
      }

      // Add title
      markdownContent += `# ${document.title}\n\n`;

      // Add metadata
      if (options.includeMetadata) {
        markdownContent += this.generateMarkdownMetadata(document);
      }

      // Add main content
      markdownContent += this.processContentForMarkdown(document.content);

      // Add tags if present
      if (document.tags && document.tags.length > 0) {
        markdownContent += `\n\n---\n\n**Tags:** ${document.tags.join(', ')}\n`;
      }

      const buffer = Buffer.from(markdownContent, 'utf8');

      return {
        buffer,
        filename: `${this.sanitizeFilename(document.title)}.md`,
        contentType: 'text/markdown'
      };

    } catch (error) {
      console.error('Markdown export error:', error);
      throw new Error(`Markdown export failed: ${error.message}`);
    }
  }

  /**
   * Export multiple documents as a ZIP archive
   */
  async exportToZip(documentIds, format, options = {}) {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();

    try {
      for (const docId of documentIds) {
        let exportResult;
        
        switch (format.toLowerCase()) {
          case 'pdf':
            exportResult = await this.exportToPdf(docId, options);
            break;
          case 'word':
          case 'docx':
            exportResult = await this.exportToWord(docId, options);
            break;
          case 'markdown':
          case 'md':
            exportResult = await this.exportToMarkdown(docId, options);
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        zip.addFile(exportResult.filename, exportResult.buffer);
      }

      const zipBuffer = zip.toBuffer();

      return {
        buffer: zipBuffer,
        filename: `documents_export_${format}_${Date.now()}.zip`,
        contentType: 'application/zip'
      };

    } catch (error) {
      console.error('ZIP export error:', error);
      throw new Error(`ZIP export failed: ${error.message}`);
    }
  }

  /**
   * Export workspace documentation as a complete package
   */
  async exportWorkspace(workspaceId, format, options = {}) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      const documents = await Document.find({ workspace: workspaceId })
        .sort({ title: 1 });

      const documentIds = documents.map(doc => doc._id.toString());

      // Generate table of contents
      const tocDocument = await this.generateTableOfContents(documents, options);
      
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();

      // Add table of contents
      if (format.toLowerCase() === 'pdf') {
        const tocPdf = await this.exportToPdf(tocDocument._id, options);
        zip.addFile('00_Table_of_Contents.pdf', tocPdf.buffer);
      } else if (format.toLowerCase() === 'markdown') {
        const tocMd = await this.exportToMarkdown(tocDocument._id, options);
        zip.addFile('00_Table_of_Contents.md', tocMd.buffer);
      }

      // Add all documents
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const prefix = String(i + 1).padStart(2, '0');
        
        let exportResult;
        switch (format.toLowerCase()) {
          case 'pdf':
            exportResult = await this.exportToPdf(doc._id, options);
            break;
          case 'word':
          case 'docx':
            exportResult = await this.exportToWord(doc._id, options);
            break;
          case 'markdown':
          case 'md':
            exportResult = await this.exportToMarkdown(doc._id, options);
            break;
        }

        const filename = `${prefix}_${exportResult.filename}`;
        zip.addFile(filename, exportResult.buffer);
      }

      // Add workspace metadata
      const workspaceInfo = {
        name: workspace.name,
        description: workspace.description,
        exportDate: new Date().toISOString(),
        documentCount: documents.length,
        documents: documents.map(doc => ({
          title: doc.title,
          description: doc.description,
          tags: doc.tags,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }))
      };

      zip.addFile('workspace_info.json', Buffer.from(JSON.stringify(workspaceInfo, null, 2)));

      const zipBuffer = zip.toBuffer();

      return {
        buffer: zipBuffer,
        filename: `${this.sanitizeFilename(workspace.name)}_${format}_${Date.now()}.zip`,
        contentType: 'application/zip'
      };

    } catch (error) {
      console.error('Workspace export error:', error);
      throw new Error(`Workspace export failed: ${error.message}`);
    }
  }

  // Helper methods

  async generateHtmlContent(document, options = {}) {
    const workspace = document.workspace;
    const branding = workspace?.branding || {};

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${document.title}</title>
        <style>
          body {
            font-family: ${branding.fontFamily || 'Arial, sans-serif'};
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 2px solid ${branding.primaryColor || '#007bff'};
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            color: ${branding.primaryColor || '#007bff'};
            font-size: 2.5em;
            margin-bottom: 10px;
          }
          .metadata {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 20px;
          }
          .content {
            font-size: 1.1em;
          }
          .content h1, .content h2, .content h3 {
            color: ${branding.primaryColor || '#007bff'};
          }
          .tags {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .tag {
            display: inline-block;
            background: ${branding.secondaryColor || '#f8f9fa'};
            color: ${branding.primaryColor || '#007bff'};
            padding: 4px 8px;
            border-radius: 4px;
            margin-right: 8px;
            font-size: 0.9em;
          }
          pre, code {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 8px;
            font-family: 'Courier New', monospace;
          }
          blockquote {
            border-left: 4px solid ${branding.primaryColor || '#007bff'};
            padding-left: 16px;
            margin-left: 0;
            font-style: italic;
          }
          .mermaid {
            text-align: center;
            margin: 20px 0;
          }
        </style>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css">
      </head>
      <body>
        <div class="header">
          ${branding.logo ? `<img src="${branding.logo}" alt="Logo" style="height: 50px; margin-bottom: 20px;">` : ''}
          <h1 class="title">${document.title}</h1>
          ${document.description ? `<p class="description">${document.description}</p>` : ''}
        </div>
        
        <div class="metadata">
          <strong>Created:</strong> ${new Date(document.createdAt).toLocaleDateString()}<br>
          <strong>Last Updated:</strong> ${new Date(document.updatedAt).toLocaleDateString()}<br>
          ${document.createdBy ? `<strong>Author:</strong> ${document.createdBy.username}<br>` : ''}
          ${workspace ? `<strong>Workspace:</strong> ${workspace.name}<br>` : ''}
        </div>
        
        <div class="content">
          ${await this.processContentForHtml(document.content)}
        </div>
        
        ${document.tags && document.tags.length > 0 ? `
          <div class="tags">
            <strong>Tags:</strong><br>
            ${document.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
      </body>
      </html>
    `;

    return html;
  }

  generatePdfHeader(document, options) {
    const workspace = document.workspace;
    const branding = workspace?.branding || {};
    
    return `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666; margin: 0 15mm;">
        ${branding.logo ? `<img src="${branding.logo}" style="height: 20px; margin-right: 10px;">` : ''}
        ${workspace?.name || 'Surge Documentation'}
      </div>
    `;
  }

  generatePdfFooter(document, options) {
    return `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666; margin: 0 15mm;">
        <span>${document.title}</span>
        <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  addWordHeader(docx, document, options) {
    // Add document header with branding
    const header = docx.getHeader().createP();
    header.addText(document.workspace?.name || 'Surge Documentation', {
      bold: true,
      font_size: 12,
      color: '0066cc'
    });
  }

  addWordContent(docx, document, options) {
    // Add title
    const title = docx.createP();
    title.addText(document.title, {
      bold: true,
      font_size: 18,
      color: '0066cc'
    });

    // Add description
    if (document.description) {
      const desc = docx.createP();
      desc.addText(document.description, { italic: true });
    }

    // Add metadata
    const metadata = docx.createP();
    metadata.addText(`Created: ${new Date(document.createdAt).toLocaleDateString()}`, { font_size: 10 });
    metadata.addLineBreak();
    metadata.addText(`Last Updated: ${new Date(document.updatedAt).toLocaleDateString()}`, { font_size: 10 });
    
    if (document.createdBy) {
      metadata.addLineBreak();
      metadata.addText(`Author: ${document.createdBy.username}`, { font_size: 10 });
    }

    // Add separator
    docx.createP().addText('', { border_bottom: { style: 'single', size: 1, color: '0066cc' } });

    // Process and add content
    this.addWordContentFromMarkdown(docx, document.content);

    // Add tags
    if (document.tags && document.tags.length > 0) {
      docx.createP().addText('');
      const tags = docx.createP();
      tags.addText('Tags: ' + document.tags.join(', '), { font_size: 10, italic: true });
    }
  }

  addWordFooter(docx, document, options) {
    const footer = docx.getFooter().createP();
    footer.addText(document.title + ' - Page ', { font_size: 10 });
    footer.addPageNumber();
  }

  addWordContentFromMarkdown(docx, content) {
    // Convert markdown content to Word document structure
    const lines = content.split('\n');
    let currentParagraph = null;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // H1 heading
        const p = docx.createP();
        p.addText(line.substring(2), { bold: true, font_size: 16, color: '0066cc' });
      } else if (line.startsWith('## ')) {
        // H2 heading
        const p = docx.createP();
        p.addText(line.substring(3), { bold: true, font_size: 14, color: '0066cc' });
      } else if (line.startsWith('### ')) {
        // H3 heading
        const p = docx.createP();
        p.addText(line.substring(4), { bold: true, font_size: 12, color: '0066cc' });
      } else if (line.startsWith('```')) {
        // Code block (simplified handling)
        if (!currentParagraph || currentParagraph.type !== 'code') {
          currentParagraph = { type: 'code', content: [] };
        } else {
          // End of code block
          const p = docx.createP();
          p.addText(currentParagraph.content.join('\n'), { 
            font_family: 'Courier New',
            font_size: 10,
            shd: { fill: 'f8f9fa' }
          });
          currentParagraph = null;
        }
      } else if (currentParagraph && currentParagraph.type === 'code') {
        currentParagraph.content.push(line);
      } else if (line.trim()) {
        // Regular paragraph
        const p = docx.createP();
        
        // Simple markdown processing for bold and italic
        let processedLine = line;
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<bold>$1</bold>');
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<italic>$1</italic>');
        
        // Add processed text (simplified - would need more complex parsing for full markdown)
        p.addText(processedLine.replace(/<\/?(?:bold|italic)>/g, ''));
      } else {
        // Empty line
        docx.createP().addText('');
      }
    }
  }

  generateMarkdownFrontmatter(document) {
    return `---
title: "${document.title}"
description: "${document.description || ''}"
author: "${document.createdBy?.username || 'Unknown'}"
created: ${document.createdAt.toISOString()}
updated: ${document.updatedAt.toISOString()}
tags: [${document.tags ? document.tags.map(tag => `"${tag}"`).join(', ') : ''}]
workspace: "${document.workspace?.name || ''}"
---

`;
  }

  generateMarkdownMetadata(document) {
    let metadata = '';
    metadata += `**Created:** ${new Date(document.createdAt).toLocaleDateString()}\n`;
    metadata += `**Last Updated:** ${new Date(document.updatedAt).toLocaleDateString()}\n`;
    if (document.createdBy) {
      metadata += `**Author:** ${document.createdBy.username}\n`;
    }
    if (document.workspace) {
      metadata += `**Workspace:** ${document.workspace.name}\n`;
    }
    metadata += '\n---\n\n';
    return metadata;
  }

  processContentForMarkdown(content) {
    // Process TipTap JSON content or HTML content to clean Markdown
    if (typeof content === 'object') {
      // Handle TipTap JSON format
      return this.tiptapToMarkdown(content);
    } else if (typeof content === 'string') {
      // Handle HTML or markdown string
      return content;
    }
    return '';
  }

  async processContentForHtml(content) {
    if (typeof content === 'object') {
      // Convert TipTap JSON to HTML
      return this.tiptapToHtml(content);
    } else if (typeof content === 'string') {
      // Process markdown to HTML
      return md.render(content);
    }
    return '';
  }

  tiptapToMarkdown(json) {
    // Convert TipTap JSON to Markdown (simplified implementation)
    if (!json || !json.content) return '';
    
    return json.content.map(node => {
      switch (node.type) {
        case 'heading':
          const level = '#'.repeat(node.attrs?.level || 1);
          return `${level} ${this.extractText(node)}\n\n`;
        case 'paragraph':
          return `${this.extractText(node)}\n\n`;
        case 'codeBlock':
          const lang = node.attrs?.language || '';
          return `\`\`\`${lang}\n${this.extractText(node)}\n\`\`\`\n\n`;
        case 'blockquote':
          return `> ${this.extractText(node)}\n\n`;
        case 'bulletList':
          return this.processList(node, '- ') + '\n';
        case 'orderedList':
          return this.processList(node, '1. ') + '\n';
        default:
          return this.extractText(node) + '\n\n';
      }
    }).join('');
  }

  tiptapToHtml(json) {
    // Convert TipTap JSON to HTML (simplified implementation)
    if (!json || !json.content) return '';
    
    return json.content.map(node => {
      switch (node.type) {
        case 'heading':
          const level = node.attrs?.level || 1;
          return `<h${level}>${this.extractText(node)}</h${level}>`;
        case 'paragraph':
          return `<p>${this.extractText(node)}</p>`;
        case 'codeBlock':
          const lang = node.attrs?.language || '';
          return `<pre><code class="language-${lang}">${this.extractText(node)}</code></pre>`;
        case 'blockquote':
          return `<blockquote><p>${this.extractText(node)}</p></blockquote>`;
        case 'bulletList':
          return `<ul>${this.processListHtml(node)}</ul>`;
        case 'orderedList':
          return `<ol>${this.processListHtml(node)}</ol>`;
        default:
          return `<p>${this.extractText(node)}</p>`;
      }
    }).join('\n');
  }

  extractText(node) {
    if (!node.content) return '';
    
    return node.content.map(child => {
      if (child.type === 'text') {
        let text = child.text || '';
        if (child.marks) {
          child.marks.forEach(mark => {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`;
                break;
              case 'italic':
                text = `*${text}*`;
                break;
              case 'code':
                text = `\`${text}\``;
                break;
              case 'link':
                text = `[${text}](${mark.attrs?.href || ''})`;
                break;
            }
          });
        }
        return text;
      } else if (child.type === 'hardBreak') {
        return '\n';
      }
      return this.extractText(child);
    }).join('');
  }

  processList(listNode, prefix) {
    if (!listNode.content) return '';
    
    return listNode.content.map(item => {
      return `${prefix}${this.extractText(item)}`;
    }).join('\n');
  }

  processListHtml(listNode) {
    if (!listNode.content) return '';
    
    return listNode.content.map(item => {
      return `<li>${this.extractText(item)}</li>`;
    }).join('');
  }

  async generateTableOfContents(documents, options) {
    // Create a virtual table of contents document
    let tocContent = '# Table of Contents\n\n';
    
    documents.forEach((doc, index) => {
      const number = String(index + 1).padStart(2, '0');
      tocContent += `${index + 1}. [${doc.title}](#${this.sanitizeFilename(doc.title)})\n`;
      if (doc.description) {
        tocContent += `   ${doc.description}\n`;
      }
      tocContent += '\n';
    });

    // Return a mock document object
    return {
      _id: 'toc',
      title: 'Table of Contents',
      content: tocContent,
      createdAt: new Date(),
      updatedAt: new Date(),
      workspace: documents[0]?.workspace
    };
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase();
  }
}

module.exports = new ExportService();