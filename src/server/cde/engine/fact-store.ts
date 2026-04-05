/**
 * Fact Store Manager — Session state manager
 * Working memory for a scan session. Serializable to JSONB.
 */

import type { FactStore } from '@/types/cde';
import { createDefaultFactStore } from '@/types/cde';

interface UpdateRecord {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

/**
 * Deep merge two values following CDE merge rules:
 * - Arrays: append unique values
 * - Objects: recursive merge
 * - Primitives: overwrite
 * - null/undefined incoming: skip
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (source === null || source === undefined) {
    return target;
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    const merged = [...target];
    for (const item of source) {
      const exists = merged.some((existing) => {
        if (typeof existing === 'string' && typeof item === 'string') {
          return existing.toLowerCase() === item.toLowerCase();
        }
        return JSON.stringify(existing) === JSON.stringify(item);
      });
      if (!exists) {
        merged.push(item);
      }
    }
    return merged;
  }

  if (
    typeof target === 'object' &&
    target !== null &&
    typeof source === 'object' &&
    source !== null &&
    !Array.isArray(target) &&
    !Array.isArray(source)
  ) {
    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    for (const key of Object.keys(source as Record<string, unknown>)) {
      const sourceVal = (source as Record<string, unknown>)[key];
      if (sourceVal === null || sourceVal === undefined) continue;
      result[key] = deepMerge(result[key], sourceVal);
    }
    return result;
  }

  return source;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (current[segments[i]] === undefined || current[segments[i]] === null || typeof current[segments[i]] !== 'object') {
      current[segments[i]] = {};
    }
    current = current[segments[i]] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}

/** Critical fields that must be populated for CDE readiness */
const CRITICAL_FIELDS = [
  { check: (fs: FactStore) => fs.bodyRegion !== null || fs.conditionMentioned !== null, name: 'bodyRegion or conditionMentioned' },
  { check: (fs: FactStore) => fs.severity !== null, name: 'severity' },
  { check: (fs: FactStore) => Object.values(fs.redFlags).some((v) => v !== null), name: 'at least one red flag screened' },
  { check: (fs: FactStore) => fs.aggravatingFactors.length > 0, name: 'at least one aggravating factor' },
];

export class FactStoreManager {
  private store: FactStore;
  private history: UpdateRecord[] = [];

  constructor(initialData?: Partial<FactStore>) {
    this.store = createDefaultFactStore();
    if (initialData) {
      this.store = deepMerge(this.store, initialData) as FactStore;
    }
  }

  update(data: Partial<FactStore>): void {
    const now = new Date().toISOString();
    const dataObj = data as Record<string, unknown>;

    for (const key of Object.keys(dataObj)) {
      if (dataObj[key] === null || dataObj[key] === undefined) continue;
      const oldValue = (this.store as unknown as Record<string, unknown>)[key];
      this.history.push({
        field: key,
        oldValue: JSON.parse(JSON.stringify(oldValue ?? null)),
        newValue: JSON.parse(JSON.stringify(dataObj[key])),
        timestamp: now,
      });
    }

    this.store = deepMerge(this.store, data) as FactStore;

    // Increment conversation turn counter
    const storeRaw = this.store as unknown as Record<string, unknown>;
    const currentTurns = (storeRaw._turnCount as number) ?? 0;
    storeRaw._turnCount = currentTurns + 1;
  }

  get(field: string): unknown {
    return getByPath(this.store as unknown as Record<string, unknown>, field);
  }

  set(field: string, value: unknown): void {
    const oldValue = this.get(field);
    this.history.push({
      field,
      oldValue: oldValue !== undefined ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: JSON.parse(JSON.stringify(value)),
      timestamp: new Date().toISOString(),
    });
    setByPath(this.store as unknown as Record<string, unknown>, field, value);
  }

  getStore(): FactStore {
    return this.store;
  }

  getRedFlagStatus(): { anyPositive: boolean; positiveFlags: string[] } {
    const positiveFlags: string[] = [];
    for (const [key, value] of Object.entries(this.store.redFlags)) {
      if (value === true) {
        positiveFlags.push(key);
      }
    }
    return { anyPositive: positiveFlags.length > 0, positiveFlags };
  }

  getMissingCriticalFields(): string[] {
    return CRITICAL_FIELDS
      .filter((f) => !f.check(this.store))
      .map((f) => f.name);
  }

  isCDEReady(): boolean {
    const store = this.store;
    const storeRaw = store as unknown as Record<string, unknown>;

    // Required: body region
    const hasRegion = !!(store.bodyRegion || store.conditionMentioned);
    if (!hasRegion) return false;

    // Required: severity (must be explicitly set, never inferred)
    const hasSeverity = store.severity !== null && store.severity !== undefined;
    if (!hasSeverity) return false;

    // Required: at least one red flag screened (true or false, not null)
    const redFlags = (store.redFlags ?? {}) as Record<string, boolean | null>;
    const screenedCount = Object.values(redFlags).filter((v) => v !== null).length;
    if (screenedCount < 1) return false;

    // Turn-based fallback: after 7+ turns, allow CDE to fire even without aggravating/duration
    const turnCount = (storeRaw._turnCount as number) ?? 0;

    // Required: aggravating factors (or fallback after 7 turns)
    const hasAggravating = (store.aggravatingFactors ?? []).length > 0;
    if (!hasAggravating && turnCount < 7) return false;

    // Required: duration (or fallback after 7 turns)
    const hasDuration = !!store.duration;
    if (!hasDuration && turnCount < 7) return false;

    return true;
  }

  getHistory(): UpdateRecord[] {
    return [...this.history];
  }

  toJSON(): Record<string, unknown> {
    return JSON.parse(JSON.stringify(this.store));
  }

  static fromJSON(json: Record<string, unknown>): FactStoreManager {
    return new FactStoreManager(json as Partial<FactStore>);
  }
}
