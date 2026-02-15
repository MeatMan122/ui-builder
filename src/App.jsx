import React from 'react';
import Toolbar from './components/Toolbar';
import FileBrowser from './components/FileBrowser';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayerPanel from './components/LayerPanel';
import ExportModal from './components/ExportModal';

export default function App() {
  return (
    <div className="app-shell">
      <Toolbar />
      <div className="main-area">
        <div className="panel-left">
          <FileBrowser />
        </div>
        <div className="canvas-container" id="canvas-container">
          <Canvas />
        </div>
        <div className="panel-right">
          <PropertiesPanel />
        </div>
      </div>
      <div className="panel-bottom">
        <LayerPanel />
      </div>
      <ExportModal />
    </div>
  );
}
