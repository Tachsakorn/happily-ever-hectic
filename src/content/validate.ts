import type { ContentRegistry } from './ContentRegistry';
import { GIFT_ITEM_ID } from './contracts';
import type { StationKind } from './types';

/**
 * Checks every cross-reference and invariant the systems rely on, so broken
 * content fails loudly in tests (and at boot in dev) instead of mid-level.
 * Returns human-readable problems; an empty array means valid.
 */
export function validateContent(content: ContentRegistry): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) errors.push(message);
  };

  for (const type of content.guestTypes.all()) {
    for (const t of type.traitIds) check(content.traits.has(t), `guest type ${type.id}: unknown trait ${t}`);
    for (const r of type.requestPool) check(content.items.has(r.itemId), `guest type ${type.id}: unknown item ${r.itemId}`);
    check(type.patienceSeconds > 0, `guest type ${type.id}: patienceSeconds must be > 0`);
    check(
      type.requestIntervalSeconds[0] <= type.requestIntervalSeconds[1],
      `guest type ${type.id}: request interval min > max`,
    );
  }

  for (const venue of content.venues.all()) {
    for (const s of venue.stations) {
      if (s.providesItemId) check(content.items.has(s.providesItemId), `venue ${venue.id}: station ${s.id} provides unknown item`);
      if (s.kind === 'drinkTap' || s.kind === 'dessertTable' || s.kind === 'cakeTable') {
        check(!!s.providesItemId, `venue ${venue.id}: station ${s.id} (${s.kind}) must provide an item`);
      }
    }
    for (const required of ['kitchenPass', 'coupleTable', 'giftTable', 'bin'] as StationKind[]) {
      check(venue.stations.some((s) => s.kind === required), `venue ${venue.id}: missing ${required} station`);
    }
    check(venue.passSlots.length > 0, `venue ${venue.id}: needs at least one pass slot`);
    check(venue.waitingSlots.length > 0, `venue ${venue.id}: needs at least one waiting slot`);
    const ids = [...venue.stations.map((s) => s.id), ...venue.tables.flatMap((t) => [t.id, ...t.seats.map((s) => s.id)])];
    check(new Set(ids).size === ids.length, `venue ${venue.id}: station/table/seat ids must be unique`);
  }

  for (const d of content.disasters.all()) {
    check(d.warningSeconds >= 0 && d.activeSeconds > 0 && d.escalatedSeconds > 0, `disaster ${d.id}: invalid phase durations`);
    check(d.workSeconds > 0, `disaster ${d.id}: workSeconds must be > 0`);
    check(d.maxOccurrences > 0, `disaster ${d.id}: maxOccurrences must be > 0`);
  }

  for (const m of content.moments.all()) {
    check(content.items.has(m.itemId), `moment ${m.id}: unknown item ${m.itemId}`);
  }

  for (const w of content.weddings.all()) {
    for (const i of w.menuItemIds) {
      check(content.items.has(i) && content.items.get(i).kind === 'dish', `wedding ${w.id}: menu item ${i} must be a dish`);
    }
    for (const i of w.coupleRequestItemIds) check(content.items.has(i), `wedding ${w.id}: unknown couple item ${i}`);
    check(w.menuItemIds.length > 0, `wedding ${w.id}: menu is empty`);
    for (const i of w.appetizerItemIds ?? []) {
      check(content.items.has(i) && content.items.get(i).kind === 'dish', `wedding ${w.id}: starter ${i} must be a dish`);
    }
    if (w.dessertItemId) check(content.items.has(w.dessertItemId), `wedding ${w.id}: unknown dessert ${w.dessertItemId}`);
  }

  const groupIds = new Set(content.groups.all().map((g) => g.id));
  for (const level of content.levels.all()) {
    const where = `level ${level.id}`;
    check(content.weddings.has(level.weddingId), `${where}: unknown wedding ${level.weddingId}`);
    check(content.venues.has(level.venueId), `${where}: unknown venue ${level.venueId}`);
    if (level.dancing && content.venues.has(level.venueId)) {
      check((content.venues.get(level.venueId).danceSpots?.length ?? 0) > 0, `${where}: dancing needs a venue with a dance floor`);
    }
    for (const d of level.disasterIds) check(content.disasters.has(d), `${where}: unknown disaster ${d}`);
    for (const [d, t] of Object.entries(level.disasterTriggers ?? {})) {
      check(level.disasterIds.includes(d), `${where}: trigger set for disaster ${d}, which the level does not use`);
      const start = t.kind === 'scheduled' ? t.at : t.kind === 'random' ? t.from : (t.from ?? 0);
      check(start < level.durationSeconds, `${where}: disaster ${d} is scheduled after the reception ends`);
      if (t.kind === 'random') check(t.from < t.to, `${where}: disaster ${d} has an empty time window`);
    }
    for (const m of level.moments) {
      check(content.moments.has(m.momentId), `${where}: unknown moment ${m.momentId}`);
      check(m.at < level.durationSeconds, `${where}: moment ${m.momentId} happens after the reception ends`);
    }
    if (level.unlockRequiresLevelId) {
      check(content.levels.has(level.unlockRequiresLevelId), `${where}: unknown unlock level ${level.unlockRequiresLevelId}`);
    }
    for (const dlg of [level.introDialogueId, level.outroDialogueId]) {
      if (dlg) check(content.dialogues.has(dlg), `${where}: unknown dialogue ${dlg}`);
    }
    check(
      level.starScores[0] < level.starScores[1] && level.starScores[1] < level.starScores[2],
      `${where}: star scores must be strictly ascending`,
    );
    check(level.kitchen.burners > 0 && level.kitchen.cookSeconds > 0, `${where}: invalid kitchen settings`);

    const keys = new Set(level.guests.map((g) => g.key));
    check(keys.size === level.guests.length, `${where}: guest keys must be unique`);
    for (const g of level.guests) {
      check(content.guestTypes.has(g.typeId), `${where}: guest ${g.key} has unknown type ${g.typeId}`);
      check(groupIds.has(g.groupId), `${where}: guest ${g.key} has unknown group ${g.groupId}`);
      check(g.arriveAt >= 0 && g.arriveAt < level.durationSeconds, `${where}: guest ${g.key} arrives outside the reception`);
      for (const ref of [...g.likes, ...g.dislikes]) {
        check(keys.has(ref) || groupIds.has(ref), `${where}: guest ${g.key} refers to unknown guest/group ${ref}`);
      }
    }

    if (content.venues.has(level.venueId)) {
      const venue = content.venues.get(level.venueId);
      const seatCount = venue.tables.reduce((n, t) => n + t.seats.length, 0);
      // More guests than seats only works if guests eventually leave and free their seats.
      if (level.guests.length > seatCount) {
        for (const g of level.guests) {
          const stays = content.guestTypes.has(g.typeId) ? content.guestTypes.get(g.typeId).staysFor : undefined;
          check(stays !== undefined, `${where}: ${level.guests.length} guests for ${seatCount} seats, but ${g.key} never leaves (no staysFor)`);
        }
      }
      for (const dId of level.disasterIds) {
        if (!content.disasters.has(dId)) continue;
        const target = content.disasters.get(dId).target;
        if (target.kind === 'station') {
          check(
            venue.stations.some((s) => s.kind === target.stationKind),
            `${where}: disaster ${dId} needs a ${target.stationKind} station in venue ${venue.id}`,
          );
        }
      }
      // Requests go through the level's item swaps; so do station hand-outs.
      const swap = (id: string) => level.itemSwaps?.[id] ?? id;
      const provided = (id: string) => venue.stations.some((s) => s.providesItemId !== undefined && swap(s.providesItemId) === id);
      for (const [from, to] of Object.entries(level.itemSwaps ?? {})) {
        check(content.items.has(from) && content.items.has(to), `${where}: item swap ${from} → ${to} uses an unknown item`);
      }
      for (const m of level.moments) {
        if (!content.moments.has(m.momentId)) continue;
        const itemId = swap(content.moments.get(m.momentId).itemId);
        check(provided(itemId), `${where}: moment ${m.momentId} needs a station providing ${itemId}`);
      }
      if (content.weddings.has(level.weddingId)) {
        const dessert = content.weddings.get(level.weddingId).dessertItemId;
        if (dessert) check(provided(swap(dessert)), `${where}: dessert ${swap(dessert)} has no station providing it`);
        for (const itemId of content.weddings.get(level.weddingId).coupleRequestItemIds) {
          check(provided(itemId), `${where}: couple request ${itemId} has no station providing it`);
        }
      }
      for (const g of level.guests) {
        if (!content.guestTypes.has(g.typeId)) continue;
        for (const r of content.guestTypes.get(g.typeId).requestPool) {
          const itemId = swap(r.itemId);
          check(provided(itemId), `${where}: guest type ${g.typeId} may request ${itemId} but no station provides it`);
        }
      }
    }
  }

  for (const sec of content.secretEvents.all()) {
    const where = `secret event ${sec.id}`;
    check(sec.chance > 0 && sec.chance <= 1, `${where}: chance must be in (0, 1]`);
    check(sec.window[0] < sec.window[1], `${where}: empty time window`);
    check(sec.staySeconds > 0, `${where}: staySeconds must be > 0`);
    if (sec.spots === 'danceFloor') continue;
    check(sec.spots.length > 0, `${where}: needs at least one spot`);
    // Every venue shares these coordinates, so every spot must be walkable in every venue.
    for (const venue of content.venues.all()) {
      for (const p of sec.spots) {
        const blocked = venue.obstacles.some((o) =>
          o.kind === 'circle'
            ? Math.hypot(p.x - o.center.x, p.y - o.center.y) < o.radius
            : p.x > o.x && p.x < o.x + o.w && p.y > o.y && p.y < o.y + o.h,
        );
        check(!blocked, `${where}: spot (${p.x}, ${p.y}) is inside an obstacle in venue ${venue.id}`);
      }
    }
  }

  for (const a of content.achievements.all()) {
    const where = `achievement ${a.id}`;
    const c = a.condition;
    if (c.kind === 'secretFound') check(content.secretEvents.has(c.secretId), `${where}: unknown secret event ${c.secretId}`);
    if (c.kind === 'allSecretsFound') check(content.secretEvents.all().length > 0, `${where}: there are no secret events`);
    if (c.kind === 'weddingsCompleted' || c.kind === 'lifetime') check(c.count > 0, `${where}: count must be > 0`);
    if (c.kind === 'completedDuringHours') check(c.from >= 0 && c.to <= 24 && c.from < c.to, `${where}: invalid hours`);
    if (a.secret) check(!!a.hint, `${where}: secret achievements need a hint`);
  }

  // Systems rely on these ids existing (gifts are carried as the 'gift' item).
  check(
    content.items.has(GIFT_ITEM_ID) && content.items.get(GIFT_ITEM_ID).kind === 'gift',
    `items: a '${GIFT_ITEM_ID}' item of kind gift is required`,
  );

  const info = content.info;
  if (info.endingDialogueId) check(content.dialogues.has(info.endingDialogueId), `info: unknown ending dialogue`);
  if (info.finalLevelId) check(content.levels.has(info.finalLevelId), `info: unknown final level`);

  return errors;
}
