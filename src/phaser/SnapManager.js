import useEditorStore from '../stores/editorStore';

/**
 * SnapManager: edge/center snapping with visual guide lines.
 */
export default class SnapManager {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9999);
  }

  /**
   * Given a dragging element rect { x, y, w, h } and its id,
   * returns the snapped { x, y } and draws guide lines.
   */
  snap(dragId, rect) {
    const state = useEditorStore.getState();
    if (!state.snapEnabled) {
      this.clearGuides();
      return { x: rect.x, y: rect.y };
    }

    const threshold = state.snapThreshold;
    const elements = state.elements.filter((e) => e.id !== dragId && e.visible !== false);
    const guides = [];

    let snappedX = rect.x;
    let snappedY = rect.y;
    let bestDx = threshold + 1;
    let bestDy = threshold + 1;

    // Dragging element edges
    const dl = rect.x;
    const dr = rect.x + rect.w;
    const dcx = rect.x + rect.w / 2;
    const dt = rect.y;
    const db = rect.y + rect.h;
    const dcy = rect.y + rect.h / 2;

    for (const el of elements) {
      const el_l = el.x;
      const el_r = el.x + el.w;
      const el_cx = el.x + el.w / 2;
      const el_t = el.y;
      const el_b = el.y + el.h;
      const el_cy = el.y + el.h / 2;

      // Horizontal snapping (x-axis)
      const xPairs = [
        { drag: dl, target: el_l, type: 'left-left' },
        { drag: dl, target: el_r, type: 'left-right' },
        { drag: dr, target: el_l, type: 'right-left' },
        { drag: dr, target: el_r, type: 'right-right' },
        { drag: dcx, target: el_cx, type: 'cx-cx' },
      ];

      for (const pair of xPairs) {
        const d = Math.abs(pair.drag - pair.target);
        if (d < bestDx) {
          bestDx = d;
          snappedX = rect.x + (pair.target - pair.drag);
          if (d <= threshold) {
            guides.push({ axis: 'v', pos: pair.target });
          }
        }
      }

      // Vertical snapping (y-axis)
      const yPairs = [
        { drag: dt, target: el_t, type: 'top-top' },
        { drag: dt, target: el_b, type: 'top-bottom' },
        { drag: db, target: el_t, type: 'bottom-top' },
        { drag: db, target: el_b, type: 'bottom-bottom' },
        { drag: dcy, target: el_cy, type: 'cy-cy' },
      ];

      for (const pair of yPairs) {
        const d = Math.abs(pair.drag - pair.target);
        if (d < bestDy) {
          bestDy = d;
          snappedY = rect.y + (pair.target - pair.drag);
          if (d <= threshold) {
            guides.push({ axis: 'h', pos: pair.target });
          }
        }
      }
    }

    if (bestDx > threshold) snappedX = rect.x;
    if (bestDy > threshold) snappedY = rect.y;

    // Draw guides
    this.drawGuides(guides);

    return { x: snappedX, y: snappedY };
  }

  drawGuides(guides) {
    this.graphics.clear();
    this.graphics.lineStyle(1, 0xf9e2af, 0.7);

    for (const g of guides) {
      if (g.axis === 'v') {
        this.graphics.moveTo(g.pos, -5000);
        this.graphics.lineTo(g.pos, 10000);
      } else {
        this.graphics.moveTo(-5000, g.pos);
        this.graphics.lineTo(10000, g.pos);
      }
    }
    this.graphics.strokePath();
  }

  clearGuides() {
    this.graphics.clear();
  }
}
