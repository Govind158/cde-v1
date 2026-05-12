/**
 * Kriya CDE — Curated Population-Context Stats (peer-reviewed sources only).
 *
 * Maps condition names (matching conditions-db.ts entries) to a small list of
 * stat candidates. Each stat declares a demographic filter; pickStatFor()
 * picks the first stat whose filter matches the user's age/gender.
 *
 * INVIOLABLE RULES (matches the user's "no hallucination" directive):
 *   1. Every stat must cite a peer-reviewed source with a working URL.
 *   2. A condition with no entry here simply shows nothing — never a
 *      fabricated number.
 *   3. Indian-cohort stats are preferred; global / non-Indian stats are
 *      labelled "(Global study)" inside the user-facing text.
 *   4. Rare or emergency conditions (Cancer, Cauda Equina, Vascular,
 *      Cardiac Referred Pain, Fracture, Stress Fracture, Cervical Myelopathy,
 *      Glenohumeral Instability, etc.) intentionally have NO entry — a
 *      population percentage either trivialises the urgency or alarms
 *      without adding usable context.
 *
 * Source approval log: every entry below was approved by Govind on
 * 2026-05-12 after batch-1 research presented in the WebSearch findings.
 */

import type { PatientData } from './types';

export interface ConditionStat {
  /** User-facing one-sentence stat (softer-tone, no clinical jargon). */
  text: string;
  /** Source citation in the form "Author / Study title, Journal, Year". */
  source: string;
  /** Working URL to the abstract / PMC / publisher page. */
  url: string;
  /** Demographic filter — all populated keys must match for this stat to apply. */
  filter: {
    /** Minimum age inclusive (years). */
    ageMin?: number;
    /** Maximum age inclusive (years). */
    ageMax?: number;
    /** Required gender from PatientData.L010401. */
    gender?: 'Male' | 'Female';
  };
}

/** Lookup keyed by the EXACT `name` strings from conditions-db.ts. */
export const CONDITION_STATS: Record<string, ConditionStat[]> = {
  // ── Back ────────────────────────────────────────────────────────────
  'Disc Bulge': [
    {
      text:
        "You're not alone — MRI studies of Indian adults show disc bulges in about 1 in 3 people, often without any pain at all. With the right care, most respond well to non-surgical management.",
      source:
        'Multicenter Hospital Based Study on Prevalence of Lumbar Intervertebral Disc Herniation in Asymptomatic Individuals on MRI, IJPRT, 2024',
      url: 'https://www.ijprt.org/index.php/pub/article/view/312',
      filter: {},
    },
  ],
  'Disc Bulge or Herniation': [
    {
      text:
        "You're not alone — MRI studies of Indian adults show disc bulges in about 1 in 3 people, often without any pain at all. With the right care, most respond well to non-surgical management.",
      source:
        'Multicenter Hospital Based Study on Prevalence of Lumbar Intervertebral Disc Herniation in Asymptomatic Individuals on MRI, IJPRT, 2024',
      url: 'https://www.ijprt.org/index.php/pub/article/view/312',
      filter: {},
    },
  ],
  'Osteoarthritis': [
    {
      text:
        'Nearly 45% of Indian women over 65 manage knee osteoarthritis symptoms — staying active and strengthening the muscles around the knee is what consistently protects mobility.',
      source: 'Pal CP et al., Epidemiology of knee osteoarthritis in India, Indian J Orthop, 2016',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5017174/',
      filter: { ageMin: 65, gender: 'Female' },
    },
    {
      text:
        'Around 1 in 4 Indian adults (28.7%) live with knee osteoarthritis — slightly more women than men. Movement and strength work consistently keep mobility high.',
      source: 'Pal CP et al., Epidemiology of knee osteoarthritis in India, Indian J Orthop, 2016',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5017174/',
      filter: {},
    },
  ],
  'Radiculopathy (Sciatica) / Herniation': [
    {
      text:
        "Sciatica-type nerve pain affects about 12% of Indian adults — and is nearly twice as common in women (14.6%) as men (7.3%). Most people improve within weeks of starting the right exercises.",
      source:
        'Sharma R et al., Clinical patterns and prevalence among adults with back pain — Gadchiroli, India, J Global Health, 2021',
      url: 'https://jogh.org/2021/jogh-11-12004',
      filter: {},
    },
  ],
  'Postural Syndrome': [
    {
      text:
        'Non-specific back and neck pain accounts for about 90% of all such cases — in rural Indian women the lifetime rate reaches 80%. Most people recover within weeks with movement-based care.',
      source:
        'Kowsalya R et al., Epidemiology of pain in back and extremities in rural population, Gadchiroli, India, J Pain Res, 2021',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8647780/',
      filter: {},
    },
  ],
  'Muscle Dysfunction or Soft Tissue': [
    {
      text:
        'Non-specific back and neck pain accounts for about 90% of all such cases — in rural Indian women the lifetime rate reaches 80%. Most people recover within weeks with movement-based care.',
      source:
        'Kowsalya R et al., Epidemiology of pain in back and extremities in rural population, Gadchiroli, India, J Pain Res, 2021',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8647780/',
      filter: {},
    },
  ],
  'Spondylosis or Degenerative Disc': [
    {
      text:
        'Spine wear is part of ageing — X-rays show changes in about 50% of adults over 40 and up to 85% over 60. Most never develop symptoms severe enough to need surgery. (Global radiographic review)',
      source: 'Cervical Spondylosis, StatPearls, NCBI Bookshelf, 2024',
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK551557/',
      filter: {},
    },
  ],
  'Osteoporosis': [
    {
      text:
        'About 1 in 9 Indian women over 40 has osteoporosis, compared with 1 in 24 men. Strength training and adequate calcium / Vitamin D measurably slow bone loss.',
      source:
        'Aggarwal V et al., Prevalence of Osteoporosis in Apparently Healthy Adults > 40 in Pune City, Indian J Endocrinol Metab, 2018',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5838914/',
      filter: { ageMin: 40 },
    },
  ],
  'Ankylosing Spondylitis': [
    {
      text:
        'Ankylosing spondylitis affects roughly 0.03% of Indian adults — it most often appears between ages 20 and 40 and is around 5 times more common in men. Early diagnosis and movement therapy keep most people active.',
      source: 'Malaviya AN, Indian Rheumatology Association consensus, Indian J Rheumatol, 2020',
      url: 'https://www.indianjrheumatol.com/article.asp?issn=0973-3698;year=2020;volume=15;issue=5;spage=2;epage=5;aulast=Malaviya',
      filter: {},
    },
  ],
  'Post Pregnancy Low Back Pain': [
    {
      text:
        'Roughly 1 in 4 postpartum women experience SI-joint and lower back pain — and about 1 in 10 still have it 1 to 2 years after delivery. Targeted pelvic-floor and core conditioning measurably reduces both rate and duration.',
      source:
        'Aldabe D et al., Sacroiliac Joint and Pelvic Dysfunction in Postpartum Women, PMC, 2021',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8580107/',
      filter: { gender: 'Female' },
    },
  ],
  'SI Joint': [
    {
      text:
        'Roughly 1 in 4 postpartum women experience SI-joint pain — and about 1 in 10 still have it 1 to 2 years after delivery. Targeted pelvic-floor and core conditioning measurably reduces both rate and duration.',
      source:
        'Aldabe D et al., Sacroiliac Joint and Pelvic Dysfunction in Postpartum Women, PMC, 2021',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8580107/',
      filter: { gender: 'Female' },
    },
  ],
  'Piriformis Syndrome': [
    {
      text:
        "Piriformis syndrome accounts for up to 6% of lower back and sciatica cases seen in general practice — and is more common in women. Targeted stretching and gluteal strengthening resolve most cases. (Global review)",
      source: 'Hopayian K et al., Piriformis syndrome: a systematic review, BMC Surgery, 2025',
      url: 'https://bmcsurg.biomedcentral.com/counter/pdf/10.1186/s12893-025-03202-2.pdf',
      filter: {},
    },
  ],
  'Stenosis': [
    {
      text:
        'Spinal stenosis affects around 11% of adults overall and becomes much more common after 50. Many manage symptoms well with targeted exercise and movement therapy. (Global systematic review)',
      source:
        'Jensen RK et al., Prevalence of lumbar spinal stenosis: a systematic review and meta-analysis, Eur Spine J, 2020',
      url: 'https://link.springer.com/article/10.1007/s00586-020-06339-1',
      filter: {},
    },
  ],

  // ── Neck (shared keys with back where conditions overlap) ───────────
  'Rotator Cuff Injuries': [
    {
      text:
        "After age 50, about 1 in 5 Indian adults has some degree of rotator cuff wear — and roughly two-thirds of those tears don't cause any pain. Most respond to non-surgical care.",
      source:
        'Asymptomatic Rotator Cuff Tears Among the Indian Population, PMC, 2024',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12151958/',
      filter: { ageMin: 50 },
    },
  ],
  'Muscle Strains/ Imbalance/ Tight Tissues': [
    {
      text:
        'Non-specific back and neck pain accounts for about 90% of all such cases — in rural Indian women the lifetime rate reaches 80%. Most people recover within weeks with movement-based care.',
      source:
        'Kowsalya R et al., Epidemiology of pain in back and extremities in rural population, Gadchiroli, India, J Pain Res, 2021',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8647780/',
      filter: {},
    },
  ],
  'Radiculopathy': [
    {
      text:
        "Sciatica-type nerve pain affects about 12% of Indian adults — and is nearly twice as common in women (14.6%) as men (7.3%). Most people improve within weeks of starting the right exercises.",
      source:
        'Sharma R et al., Clinical patterns and prevalence among adults with back pain — Gadchiroli, India, J Global Health, 2021',
      url: 'https://jogh.org/2021/jogh-11-12004',
      filter: {},
    },
  ],

  // ── Shoulder ────────────────────────────────────────────────────────
  'Rotator Cuff': [
    {
      text:
        "After age 50, about 1 in 5 Indian adults has some degree of rotator cuff wear — and roughly two-thirds of those tears don't cause any pain. Most respond to non-surgical care.",
      source:
        'Asymptomatic Rotator Cuff Tears Among the Indian Population, PMC, 2024',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12151958/',
      filter: { ageMin: 50 },
    },
  ],
  'Adhesive Capsulitis': [
    {
      text:
        "Frozen shoulder affects about 3% of adults, peaks between 40 and 70, and is more common in women. It does resolve with time and physiotherapy — usually within 1 to 3 years. (Global review)",
      source: 'Adhesive Capsulitis: A Review, American Family Physician, 2011',
      url: 'https://www.aafp.org/pubs/afp/issues/2011/0215/p417.html',
      filter: { ageMin: 40, ageMax: 70 },
    },
    {
      text:
        "Frozen shoulder affects about 3% of adults and is more common in women. It does resolve with time and physiotherapy — usually within 1 to 3 years. (Global review)",
      source: 'Adhesive Capsulitis: A Review, American Family Physician, 2011',
      url: 'https://www.aafp.org/pubs/afp/issues/2011/0215/p417.html',
      filter: {},
    },
  ],

  // ── Knee ────────────────────────────────────────────────────────────
  'Patellar Tendinopathy or Quadriceps': [
    {
      text:
        "'Jumper's knee' affects 6-25% of recreational athletes depending on the sport — most common in men and adolescents/young adults. The vast majority recover with proper load management. (Global systematic review)",
      source:
        'Sprague AL et al., Patellar tendinopathy: an overview of prevalence, risk factors, screening, diagnosis, treatment and prevention, Arch Orthop Trauma Surg, 2023',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10541843/',
      filter: {},
    },
  ],
};

/**
 * Parse a PatientData age string (e.g. '34', '34 years') into a number, or
 * null if it cannot be parsed. The questionnaire stores age as a string for
 * historic reasons (free-form input). v4.1+ also stores an L010301_band row
 * letter, but raw `L010301` is the authoritative numeric value.
 */
function parseAgeNumber(ageStr: string | undefined): number | null {
  if (!ageStr) return null;
  const n = parseFloat(ageStr);
  if (Number.isFinite(n) && n > 0 && n < 130) return n;
  return null;
}

/**
 * Pick the best stat for the user's demographic, or null if none fits.
 * Strategy: walk the candidate list in order, return the FIRST stat whose
 * declared filter is fully satisfied. Authors of CONDITION_STATS must put
 * the most specific (age + gender) entries first, then progressively
 * broader fallbacks. An empty filter `{}` always matches.
 */
export function pickStatFor(
  conditionName: string,
  user: { age?: string; gender?: string } | undefined,
): ConditionStat | null {
  const candidates = CONDITION_STATS[conditionName];
  if (!candidates || candidates.length === 0) return null;
  const age = parseAgeNumber(user?.age);
  const gender = user?.gender;
  for (const c of candidates) {
    const f = c.filter;
    if (f.ageMin !== undefined && (age === null || age < f.ageMin)) continue;
    if (f.ageMax !== undefined && (age === null || age > f.ageMax)) continue;
    if (f.gender !== undefined && gender !== f.gender) continue;
    return c;
  }
  return null;
}

/**
 * Convenience wrapper for the result card — given the result.user envelope
 * (which is shaped { age?: string; gender?: string; bmi?: number }), pick
 * the relevant stat for each top-3 condition name. Returns parallel array
 * indexed identically to top_3 (null where no stat applies).
 */
export function statsForTop3(
  top3Names: string[],
  user: { age?: string; gender?: string } | undefined,
): (ConditionStat | null)[] {
  return top3Names.map((name) => pickStatFor(name, user));
}

/**
 * Re-export type so consumers (tests, future clinician views) don't need
 * to dig into PatientData for the demographic shape.
 */
export type StatUser = Pick<PatientData, 'L010301' | 'L010401'>;
