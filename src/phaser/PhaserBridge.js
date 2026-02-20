import useEditorStore from '../stores/editorStore';

/**
 * PhaserBridge: bidirectional sync between Zustand store and Phaser scene.
 * - subscribes to store changes and updates Phaser game objects
 * - provides methods for Phaser events to update the store
 */
export default class PhaserBridge {
  constructor(scene) {
    this.scene = scene;
    /** @type {Map<string, Phaser.GameObjects.GameObject>} */
    this.gameObjects = new Map();
    this._unsubscribe = null;
    this._syncing = false; // guard against feedback loops
  }

  start() {
    // Subscribe to store element changes
    this._unsubscribe = useEditorStore.subscribe(
      (state) => state.elements,
      (elements) => {
        if (this._syncing) return;
        this.syncFromStore(elements);
        this.scene.selectionManager?.refreshHandles();
      },
      { equalityFn: Object.is }
    );

    // Also subscribe to selection to update visual selection
    useEditorStore.subscribe(
      (state) => state.selectedIds,
      () => this.scene.selectionManager?.refreshHandles()
    );
  }

  stop() {
    if (this._unsubscribe) this._unsubscribe();
  }

  /** Push a change from Phaser -> Store (guards against loops) */
  updateStore(id, patch) {
    this._syncing = true;
    useEditorStore.getState().updateElement(id, patch);
    this._syncing = false;
  }

  /** Sync store elements -> Phaser game objects */
  syncFromStore(elements) {
    const scene = this.scene;
    if (!scene || !scene.scene.isActive()) return;

    const currentIds = new Set(elements.map((e) => e.id));

    // Remove objects that no longer exist in store
    for (const [id, go] of this.gameObjects) {
      if (!currentIds.has(id)) {
        go.destroy();
        this.gameObjects.delete(id);
      }
    }

    // Add or update
    for (const el of elements) {
      let go = this.gameObjects.get(el.id);

      if (el.type === 'text') {
        // ----- Text element -----
        if (!go) {
          go = this._createTextObject(el);
        } else if (go.type !== 'Text') {
          const depth = go.depth;
          go.destroy();
          go = this._createTextObject(el);
          go.setDepth(depth);
        } else {
          this._updateTextObject(go, el);
        }
      } else {
        // ----- Image / NineSlice element -----
        if (!go) {
          if (!scene.textures.exists(el.textureKey)) continue;

          if (el.nineSlice) {
            go = scene.add.nineslice(
              el.x, el.y,
              el.textureKey, null,
              el.w, el.h,
              el.nineSlice.left, el.nineSlice.right,
              el.nineSlice.top, el.nineSlice.bottom
            );
          } else {
            go = scene.add.image(el.x, el.y, el.textureKey);
            go.setDisplaySize(el.w, el.h);
          }
          go.setOrigin(0, 0);
          go.setData('elementId', el.id);
          go.setInteractive({ draggable: true });
          this.gameObjects.set(el.id, go);
          scene.setupDragForGameObject(go);
        } else {
          const isNineSlice = go.type === 'NineSlice';
          if (el.nineSlice && !isNineSlice) {
            const depth = go.depth;
            go.destroy();
            go = scene.add.nineslice(
              el.x, el.y,
              el.textureKey, null,
              el.w, el.h,
              el.nineSlice.left, el.nineSlice.right,
              el.nineSlice.top, el.nineSlice.bottom
            );
            go.setOrigin(0, 0);
            go.setData('elementId', el.id);
            go.setDepth(depth);
            go.setInteractive({ draggable: true });
            this.gameObjects.set(el.id, go);
            scene.setupDragForGameObject(go);
          } else if (!el.nineSlice && isNineSlice) {
            const depth = go.depth;
            go.destroy();
            go = scene.add.image(el.x, el.y, el.textureKey);
            go.setOrigin(0, 0);
            go.setDisplaySize(el.w, el.h);
            go.setData('elementId', el.id);
            go.setDepth(depth);
            go.setInteractive({ draggable: true });
            this.gameObjects.set(el.id, go);
            scene.setupDragForGameObject(go);
          } else {
            go.setPosition(el.x, el.y);
            if (isNineSlice) {
              go.setSize(el.w, el.h);
            } else {
              go.setDisplaySize(el.w, el.h);
            }
          }
        }
      }

      go.setAngle(el.rotation || 0);
      go.setVisible(el.visible !== false);
    }

    // Update depth based on element order
    elements.forEach((el, i) => {
      const go = this.gameObjects.get(el.id);
      if (go) go.setDepth(i);
    });
  }

  getGameObject(id) {
    return this.gameObjects.get(id);
  }

  getAllGameObjects() {
    return this.gameObjects;
  }

  removeGameObject(id) {
    const go = this.gameObjects.get(id);
    if (go) {
      go.destroy();
      this.gameObjects.delete(id);
    }
  }

  _buildTextStyle(el) {
    const style = {
      fontFamily: el.fontFamily || 'Arial',
      fontSize: `${el.fontSize || 24}px`,
      color: el.color || '#ffffff',
      align: el.align || 'left',
    };
    if (el.fontStyle) style.fontStyle = el.fontStyle;
    if (el.stroke && el.strokeThickness > 0) {
      style.stroke = el.stroke;
      style.strokeThickness = el.strokeThickness;
    }
    if (el.wordWrapWidth > 0) {
      style.wordWrap = { width: el.wordWrapWidth, useAdvancedWrap: true };
    }
    if (el.lineSpacing) style.lineSpacing = el.lineSpacing;
    if (el.letterSpacing) style.letterSpacing = el.letterSpacing;
    if (el.padding > 0) {
      const p = el.padding;
      style.padding = { left: p, right: p, top: p, bottom: p };
    }
    return style;
  }

  _createTextObject(el) {
    const scene = this.scene;
    const style = this._buildTextStyle(el);
    const go = scene.add.text(el.x, el.y, el.text || '', style);
    go.setOrigin(0, 0);
    go.setData('elementId', el.id);
    go.setInteractive({ draggable: true, useHandCursor: false });
    this.gameObjects.set(el.id, go);
    scene.setupDragForGameObject(go);

    // Store measured size back so selection handles and snap work
    this._syncTextSize(el.id, go);
    return go;
  }

  _updateTextObject(go, el) {
    go.setPosition(el.x, el.y);
    go.setText(el.text || '');
    go.setStyle(this._buildTextStyle(el));

    this._syncTextSize(el.id, go);
  }

  _syncTextSize(id, go) {
    const w = Math.ceil(go.width);
    const h = Math.ceil(go.height);
    const store = useEditorStore.getState();
    const el = store.elements.find((e) => e.id === id);
    if (el && (el.w !== w || el.h !== h)) {
      this._syncing = true;
      store.updateElement(id, { w, h });
      this._syncing = false;
    }
  }
}
