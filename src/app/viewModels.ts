import type { ContentRegistry } from '../content/ContentRegistry';
import type { Id } from '../content/types';
import { decorMatches, isUnlocked } from '../core/progression/progression';
import type { ResultOutcome } from '../core/progression/progression';
import type { SaveData } from '../core/progression/saveData';
import type { ReceptionResult } from '../core/scoring/results';
import type { DecorLook } from '../art/venuePainter';
import { characterLook, everydayLook, plannerLook } from '../art/characters';
import type { PersonLook } from '../art/people';
import type { DialogueLine } from '../content/types';
import type { DialogueLineVM } from '../ui/screens/DialogueScreen';
import type { MainMenuVM } from '../ui/screens/MainMenuScreen';
import type { LevelCardVM, ShopItemVM } from '../ui/screens/LevelSelectScreen';
import type { PrepVM } from '../ui/screens/PrepScreen';
import type { ResultsVM } from '../ui/screens/InPlayScreens';

/** Pure builders: content + save → what screens display. Screens never read content or saves directly. */

export function levelCards(content: ContentRegistry, save: SaveData): LevelCardVM[] {
  const finalId = content.info.finalLevelId;
  return content.orderedLevels().map((l, i) => {
    const w = content.weddings.get(l.weddingId);
    const p = save.levels[l.id];
    return {
      id: l.id,
      number: i + 1,
      name: l.name,
      couple: w.title,
      stars: p?.stars ?? 0,
      bestScore: p?.bestScore ?? 0,
      unlocked: isUnlocked(save, l),
      isFinal: l.id === finalId,
    };
  });
}

export function shopItems(content: ContentRegistry, save: SaveData): ShopItemVM[] {
  return content.upgrades
    .all()
    .map((u) => ({ id: u.id, name: u.name, description: u.description, cost: u.cost, owned: save.upgrades.includes(u.id), icon: u.icon }));
}

export function prepVM(content: ContentRegistry, save: SaveData, levelId: Id): PrepVM {
  const level = content.levels.get(levelId);
  const wedding = content.weddings.get(level.weddingId);
  const mins = Math.floor(level.durationSeconds / 60);
  const secs = level.durationSeconds % 60;
  const decor = content.decor
    .all()
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      color: d.visual.color,
      icon: d.visual.icon,
      loved: decorMatches(content, wedding.id, d.id),
    }))
    // Loved decor first, so the better choice is obvious but still a choice.
    .sort((a, b) => Number(b.loved) - Number(a.loved));
  return {
    levelName: level.name,
    couple: wedding.title,
    partners: [characterLook(wedding.partnerA), characterLook(wedding.partnerB)],
    minutes: secs ? `${mins}:${String(secs).padStart(2, '0')} min` : `${mins} min`,
    guestCount: level.guests.length,
    loves: wedding.lovesTags,
    moments: level.moments.map((m) => content.moments.get(m.momentId).name),
    disasters: level.disasterIds.map((d) => content.disasters.get(d).name),
    upgrades: save.upgrades.filter((u) => content.upgrades.has(u)).map((u) => content.upgrades.get(u).name),
    decor,
    starScores: level.starScores,
  };
}

export function decorLook(content: ContentRegistry, decorId: Id | null): DecorLook {
  const decor = decorId && content.decor.has(decorId) ? content.decor.get(decorId) : content.decor.all()[0];
  const flower = decor?.visual.color ?? 0xf2a7b8;
  return { flower, cloth: 0xfffcf8 };
}

export function nextLevelId(content: ContentRegistry, save: SaveData, levelId: Id): Id | null {
  const levels = content.orderedLevels();
  const i = levels.findIndex((l) => l.id === levelId);
  const next = levels[i + 1];
  return next && isUnlocked(save, next) ? next.id : null;
}

export function resultsVM(content: ContentRegistry, result: ReceptionResult, outcome: ResultOutcome, hasNext: boolean): ResultsVM {
  const s = result.stats;
  return {
    levelName: content.levels.get(result.levelId).name,
    success: result.outcome === 'COMPLETE',
    score: result.score,
    stars: result.stars,
    newBest: outcome.newBest,
    coinsEarned: outcome.coinsEarned,
    coins: outcome.save.coins,
    finalMood: result.finalMood,
    stats: [
      { label: 'Dinners served', value: String(s.guestsServed) },
      { label: 'Gifts delivered', value: String(s.giftsDelivered) },
      ...(s.dances ? [{ label: 'Dances', value: String(s.dances) }] : []),
      { label: 'Happy goodbyes', value: String(s.guestsLeftHappy) },
      { label: 'Disasters fixed', value: `${s.disastersResolved} / ${s.disastersResolved + s.disastersFailed}` },
      { label: 'Wedding moments', value: `${s.momentsCompleted} / ${s.momentsCompleted + s.momentsFailed}` },
      { label: 'Guests who left upset', value: String(s.guestsUpset) },
    ],
    moodBreakdown: result.moodBreakdown,
    unlocked: outcome.newlyUnlocked.map((id) => content.levels.get(id).name),
    hasNext,
    firstStarScore: content.levels.get(result.levelId).starScores[0],
  };
}

/** The couple on the title screen: the final wedding's couple (the players themselves, in a personal pack). */
export function menuVM(content: ContentRegistry, save: SaveData): MainMenuVM {
  const finalId = content.info.finalLevelId;
  const level = finalId && content.levels.has(finalId) ? content.levels.get(finalId) : content.orderedLevels()[0];
  const wedding = level ? content.weddings.get(level.weddingId) : null;
  return {
    title: content.info.title,
    tagline: content.info.tagline,
    settings: save.settings,
    testTools: save.settings.testTools,
    couple: wedding ? [characterLook(wedding.partnerA), characterLook(wedding.partnerB)] : null,
    coupleNames: wedding?.title ?? '',
  };
}

const EXTRA_OUTFITS = [0x8fd0e8, 0xb49be0, 0xf2b84b, 0x7fb08a, 0xe8a07a];

/**
 * Gives every dialogue speaker a face and a side. A speaker who is a partner
 * in any wedding looks like that character; the planner looks like the
 * planner; anyone else gets a stable everyday look.
 */
export function dialogueVM(content: ContentRegistry, lines: readonly DialogueLine[], levelId: Id | null): DialogueLineVM[] {
  const preferred = levelId ? content.weddings.get(content.levels.get(levelId).weddingId) : null;
  const weddings = preferred ? [preferred, ...content.weddings.all().filter((w) => w.id !== preferred.id)] : content.weddings.all();
  const lookFor = (speaker: string): PersonLook => {
    if (speaker === content.info.plannerName) return plannerLook('happy');
    for (const w of weddings) {
      if (w.partnerA.name === speaker) return characterLook(w.partnerA);
      if (w.partnerB.name === speaker) return characterLook(w.partnerB);
    }
    let h = 0;
    for (const ch of speaker) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return everydayLook(speaker, EXTRA_OUTFITS[h % EXTRA_OUTFITS.length]!, 'happy');
  };
  const sides = new Map<string, 'left' | 'right'>();
  const looks = new Map<string, PersonLook>();
  return lines.map((line) => {
    if (!sides.has(line.speaker)) {
      sides.set(line.speaker, sides.size % 2 === 0 ? 'left' : 'right');
      looks.set(line.speaker, lookFor(line.speaker));
    }
    return { speaker: line.speaker, text: line.text, side: sides.get(line.speaker)!, look: looks.get(line.speaker) };
  });
}
