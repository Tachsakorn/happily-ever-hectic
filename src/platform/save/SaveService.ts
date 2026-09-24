import { migrate, newSave, type SaveData } from '../../core/progression/saveData';

/**
 * Storage abstraction. Gameplay and progression never touch a storage API
 * directly, so moving to IndexedDB or a cloud save later changes only this layer.
 */
export interface SaveService {
  load(): SaveData;
  save(data: SaveData): void;
  clear(): void;
}

const KEY = 'happily-ever-hectic/save';

/**
 * localStorage-backed saves. Every access is guarded: Safari private mode,
 * storage eviction or quota errors must never crash the game — progress just
 * stays in memory for the session instead.
 */
export class LocalStorageSaveService implements SaveService {
  private memory: SaveData | null = null;

  constructor(private readonly storage: Storage | null = safeLocalStorage()) {}

  load(): SaveData {
    if (this.memory) return this.memory;
    try {
      const raw = this.storage?.getItem(KEY);
      this.memory = raw ? migrate(JSON.parse(raw)) : newSave();
    } catch {
      this.memory = newSave();
    }
    return this.memory;
  }

  save(data: SaveData): void {
    this.memory = data;
    try {
      this.storage?.setItem(KEY, JSON.stringify(data));
    } catch {
      // Quota exceeded or storage blocked: keep playing with in-memory progress.
    }
  }

  clear(): void {
    this.memory = newSave();
    try {
      this.storage?.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}

export class InMemorySaveService implements SaveService {
  private data: SaveData;

  constructor(initial: SaveData = newSave()) {
    this.data = initial;
  }

  load(): SaveData {
    return this.data;
  }

  save(data: SaveData): void {
    this.data = data;
  }

  clear(): void {
    this.data = newSave();
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
