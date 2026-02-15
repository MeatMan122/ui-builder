import Phaser from 'phaser';
import useEditorStore from '../stores/editorStore';
import PhaserBridge from './PhaserBridge';
import SnapManager from './SnapManager';
import SelectionManager from './SelectionManager';
import { getAnimation } from '../animations/registry';

export default class WorkspaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorkspaceScene' });
    this.bridge = null;
    this.snapManager = null;
    this.selectionManager = null;
    this._pendingTextures = [];
  }

  preload() {
    // Nothing to preload initially – textures are loaded on-the-fly
  }

  create() {
    this.bridge = new PhaserBridge(this);
    this.snapManager = new SnapManager(this);
    this.selectionManager = new SelectionManager(this);

    // Start bridge sync
    this.bridge.start();

    // Checkerboard background
    this.drawBackground();

    // Click on empty space -> deselect
    this.input.on('pointerdown', (pointer) => {
      // Only if clicking directly on the scene (not on a game object)
      const hits = this.input.hitTestPointer(pointer);
      const realHits = hits.filter(
        (h) => h.getData && h.getData('elementId') && !h.getData('handleType')
      );
      if (realHits.length === 0) {
        useEditorStore.getState().clearSelection();
      }
    });

    // Handle drop from file browser
    const canvas = this.game.canvas;
    canvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    canvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/x-asset');
      if (!data) return;
      const asset = JSON.parse(data);

      // Calculate position relative to canvas
      const rect = canvas.getBoundingClientRect();
      const zoom = useEditorStore.getState().zoom;
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      this.addElementFromAsset(asset, x, y);
    });

    // Listen for animation preview events
    window.addEventListener('preview-animation', (e) => {
      this.previewAnimation(e.detail.elementId);
    });

    // Sync any elements already in store
    this.bridge.syncFromStore(useEditorStore.getState().elements);
  }

  drawBackground() {
    // Create a small 2x2 tile checkerboard texture, then tile it
    const size = 20;
    const key = '__checkerboard__';
    if (!this.textures.exists(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext('2d');
      const c1 = '#1a1a2e';
      const c2 = '#16162a';
      ctx.fillStyle = c1; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = c2; ctx.fillRect(size, 0, size, size);
      ctx.fillStyle = c2; ctx.fillRect(0, size, size, size);
      ctx.fillStyle = c1; ctx.fillRect(size, size, size, size);
      this.textures.addCanvas(key, canvas);
    }
    const bg = this.add.tileSprite(0, 0, 4000, 4000, key);
    bg.setOrigin(0.5, 0.5);
    bg.setDepth(-1000);
  }

  async addElementFromAsset(asset, x, y) {
    const textureKey = `asset_${asset.path.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Load texture if not already loaded
    if (!this.textures.exists(textureKey)) {
      await new Promise((resolve) => {
        this.load.image(textureKey, asset.objectUrl);
        this.load.once('complete', resolve);
        this.load.start();
      });
    }

    const frame = this.textures.getFrame(textureKey);
    const w = frame.width;
    const h = frame.height;

    // Add to store
    useEditorStore.getState().addElement({
      textureKey,
      fileName: asset.name,
      filePath: asset.path,
      objectUrl: asset.objectUrl,
      x: Math.round(x),
      y: Math.round(y),
      w,
      h,
      originW: w,
      originH: h,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      nineSlice: null,
      animation: null,
      interactive: false,
      interactionTrigger: 'hover',
      groupId: null,
      name: asset.name.replace(/\.[^.]+$/, ''),
    });

    // Bridge will create the game object via subscription
    // but subscription may not fire synchronously, so force sync
    this.bridge.syncFromStore(useEditorStore.getState().elements);
  }

  setupDragForGameObject(go) {
    const scene = this;

    go.on('pointerdown', (pointer) => {
      const id = go.getData('elementId');
      const state = useEditorStore.getState();

      if (pointer.event.ctrlKey || pointer.event.metaKey) {
        state.toggleSelection(id);
      } else if (!state.selectedIds.includes(id)) {
        state.setSelection([id]);
      }
    });

    let dragStartPositions = null;

    go.on('dragstart', () => {
      const state = useEditorStore.getState();
      const id = go.getData('elementId');

      // If this element is part of a group, select all group members
      const el = state.elements.find((e) => e.id === id);
      if (el?.groupId) {
        const members = state.elements.filter((e) => e.groupId === el.groupId);
        const memberIds = members.map((m) => m.id);
        if (!state.selectedIds.includes(id)) {
          state.setSelection(memberIds);
        }
      }

      // Store starting positions for all selected elements (for group move)
      const selIds = useEditorStore.getState().selectedIds;
      dragStartPositions = {};
      for (const sid of selIds) {
        const sel = state.elements.find((e) => e.id === sid);
        if (sel) dragStartPositions[sid] = { x: sel.x, y: sel.y };
      }
    });

    go.on('drag', (pointer, dragX, dragY) => {
      const id = go.getData('elementId');
      const state = useEditorStore.getState();
      const el = state.elements.find((e) => e.id === id);
      if (!el) return;

      // Calculate delta from the dragged element's start position
      const startPos = dragStartPositions?.[id];
      if (!startPos) return;

      let newX = dragX;
      let newY = dragY;

      // Snap the primary dragged element
      const snapped = scene.snapManager.snap(id, { x: newX, y: newY, w: el.w, h: el.h });
      newX = snapped.x;
      newY = snapped.y;

      const dx = newX - startPos.x;
      const dy = newY - startPos.y;

      // Move all selected elements by the same delta
      const selIds = state.selectedIds;
      for (const sid of selIds) {
        const sp = dragStartPositions?.[sid];
        if (!sp) continue;
        const nx = Math.round(sp.x + dx);
        const ny = Math.round(sp.y + dy);
        scene.bridge.updateStore(sid, { x: nx, y: ny });

        const sgo = scene.bridge.getGameObject(sid);
        if (sgo) sgo.setPosition(nx, ny);
      }

      scene.selectionManager.refreshHandles();
    });

    go.on('dragend', () => {
      dragStartPositions = null;
      scene.snapManager.clearGuides();
      scene.selectionManager.refreshHandles();
    });
  }

  previewAnimation(elementId) {
    const state = useEditorStore.getState();
    const el = state.elements.find((e) => e.id === elementId);
    if (!el || !el.animation) return;

    const go = this.bridge.getGameObject(elementId);
    if (!go) return;

    const animDef = getAnimation(el.animation.type);
    if (!animDef) return;

    const tweenConfig = animDef.buildTween(this, go, el.animation.config);
    if (tweenConfig) {
      // Store original position for revert
      const origX = go.x;
      const origY = go.y;
      const origScaleX = go.scaleX;
      const origScaleY = go.scaleY;
      const origAlpha = go.alpha;
      const origAngle = go.angle;

      this.tweens.add({
        ...tweenConfig,
        onComplete: () => {
          // Revert after preview
          this.tweens.add({
            targets: go,
            x: origX,
            y: origY,
            scaleX: origScaleX,
            scaleY: origScaleY,
            alpha: origAlpha,
            angle: origAngle,
            duration: tweenConfig.duration || 300,
            ease: tweenConfig.ease || 'Power2',
          });
        },
      });
    }
  }
}
