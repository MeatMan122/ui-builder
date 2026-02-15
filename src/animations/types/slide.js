import { registerAnimation } from '../registry';

registerAnimation('slide', {
  label: 'Slide',

  defaultConfig: {
    direction: 'left',
    distance: 100,
    duration: 300,
    ease: 'Power2',
  },

  /**
   * Build a Phaser tween config for sliding an element.
   * @param {Phaser.Scene} scene
   * @param {Phaser.GameObjects.GameObject} target
   * @param {object} config - { direction, distance, duration, ease }
   * @returns {object} Phaser tween config
   */
  buildTween(scene, target, config) {
    const { direction, distance, duration, ease } = config;
    const tweenConfig = {
      targets: target,
      duration,
      ease,
    };

    switch (direction) {
      case 'left':
        tweenConfig.x = target.x - distance;
        break;
      case 'right':
        tweenConfig.x = target.x + distance;
        break;
      case 'up':
        tweenConfig.y = target.y - distance;
        break;
      case 'down':
        tweenConfig.y = target.y + distance;
        break;
    }

    return tweenConfig;
  },
});
