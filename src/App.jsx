import React, { useEffect, useRef, useState, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import FileBrowser from './components/FileBrowser';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayerPanel from './components/LayerPanel';
import ExportModal from './components/ExportModal';
import useEditorStore from './stores/editorStore';

const MIN_LEFT = 140;
const MIN_RIGHT = 160;
const MIN_BOTTOM = 60;
const DEFAULT_LEFT = 220;
const DEFAULT_RIGHT = 260;
const DEFAULT_BOTTOM = 160;

export default function App() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT);
  const [bottomHeight, setBottomHeight] = useState(DEFAULT_BOTTOM);
  const dragRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'c') {
        e.preventDefault();
        useEditorStore.getState().copySelection();
      } else if (mod && e.key === 'v') {
        e.preventDefault();
        useEditorStore.getState().pasteClipboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onMouseMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;

    if (d.panel === 'left') {
      const newW = Math.max(MIN_LEFT, e.clientX - d.offset);
      setLeftWidth(newW);
    } else if (d.panel === 'right') {
      const newW = Math.max(MIN_RIGHT, window.innerWidth - e.clientX - d.offset);
      setRightWidth(newW);
    } else if (d.panel === 'bottom') {
      const newH = Math.max(MIN_BOTTOM, window.innerHeight - e.clientY - d.offset);
      setBottomHeight(newH);
    }
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const startDrag = useCallback((panel, e) => {
    e.preventDefault();
    if (panel === 'left') {
      dragRef.current = { panel, offset: e.clientX - leftWidth };
      document.body.style.cursor = 'col-resize';
    } else if (panel === 'right') {
      dragRef.current = { panel, offset: window.innerWidth - e.clientX - rightWidth };
      document.body.style.cursor = 'col-resize';
    } else if (panel === 'bottom') {
      dragRef.current = { panel, offset: window.innerHeight - e.clientY - bottomHeight };
      document.body.style.cursor = 'row-resize';
    }
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [leftWidth, rightWidth, bottomHeight, onMouseMove, onMouseUp]);

  return (
    <div className="app-shell">
      <Toolbar />
      <div className="main-area">
        <div className="panel-left" style={{ width: leftWidth }}>
          <FileBrowser />
        </div>
        <div
          className="resize-handle resize-handle-v"
          onMouseDown={(e) => startDrag('left', e)}
        />
        <div className="canvas-container" id="canvas-container">
          <Canvas />
        </div>
        <div
          className="resize-handle resize-handle-v"
          onMouseDown={(e) => startDrag('right', e)}
        />
        <div className="panel-right" style={{ width: rightWidth }}>
          <PropertiesPanel />
        </div>
      </div>
      <div
        className="resize-handle resize-handle-h"
        onMouseDown={(e) => startDrag('bottom', e)}
      />
      <div className="panel-bottom" style={{ height: bottomHeight }}>
        <LayerPanel />
      </div>
      <ExportModal />
    </div>
  );
}
