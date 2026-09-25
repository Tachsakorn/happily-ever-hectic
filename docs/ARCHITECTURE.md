# Architecture

## Layers

```
main.ts (composition root)
  │
  ├── app/        Game flow: AppFlow state machine, GameApp (state → screen/scene), AudioDirector, view models
  ├── ui/         DOM screens (menus, map, prep, dialogue, pause, results). No Phaser.
  ├── render/     Phaser scenes and views, texture baking, effects (fx/), touch input. Reads sim state, sends commands.
  ├── art/        Pure Canvas2D painters shared by render and ui: people, items, props, flora, scenery, venue, fx.
  ├── platform/   Browser services behind interfaces: SaveService, AudioService, viewport/touch hardening
  ├── core/       Gameplay simulation. Pure TypeScript: no Phaser, no DOM, fully unit tested.
  ├── content/    Content types, ContentRegistry, validation, id contracts
  └── data/       Content packs (base + personal). Plain data only.
```

Dependency rule (enforced by ESLint `no-restricted-imports`):
`data → content ← core ← render/ui/app`. `core`, `content`, `data` and `art` never import
`phaser`, `render`, `ui`, `app` or `platform`. `ui` never imports `phaser` or `render`.
`art` is the one visual vocabulary: a menu portrait and an in-game sprite are the same painter.
`madge --circular` reports no cycles.

## Data flow in a reception

```
touch ──► ReceptionInput ──► Command ──► ReceptionSimulation ──► state (read-only to views)
                                              │
                                              └──► DomainEvents ──► scene feedback (text, banners)
                                                                └──► AudioDirector (sounds, music duck)
```

- `ReceptionSession` (core) owns the simulation and a `FixedStepRunner` (60 Hz). The scene feeds
  real frame time in; pause = stop feeding. Same speed on 60 Hz and 120 Hz iPads.
- Commands: `seatGuest`, `queueAction`, `clearQueue`, `sendToDance`, `useRescue`. Views never mutate state.
- Events carry positions so feedback appears where things happen.

## Simulation (core/)

`ReceptionSimulation` composes small systems, run in this order each tick:

| System | Responsibility |
|---|---|
| Timeline | Guest arrivals and wedding moments at their authored times |
| Disasters | Trigger → WARNING → ACTIVE → ESCALATED → FAILED, or RESOLVED by the planner |
| Planner | Action queue, walking (visibility-graph nav), work timers, interactions on arrival |
| Guests | Per-state behaviour handlers + validated transition table, patience, seating mood |
| Kitchen | Burners, cook time, pass slots; stops while a disaster `stopsKitchen` (set each tick by Disasters) |
| Gifts | Gifts left too long go missing |
| Secrets | Rare surprises: armed by chance, appear when their conditions hold, found by tapping (own random stream) |
| Couple | Couple requests, moment timers, calm recovery |

All side effects flow through three services: `EventBus`, `MoodLedger` (every mood change has a
cause — shown live in the HUD and summarised on the results screen) and `ScoreKeeper`.

Guest lifecycle: `ARRIVING → WAITING_TO_BE_SEATED → WALKING_TO_SEAT → SEATED → READY_TO_ORDER →
WAITING_FOR_FOOD → EATING → SATISFIED ⇄ REQUESTING`, and from any waiting/seated state `→ UPSET →
LEAVING → GONE`. Illegal transitions throw.

Meal: a guest eats up to three courses in order (`core/guests/courses.ts`), as the wedding's data
provides: a starter (`appetizerItemIds`, plated by the kitchen as soon as the guest wants it, no
burner), the main (`menuItemIds`: the guest orders, the kitchen cooks) and dessert (`dessertItemId`,
from the dessert table). Between courses there is a short pause, sometimes an extra wish.

Chains (`core/scoring/chain.ts`): consecutive jobs of the same kind (`serve:<item>`, `order`, `gift`,
`fix`, `couple`) grow a chain; the n-th pays (n − 1) × `chainBonusPerStep`. Fetching, binning,
seating and sending dancers are neutral. Any other kind of job starts a new chain.

Ending: by default (`LevelDef.ending: 'guestsGone'`) a reception is complete once every guest has
arrived and left and every wedding moment is over; `durationSeconds` is then only an estimate.
`'timer'` ends it on the clock (unit tests use this).

Turnover: each guest type's `staysFor: [min, max]` is how many follow-up wishes (a drink, a dance)
a guest has before a happy goodbye (`SATISFIED → LEAVING`, bonus score per heart). Their seat frees
up, so a level can have more guests than seats — validation requires `staysFor` for every guest in
such a level.

Dancing (levels with `dancing: true`, venues with `danceSpots`): a follow-up wish can be a dance
instead of an item (`GuestTypeDef.danceWeight`). `SATISFIED → WANTS_TO_DANCE` (music-note bubble,
patience drains) → the player drags the guest onto the floor (`sendToDance`) → `WALKING_TO_DANCE →
DANCING` (happiness rises) `→ RETURNING_TO_SEAT → SATISFIED`. Dancers keep their seat. The floor's
rectangle comes from `content/danceFloor.ts`, shared by the painter, the drop test and the highlight.

Seating ("sit next to", `core/guests/seating.ts`): only the seats either side count — a table's
`seats` are listed in order around it and `VenueIndex.adjacentSeats` gives each seat's two
neighbours (across the table is not a neighbour). A guest's comfort = Σ affinity with each side
neighbour (likes/dislikes by guest key or group, same-group familiarity, trait bonuses). It changes
happiness continuously; side-by-side enemies can start the argument disaster. Waiting guests show
their wishes as bubbles (a face with ♥ or ✕), and while a guest is held every free seat is tinted.

Service requests (`core/guests/services.ts`, `ServiceDef`): a wish granted at a station instead of
carried, e.g. a song at the DJ booth. Levels opt in with `services`, guest types weigh them with
`serviceWeights`. The guest is `REQUESTING` with `wantsServiceId`; tapping the station — or the
guest, which sends the planner there — grants every waiting request at that station at once.

Rescue champagne (`core/guests/rescue.ts`): `LevelDef.rescues` bottles; the `useRescue` command
adds `tuning.rescue.guestHappiness` to every guest and a little couple mood. No walking, chain-neutral.
Each unopened bottle pays `scoring.rescueUnused` at the end, so it is a decision, not a free heal.

Personalities are traits: a guest's `traitIds` = their type's plus their own (`LevelGuestSpec.traitIds`),
e.g. `fast-eater`, `slow-eater`, `drama` (modifier `disasterReaction` scales how hard disasters hit
them, and `seatedGuest` disasters prefer them).

Interactions resolve **on arrival and again on completion**, because the world changes while the
planner walks (Dash-genre contract).

Randomness only through the seeded `Rng`: every reception is reproducible from its seed.

## Game states (app/AppFlow.ts)

`BOOT → MAIN_MENU → PROGRESSION ⇄ WEDDING_PREPARATION → RECEPTION_INTRO → RECEPTION_PLAYING ⇄ PAUSED →
WEDDING_COMPLETE → RESULTS`. The transition table is the single source of truth; `GameApp` has one
small handler per state. Transitions requested while listeners run are queued.

## Save system

`SaveService` interface (`platform/save`) with `LocalStorageSaveService` (guarded against private
mode, quota and eviction errors) and `InMemorySaveService` (tests). Save data is versioned and
always passes through `migrate()`, which repairs corrupted fields instead of crashing.
Progression rules (unlocks, coins, shop, decor bonus, achievements) are pure functions in
`core/progression`. The save also holds unlocked achievements (id → time), lifetime totals and
secrets found; saves from before these existed load with them empty (no version bump needed).

## Input

Touch-first, no hover or keyboard. Only the first finger is tracked. Gestures: drag guest → seat
(or a guest who wants to dance → dance floor), tap guest then tap seat/floor, tap anything to queue an action, tap the planner to clear the queue.
Hit-testing is done in world space by the simulation (`core/input/picking.ts`) with generous radii.
`installTouchHardening` blocks pinch zoom, double-tap zoom, long-press menus and rubber-banding.

## Rendering & performance

- One `Phaser.Game` for the whole session; scenes are started/stopped, never the game.
- Canvas renders at `renderScale` (≈ physical pixels, max 2×); cameras zoom so code uses design units (1400×1000).
- All art is drawn once with Canvas2D (`art/`) and baked into textures (`render/art/TextureFactory`).
  The frame loop only moves images; views update display objects only when the underlying value changed.
- Motion (walk bob, breathing, hops, squash) is a few multiplications per sprite per frame; reactions are
  tweens on small offset objects that the views apply on top of simulated positions.
- `render/fx/Fx` owns every particle (hearts, sparkles, confetti, dust, steam, flying coins/items) from one
  fixed pool of images: a chaotic moment can never allocate without bound.
- Pools for floating text and tap ripples; no per-frame DOM work (HUD is in the canvas).

### Art direction

One ink colour (`INK`) outlines everything; shapes get a two-tone toon shade (`toon()`); glows are
posterised rings, not gradients. Fonts: Lilita One (display) and Baloo 2 (body), bundled with
@fontsource and loaded before boot (`platform/fonts.ts`) so canvas text never falls back.

### DOM menus

Screens are small classes over `ui/dom.ts` helpers; painted canvases come from `ui/paint.ts`
(icons, portraits, full-body figures, resize-aware backdrops). Ambience (petals, confetti, hearts)
is a fixed number of CSS-animated elements. `ScreenStack` swaps screens with a `cut` or a `curtain`
wipe; the app picks the transition (in-play overlays cut, menus wipe).

### Vendor patch: Phaser multi-texture selection

`patches/phaser@4.2.1.patch` (applied by pnpm) makes Phaser's fragment shader round the interpolated
texture id before choosing a texture unit. Unpatched, it compares the float with `==`; on GPUs whose
interpolation is not exact, rotated sprites lose triangles/tiles (seen as headless characters). Remove
the patch once Phaser ships an equivalent fix.

## Audio

`SynthAudioService` synthesises every sound with WebAudio (no files). Unlocked by the first tap
(iOS requirement), suspended when the tab is hidden. The DJ disaster's `silencesMusic` effect ducks the
music via `AudioDirector`.

## Testing

`pnpm test` runs: kernel (RNG, fixed step, nav, events), guest lifecycle, seating, planner, kitchen,
gifts, disasters, moments, couple mood, end conditions, determinism, progression, save migration,
content integrity, and an **autoplayer** that plays every level with six seeds to prove each is
winnable and to calibrate star thresholds (`tests/balance.test.ts`, run with `--silent=false` to see scores).

## Test tools (playtesting)

Tap the title on the main menu five times to toggle them (saved in `settings.testTools`; a badge
shows when on). The map gets a wrench button (unlock every wedding, +500 coins, reset progress) and
the pause menu gets shortcuts (win with 3 or 1 stars, lose, skip 30 s, full mood). Reception
shortcuts are `Cheat`s applied by the simulation itself (`core/sim/cheats.ts`), so a cheated finish
runs through the same results → progression → save path as a real one.
