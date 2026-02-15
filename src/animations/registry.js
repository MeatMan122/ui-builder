/**
 * Animation type registry.
 * 
 * Each animation type has:
 *   label: string            - Display name
 *   defaultConfig: object    - Default parameters for this animation
 *   buildTween: (scene, target, config) => tweenConfig
 *                            - Returns a Phaser tween config object
 * 
 * To add a new animation type:
 *   1. Create a new file in animations/types/
 *   2. Import registerAnimation and call it with (name, definition)
 *   3. Import your new file in animations/init.js
 */

const animationTypes = new Map();

export function registerAnimation(name, definition) {
  animationTypes.set(name, definition);
}

export function getAnimation(name) {
  return animationTypes.get(name);
}

export function getAllAnimationTypes() {
  return Array.from(animationTypes.entries()).map(([name, def]) => ({
    name,
    label: def.label,
    defaultConfig: def.defaultConfig,
  }));
}
