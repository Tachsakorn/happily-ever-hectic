import { ContentRegistry } from '../content/ContentRegistry';
import { basePack } from './packs/base';
import { personalPack } from './packs/personal';

/** Pack load order. Later packs add content and may retitle the game. */
export const PACKS = [basePack, personalPack] as const;

export function loadContent(): ContentRegistry {
  return new ContentRegistry(PACKS);
}
