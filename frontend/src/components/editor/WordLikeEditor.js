import React from 'react';
import RichTextEditor from './RichTextEditor';

const WordLikeEditor = ({ initialValue, onEditorChange }) => {
  const handleUpdate = (content) => {
    if (onEditorChange) {
      onEditorChange(content);
    }
  };

  return (
    <RichTextEditor
      content={initialValue || ''}
      onUpdate={handleUpdate}
      placeholder="Start writing your document..."
    />
  );
};

export default WordLikeEditor;