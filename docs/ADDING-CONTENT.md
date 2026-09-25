# Adding content

All content is data in `src/data/packs/*`. After any change run `pnpm check`: the content
integrity test reports broken references (unknown ids, missing stations, impossible timings).

## A new guest type

Add to `guestTypes` in `src/data/packs/base/people.ts`:

```ts
{
  id: 'influencer',
  name: 'Influencer',
  patienceSeconds: 40,          // full → zero happiness while waiting
  eatSeconds: 8,
  requestIntervalSeconds: [15, 25],
  requestPool: [{ itemId: 'champagne', weight: 5 }, { itemId: 'cake-slice', weight: 2, requiresFlag: 'cake-cut' }],
  staysFor: [1, 2],              // follow-up wishes before a happy goodbye (frees the seat)
  danceWeight: 5,                // how likely a follow-up wish is a dance (dancing levels only)
  serviceWeights: { song: 3 },   // how likely it is a song request (levels with services: ['song'])
  traitIds: ['social', 'demanding'],
  visual: { color: 0xf2c9a8, icon: 'party' },   // icon: guest | grandparent | party | foodie | kid | boss
}
```

A single guest can have extra personality on top of their type: `guest(..., { traitIds: ['drama'] })`.

New behaviour that is just numbers → a new **trait** (`traits`, same file) with `modifiers`,
`sameGroupBonus` or `otherGroupBonus`. Only genuinely new behaviour needs code: a new state handler in
`core/guests/GuestSystem.ts` plus its transitions in `guestMachine.ts`.

## A new disaster

Add to `disasters` in `src/data/packs/base/chaos.ts`, then list its id in a level's `disasterIds`:

```ts
{
  id: 'wilting-flowers',
  name: 'Wilting Flowers',
  hint: 'The centrepiece is wilting! Tap the table to freshen it up.',
  trigger: { kind: 'random', from: 40, to: 180, chancePerSecond: 0.015 },
  target: { kind: 'occupiedTable' },
  warningSeconds: 6, activeSeconds: 10, escalatedSeconds: 8,
  warning: { moodPerSecond: 0.2 },
  active: { moodPerSecond: 0.8, guestDrainMultiplier: 1.4, guestScope: 'table' },
  escalated: { moodPerSecond: 1.5, guestDrainMultiplier: 2, guestScope: 'table' },
  workSeconds: 1.5,
  resolvedEarly: { mood: 4, score: 90 }, resolved: { mood: 2, score: 50 }, failed: { mood: -8, score: -40 },
  maxOccurrences: 1, cooldownSeconds: 60,
  visual: { color: 0x9dbf6a, icon: 'alert' },
}
```

Triggers: `scheduled`, `random`, `seatingConflict`. Targets: `station`, `conflictTable`,
`occupiedTable`, `seatedGuest` (optionally `prefersTraitId`, e.g. a drama-prone guest), `floorSpot`.
Effects: mood drain, guest patience drain (scoped; scaled per guest by `disasterReaction`), planner
slow-down, music silence, `stopsKitchen`. `{guest}` in the hint is replaced by the involved guest's name. A genuinely new mechanic = one new trigger/target kind in
`core/disasters/disasterKinds.ts`; a new icon = one case in `paintDisasterIcon` (`src/art/props.ts`).

## A new wedding and level

1. Add a `WeddingDef` to `weddings` (couple, outfits, what they love, couple requests) and its meal:
   `appetizerItemIds` (starters), `menuItemIds` (mains) and `dessertItemId` — leave out a course to skip it.
2. Add a `LevelDef` to `levels` (`src/data/packs/base/weddings.ts`): venue, duration, guest list
   (use the `guest(key, name, type, group, arriveAt, { bringsGift, likes, dislikes })` helper),
   disasters, moments (`toast`, `cake-cutting`), kitchen, star scores, coins, unlock chain, dialogue ids.
   Optional: `dancing: true` (needs a venue with `danceSpots`), `services: ['song']` (song requests
   at the DJ booth), `rescues: 2` (bottles of rescue champagne) and `modifiers` for pickier guests
   (e.g. `{ guestPatienceDrain: 1.15, guestRequestInterval: 0.9 }`). Level ids are save keys —
   never rename a shipped one; change `order` to move it on the map.
3. Add intro/outro lines to `dialogues` in `meta.ts`.
4. Run `pnpm vitest run tests/balance.test.ts --silent=false` and copy the printed `suggested`
   thresholds (≈ 55% / 80% / 95% of what the *casual* autoplayer scores) into `starScores`.
   Introduce at most one new mechanic per wedding — players need room to learn it.

### Pacing a level's surprises

A level can override when each of its disasters may fire with `disasterTriggers`
(`{ 'missing-rings': { kind: 'scheduled', at: 88 } }`). Use it to make a level hard through
variety — one new kind of surprise at a time — instead of piling on guests. The finale does this.

## A new service request

Add to `services` in `people.ts` — `{ id, name, stationKind, hint, visual: { color, icon } }` where
`icon` is a UI icon name (`render` shows it in the guest's bubble). Give guest types a weight in
`serviceWeights` and list it in a level's `services`. Validation checks the venue has the station.

## A new secret event

Add to `secretEvents` in `src/data/packs/base/secrets.ts` (a personal pack can add its own too):

```ts
{
  id: 'runaway-balloon', name: 'Runaway Balloon',
  chance: 0.25,                    // rolled once per reception
  window: [40, 160],               // seconds into the reception
  requires: [{ kind: 'theme', themes: ['garden'] }],   // also: minMood, dancersAtOnce
  spots: [{ x: 675, y: 570 }],     // walkable floor (validation checks every venue), or 'danceFloor'
  staySeconds: 10,
  appearText: 'A heart balloon is floating away!', foundText: 'Caught it!',
  reward: { score: 200, mood: 6 },
  visual: { icon: 'golden-bouquet', color: 0xf49ac1 },  // a new icon = one case in art/secrets.ts
}
```

Secrets use their own random stream (seeded from the reception), so adding one never changes how
the rest of a level plays. Test tools: *Secret* on the pause screen shows one immediately.

## A new achievement

Add to `achievements` in the same file. Conditions: `weddingsCompleted`, `threeStarLevels`,
`finalLevelCompleted`, `lifetime` (dances, gifts, disasters fixed, happy goodbyes, guests served),
`reception` (one finished wedding within bounds: `minGuests`, `maxUpset`, `maxFinalMood`, `minStars`),
`secretFound`, `allSecretsFound`, `allUpgradesOwned`, `completedDuringHours`. `secret: true` hides it as
"???" with its `hint` until unlocked. Achievements are checked after every reception and every purchase
(`core/progression/achievements.ts`); unlocking is permanent.

## A new venue

Add a `VenueDef` (stations, tables, waiting spots, pass slots, obstacles, aisle waypoints, optional
`danceSpots`) and a drawing for any new station kind in `art/venuePainter.ts`. A new *look* for the
same floor plan is just `{ ...gardenHall, id, name, theme, floorColor }`; themes (`garden`, `beach`,
`ballroom`, `night`) are painted in `art/venueThemes.ts` (wall, floor, props, lighting, dance floor). Required stations: `kitchenPass`,
`coupleTable`, `giftTable`, `bin`, plus a station providing every item any guest or moment asks for —
validation tells you what is missing.

## Decor and shop upgrades

Decor lives in `data/packs/base/meta.ts` (`decor`). `visual.color` tints tables and flowers in the venue;
`visual.icon` picks the picture on the preparation screen (`bouquet`, `lantern`, `candles`, `tropical`;
anything else falls back to the bouquet). Upgrades (`upgrades`) take an optional `icon` from the UI icon
set (`chair`, `shoe`, `chef`, `walkie`, `violin`, …); unknown names fall back to a heart.

## How a couple looks

A `CharacterDef` may carry a `look` (skin, hair colour, `hairStyle`, `shirt`, `accessory`,
`signatureMood`). The same look drives the in-game sprite, the dialogue portrait, the title-screen
couple and the invitation on the preparation screen (`art/characters.ts`). Dialogue speakers who are
not partners in any wedding get a stable everyday look from their name.
