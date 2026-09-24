import type { ContentRegistry } from '../../content/ContentRegistry';
import type { CharacterDef, Id } from '../../content/types';
import { CHEF_LOOK, characterLook, HAIRS, hashString, plannerLook, SKINS } from '../../art/characters';
import type { Guest } from '../../core/sim/state';
import type { TextureFactory } from './TextureFactory';
import {
  ICON_SIZE,
  paintBubble,
  paintDisasterIcon,
  paintDot,
  paintIcon,
  paintPerson,
  PERSON_FEET,
  PERSON_H,
  PERSON_W,
  type HairStyle,
  type ItemIcon,
  type Mood,
  type PersonLook,
  type PersonStyle,
} from '../../art/painters';

const GUEST_HAIR_STYLES: HairStyle[] = ['short', 'bob', 'long', 'curly', 'side', 'bun'];

/** Vertical origin that puts a person sprite's feet on its position. */
export const FEET_ORIGIN_Y = PERSON_FEET / PERSON_H;

const STYLES = new Set<string>(['guest', 'grandparent', 'party', 'foodie', 'kid', 'boss', 'dress', 'suit', 'planner', 'chef']);

/** Maps content to baked textures. The only place that knows how content *looks*. */
export class ArtKit {
  constructor(
    private readonly tex: TextureFactory,
    private readonly content: ContentRegistry,
  ) {}

  person(look: PersonLook): string {
    const key = `person:${look.style}:${look.skin}:${look.hair}:${look.outfit}:${look.hairStyle ?? '-'}:${look.mood ?? 'neutral'}`;
    return this.tex.ensure(key, PERSON_W, PERSON_H, paintPerson(look));
  }

  guestLook(g: Pick<Guest, 'key' | 'typeId' | 'groupId'>, mood: Mood = 'neutral'): PersonLook {
    const type = this.content.guestTypes.get(g.typeId);
    const group = this.content.groups.get(g.groupId);
    const h = hashString(g.key);
    const icon = type.visual.icon ?? 'guest';
    const style = (STYLES.has(icon) ? icon : 'guest') as PersonStyle;
    // Styles with a signature hairdo keep it; everyone else gets a varied one.
    const hairStyle = style === 'guest' || style === 'foodie' ? GUEST_HAIR_STYLES[(h >> 4) % GUEST_HAIR_STYLES.length] : undefined;
    return {
      style,
      hairStyle,
      mood,
      skin: SKINS[h % SKINS.length] ?? SKINS[0]!,
      hair: style === 'grandparent' ? 0xe6e2de : (HAIRS[(h >> 8) % HAIRS.length] ?? HAIRS[0]!),
      outfit: group.visual.color,
    };
  }

  guest(g: Pick<Guest, 'key' | 'typeId' | 'groupId'>, mood: Mood = 'neutral'): string {
    return this.person(this.guestLook(g, mood));
  }

  chef(): string {
    return this.person(CHEF_LOOK);
  }

  planner(mood: Mood = 'neutral'): string {
    return this.person(plannerLook(mood));
  }

  partner(def: CharacterDef, mood?: Mood): string {
    const look = characterLook(def, mood);
    const key = `partner:${def.id}:${look.mood}:${look.skin}:${look.hair}:${look.hairStyle ?? '-'}:${look.outfit}`;
    return this.tex.ensure(key, PERSON_W, PERSON_H, paintPerson(look));
  }

  item(itemId: Id): string {
    const item = this.content.items.get(itemId);
    const icon = (item.visual.icon ?? 'plate') as ItemIcon;
    return this.icon(icon, item.visual.color, item.visual.accent);
  }

  icon(icon: ItemIcon, color = 0xe86f8e, accent?: number): string {
    return this.tex.ensure(`icon:${icon}:${color}:${accent ?? ''}`, ICON_SIZE, ICON_SIZE, paintIcon(icon, color, accent));
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
