/**
 * Fact Store Manager Tests — 20+ test cases
 */

import { describe, it, expect } from 'vitest';
import { FactStoreManager } from '../fact-store';

describe('FactStoreManager', () => {
  // ─── Initialization ───
  describe('initialization', () => {
    it('creates with default values', () => {
      const fs = new FactStoreManager();
      expect(fs.get('severity')).toBeNull();
      expect(fs.get('bodyRegion')).toBeNull();
      expect(fs.get('aggravatingFactors')).toEqual([]);
    });

    it('creates with initial data', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine', severity: 5 });
      expect(fs.get('bodyRegion')).toBe('lumbar_spine');
      expect(fs.get('severity')).toBe(5);
    });

    it('preserves defaults for unspecified fields', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      expect(fs.get('aggravatingFactors')).toEqual([]);
      expect(fs.get('numbness')).toBeNull();
    });
  });

  // ─── Deep Merge ───
  describe('deep merge', () => {
    it('appends unique values to arrays', () => {
      const fs = new FactStoreManager({ aggravatingFactors: ['sitting'] });
      fs.update({ aggravatingFactors: ['bending', 'sitting'] });
      expect(fs.get('aggravatingFactors')).toEqual(['sitting', 'bending']);
    });

    it('recursively merges objects', () => {
      const fs = new FactStoreManager();
      fs.update({ functionalImpact: { sleep: 2 } } as any);
      fs.update({ functionalImpact: { work: 1 } } as any);
      expect(fs.get('functionalImpact.sleep')).toBe(2);
      expect(fs.get('functionalImpact.work')).toBe(1);
    });

    it('overwrites primitive values', () => {
      const fs = new FactStoreManager({ severity: 3 });
      fs.update({ severity: 7 });
      expect(fs.get('severity')).toBe(7);
    });

    it('skips null incoming values', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      fs.update({ bodyRegion: null } as any);
      expect(fs.get('bodyRegion')).toBe('lumbar_spine');
    });

    it('skips undefined incoming values', () => {
      const fs = new FactStoreManager({ severity: 5 });
      fs.update({ severity: undefined } as any);
      expect(fs.get('severity')).toBe(5);
    });
  });

  // ─── Dot Notation ───
  describe('dot notation get/set', () => {
    it('gets nested values', () => {
      const fs = new FactStoreManager();
      fs.update({ functionalImpact: { adl: 2 } } as any);
      expect(fs.get('functionalImpact.adl')).toBe(2);
    });

    it('sets nested values', () => {
      const fs = new FactStoreManager();
      fs.set('functionalImpact.sleep', 3);
      expect(fs.get('functionalImpact.sleep')).toBe(3);
    });

    it('creates intermediate objects when setting', () => {
      const fs = new FactStoreManager();
      fs.set('imaging.finding', 'disc_bulge');
      expect(fs.get('imaging.finding')).toBe('disc_bulge');
    });

    it('returns undefined for nonexistent paths', () => {
      const fs = new FactStoreManager();
      expect(fs.get('nonexistent.deep.path')).toBeUndefined();
    });
  });

  // ─── Missing Critical Fields ───
  describe('missing critical fields', () => {
    it('reports all missing fields for empty store', () => {
      const fs = new FactStoreManager();
      const missing = fs.getMissingCriticalFields();
      expect(missing).toContain('bodyRegion or conditionMentioned');
      expect(missing).toContain('severity');
      expect(missing).toContain('at least one red flag screened');
      expect(missing).toContain('at least one aggravating factor');
    });

    it('bodyRegion satisfies first requirement', () => {
      const fs = new FactStoreManager({ bodyRegion: 'lumbar_spine' });
      const missing = fs.getMissingCriticalFields();
      expect(missing).not.toContain('bodyRegion or conditionMentioned');
    });

    it('conditionMentioned also satisfies first requirement', () => {
      const fs = new FactStoreManager({ conditionMentioned: 'sciatica' });
      const missing = fs.getMissingCriticalFields();
      expect(missing).not.toContain('bodyRegion or conditionMentioned');
    });
  });

  // ─── CDE Readiness ───
  describe('CDE readiness', () => {
    it('returns false when missing fields', () => {
      const fs = new FactStoreManager();
      expect(fs.isCDEReady()).toBe(false);
    });

    it('returns true when all critical fields populated', () => {
      const fs = new FactStoreManager({
        bodyRegion: 'lumbar_spine',
        severity: 5,
        duration: 'acute_0_6_weeks',
        aggravatingFactors: ['sitting'],
        redFlags: { caudaEquina: false },
      });
      expect(fs.isCDEReady()).toBe(true);
    });
  });

  // ─── Serialization ───
  describe('serialization', () => {
    it('roundtrip serialization preserves data', () => {
      const fs = new FactStoreManager({
        bodyRegion: 'lumbar_spine',
        severity: 7,
        aggravatingFactors: ['sitting', 'bending'],
      });
      const json = fs.toJSON();
      const restored = FactStoreManager.fromJSON(json);
      expect(restored.get('bodyRegion')).toBe('lumbar_spine');
      expect(restored.get('severity')).toBe(7);
      expect(restored.get('aggravatingFactors')).toEqual(['sitting', 'bending']);
    });

    it('toJSON returns a plain object', () => {
      const fs = new FactStoreManager({ severity: 5 });
      const json = fs.toJSON();
      expect(typeof json).toBe('object');
      expect(json.severity).toBe(5);
    });
  });

  // ─── Red Flag Status ───
  describe('red flag status', () => {
    it('reports no flags when none screened', () => {
      const fs = new FactStoreManager();
      const status = fs.getRedFlagStatus();
      expect(status.anyPositive).toBe(false);
      expect(status.positiveFlags).toEqual([]);
    });

    it('reports positive flags', () => {
      const fs = new FactStoreManager({
        redFlags: { caudaEquina: true, cancer: false },
      });
      const status = fs.getRedFlagStatus();
      expect(status.anyPositive).toBe(true);
      expect(status.positiveFlags).toContain('caudaEquina');
      expect(status.positiveFlags).not.toContain('cancer');
    });

    it('reports negative when all flags false', () => {
      const fs = new FactStoreManager({
        redFlags: { caudaEquina: false, cancer: false },
      });
      expect(fs.getRedFlagStatus().anyPositive).toBe(false);
    });
  });

  // ─── Update History ───
  describe('update history', () => {
    it('tracks updates', () => {
      const fs = new FactStoreManager();
      fs.update({ severity: 5 });
      const history = fs.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history.some((h) => h.field === 'severity')).toBe(true);
    });

    it('tracks set operations', () => {
      const fs = new FactStoreManager();
      fs.set('bodyRegion', 'lumbar_spine');
      const history = fs.getHistory();
      expect(history.some((h) => h.field === 'bodyRegion')).toBe(true);
    });
  });
});
