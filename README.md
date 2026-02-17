# Phaser UI Builder

A visual drag-and-drop editor for building [Phaser 3](https://phaser.io/) UI components. Design layouts by dragging image assets onto a canvas, configure properties like nine-slice scaling and animations, then export clean Phaser.js code ready to drop into your project.

![Built with React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Built with Phaser](https://img.shields.io/badge/Phaser-3.90-brightgreen?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAKCAYAAACE2W/HAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABfSURBVChTY/hPABiIUcSABJgYiAQMRAMGJDFkNQxEA4b/DAwM/4kEDMgKGYgGDCQDkgErKYCJaEBzjcSAYa2RFECKRlIMHdaAiWjAwDAIHEsiIN2xJAJGYhUBNQIA0/ELUCu3sJkAAAAASUVORK5CYII=)
![Zustand](https://img.shields.io/badge/State-Zustand-orange)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)
![License: ISC](https://img.shields.io/badge/License-ISC-blue)

## Features

- **Visual Drag-and-Drop Canvas** — Drag image assets from a file browser onto a Phaser-powered canvas. Pan with middle-click, zoom with the scroll wheel (10%–500%).
- **Asset File Browser** — Pick any folder on disk and browse its images in a tree view. Supports `.png`, `.jpg`, and `.jpeg` with preview thumbnails.
- **Nine-Slice Scaling** — Enable nine-slice mode on any element and configure left, right, top, and bottom margins.
- **Animation System** — Attach slide animations to elements with configurable direction, distance, duration, easing, and trigger (hover / click / both). Preview animations directly in the editor.
- **Grouping** — Select multiple elements and group them so they move together. Groups are shown in the layer panel and respected during export.
- **Snap-to-Grid** — Toggle snap alignment with visual guide lines for precise positioning.
- **Layer Management** — Reorder, toggle visibility, and delete elements from a dedicated layer panel.
- **Properties Panel** — Edit transform (position, size, rotation), nine-slice config, interactivity, and animations for any selected element.
- **Copy & Paste** — `Ctrl+C` / `Ctrl+V` to duplicate elements with an automatic offset.
- **Code Export** — Generate a self-contained Phaser.js factory function (`preload` + `create`) that recreates your entire layout as a `Phaser.Container`. Copy to clipboard or save as a `.js` file.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A modern browser — Chrome or Edge recommended for full [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) support (Firefox and Safari use a fallback file picker)

### Installation

```bash
git clone https://github.com/<your-username>/ui-helper.git
cd ui-helper
npm install
```

### Development

```bash
npm run dev
```

Starts a Vite dev server on **http://localhost:3000** and opens the browser automatically.

### Production Build

```bash
npm run build
npm run preview   # preview the built output locally
```

## Usage

1. **Pick a Folder** — Click the folder button in the left panel to select a directory containing your image assets.
2. **Add Elements** — Drag images from the file browser onto the canvas.
3. **Arrange & Edit** — Select elements to move, resize, rotate, or edit properties in the right panel.
4. **Group Elements** — Select two or more elements and click **Group** in the toolbar.
5. **Configure Animations** — In the properties panel, set up slide animations and use the preview button to test them.
6. **Export** — Click the **Export** button in the toolbar to generate Phaser.js code, then copy it to clipboard or save it as a file.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + C` | Copy selected elements |
| `Ctrl/Cmd + V` | Paste clipboard (with offset) |
| Middle Mouse Button | Pan canvas |
| Scroll Wheel | Zoom toward pointer |

## Export Format

The code generator produces two functions:

```js
function preloadMyComponent(scene) {
  scene.load.image('btn_bg', 'assets/btn_bg.png');
  // ...
}

function createMyComponent(scene, x, y) {
  const container = scene.add.container(x, y);
  // elements, nine-slice objects, interactive handlers, tweens...
  return container;
}
```

Drop these into any Phaser 3 project — call `preload` in your scene's `preload()` and `create` wherever you need the UI.

## Project Structure

```
ui-helper/
├── index.html                  # Entry HTML
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                # React entry point
    ├── App.jsx                 # Layout shell
    ├── components/
    │   ├── Toolbar.jsx         # Top bar (zoom, snap, group, export)
    │   ├── FileBrowser.jsx     # Left panel — asset tree
    │   ├── Canvas.jsx          # Center — Phaser game wrapper
    │   ├── PropertiesPanel.jsx # Right panel — element properties
    │   ├── LayerPanel.jsx      # Bottom panel — layer list
    │   └── ExportModal.jsx     # Export code modal
    ├── stores/
    │   └── editorStore.js      # Zustand store (single source of truth)
    ├── phaser/
    │   ├── WorkspaceScene.js   # Phaser scene (drag, zoom, pan)
    │   ├── PhaserBridge.js     # React ↔ Phaser state sync
    │   ├── SnapManager.js      # Snap alignment + guide lines
    │   ├── SelectionManager.js # Selection outlines & resize handles
    │   └── NineSliceHelper.js  # Nine-slice utilities
    ├── export/
    │   └── codeGenerator.js    # Phaser code generation
    ├── animations/
    │   ├── registry.js         # Extensible animation registry
    │   ├── init.js             # Registers built-in animations
    │   └── types/
    │       └── slide.js        # Slide animation type
    └── styles/
        └── app.css             # Dark theme styles
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Canvas / Rendering | Phaser 3 |
| State Management | Zustand |
| Build Tool | Vite 7 |
| Styling | CSS (dark theme with CSS variables) |

## Architecture

The application separates concerns between **React** (UI panels) and **Phaser** (canvas rendering). A **Zustand** store acts as the single source of truth, and `PhaserBridge` keeps the Phaser game objects in sync with the store bidirectionally. The animation system uses an extensible registry pattern, making it straightforward to add new animation types beyond the built-in slide animation.

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

## Author

David Brodie
