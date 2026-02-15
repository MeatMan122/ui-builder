import React, { useState, useCallback } from 'react';
import useEditorStore from '../stores/editorStore';

export default function FileBrowser() {
  const assetFiles = useEditorStore((s) => s.assetFiles);
  const setAssetFiles = useEditorStore((s) => s.setAssetFiles);
  const setDirectoryHandle = useEditorStore((s) => s.setDirectoryHandle);
  const [preview, setPreview] = useState(null);

  const pickFolder = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      const files = [];
      await scanDirectory(dirHandle, '', files);
      setAssetFiles(files);
    } catch (e) {
      // user cancelled
    }
  }, [setDirectoryHandle, setAssetFiles]);

  async function scanDirectory(dirHandle, pathPrefix, results) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
          const file = await entry.getFile();
          const objectUrl = URL.createObjectURL(file);
          results.push({
            name: entry.name,
            path: pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name,
            handle: entry,
            objectUrl,
            file,
          });
        }
      } else if (entry.kind === 'directory') {
        const sub = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
        await scanDirectory(entry, sub, results);
      }
    }
  }

  const onDragStart = (e, asset) => {
    e.dataTransfer.setData('application/x-asset', JSON.stringify({
      name: asset.name,
      path: asset.path,
      objectUrl: asset.objectUrl,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      <div className="panel-header">
        <span>Assets</span>
        <button onClick={pickFolder}>Pick Folder</button>
      </div>
      <div className="file-browser-list">
        {assetFiles.length === 0 && (
          <div className="empty-message">No assets loaded. Click "Pick Folder" above.</div>
        )}
        {assetFiles.map((asset) => (
          <div
            key={asset.path}
            className="asset-thumb"
            draggable
            onDragStart={(e) => onDragStart(e, asset)}
            onClick={() => setPreview(asset)}
          >
            <img src={asset.objectUrl} alt={asset.name} />
            <span title={asset.path}>{asset.name}</span>
          </div>
        ))}
      </div>

      {preview && (
        <div className="preview-overlay" onClick={() => setPreview(null)}>
          <div className="preview-popup" onClick={(e) => e.stopPropagation()}>
            <img src={preview.objectUrl} alt={preview.name} />
            <div className="preview-name">{preview.path}</div>
            <div style={{ marginTop: 8 }}>
              <button
                style={{
                  padding: '4px 12px',
                  border: '1px solid var(--input-border)',
                  borderRadius: 4,
                  background: 'var(--input-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
