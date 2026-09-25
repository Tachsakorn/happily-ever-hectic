import type {
  AchievementDef,
  ContentPack,
  DecorDef,
  DialogueDef,
  DisasterDef,
  GameInfo,
  GroupDef,
  GuestTypeDef,
  Id,
  ItemDef,
  LevelDef,
  MomentDef,
  ScoringRules,
  SecretEventDef,
  ServiceDef,
  TuningDef,
  TraitDef,
  UpgradeDef,
  VenueDef,
  WeddingDef,
} from './types';

class Catalog<T extends { readonly id: Id }> {
  private readonly byId = new Map<Id, T>();

  constructor(private readonly kind: string) {}

  add(def: T, packId: Id): void {
    if (this.byId.has(def.id)) {
      throw new Error(`Duplicate ${this.kind} id "${def.id}" (pack "${packId}")`);
    }
    this.byId.set(def.id, def);
  }

  get(id: Id): T {
    const def = this.byId.get(id);
    if (!def) throw new Error(`Unknown ${this.kind} "${id}"`);
    return def;
  }

  has(id: Id): boolean {
    return this.byId.has(id);
  }

  all(): readonly T[] {
    return [...this.byId.values()];
  }
}

/**
 * All loaded content, merged from packs. Read-only after construction.
 * Collections reject duplicate ids so a pack can never silently shadow
 * another; `info`, `scoring` and `tuning` are single values where the last pack wins
 * (that is how a personal pack retitles the game).
 */
export class ContentRegistry {
  readonly items = new Catalog<ItemDef>('item');
  readonly traits = new Catalog<TraitDef>('trait');
  readonly guestTypes = new Catalog<GuestTypeDef>('guest type');
  readonly groups = new Catalog<GroupDef>('group');
  readonly venues = new Catalog<VenueDef>('venue');
  readonly disasters = new Catalog<DisasterDef>('disaster');
  readonly moments = new Catalog<MomentDef>('moment');
  readonly services = new Catalog<ServiceDef>('service');
  readonly weddings = new Catalog<WeddingDef>('wedding');
  readonly levels = new Catalog<LevelDef>('level');
  readonly decor = new Catalog<DecorDef>('decor');
  readonly upgrades = new Catalog<UpgradeDef>('upgrade');
  readonly dialogues = new Catalog<DialogueDef>('dialogue');
  readonly secretEvents = new Catalog<SecretEventDef>('secret event');
  readonly achievements = new Catalog<AchievementDef>('achievement');
  private infoValue: GameInfo | null = null;
  private scoringValue: ScoringRules | null = null;
  private tuningValue: TuningDef | null = null;

  constructor(packs: readonly ContentPack[]) {
    for (const pack of packs) this.addPack(pack);
    if (!this.infoValue) throw new Error('No content pack provides game info');
    if (!this.scoringValue) throw new Error('No content pack provides scoring rules');
    if (!this.tuningValue) throw new Error('No content pack provides tuning');
  }

  get info(): GameInfo {
    return this.infoValue as GameInfo;
  }

  get scoring(): ScoringRules {
    return this.scoringValue as ScoringRules;
  }

  get tuning(): TuningDef {
    return this.tuningValue as TuningDef;
  }

  /** Levels in play order. */
  orderedLevels(): readonly LevelDef[] {
    return [...this.levels.all()].sort((a, b) => a.order - b.order);
  }

  private addPack(pack: ContentPack): void {
    if (pack.info) this.infoValue = pack.info;
    if (pack.scoring) this.scoringValue = pack.scoring;
    if (pack.tuning) this.tuningValue = pack.tuning;
    const add = <T extends { id: Id }>(catalog: Catalog<T>, defs: readonly T[] | undefined) => {
      for (const def of defs ?? []) catalog.add(def, pack.id);
    };
    add(this.items, pack.items);
    add(this.traits, pack.traits);
    add(this.guestTypes, pack.guestTypes);
    add(this.groups, pack.groups);
    add(this.venues, pack.venues);
    add(this.disasters, pack.disasters);
    add(this.moments, pack.moments);
    add(this.services, pack.services);
    add(this.weddings, pack.weddings);
    add(this.levels, pack.levels);
    add(this.decor, pack.decor);
    add(this.upgrades, pack.upgrades);
    add(this.dialogues, pack.dialogues);
    add(this.secretEvents, pack.secretEvents);
    add(this.achievements, pack.achievements);
  }
}
