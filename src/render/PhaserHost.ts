import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './config';

/**
 * Owns the single Phaser.Game instance. The canvas is created once and kept
 * for the whole session (re-creating WebGL contexts on iPad leaks memory);
 * scenes are started/stopped as the app state changes.
 *
 * The canvas always covers the whole screen, whatever its shape (a phone is
 * much wider than the room, an iPad Pro a little taller): its aspect follows
 * the screen, and each scene's camera fits the design area inside it and
 * centres it. Scenes paint something around the room, so there are never
 * empty bars. The canvas resolution is chosen so one design unit is about
 * `renderScale` canvas pixels: game code works in design units while text
 * and shapes stay crisp on retina screens.
 */
export class PhaserHost {
  readonly game: Phaser.Game;

  constructor(
    private readonly parent: HTMLElement,
    readonly renderScale: number,
    scenes: readonly { key: string; scene: Phaser.Types.Scenes.SceneType }[],
  ) {
    const size = this.canvasSize();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: size.width,
      height: size.height,
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
    scale.getParentBounds();
    const { width, height } = this.canvasSize();
    // A new screen shape means a new canvas shape; otherwise just re-measure.
    if (Math.abs(width - scale.gameSize.width) > 1 || Math.abs(height - scale.gameSize.height) > 1) scale.setGameSize(width, height);
    else scale.refresh();
  }

  /**
   * Canvas pixels for the parent's current size: its aspect, at about
   * `renderScale` pixels per design unit, never beyond the device's pixels.
   */
  private canvasSize(): { width: number; height: number } {
    const rect = this.parent.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || window.innerWidth);
    const cssH = Math.max(1, rect.height || window.innerHeight);
    const fit = Math.min(cssW / DESIGN_WIDTH, cssH / DESIGN_HEIGHT);
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pixelsPerCss = Math.min(dpr, Math.max(1, this.renderScale / fit));
    return { width: Math.round(cssW * pixelsPerCss), height: Math.round(cssH * pixelsPerCss) };
  }

  /**
   * Applies the design-space camera to a scene and keeps it fitted when the
   * canvas changes shape. Call from each scene's create().
   */
  static applyDesignCamera(scene: Phaser.Scene): void {
    const fit = () => {
      const { width, height } = scene.scale.gameSize;
      const cam = scene.cameras.main;
      cam.setSize(width, height);
      cam.setZoom(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT));
      cam.centerOn(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
    };
    fit();
    scene.scale.on(Phaser.Scale.Events.RESIZE, fit);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, fit));
  }

  /** The part of the world the camera can show on the widest/tallest screens, for painting surroundings. */
  static readonly SURROUND_MARGIN = { x: DESIGN_WIDTH, y: DESIGN_HEIGHT } as const;

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
