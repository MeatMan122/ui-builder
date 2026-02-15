import React from 'react';
import useEditorStore from '../stores/editorStore';

export default function LayerPanel() {
  const elements = useEditorStore((s) => s.elements);
  const groups = useEditorStore((s) => s.groups);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const setSelection = useEditorStore((s) => s.setSelection);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const removeElement = useEditorStore((s) => s.removeElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const reorderElement = useEditorStore((s) => s.reorderElement);

  const handleClick = (id, e) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelection(id);
    } else {
      setSelection([id]);
    }
  };

  const handleMoveUp = (id) => {
    const idx = elements.findIndex((e) => e.id === id);
    if (idx < elements.length - 1) reorderElement(id, idx + 1);
  };

  const handleMoveDown = (id) => {
    const idx = elements.findIndex((e) => e.id === id);
    if (idx > 0) reorderElement(id, idx - 1);
  };

  // Build grouped view
  const groupedIds = new Set();
  const groupMap = {};
  for (const g of groups) {
    groupMap[g.id] = g;
    for (const cid of g.children) groupedIds.add(cid);
  }

  // Render order: ungrouped + groups in element order
  const renderedGroups = new Set();
  const rows = [];

  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.groupId && !renderedGroups.has(el.groupId)) {
      renderedGroups.add(el.groupId);
      const group = groupMap[el.groupId];
      if (group) {
        rows.push({ type: 'group', group });
        const members = elements.filter((e) => e.groupId === el.groupId);
        for (const m of [...members].reverse()) {
          rows.push({ type: 'child', el: m, groupId: el.groupId });
        }
      }
    } else if (!el.groupId) {
      rows.push({ type: 'element', el });
    }
  }

  return (
    <>
      <div className="panel-header"><span>Layers</span></div>
      {rows.length === 0 && (
        <div className="empty-message">No elements on canvas.</div>
      )}
      {rows.map((row) => {
        if (row.type === 'group') {
          return (
            <div key={row.group.id} className="layer-item layer-group-header">
              <span className="layer-name">{row.group.name}</span>
            </div>
          );
        }
        const el = row.el;
        const isChild = row.type === 'child';
        return (
          <div
            key={el.id}
            className={`layer-item ${selectedIds.includes(el.id) ? 'selected' : ''} ${isChild ? 'layer-group-child' : ''}`}
            onClick={(e) => handleClick(el.id, e)}
          >
            <span
              className="layer-actions"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                title={el.visible ? 'Hide' : 'Show'}
                onClick={() => updateElement(el.id, { visible: !el.visible })}
              >
                {el.visible ? '👁' : '—'}
              </button>
            </span>
            <span className="layer-name">{el.name || el.fileName || el.textureKey}</span>
            <span className="layer-actions" onClick={(e) => e.stopPropagation()}>
              <button title="Move up" onClick={() => handleMoveUp(el.id)}>↑</button>
              <button title="Move down" onClick={() => handleMoveDown(el.id)}>↓</button>
              <button title="Delete" onClick={() => removeElement(el.id)}>✕</button>
            </span>
          </div>
        );
      })}
    </>
  );
}
