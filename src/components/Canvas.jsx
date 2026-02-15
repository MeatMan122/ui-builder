import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import WorkspaceScene from '../phaser/WorkspaceScene';
import useEditorStore from '../stores/editorStore';

export default function Canvas() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const config = {
      type: Phaser.AUTO,
      parent: container,
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: '#0d0d17',
      scene: [WorkspaceScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      input: {
        mouse: {
          preventDefaultWheel: false,
        },
      },
      render: {
        pixelArt: true,
        antialias: false,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
