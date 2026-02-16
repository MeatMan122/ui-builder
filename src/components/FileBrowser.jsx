import React, { useState, useCallback, useRef, useMemo } from 'react';
import useEditorStore from '../stores/editorStore';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];
const supportsDirectoryPicker = typeof window.showDirectoryPicker === 'function';

function isImageFile(name) {
  const lower = name.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/* ------------------------------------------------------------------ */
/*  Build a nested tree from the flat asset list                      */
/* ------------------------------------------------------------------ */
function buildTree(assetFiles) {
  const root = { name: '', folders: {}, files: [] };

  for (const asset of assetFiles) {
    const parts = asset.path.split('/');
    let node = root;

    // Walk / create intermediate folders
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      if (!node.folders[folderName]) {
        node.folders[folderName] = { name: folderName, folders: {}, files: [] };
      }
      node = node.folders[folderName];
    }

    node.files.push(asset);
  }

  return root;
}

/* ------------------------------------------------------------------ */
/*  Recursive folder node                                             */
/* ------------------------------------------------------------------ */
function FolderNode({ node, path, depth, expanded, onToggle, onDragStart, onPreview }) {
  const folderPath = path ? `${path}/${node.name}` : node.name;
  const isOpen = expanded.has(folderPath);
  const subFolders = Object.values(node.folders).sort((a, b) => a.name.localeCompare(b.name));
  const hasChildren = subFolders.length > 0 || node.files.length > 0;

  return (
    <div className="folder-node">
      <div
        className="folder-row"
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={() => onToggle(folderPath)}
      >
        <span className={`folder-chevron ${isOpen ? 'open' : ''}`}>&#9656;</span>
        <span className="folder-icon">&#128193;</span>
        <span className="folder-name">{node.name}</span>
        <span className="folder-count">{countFiles(node)}</span>
      </div>

      {isOpen && hasChildren && (
        <div className="folder-children">
          {subFolders.map((child) => (
            <FolderNode
              key={child.name}
              node={child}
              path={folderPath}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onDragStart={onDragStart}
              onPreview={onPreview}
            />
          ))}

          {node.files.length > 0 && (
            <div className="folder-files" style={{ paddingLeft: (depth + 1) * 14 + 6 }}>
              {node.files.map((asset) => (
                <div
                  key={asset.path}
                  className="asset-thumb"
                  draggable
                  onDragStart={(e) => onDragStart(e, asset)}
                  onClick={() => onPreview(asset)}
                >
                  <img src={asset.objectUrl} alt={asset.name} />
                  <span title={asset.path}>{asset.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function countFiles(node) {
  let total = node.files.length;
  for (const sub of Object.values(node.folders)) {
    total += countFiles(sub);
  }
  return total;
}

/* ------------------------------------------------------------------ */
/*  Collect all folder paths so we can "expand all" on first load     */
/* ------------------------------------------------------------------ */
function collectFolderPaths(node, parentPath, out) {
  const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  if (node.name) out.push(folderPath);
  for (const child of Object.values(node.folders)) {
    collectFolderPaths(child, folderPath, out);
  }
}

/* ================================================================== */
/*  FileBrowser component                                             */
/* ================================================================== */
export default function FileBrowser() {
  const assetFiles = useEditorStore((s) => s.assetFiles);
  const setAssetFiles = useEditorStore((s) => s.setAssetFiles);
  const setDirectoryHandle = useEditorStore((s) => s.setDirectoryHandle);
  const [preview, setPreview] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const folderInputRef = useRef(null);

  // Build tree from flat list
  const tree = useMemo(() => buildTree(assetFiles), [assetFiles]);

  // Top-level folders and root-level files
  const topFolders = useMemo(
    () => Object.values(tree.folders).sort((a, b) => a.name.localeCompare(b.name)),
    [tree],
  );
  const rootFiles = tree.files;

  /* ---------- Expand / collapse helpers ---------- */
  const toggleFolder = useCallback((folderPath) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const paths = [];
    collectFolderPaths(tree, '', paths);
    setExpanded(new Set(paths));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  /* ---------- Native File System Access API (Chrome / Edge) ---------- */
  async function scanDirectory(dirHandle, pathPrefix, results) {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (isImageFile(entry.name)) {
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

  const pickFolderNative = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      const files = [];
      await scanDirectory(dirHandle, '', files);
      setAssetFiles(files);
      setExpanded(new Set());
    } catch (e) {
      // user cancelled
    }
  }, [setDirectoryHandle, setAssetFiles]);

  /* ---------- Fallback via <input webkitdirectory> (Firefox / Safari) ---------- */
  const handleFolderInput = useCallback(
    (e) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const files = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!isImageFile(file.name)) continue;

        const relativePath = file.webkitRelativePath || file.name;
        const objectUrl = URL.createObjectURL(file);
        files.push({
          name: file.name,
          path: relativePath,
          handle: null,
          objectUrl,
          file,
        });
      }

      setDirectoryHandle(null);
      setAssetFiles(files);
      setExpanded(new Set());

      e.target.value = '';
    },
    [setDirectoryHandle, setAssetFiles],
  );

  const pickFolder = useCallback(() => {
    if (supportsDirectoryPicker) {
      pickFolderNative();
    } else {
      folderInputRef.current?.click();
    }
  }, [pickFolderNative]);

  /* ---------- Drag ---------- */
  const onDragStart = useCallback((e, asset) => {
    e.dataTransfer.setData('application/x-asset', JSON.stringify({
      name: asset.name,
      path: asset.path,
      objectUrl: asset.objectUrl,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const hasFolders = topFolders.length > 0;

  return (
    <>
      {/* Hidden file input for browsers without showDirectoryPicker */}
      {!supportsDirectoryPicker && (
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderInput}
        />
      )}

      <div className="panel-header">
        <span>Assets</span>
        <div className="panel-header-actions">
          {hasFolders && (
            <>
              <button onClick={expandAll} title="Expand all folders">&#9660;</button>
              <button onClick={collapseAll} title="Collapse all folders">&#9650;</button>
            </>
          )}
          <button onClick={pickFolder}>Pick Folder</button>
        </div>
      </div>

      <div className="file-browser-list">
        {assetFiles.length === 0 && (
          <div className="empty-message">No assets loaded. Click "Pick Folder" above.</div>
        )}

        {/* Folder tree */}
        {topFolders.map((folder) => (
          <FolderNode
            key={folder.name}
            node={folder}
            path=""
            depth={0}
            expanded={expanded}
            onToggle={toggleFolder}
            onDragStart={onDragStart}
            onPreview={setPreview}
          />
        ))}

        {/* Root-level files (not inside any folder) */}
        {rootFiles.length > 0 && (
          <div className="folder-files" style={{ paddingLeft: 6 }}>
            {rootFiles.map((asset) => (
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
        )}
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
