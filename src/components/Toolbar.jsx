import React from 'react';
import useEditorStore from '../stores/editorStore';

export default function Toolbar() {
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const addGroup = useEditorStore((s) => s.addGroup);
  const groups = useEditorStore((s) => s.groups);
  const elements = useEditorStore((s) => s.elements);
  const removeGroup = useEditorStore((s) => s.removeGroup);
  const setExportOpen = useEditorStore((s) => s.setExportOpen);

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    addGroup(`Group ${groups.length + 1}`, selectedIds);
  };

  const handleUngroup = () => {
    const groupIds = new Set();
    for (const id of selectedIds) {
      const el = elements.find((e) => e.id === id);
      if (el?.groupId) groupIds.add(el.groupId);
    }
    groupIds.forEach((gid) => removeGroup(gid));
  };

  return (
    <div className="toolbar">
      <span style={{ fontWeight: 600, fontSize: 13 }}>Phaser UI Builder</span>
      <div className="separator" />
      <button onClick={() => window.dispatchEvent(new CustomEvent('add-text-element'))}>
        + Text
      </button>
      <div className="separator" />
      <button onClick={handleGroup} disabled={selectedIds.length < 2}>
        Group
      </button>
      <button onClick={handleUngroup}>Ungroup</button>
      <div className="separator" />
      <button className={snapEnabled ? 'active' : ''} onClick={toggleSnap}>
        Snap {snapEnabled ? 'ON' : 'OFF'}
      </button>
      <div className="separator" />
      <button onClick={() => setZoom(zoom - 0.1)}>-</button>
      <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={() => setZoom(zoom + 0.1)}>+</button>
      <div className="spacer" />
      <button className="primary" style={{ background: 'var(--accent)', color: 'var(--surface)', borderColor: 'var(--accent)' }} onClick={() => setExportOpen(true)}>
        Export
      </button>
    </div>
  );
}
