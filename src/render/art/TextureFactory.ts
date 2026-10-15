import Phaser from 'phaser';
import type { Painter } from '../../art/painters';
import { finishWatercolor, useWatercolorBrush, type Finish } from '../../art/watercolor';

/**
 * Bakes painters into textures at the render scale. Textures are cached by key
 * for the lifetime of the game, so repeated receptions reuse them.
 */
export class TextureFactory {
  constructor(
    private readonly textures: Phaser.Textures.TextureManager,
    readonly scale: number,
  ) {}

  /**
   * `finish` opts a texture into the watercolour look; omit it for interface
   * art, which keeps the bold cartoon outline.
   */
  ensure(key: string, width: number, height: number, paint: Painter, scale = this.scale, finish?: Finish): string {
    if (this.textures.exists(key)) return key;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    ctx.scale(scale, scale);
    if (finish) useWatercolorBrush(ctx);
    paint(ctx);
    if (finish) finishWatercolor(canvas, scale, finish);
    this.textures.addCanvas(key, canvas);
    return key;
  }

  /** Adds an image of a baked texture sized in design units. */
  image(scene: Phaser.Scene, x: number, y: number, key: string, textureScale = this.scale): Phaser.GameObjects.Image {
    return scene.add.image(x, y, key).setScale(1 / textureScale);
  }

  replace(key: string): void {
    if (this.textures.exists(key)) this.textures.remove(key);
  }
}
