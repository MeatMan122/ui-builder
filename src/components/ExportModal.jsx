import React, { useState, useMemo } from 'react';
import useEditorStore from '../stores/editorStore';
import { generateCode } from '../export/codeGenerator';

export default function ExportModal() {
  const exportOpen = useEditorStore((s) => s.exportOpen);
  const setExportOpen = useEditorStore((s) => s.setExportOpen);
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const [componentName, setComponentName] = useState('MyUIComponent');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!exportOpen) return '';
    return generateCode(componentName, elements, groups);
  }, [exportOpen, componentName, elements, groups]);

  if (!exportOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers or insecure contexts
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `${componentName}.js`,
          types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(code);
        await writable.close();
        return;
      } catch (e) {
        // user cancelled
        return;
      }
    }

    // Fallback: trigger a standard download
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentName}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={() => setExportOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Export Component</h2>
        <div className="component-name-row">
          <label>Name:</label>
          <input
            value={componentName}
            onChange={(e) => setComponentName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          />
        </div>
        <div className="code-area">{code}</div>
        <div className="modal-actions">
          {copied && <span className="copy-success">Copied!</span>}
          <button onClick={() => setExportOpen(false)}>Close</button>
          <button onClick={handleCopy}>Copy to Clipboard</button>
          <button className="primary" onClick={handleSave}>Save as .js</button>
        </div>
      </div>
    </div>
  );
}
