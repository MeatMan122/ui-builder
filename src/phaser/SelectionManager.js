import Phaser from 'phaser';
import useEditorStore from '../stores/editorStore';

const HANDLE_SIZE = 8;
const HANDLE_HIT_SIZE = 20;
const HANDLE_COLOR = 0x89b4fa;
const ROTATION_LINE_LENGTH = 25;

const HANDLE_OUTWARD = {
  tl: { x: -1, y: -1 },
  tc: { x:  0, y: -1 },
  tr: { x:  1, y: -1 },
  ml: { x: -1, y:  0 },
  mr: { x:  1, y:  0 },
  bl: { x: -1, y:  1 },
  bc: { x:  0, y:  1 },
  br: { x:  1, y:  1 },
};

const HANDLE_BASE_AXIS = {
  tc: 0, bc: 0,
  tr: 45, bl: 45,
  mr: 90, ml: 90,
  br: 135, tl: 135,
};

const RESIZE_CURSORS = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];

/**
 * SelectionManager: click select, multi-select, resize handles, rotation handle.
 * All handles and outlines rotate with the element.
 */
export default class SelectionManager {
  constructor(scene) {
    this.scene = scene;
    this.handles = [];
    this.outline = null;
    this._activeHandle = null;
    this._dragStartState = null;

    this._rotGfx = null;
    this._rotZone = null;
    this._rotatingId = null;
    this._rotCenter = null;
    this._rotPrevPointerAngle = 0;
    this._rotStartRotation = 0;
    this._rotAccumulatedDelta = 0;

    this.outline = scene.add.graphics();
    this.outline.setDepth(10000);
  }

  /* ---- helpers ---- */

  _rotateLocal(lx, ly, angleDeg, ox, oy) {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return {
      x: ox + lx * c - ly * s,
      y: oy + lx * s + ly * c,
    };
  }

  _strokeRotatedRect(graphics, el) {
    const rot = el.rotation || 0;
    const r = (lx, ly) => this._rotateLocal(lx, ly, rot, el.x, el.y);
    const tl = r(0, 0);
    const tr = r(el.w, 0);
    const br = r(el.w, el.h);
    const bl = r(0, el.h);
    graphics.beginPath();
    graphics.moveTo(tl.x, tl.y);
    graphics.lineTo(tr.x, tr.y);
    graphics.lineTo(br.x, br.y);
    graphics.lineTo(bl.x, bl.y);
    graphics.closePath();
    graphics.strokePath();
  }

  _getResizeCursor(handleType, rotation) {
    const base = HANDLE_BASE_AXIS[handleType] || 0;
    const angle = (((base + rotation) % 180) + 180) % 180;
    const idx = Math.round(angle / 45) % 4;
    return RESIZE_CURSORS[idx];
  }

  /* ---- main refresh ---- */

  refreshHandles() {
    this.clearHandles();
    const { selectedIds, elements, zoom } = useEditorStore.getState();
    if (selectedIds.length === 0) return;

    this.outline.clear();
    this.outline.lineStyle(1.5 / zoom, HANDLE_COLOR, 0.8);

    for (const id of selectedIds) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      this._strokeRotatedRect(this.outline, el);
    }

    if (selectedIds.length === 1) {
      const el = elements.find((e) => e.id === selectedIds[0]);
      if (!el) return;
      this.createHandles(el, zoom);
      this.createRotationHandle(el, zoom);
    }
  }

  /* ---- resize handles ---- */

  getHandlePositions(el) {
    const { x, y, w, h, rotation } = el;
    const rot = rotation || 0;
    const r = (lx, ly) => this._rotateLocal(lx, ly, rot, x, y);
    return [
      { type: 'tl', ...r(0, 0),       cursor: this._getResizeCursor('tl', rot) },
      { type: 'tc', ...r(w / 2, 0),   cursor: this._getResizeCursor('tc', rot) },
      { type: 'tr', ...r(w, 0),       cursor: this._getResizeCursor('tr', rot) },
      { type: 'ml', ...r(0, h / 2),   cursor: this._getResizeCursor('ml', rot) },
      { type: 'mr', ...r(w, h / 2),   cursor: this._getResizeCursor('mr', rot) },
      { type: 'bl', ...r(0, h),       cursor: this._getResizeCursor('bl', rot) },
      { type: 'bc', ...r(w / 2, h),   cursor: this._getResizeCursor('bc', rot) },
      { type: 'br', ...r(w, h),       cursor: this._getResizeCursor('br', rot) },
    ];
  }

  createHandles(el, zoom) {
    const rot = el.rotation || 0;
    const positions = this.getHandlePositions(el);

    for (const pos of positions) {
      const handle = this.scene.add.rectangle(
        pos.x, pos.y,
        HANDLE_SIZE, HANDLE_SIZE,
        HANDLE_COLOR
      );
      handle.setOrigin(0.5, 0.5);
      handle.setDepth(10001);
      handle.setScale(1 / zoom);
      handle.setAngle(rot);

      const outwardBias = (HANDLE_HIT_SIZE - HANDLE_SIZE) / 2;
      const dir = HANDLE_OUTWARD[pos.type];
      const hitX = (HANDLE_SIZE - HANDLE_HIT_SIZE) / 2 + dir.x * outwardBias;
      const hitY = (HANDLE_SIZE - HANDLE_HIT_SIZE) / 2 + dir.y * outwardBias;

      handle.setInteractive(
        new Phaser.Geom.Rectangle(hitX, hitY, HANDLE_HIT_SIZE, HANDLE_HIT_SIZE),
        Phaser.Geom.Rectangle.Contains,
        { draggable: true, cursor: pos.cursor }
      );
      handle.setData('handleType', pos.type);
      handle.setData('elementId', el.id);

      this.scene.input.setDraggable(handle);

      handle.on('dragstart', () => {
        const currentEl = useEditorStore.getState().elements.find((e) => e.id === el.id);
        this._activeHandle = pos.type;
        this._dragStartState = { ...currentEl };
        if (this._rotGfx) this._rotGfx.setVisible(false);
        if (this._rotZone) this._rotZone.setVisible(false);
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

  /* ---- rotation-aware resize drag ---- */

  onHandleDrag(type, pointerX, pointerY) {
    const start = this._dragStartState;
    if (!start) return;

    const rot = start.rotation || 0;
    const rad = Phaser.Math.DegToRad(rot);
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // Project pointer into element's local (unrotated) coordinate space
    const dx = pointerX - start.x;
    const dy = pointerY - start.y;
    const localX = dx * cosR + dy * sinR;
    const localY = -dx * sinR + dy * cosR;

    let newW = start.w;
    let newH = start.h;
    let offsetLX = 0;
    let offsetLY = 0;
    const minSize = 4;

    switch (type) {
      case 'tl':
        offsetLX = localX; offsetLY = localY;
        newW = start.w - localX; newH = start.h - localY;
        break;
      case 'tc':
        offsetLY = localY;
        newH = start.h - localY;
        break;
      case 'tr':
        offsetLY = localY;
        newW = localX; newH = start.h - localY;
        break;
      case 'ml':
        offsetLX = localX;
        newW = start.w - localX;
        break;
      case 'mr':
        newW = localX;
        break;
      case 'bl':
        offsetLX = localX;
        newW = start.w - localX; newH = localY;
        break;
      case 'bc':
        newH = localY;
        break;
      case 'br':
        newW = localX; newH = localY;
        break;
    }

    if (newW < minSize) {
      if (type === 'tl' || type === 'ml' || type === 'bl') offsetLX = start.w - minSize;
      newW = minSize;
    }
    if (newH < minSize) {
      if (type === 'tl' || type === 'tc' || type === 'tr') offsetLY = start.h - minSize;
      newH = minSize;
    }

    // Convert local-space origin offset back to world space
    const x = Math.round(start.x + offsetLX * cosR - offsetLY * sinR);
    const y = Math.round(start.y + offsetLX * sinR + offsetLY * cosR);
    const w = Math.round(newW);
    const h = Math.round(newH);

    const bridge = this.scene.bridge;
    bridge.updateStore(start.id, { x, y, w, h });

    const go = bridge.getGameObject(start.id);
    if (go) {
      go.setPosition(x, y);
      if (go.type === 'Text') {
        // Text size driven by content/style
      } else if (go.type === 'NineSlice') {
        go.setSize(w, h);
      } else {
        go.setDisplaySize(w, h);
      }
    }

    const zoom = useEditorStore.getState().zoom;
    const el = { x, y, w, h, rotation: rot };

    this.outline.clear();
    this.outline.lineStyle(1.5 / zoom, HANDLE_COLOR, 0.8);
    this._strokeRotatedRect(this.outline, el);

    const positions = this.getHandlePositions(el);
    for (let i = 0; i < this.handles.length; i++) {
      this.handles[i].setPosition(positions[i].x, positions[i].y);
    }
  }

  /* ---- rotation handle ---- */

  createRotationHandle(el, zoom) {
    const rot = el.rotation || 0;
    const rad = Phaser.Math.DegToRad(rot);
    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // Top-center in world space (rotated)
    const tc = this._rotateLocal(el.w / 2, 0, rot, el.x, el.y);

    // Offset along the rotated "up" direction (local -Y → world (sinR, -cosR))
    const offset = ROTATION_LINE_LENGTH / zoom;
    const handleR = 6 / zoom;
    const handleX = tc.x + sinR * offset;
    const handleY = tc.y - cosR * offset;

    const gfx = this.scene.add.graphics();
    gfx.setDepth(10001);

    // Connecting line (top-center → handle edge)
    gfx.lineStyle(1 / zoom, HANDLE_COLOR, 0.4);
    gfx.lineBetween(tc.x, tc.y, handleX - sinR * handleR, handleY + cosR * handleR);

    // Filled circle
    gfx.fillStyle(HANDLE_COLOR, 1);
    gfx.fillCircle(handleX, handleY, handleR);

    // Rotation indicator arc
    const arcR = handleR + 3 / zoom;
    gfx.lineStyle(1.5 / zoom, HANDLE_COLOR, 0.5);
    gfx.beginPath();
    gfx.arc(handleX, handleY, arcR, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(240), false);
    gfx.strokePath();

    // Small rotation arrow inside the circle
    const innerR = handleR * 0.45;
    gfx.lineStyle(1.2 / zoom, 0x1e1e2e, 1);
    gfx.beginPath();
    gfx.arc(handleX, handleY, innerR, Phaser.Math.DegToRad(0), Phaser.Math.DegToRad(270), false);
    gfx.strokePath();

    this._rotGfx = gfx;

    // Element center in world space (rotated)
    const elCenter = this._rotateLocal(el.w / 2, el.h / 2, rot, el.x, el.y);

    // Invisible zone for hit detection
    const hitSize = HANDLE_HIT_SIZE / zoom;
    const zone = this.scene.add.zone(handleX, handleY, hitSize * 1.5, hitSize * 1.5);
    zone.setDepth(10002);
    zone.setInteractive({ draggable: true, cursor: 'grab' });
    zone.setData('handleType', 'rotation');
    this.scene.input.setDraggable(zone);

    zone.on('dragstart', (pointer) => {
      this._rotatingId = el.id;
      this._rotCenter = elCenter;
      this._rotPrevPointerAngle = Math.atan2(
        pointer.worldY - elCenter.y, pointer.worldX - elCenter.x
      );
      const currentEl = useEditorStore.getState().elements.find(e => e.id === el.id);
      this._rotStartRotation = currentEl?.rotation || 0;
      this._rotAccumulatedDelta = 0;
      for (const h of this.handles) h.setVisible(false);
      if (this._rotGfx) this._rotGfx.setVisible(false);
    });

    zone.on('drag', (pointer, dragX, dragY) => {
      if (!this._rotCenter) return;

      const currentAngle = Math.atan2(
        dragY - this._rotCenter.y,
        dragX - this._rotCenter.x
      );

      let delta = currentAngle - this._rotPrevPointerAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      this._rotAccumulatedDelta += delta;
      this._rotPrevPointerAngle = currentAngle;

      let angle = this._rotStartRotation + Phaser.Math.RadToDeg(this._rotAccumulatedDelta);

      if (pointer.event.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }

      const normalized = Math.round(((angle % 360) + 360) % 360);

      this.scene.bridge.updateStore(el.id, { rotation: normalized });
      const go = this.scene.bridge.getGameObject(el.id);
      if (go) go.setAngle(normalized);

      // Update outline to follow rotation
      const state = useEditorStore.getState();
      const currentEl = state.elements.find(e => e.id === el.id);
      if (currentEl) {
        this.outline.clear();
        this.outline.lineStyle(1.5 / state.zoom, HANDLE_COLOR, 0.8);
        this._strokeRotatedRect(this.outline, currentEl);
      }
    });

    zone.on('dragend', () => {
      this._rotatingId = null;
      this._rotCenter = null;
      this.refreshHandles();
    });

    this._rotZone = zone;
  }

  /* ---- cleanup ---- */

  clearHandles() {
    for (const h of this.handles) h.destroy();
    this.handles = [];
    if (this.outline) this.outline.clear();
    if (this._rotGfx) { this._rotGfx.destroy(); this._rotGfx = null; }
    if (this._rotZone) { this._rotZone.destroy(); this._rotZone = null; }
  }
}
