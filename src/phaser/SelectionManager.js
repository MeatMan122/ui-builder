import useEditorStore from '../stores/editorStore';

const HANDLE_SIZE = 8;
const HANDLE_COLOR = 0x89b4fa;

/**
 * SelectionManager: click select, multi-select, resize handles.
 */
export default class SelectionManager {
  constructor(scene) {
    this.scene = scene;
    this.handles = [];     // Phaser rectangles for resize
    this.outline = null;   // Graphics for selection outline
    this._activeHandle = null;
    this._dragStartState = null;

    this.outline = scene.add.graphics();
    this.outline.setDepth(10000);
  }

  refreshHandles() {
    this.clearHandles();
    const { selectedIds, elements } = useEditorStore.getState();
    if (selectedIds.length === 0) return;

    // Draw outline around each selected element
    this.outline.clear();
    this.outline.lineStyle(1.5, HANDLE_COLOR, 0.8);

    for (const id of selectedIds) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      this.outline.strokeRect(el.x, el.y, el.w, el.h);
    }

    // If exactly one is selected, show resize handles
    if (selectedIds.length === 1) {
      const el = elements.find((e) => e.id === selectedIds[0]);
      if (!el) return;
      this.createHandles(el);
    }
  }

  createHandles(el) {
    const positions = this.getHandlePositions(el);
    for (const pos of positions) {
      const handle = this.scene.add.rectangle(
        pos.x, pos.y,
        HANDLE_SIZE, HANDLE_SIZE,
        HANDLE_COLOR
      );
      handle.setOrigin(0.5, 0.5);
      handle.setDepth(10001);
      handle.setInteractive({ draggable: true, cursor: pos.cursor });
      handle.setData('handleType', pos.type);
      handle.setData('elementId', el.id);

      this.scene.input.setDraggable(handle);

      handle.on('dragstart', () => {
        const currentEl = useEditorStore.getState().elements.find((e) => e.id === el.id);
        this._activeHandle = pos.type;
        this._dragStartState = { ...currentEl };
      });

      handle.on('drag', (pointer, dragX, dragY) => {
        this.onHandleDrag(pos.type, dragX, dragY);
      });

      handle.on('dragend', () => {
        this._activeHandle = null;
        this._dragStartState = null;
        this.refreshHandles();
      });

      this.handles.push(handle);
    }
  }

  getHandlePositions(el) {
    const { x, y, w, h } = el;
    return [
      { type: 'tl', x: x, y: y, cursor: 'nwse-resize' },
      { type: 'tc', x: x + w / 2, y: y, cursor: 'ns-resize' },
      { type: 'tr', x: x + w, y: y, cursor: 'nesw-resize' },
      { type: 'ml', x: x, y: y + h / 2, cursor: 'ew-resize' },
      { type: 'mr', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
      { type: 'bl', x: x, y: y + h, cursor: 'nesw-resize' },
      { type: 'bc', x: x + w / 2, y: y + h, cursor: 'ns-resize' },
      { type: 'br', x: x + w, y: y + h, cursor: 'nwse-resize' },
    ];
  }

  onHandleDrag(type, pointerX, pointerY) {
    const start = this._dragStartState;
    if (!start) return;

    let { x, y, w, h } = start;
    const minSize = 4;

    switch (type) {
      case 'tl':
        w = (x + w) - pointerX;
        h = (y + h) - pointerY;
        x = pointerX;
        y = pointerY;
        break;
      case 'tc':
        h = (y + h) - pointerY;
        y = pointerY;
        break;
      case 'tr':
        w = pointerX - x;
        h = (y + h) - pointerY;
        y = pointerY;
        break;
      case 'ml':
        w = (x + w) - pointerX;
        x = pointerX;
        break;
      case 'mr':
        w = pointerX - x;
        break;
      case 'bl':
        w = (x + w) - pointerX;
        h = pointerY - y;
        x = pointerX;
        break;
      case 'bc':
        h = pointerY - y;
        break;
      case 'br':
        w = pointerX - x;
        h = pointerY - y;
        break;
    }

    if (w < minSize) w = minSize;
    if (h < minSize) h = minSize;

    const bridge = this.scene.bridge;
    bridge.updateStore(start.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });

    // Update the game object immediately
    const go = bridge.getGameObject(start.id);
    if (go) {
      go.setPosition(Math.round(x), Math.round(y));
      if (go.type === 'NineSlice') {
        go.setSize(Math.round(w), Math.round(h));
      } else {
        go.setDisplaySize(Math.round(w), Math.round(h));
      }
    }

    // Update outline
    this.outline.clear();
    this.outline.lineStyle(1.5, HANDLE_COLOR, 0.8);
    this.outline.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

    // Update handle positions
    const positions = this.getHandlePositions({ id: start.id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    for (let i = 0; i < this.handles.length; i++) {
      this.handles[i].setPosition(positions[i].x, positions[i].y);
    }
  }

  clearHandles() {
    for (const h of this.handles) h.destroy();
    this.handles = [];
    if (this.outline) this.outline.clear();
  }
}
