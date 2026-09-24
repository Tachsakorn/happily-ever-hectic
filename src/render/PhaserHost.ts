import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './config';

/**
 * Owns the single Phaser.Game instance. The canvas is created once and kept
 * for the whole session (re-creating WebGL contexts on iPad leaks memory);
 * scenes are started/stopped as the app state changes.
 *
 * The canvas is rendered at `renderScale` × design size and every scene's
 * camera is zoomed by the same factor, so game code always works in design
 * units while text and shapes stay crisp on retina screens.
 */
export class PhaserHost {
  readonly game: Phaser.Game;

  constructor(
    parent: HTMLElement,
    readonly renderScale: number,
    scenes: Phaser.Types.Scenes.SceneType[],
  ) {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: DESIGN_WIDTH * renderScale,
      height: DESIGN_HEIGHT * renderScale,
      backgroundColor: '#f3d9cf',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      input: { activePointers: 3 },
      render: { antialias: true, powerPreference: 'high-performance' },
      banner: false,
      audio: { noAudio: true },
      scene: scenes,
    });
  }

  /** Applies the design-space camera to a scene. Call from each scene's create(). */
  static applyDesignCamera(scene: Phaser.Scene, renderScale: number): void {
    const cam = scene.cameras.main;
    cam.setZoom(renderScale);
    cam.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
  }

  start(key: string, data?: object): void {
    for (const scene of this.game.scene.getScenes(true)) {
      if (scene.scene.key !== key) this.game.scene.stop(scene.scene.key);
    }
    this.game.scene.start(key, data);
  }

  stopAll(): void {
    for (const scene of this.game.scene.getScenes(true)) this.game.scene.stop(scene.scene.key);
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
