import type { Id, SeatDef, StationDef, StationKind, TableDef, VenueDef } from '../../content/types';

/** Fast static lookups over a venue definition. */
export class VenueIndex {
  private readonly stationsById = new Map<Id, StationDef>();
  private readonly seatsById = new Map<Id, { seat: SeatDef; table: TableDef }>();
  private readonly tablesById = new Map<Id, TableDef>();

  constructor(readonly def: VenueDef) {
    for (const s of def.stations) this.stationsById.set(s.id, s);
    for (const t of def.tables) {
      this.tablesById.set(t.id, t);
      for (const seat of t.seats) this.seatsById.set(seat.id, { seat, table: t });
    }
  }

  station(id: Id): StationDef {
    const s = this.stationsById.get(id);
    if (!s) throw new Error(`Unknown station ${id} in venue ${this.def.id}`);
    return s;
  }

  hasStation(id: Id): boolean {
    return this.stationsById.has(id);
  }

  stationsOfKind(kind: StationKind): StationDef[] {
    return this.def.stations.filter((s) => s.kind === kind);
  }

  firstStationOfKind(kind: StationKind): StationDef {
    const s = this.def.stations.find((st) => st.kind === kind);
    if (!s) throw new Error(`Venue ${this.def.id} has no ${kind}`);
    return s;
  }

  seat(id: Id): { seat: SeatDef; table: TableDef } {
    const s = this.seatsById.get(id);
    if (!s) throw new Error(`Unknown seat ${id} in venue ${this.def.id}`);
    return s;
  }

  hasSeat(id: Id): boolean {
    return this.seatsById.has(id);
  }

  table(id: Id): TableDef {
    const t = this.tablesById.get(id);
    if (!t) throw new Error(`Unknown table ${id} in venue ${this.def.id}`);
    return t;
  }

  get tables(): readonly TableDef[] {
    return this.def.tables;
  }
}
