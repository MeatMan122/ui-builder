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
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${componentName}.js`,
        types: [{ description: 'JavaScript', accept: { 'text/javascript': ['.js'] } }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(code);
      await writable.close();
    } catch (e) {
      // user cancelled
    }
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
