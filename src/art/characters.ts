import type { CharacterDef } from '../content/types';
import type { HairStyle, Mood, PersonLook } from './people';

export const SKINS = [0xf6d7bf, 0xeac3a2, 0xd9a47e, 0xb97c55, 0x8d5a3b, 0xf2cfae];
export const HAIRS = [0x2b1d14, 0x5a3a22, 0x8a5a3a, 0xc9954f, 0x1e1612, 0xa0522d, 0x3b2a20];
const HAIR_STYLES = new Set<HairStyle>(['short', 'bob', 'long', 'bun', 'curly', 'spiky', 'pigtails', 'side', 'crop', 'longSide']);
const MOODS = new Set<Mood>(['neutral', 'happy', 'angry', 'sad', 'cheeky']);
const GUEST_HAIR_STYLES: HairStyle[] = ['short', 'bob', 'long', 'curly', 'side', 'bun'];

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The couple's look, shared by in-game sprites and menu portraits so they always match. */
export function characterLook(def: CharacterDef, mood?: Mood): PersonLook {
  const look = def.look ?? {};
  const hairStyle = look.hairStyle && HAIR_STYLES.has(look.hairStyle as HairStyle) ? (look.hairStyle as HairStyle) : undefined;
  const signature = look.signatureMood && MOODS.has(look.signatureMood as Mood) ? (look.signatureMood as Mood) : 'happy';
  return {
    style: def.visual.icon === 'suit' ? 'suit' : 'dress',
    skin: look.skin ?? SKINS[hashString(def.id) % SKINS.length] ?? SKINS[0]!,
    hair: look.hair ?? def.visual.accent ?? 0x2b1d14,
    outfit: def.visual.color,
    hairStyle,
    shirt: look.shirt,
    accessory: look.accessory === 'star-clip' ? 'star-clip' : undefined,
    mood: mood ?? signature,
  };
}

export function plannerLook(mood: Mood = 'neutral'): PersonLook {
  return { style: 'planner', skin: 0xf2cfae, hair: 0x6b3f25, outfit: 0xe86f8e, mood };
}

export const CHEF_LOOK: PersonLook = { style: 'chef', skin: 0xd9a47e, hair: 0x2b1d14, outfit: 0xffffff };

/** A stable everyday look for anyone known only by name (dialogue speakers, generic guests). */
export function everydayLook(seed: string, outfit: number, mood: Mood = 'neutral'): PersonLook {
  const h = hashString(seed);
  return {
    style: 'guest',
    hairStyle: GUEST_HAIR_STYLES[(h >> 4) % GUEST_HAIR_STYLES.length],
    mood,
    skin: SKINS[h % SKINS.length] ?? SKINS[0]!,
    hair: HAIRS[(h >> 8) % HAIRS.length] ?? HAIRS[0]!,
    outfit,
  };
}
