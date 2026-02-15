/**
 * NineSliceHelper: utility for working with Phaser NineSlice objects in the editor.
 * 
 * The core swap logic (Image <-> NineSlice) is handled by PhaserBridge.syncFromStore().
 * This file provides additional utility functions if needed.
 */

/**
 * Check if a Phaser game object is a NineSlice.
 */
export function isNineSlice(gameObject) {
  return gameObject?.type === 'NineSlice';
}

/**
 * Get the current nine-slice config from a NineSlice game object.
 * Returns null if the object is not a NineSlice.
 */
export function getNineSliceConfig(gameObject) {
  if (!isNineSlice(gameObject)) return null;
  return {
    left: gameObject.leftWidth,
    right: gameObject.rightWidth,
    top: gameObject.topHeight,
    bottom: gameObject.bottomHeight,
  };
}

/**
 * Validate nine-slice margins against an image's dimensions.
 * Returns clamped margins that don't exceed image bounds.
 */
export function clampNineSliceMargins(margins, imageWidth, imageHeight) {
  const maxH = Math.floor(imageWidth / 2) - 1;
  const maxV = Math.floor(imageHeight / 2) - 1;
  return {
    left: Math.max(0, Math.min(margins.left, maxH)),
    right: Math.max(0, Math.min(margins.right, maxH)),
    top: Math.max(0, Math.min(margins.top, maxV)),
    bottom: Math.max(0, Math.min(margins.bottom, maxV)),
  };
}
