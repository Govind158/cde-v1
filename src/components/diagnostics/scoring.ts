/**
 * Kriya Pain Diagnostics — Scoring Engine
 * Ported from App.jsx (scoreAll + severity).
 * Pure functions — no side effects. Input: PatientData. Output: scored conditions + severity bucket.
 */

import { DB, FLAG_WEIGHT } from './conditions-db';
import type {
  ConditionsDB,
  PatientData,
  RegionKey,
  ScoredCondition,
  SeverityResult,
  SeverityBucket,
} from './types';

const lo = (s: string | undefined | null): string => (s ?? '').toLowerCase();

/**
 * Map a free-text body region to a DB key.
 * 12 pain-region chips collapse into 4 canonical condition buckets.
 */
export function mapRegion(region: string | undefined): RegionKey {
  const l = lo(region);
  if (l.includes('lower back') || l.includes('upper back') || l.includes('hip')) return 'back';
  if (l.includes('neck')) return 'neck';
  if (l.includes('shoulder') || l.includes('arm')) return 'shoulder';
  if (l.includes('knee') || l.includes('leg') || l.includes('thigh') || l.includes('ankle')) return 'knee';
  return 'back';
}

/**
 * Score every condition in the region against the patient data,
 * then sort by score descending (flag weight breaks ties).
 */
export function scoreAll(region: RegionKey, d: PatientData): ScoredCondition[] {
  const db: ConditionsDB = DB;
  return (db[region] ?? [])
    .map((c) => {
      let s = 0;

      // Feeling (constant / intermittent) — +2
      const feeling = lo(d.L030601).includes('constant')
        ? 'constant'
        : lo(d.L030601).includes('intermittent')
        ? 'intermittent'
        : '';
      if (feeling && c.feel.includes(feeling)) s += 2;

      // Aggravating activity — +1.5 per fuzzy match (capped at 8 pre-cap)
      const uAgg = lo(d.L190201);
      (c.agg ?? []).forEach((a) => {
        const aLo = lo(a);
        if (uAgg && (uAgg.includes(aLo) || aLo.includes(uAgg.split(' ')[0] ?? ''))) s += 1.5;
      });
      s = Math.min(s, 8);

      // Relieving activity — +1.5 per fuzzy match
      const uRel = lo(d.L210101);
      (c.rel ?? []).forEach((r) => {
        const rLo = lo(r);
        if (uRel && (uRel.includes(rLo) || rLo.includes(uRel.split(' ')[0] ?? ''))) s += 1.5;
      });

      // Duration — +2
      const durMap: Record<string, 'acute' | 'chronic'> = {
        'Since last 7 days': 'acute',
        'Since last 3 months': 'chronic',
        'For more than 3 months': 'chronic',
      };
      const durKey = d.L150101 ? durMap[d.L150101] : undefined;
      // Conditions marked dur:'either' match both acute and chronic windows.
      // Without this, disc bulge / herniation and other multi-window
      // conditions silently fail the duration check (Finding #4).
      if (durKey && (c.dur.includes(durKey) || c.dur.includes('either'))) s += 2;

      // Status / trend
      // "worsening" exact match → +2.
      // "progressive" / "worse" synonym → +1 (partial credit) so the
      // Worsening bonus is not a de-facto red-flag-only bonus (see
      // Finding #3 in the clinical audit).
      if (d.L030901 === 'Worsening') {
        if (c.status.includes('worsening')) s += 2;
        else if (c.status.includes('progressive') || c.status.includes('worse')) s += 1;
      }
      if (d.L030901 === 'Much better than before' && c.status.includes('improving')) s += 1.5;
      if (d.L030901 === 'Same as before' && c.status.includes('same')) s += 1;

      // Neuro — +3 affected match, +1 wnl match
      const sym = d.L030801 ?? [];
      const hasNeuro = sym.some(
        (x) => x.includes('Tingling') || x.includes('Weakness') || x.includes('balance'),
      );
      if (hasNeuro && c.neuro === 'affected') s += 3;
      if (!hasNeuro && c.neuro === 'wnl') s += 1;

      // Features — fuzzy match across several multi-select fields.
      //
      // Only forward match: the user's text must CONTAIN the condition's
      // feature phrase. The previous reverse check `fLo.includes(uf.substring(0, 6))`
      // caused a clinically unsafe false positive: any user selecting any
      // "History of X" medical condition produced the 6-char prefix "histor",
      // which is a substring of "history of cancer" (a feature on Cancer /
      // Malignancy and Shoulder Fracture) — effectively flagging cancer for
      // anyone with a neurological-condition or TB history.
      const allFeats = [
        ...(d.L031001 ?? []),
        ...(d.L170101 ?? []),
        ...(d.L170201 ?? []),
        ...(d.L030801 ?? []),
      ].map(lo);
      let featMatchCount = 0;
      (c.feat ?? []).forEach((f) => {
        const fLo = lo(f);
        if (allFeats.some((uf) => uf.includes(fLo))) {
          s += 1.5;
          featMatchCount += 1;
        }
      });

      // Age
      const age = parseInt(d.L010301 ?? '', 10) || 0;
      if (c.age?.includes('>55') && age > 55) s += 1.5;
      if (c.age?.includes('>50') && age > 50) s += 1.5;
      if (c.age?.includes('>60') && age > 60) s += 1.5;
      if (c.age?.includes('<30') && age < 30) s += 1.5;
      if (c.age?.includes('<18') && age < 18) s += 1.5;
      if (c.age?.includes('20-25') && age >= 18 && age <= 30) s += 1;
      if (c.age?.includes('30-45') && age >= 30 && age <= 45) s += 1;
      if (c.age?.includes('13-25') && age >= 13 && age <= 25) s += 1;

      // Gender
      if (c.gender !== 'both' && d.L010401) {
        if (c.gender === 'F>M' && d.L010401 === 'Female') s += 1;
        if (c.gender === 'M>F' && d.L010401 === 'Male') s += 1;
        if (c.gender === 'female' && d.L010401 === 'Female') s += 2;
      }

      // BMI
      const bmi = d.bmi ?? 0;
      if (bmi >= 30) s += 0.5;
      if (bmi >= 35 && c.flag !== 'green') s += 1;

      // Severe pain + red flag
      if ((d.L030501 ?? 5) >= 8 && c.flag === 'red') s += 2;

      // Relapse + chronic
      if (d.L150102 === 'Yes' && c.dur.includes('chronic')) s += 1;

      // Red-flag gating — clinical safety guard.
      //
      // A red-flag diagnosis (Cancer/Malignancy, Cauda Equina, Fracture,
      // Infection) must NEVER surface on non-specific signals alone
      // (constant pain + worsening trend + chronic duration + severe scale
      // + neuro symptoms can otherwise reach 11+ points on every red flag
      // regardless of the user's actual condition history).
      //
      // If the user has matched ZERO specific features of a red-flag
      // condition (no "history of cancer", no "night pain", no
      // "unexplained weight loss", no "post-traumatic", no "urine control
      // loss", etc.), we cap its score so it cannot outrank legitimate
      // green/yellow conditions driven by specific matches. A red flag
      // that DOES have ≥1 specific feature match is left unchanged and
      // will still surface (and still wins the FLAG_WEIGHT tie-break).
      if (c.flag === 'red' && featMatchCount === 0) {
        s = Math.min(s, 2.5);
      }

      return {
        name: c.name,
        score: Math.round(s * 10) / 10,
        flag: c.flag,
      };
    })
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : (FLAG_WEIGHT[b.flag] ?? 0) - (FLAG_WEIGHT[a.flag] ?? 0),
    );
}

/**
 * Compute severity bucket from pain scale, description, and neuro/bowel flags.
 * Returns total points + bucket label.
 */
export function severity(d: PatientData): SeverityResult {
  let t = 0;

  const ps = d.L030501 ?? 5;
  t += ps <= 3 ? 1 : ps <= 6 ? 2 : ps <= 8 ? 3 : 4;

  const desc = d.L030401 ?? '';
  if (desc.includes('Crippling')) t += 5;
  else if (desc.includes('Severe')) t += 3;
  else if (desc.includes('Moderate')) t += 2;
  else if (desc.includes('comes and goes')) t += 1.5;
  else t += 1;

  const sym = d.L030801 ?? [];
  if (sym.some((x) => x.includes('Tingling'))) t += 2;
  if (sym.some((x) => x.includes('Weakness'))) t += 3;
  if (sym.some((x) => x.includes('bowel'))) t += 4;

  let bucket: SeverityBucket;
  if (t <= 3) bucket = 'Mild';
  else if (t <= 6) bucket = 'Moderate';
  else if (t <= 9) bucket = 'Severe';
  else bucket = 'Emergency';

  return { total: t, bucket };
}

export function severityColor(b: SeverityBucket): string {
  return b === 'Emergency' ? '#ef4444' : b === 'Severe' ? '#f97316' : b === 'Moderate' ? '#f59e0b' : '#22c55e';
}

export function flagColor(f: 'red' | 'yellow' | 'green'): string {
  return f === 'red' ? '#ef4444' : f === 'yellow' ? '#f59e0b' : '#22c55e';
}

export function flagLabel(f: 'red' | 'yellow' | 'green'): string {
  return f === 'red' ? 'Red Flag' : f === 'yellow' ? 'Yellow Flag' : 'Green Flag';
}
