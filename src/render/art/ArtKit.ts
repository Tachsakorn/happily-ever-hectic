import type { ContentRegistry } from '../../content/ContentRegistry';
import type { Id } from '../../content/types';
import type { Guest } from '../../core/sim/state';
import type { TextureFactory } from './TextureFactory';
import { paintBubble, paintDisasterIcon, paintDot, paintIcon, paintPerson, type ItemIcon, type PersonLook } from './painters';

const SKINS = [0xf6d7bf, 0xeac3a2, 0xd9a47e, 0xb97c55, 0x8d5a3b, 0xf2cfae];
const HAIRS = [0x2b1d14, 0x5a3a22, 0x8a5a3a, 0xc9954f, 0x1e1612, 0xa0522d, 0x3b2a20];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const STYLES = new Set(['guest', 'grandparent', 'party', 'foodie', 'kid', 'boss', 'dress', 'suit', 'planner', 'chef']);

/** Maps content to baked textures. The only place that knows how content *looks*. */
export class ArtKit {
  constructor(
    private readonly tex: TextureFactory,
    private readonly content: ContentRegistry,
  ) {}

  person(look: PersonLook): string {
    const key = `person:${look.style}:${look.skin}:${look.hair}:${look.outfit}:${look.ring ?? 'x'}`;
    return this.tex.ensure(key, 60, 104, paintPerson(look));
  }

  guest(g: Guest): string {
    const type = this.content.guestTypes.get(g.typeId);
    const group = this.content.groups.get(g.groupId);
    const h = hash(g.key);
    const icon = type.visual.icon ?? 'guest';
    return this.person({
      style: (STYLES.has(icon) ? icon : 'guest') as PersonLook['style'],
      skin: SKINS[h % SKINS.length] ?? SKINS[0]!,
      hair: HAIRS[(h >> 8) % HAIRS.length] ?? HAIRS[0]!,
      outfit: group.visual.color,
    });
  }

  chef(): string {
    return this.person({ style: 'chef', skin: 0xd9a47e, hair: 0x2b1d14, outfit: 0xffffff });
  }

  planner(): string {
    return this.person({ style: 'planner', skin: 0xf2cfae, hair: 0x6b3f25, outfit: 0xe07a95 });
  }

  partner(visual: { color: number; accent?: number; icon?: string }, skinSeed: string): string {
    const style = visual.icon === 'suit' ? 'suit' : 'dress';
    return this.person({ style, skin: SKINS[hash(skinSeed) % SKINS.length] ?? SKINS[0]!, hair: visual.accent ?? 0x2b1d14, outfit: visual.color });
  }

  item(itemId: Id): string {
    const item = this.content.items.get(itemId);
    const icon = (item.visual.icon ?? 'plate') as ItemIcon;
    return this.icon(icon, item.visual.color, item.visual.accent);
  }

  icon(icon: ItemIcon, color = 0xe07a95, accent?: number): string {
    return this.tex.ensure(`icon:${icon}:${color}:${accent ?? ''}`, 44, 44, paintIcon(icon, color, accent));
  }

  bubble(): string {
    return this.tex.ensure('bubble', 64, 64, paintBubble());
  }

  dot(color: number, radius: number, stroke?: number): string {
    return this.tex.ensure(`dot:${color}:${radius}:${stroke ?? ''}`, radius * 2 + 4, radius * 2 + 4, paintDot(color, radius, stroke));
  }

  disaster(defId: Id): string {
    const def = this.content.disasters.get(defId);
    return this.tex.ensure(`disaster:${defId}`, 80, 80, paintDisasterIcon(def.visual.icon ?? 'alert', def.visual.color));
  }
}
