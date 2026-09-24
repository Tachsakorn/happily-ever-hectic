import Phaser from 'phaser';

import { FONT_BODY, FONT_DISPLAY } from '../../art/canvas';

export const FONT = FONT_BODY;

export const Depth = {
  props: 5,
  actorsBase: 100,
  disasters: 1500,
  bubbles: 2000,
  overlay: 2500,
  floating: 3000,
  hud: 4000,
  banner: 4500,
} as const;

export const Colors = {
  ink: 0x3b2640,
  inkCss: '#3b2640',
  blush: 0xe07a95,
  good: 0x5fae6e,
  goodCss: '#3f8f52',
  warn: 0xe8b04a,
  bad: 0xd9534f,
  badCss: '#c0392b',
  gold: 0xd9a441,
  goldCss: '#b7852a',
  card: 0xfffaf6,
} as const;

export interface TextOpts {
  readonly size?: number;
  readonly color?: string;
  readonly weight?: '400' | '600' | '700' | '800';
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly align?: 'left' | 'center' | 'right';
  readonly wrapWidth?: number;
  /** The chunky title face (Lilita One) for numbers and headings. */
  readonly display?: boolean;
}

/** Text in design units, rendered at the canvas render scale so it stays crisp. */
export function makeText(scene: Phaser.Scene, x: number, y: number, s: string, renderScale: number, o: TextOpts = {}): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: o.display ? FONT_DISPLAY : FONT,
    fontSize: `${o.size ?? 20}px`,
    fontStyle: o.display ? '400' : (o.weight ?? '700'),
    color: o.color ?? Colors.inkCss,
    align: o.align ?? 'center',
    resolution: renderScale,
  };
  if (o.stroke) {
    style.stroke = o.stroke;
    style.strokeThickness = o.strokeWidth ?? 5;
  }
  if (o.wrapWidth) style.wordWrap = { width: o.wrapWidth, useAdvancedWrap: true };
  return scene.add.text(x, y, s, style);
}
