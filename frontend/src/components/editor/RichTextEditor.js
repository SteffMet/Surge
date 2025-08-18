import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Tooltip,
  ButtonGroup,
  Select,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  Code,
  Link,
  Image,
  TableChart,
  CheckBox,
  Functions,
  AccountTree,
  Save,
  Undo,
  Redo,
  FormatQuote,
  Title,
  ViewHeadline,
  InsertChart,
  Assignment
} from '@mui/icons-material';
import MermaidDiagram from './MermaidDiagram';
import MathEquation from './MathEquation';
import InteractiveChecklist from './InteractiveChecklist';

// Configure lowlight for syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('python', python);
lowlight.register('sql', sql);
lowlight.register('json', json);
lowlight.register('bash', bash);

const RichTextEditor = ({
  content,
  onUpdate,
  onSave,
  readOnly = false,
  placeholder = "Start writing...",
  documentId = null
}) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [mermaidDialogOpen, setMermaidDialogOpen] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [mathExpression, setMathExpression] = useState('');
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState('');
  const [checklistItems, setChecklistItems] = useState(['']);

  const extensions = [
    StarterKit,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: 'task-item',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'code-block',
      },
    }),
  ];

  // Add collaboration extensions if enabled
  // Removed for now to avoid dependency issues

  const editor = useEditor({
    extensions,
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4',
        placeholder
      },
    },
  });

  const handleSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getHTML());
    }
  }, [editor, onSave]);

  // Auto-save functionality
  useEffect(() => {
    if (!editor || !onSave) return;

    const saveInterval = setInterval(() => {
      handleSave();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [editor, handleSave, onSave]);

  const insertLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setLinkDialogOpen(false);
    }
  };

  const insertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
      setImageDialogOpen(false);
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ 
      rows: tableRows, 
      cols: tableCols, 
      withHeaderRow: true 
    }).run();
    setTableDialogOpen(false);
  };

  const insertMermaidDiagram = () => {
    if (mermaidCode) {
      // Insert Mermaid diagram as a custom node
      editor.chain().focus().insertContent(`
        <div class="mermaid-diagram" data-mermaid="${encodeURIComponent(mermaidCode)}">
          <pre><code class="language-mermaid">${mermaidCode}</code></pre>
        </div>
      `).run();
      setMermaidCode('');
      setMermaidDialogOpen(false);
    }
  };

  const insertMathEquation = () => {
    if (mathExpression) {
      // Insert math equation as a custom node
      editor.chain().focus().insertContent(`
        <div class="math-equation" data-expression="${encodeURIComponent(mathExpression)}">
          <code class="math">${mathExpression}</code>
        </div>
      `).run();
      setMathExpression('');
      setMathDialogOpen(false);
    }
  };

  const insertInteractiveChecklist = () => {
    if (checklistTitle && checklistItems.filter(item => item.trim()).length > 0) {
      const items = checklistItems
        .filter(item => item.trim())
        .map(item => `<li data-type="taskItem" data-checked="false">${item}</li>`)
        .join('');
      
      editor.chain().focus().insertContent(`
        <div class="interactive-checklist">
          <h3>${checklistTitle}</h3>
          <ul data-type="taskList">${items}</ul>
        </div>
      `).run();
      
      setChecklistTitle('');
      setChecklistItems(['']);
      setChecklistDialogOpen(false);
    }
  };

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, '']);
  };

  const updateChecklistItem = (index, value) => {
    const newItems = [...checklistItems];
    newItems[index] = value;
    setChecklistItems(newItems);
  };

  const removeChecklistItem = (index) => {
    if (checklistItems.length > 1) {
      const newItems = checklistItems.filter((_, i) => i !== index);
      setChecklistItems(newItems);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ border: '1px solid #e0e0e0' }}>
      {/* Toolbar */}
      <Toolbar 
        variant="dense" 
        sx={{ 
          borderBottom: '1px solid #e0e0e0',
          flexWrap: 'wrap',
          gap: 1,
          py: 1
        }}
      >
        {/* Text formatting */}
        <ButtonGroup size="small">
          <Tooltip title="Bold">
            <IconButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
            >
              <FormatBold />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italic">
            <IconButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
            >
              <FormatItalic />
            </IconButton>
          </Tooltip>
          <Tooltip title="Underline">
            <IconButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              color={editor.isActive('underline') ? 'primary' : 'default'}
            >
              <FormatUnderlined />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Headings */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={
              editor.isActive('heading', { level: 1 }) ? 'h1' :
              editor.isActive('heading', { level: 2 }) ? 'h2' :
              editor.isActive('heading', { level: 3 }) ? 'h3' :
              'paragraph'
            }
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = parseInt(value.replace('h', ''));
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <MenuItem value="paragraph">Paragraph</MenuItem>
            <MenuItem value="h1">Heading 1</MenuItem>
            <MenuItem value="h2">Heading 2</MenuItem>
            <MenuItem value="h3">Heading 3</MenuItem>
          </Select>
        </FormControl>

        <Divider orientation="vertical" flexItem />

        {/* Lists */}
        <ButtonGroup size="small">
          <Tooltip title="Bullet List">
            <IconButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              color={editor.isActive('bulletList') ? 'primary' : 'default'}
            >
              <FormatListBulleted />
            </IconButton>
          </Tooltip>
          <Tooltip title="Numbered List">
            <IconButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              color={editor.isActive('orderedList') ? 'primary' : 'default'}
            >
              <FormatListNumbered />
            </IconButton>
          </Tooltip>
          <Tooltip title="Task List">
            <IconButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              color={editor.isActive('taskList') ? 'primary' : 'default'}
            >
              <CheckBox />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Insert elements */}
        <ButtonGroup size="small">
          <Tooltip title="Insert Link">
            <IconButton onClick={() => setLinkDialogOpen(true)}>
              <Link />
            </IconButton>
          </Tooltip>
          <Tooltip title="Insert Image">
            <IconButton onClick={() => setImageDialogOpen(true)}>
              <Image />
            </IconButton>
          </Tooltip>
          <Tooltip title="Insert Table">
            <IconButton onClick={() => setTableDialogOpen(true)}>
              <TableChart />
            </IconButton>
          </Tooltip>
          <Tooltip title="Insert Code Block">
            <IconButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              color={editor.isActive('codeBlock') ? 'primary' : 'default'}
            >
              <Code />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Advanced content */}
        <ButtonGroup size="small">
          <Tooltip title="Insert Diagram">
            <IconButton onClick={() => setMermaidDialogOpen(true)}>
              <AccountTree />
            </IconButton>
          </Tooltip>
          <Tooltip title="Insert Math Equation">
            <IconButton onClick={() => setMathDialogOpen(true)}>
              <Functions />
            </IconButton>
          </Tooltip>
          <Tooltip title="Insert Checklist">
            <IconButton onClick={() => setChecklistDialogOpen(true)}>
              <Assignment />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        {/* Actions */}
        <ButtonGroup size="small">
          <Tooltip title="Undo">
            <IconButton 
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo">
            <IconButton 
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo />
            </IconButton>
          </Tooltip>
          {onSave && (
            <Tooltip title="Save">
              <IconButton onClick={handleSave}>
                <Save />
              </IconButton>
            </Tooltip>
          )}
        </ButtonGroup>
      </Toolbar>

      {/* Editor Content */}
      <Box sx={{ minHeight: 400 }}>
        <EditorContent editor={editor} />
      </Box>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)}>
        <DialogTitle>Insert Link</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URL"
            fullWidth
            variant="outlined"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                insertLink();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertLink} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)}>
        <DialogTitle>Insert Image</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Image URL"
            fullWidth
            variant="outlined"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                insertImage();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertImage} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={tableDialogOpen} onClose={() => setTableDialogOpen(false)}>
        <DialogTitle>Insert Table</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <TextField
              label="Rows"
              type="number"
              variant="outlined"
              size="small"
              value={tableRows}
              onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 20 }}
            />
            <TextField
              label="Columns"
              type="number"
              variant="outlined"
              size="small"
              value={tableCols}
              onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 10 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertTable} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Mermaid Diagram Dialog */}
      <Dialog 
        open={mermaidDialogOpen} 
        onClose={() => setMermaidDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Insert Diagram</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Mermaid Code"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={mermaidCode}
            onChange={(e) => setMermaidCode(e.target.value)}
            placeholder="graph TD&#10;    A[Start] --> B{Is it working?}&#10;    B -->|Yes| C[Great!]&#10;    B -->|No| D[Fix it]"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Use Mermaid syntax to create flowcharts, sequence diagrams, and more.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMermaidDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertMermaidDiagram} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Math Equation Dialog */}
      <Dialog open={mathDialogOpen} onClose={() => setMathDialogOpen(false)}>
        <DialogTitle>Insert Math Equation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="LaTeX Expression"
            fullWidth
            variant="outlined"
            value={mathExpression}
            onChange={(e) => setMathExpression(e.target.value)}
            placeholder="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Use LaTeX syntax for mathematical expressions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMathDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertMathEquation} variant="contained">Insert</Button>
        </DialogActions>
      </Dialog>

      {/* Interactive Checklist Dialog */}
      <Dialog 
        open={checklistDialogOpen} 
        onClose={() => setChecklistDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Interactive Checklist</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Checklist Title"
            fullWidth
            variant="outlined"
            value={checklistTitle}
            onChange={(e) => setChecklistTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Checklist Items:
          </Typography>
          
          {checklistItems.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                variant="outlined"
                value={item}
                onChange={(e) => updateChecklistItem(index, e.target.value)}
                placeholder={`Item ${index + 1}`}
              />
              {checklistItems.length > 1 && (
                <IconButton 
                  size="small" 
                  onClick={() => removeChecklistItem(index)}
                >
                  ✕
                </IconButton>
              )}
            </Box>
          ))}
          
          <Button
            onClick={addChecklistItem}
            size="small"
            sx={{ mt: 1 }}
          >
            Add Item
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChecklistDialogOpen(false)}>Cancel</Button>
          <Button onClick={insertInteractiveChecklist} variant="contained">
            Insert Checklist
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RichTextEditor;