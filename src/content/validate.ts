import type { ContentRegistry } from './ContentRegistry';
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
  }

  const groupIds = new Set(content.groups.all().map((g) => g.id));
  for (const level of content.levels.all()) {
    const where = `level ${level.id}`;
    check(content.weddings.has(level.weddingId), `${where}: unknown wedding ${level.weddingId}`);
    check(content.venues.has(level.venueId), `${where}: unknown venue ${level.venueId}`);
    for (const d of level.disasterIds) check(content.disasters.has(d), `${where}: unknown disaster ${d}`);
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
      check(level.guests.length <= seatCount, `${where}: ${level.guests.length} guests but only ${seatCount} seats`);
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
      for (const m of level.moments) {
        if (!content.moments.has(m.momentId)) continue;
        const itemId = content.moments.get(m.momentId).itemId;
        check(
          venue.stations.some((s) => s.providesItemId === itemId),
          `${where}: moment ${m.momentId} needs a station providing ${itemId}`,
        );
      }
      if (content.weddings.has(level.weddingId)) {
        for (const itemId of content.weddings.get(level.weddingId).coupleRequestItemIds) {
          check(
            venue.stations.some((s) => s.providesItemId === itemId),
            `${where}: couple request ${itemId} has no station providing it`,
          );
        }
      }
      for (const g of level.guests) {
        if (!content.guestTypes.has(g.typeId)) continue;
        for (const r of content.guestTypes.get(g.typeId).requestPool) {
          check(
            venue.stations.some((s) => s.providesItemId === r.itemId),
            `${where}: guest type ${g.typeId} may request ${r.itemId} but no station provides it`,
          );
        }
      }
    }
  }

  // Systems rely on these ids existing (gifts are carried as the 'gift' item).
  check(content.items.has('gift') && content.items.get('gift').kind === 'gift', `items: a 'gift' item of kind gift is required`);

  const info = content.info;
  if (info.endingDialogueId) check(content.dialogues.has(info.endingDialogueId), `info: unknown ending dialogue`);
  if (info.finalLevelId) check(content.levels.has(info.finalLevelId), `info: unknown final level`);

  return errors;
}
