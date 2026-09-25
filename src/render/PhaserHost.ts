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
    scenes: readonly { key: string; scene: Phaser.Types.Scenes.SceneType }[],
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
    });
    this.releaseStaleFingers();
    // Registered without auto-start: scenes only run when the app asks, with their data.
    for (const { key, scene } of scenes) this.game.scene.add(key, scene, false);
  }

  /**
   * Safety net for touch input. Phaser has a few finger slots and frees one
   * when it sees that finger's touchend on the window. If that touchend never
   * arrives (the touched menu element was removed mid-tap), the slot stays
   * "down" and, once all are used, every new touch is ignored. When a touch
   * begins and it is the only finger on the screen, no other finger can
   * really be down, so any slot still marked down is released first.
   */
  private releaseStaleFingers(): void {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      for (const p of this.game.input.pointers) {
        if (p.id === 0 || !p.active) continue;
        p.active = false;
        p.isDown = false;
        p.primaryDown = false;
        p.buttons = 0;
      }
    };
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    this.game.events.once(Phaser.Core.Events.DESTROY, () => window.removeEventListener('touchstart', onTouchStart, { capture: true }));
  }

  /**
   * Re-measures the container and refits the canvas now. Phaser would notice
   * on its own within half a second; after a rotation that half second shows
   * a wrongly cropped game, so the app calls this as soon as the size changes.
   */
  refit(): void {
    const scale = this.game.scale;
    if (scale.getParentBounds()) scale.refresh();
  }

  /** Applies the design-space camera to a scene. Call from each scene's create(). */
  static applyDesignCamera(scene: Phaser.Scene, renderScale: number): void {
    const cam = scene.cameras.main;
    cam.setZoom(renderScale);
    cam.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
  }

  private isLive(scene: Phaser.Scene): boolean {
    const sys = scene.sys;
    return sys.isActive() || sys.isPaused() || sys.isSleeping();
  }

  /** Stops every other scene and (re)starts `key` with fresh data. */
  start(key: string, data?: object): void {
    for (const scene of this.game.scene.getScenes(false)) {
      if (this.isLive(scene)) this.game.scene.stop(scene.scene.key);
    }
    this.game.scene.start(key, data);
  }

  pause(key: string): void {
    const scene = this.game.scene.getScene(key);
    if (scene?.sys.isActive()) this.game.scene.pause(key);
  }

  resume(key: string): void {
    const scene = this.game.scene.getScene(key);
    if (scene?.sys.isPaused()) this.game.scene.resume(key);
  }

  stopAll(): void {
    for (const scene of this.game.scene.getScenes(false)) {
      if (this.isLive(scene)) this.game.scene.stop(scene.scene.key);
    }
  }

  destroy(): void {
    this.game.destroy(true);
  }
}
