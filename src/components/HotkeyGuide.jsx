import React from 'react';

const shortcuts = [
  { keys: 'Ctrl + C', action: 'Copy' },
  { keys: 'Ctrl + V', action: 'Paste' },
  { keys: 'Delete', action: 'Delete selected' },
  { keys: 'Ctrl + Click', action: 'Multi-select' },
  { keys: 'Middle Mouse', action: 'Pan canvas' },
  { keys: 'Scroll Wheel', action: 'Zoom' },
];

export default function HotkeyGuide() {
  return (
    <div className="hotkey-guide">
      <div className="panel-header"><span>Shortcuts</span></div>
      <div className="hotkey-list">
        {shortcuts.map((s) => (
          <div key={s.keys} className="hotkey-row">
            <kbd className="hotkey-kbd">{s.keys}</kbd>
            <span className="hotkey-action">{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
