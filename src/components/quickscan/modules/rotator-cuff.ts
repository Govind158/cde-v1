/**
 * Kriya QuickScan — Rotator Cuff Injury Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_rotator_cuff_injury_prd_v1.docx
 * Validation: NICE CKS rotator cuff disorder, WORC, Constant-Murley,
 *             ASES, SPADI, OSS, DASH, Neer / Hawkins-Kennedy adaptation.
 * Tiers: LOW 0-10, MOD 11-22, HIGH 23+ or hard flag.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q21_D = 'Significant weakness — I struggle to raise my arm to shoulder height; it tends to drop';
const Q21_E = 'Unable to raise arm — cannot lift my arm without the other arm helping or extreme pain';
const Q11_POSTINJURY =
  'After a specific shoulder injury (fall, collision, traction) — more than 10 days ago';

const rotatorCuff: QSModule = {
  id: 'rotator-cuff',
  kind: 'condition',
  displayName: 'Rotator Cuff Injury',
  shortDescription: 'Shoulder cuff tendinopathy / tear / impingement.',
  estimatedMinutes: 3,
  accent: '#0ea5e9',
  instruments: ['NICE CKS', 'WORC', 'Constant-Murley', 'ASES', 'SPADI', 'Oxford Shoulder Score', 'DASH'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Many rotator cuff conditions respond well to conservative management. Please consult a qualified clinician for assessment.',
  intro: [
    'QuickScan — Rotator Cuff. This 2-3 minute scan locates you on the rotator-cuff spectrum (mild tendinopathy → full-thickness tear).',
    "We'll start with two safety screens, then ask about how it began, your imaging if any, weakness severity, and how it's affecting daily activity.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Before we begin, are you currently experiencing any of the following?',
      source: 'NICE CKS rotator cuff acute presentation; acute tear surgical timing literature',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'Severely swollen, hot, red shoulder with fever — not exercise / injury related':
          'emergency',
      },
      options: [
        {
          label:
            'Sudden injury within the last 10 days (fall, impact, pulling force) AND I now have significant difficulty raising the arm',
          points: 0,
        },
        {
          label: 'Severely swollen, hot, red shoulder with fever — not exercise / injury related',
          points: 0,
        },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you experiencing any of the following alongside your shoulder symptoms?',
      source: 'NICE shoulder red flags; NG59 progressive deficit',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Unexplained weight loss > 5 kg in past 3 months or known cancer history', points: 0 },
        {
          label: 'Progressive arm weakness rapidly worsening over 48–72 hours — not from a specific injury',
          points: 0,
        },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How did your shoulder problem begin?',
      source: 'WORC onset; ASES onset items',
      options: [
        { label: 'Gradually over weeks/months — overhead activity, sport, or age-related', points: 1 },
        { label: Q11_POSTINJURY, points: 2 },
        { label: 'I am not sure when it started — insidious over a long period', points: 2 },
        { label: 'After a period of significantly increased overhead activity / training load', points: 1 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'What is your imaging history? (Select all)',
      source: 'NICE rotator cuff imaging criteria',
      options: [
        { label: 'MRI showing rotator cuff tear (partial or full thickness)', points: 3 },
        { label: 'Ultrasound showing rotator cuff tear or significant tendinopathy', points: 2 },
        { label: 'X-ray showing subacromial narrowing, bony spurs, or acromial change', points: 1 },
        { label: 'Imaging showed only tendinopathy or minor changes — no tear confirmed', points: 1 },
        { label: 'Doctor told me I have a rotator cuff injury but no imaging', points: 1 },
        { label: 'No imaging done', points: 0 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you had this shoulder problem?',
      source: 'WORC duration',
      options: [
        { label: 'Less than 6 weeks — recent onset', points: 1 },
        { label: '6–12 weeks — sub-acute', points: 2 },
        { label: '3–12 months — established', points: 3 },
        { label: 'More than 12 months — chronic', points: 4 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'single-scored',
      prompt: 'How would you describe your shoulder strength compared to the other side?',
      helper: 'This is the highest-weighted question in this scan — be honest.',
      source: 'Constant-Murley strength self-report; Drop Arm test adaptation',
      options: [
        { label: 'No weakness — feels as strong as the other side, even if painful', points: 0 },
        { label: 'Mild weakness — slightly weaker but I can still raise the arm fully', points: 2 },
        { label: 'Moderate weakness — difficulty lifting above shoulder height', points: 4 },
        { label: Q21_D, points: 6 },
        { label: Q21_E, points: 7 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt:
        'When you lift your arm out to the side and raise it overhead, when does the pain occur?',
      source: 'Neer / Hawkins-Kennedy conceptual adaptation; Shoulder QuickScan painful arc alignment',
      options: [
        { label: 'No significant pain through the movement', points: 0 },
        {
          label:
            'Pain in the middle range (shoulder height to overhead) but not at the start or end — classic painful arc',
          points: 3,
        },
        { label: 'Pain throughout the entire movement from the start', points: 2 },
        { label: 'I cannot lift my arm beyond shoulder height — pain or weakness stops me', points: 3 },
        { label: 'Pain mainly at the very end when fully raised overhead', points: 1 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Have you experienced any of the following?',
      source: 'WORC P3/P4; OSS Q11; SPADI P2',
      options: [
        { label: 'Night pain — wakes you, especially when lying on the affected shoulder', points: 2 },
        { label: 'Clicking, catching, or grinding when moving the shoulder', points: 1 },
        {
          label: 'Weakness specifically when reaching forward or rotating outward (turning a key, reaching seatbelt)',
          points: 2,
        },
        { label: 'Pain when reaching behind your back (fastening clothes)', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'matrix-scored',
      prompt: 'How much has your shoulder affected the following in the past 2 weeks?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'DASH; OSS; SPADI disability sub-scale',
      subItems: [
        { id: 'A', label: 'Lifting / reaching above shoulder height' },
        { id: 'B', label: 'Carrying objects on the affected side' },
        { id: 'C', label: 'Sleeping on the affected shoulder' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'What best describes your shoulder activity demands?',
      source: 'Activity / load context',
      options: [
        { label: 'Low overhead use — mostly desk or low-level arm activity', points: 0 },
        { label: 'Moderate overhead use — occasional reaching or sport once a week', points: 1 },
        {
          label: 'High overhead use — overhead sport 3+ times/week (badminton, cricket, swimming)',
          points: 2,
        },
        { label: 'Heavy occupational overhead — sustained overhead work most days', points: 2 },
      ],
    },
  ],
  tiers: { lowMax: 10, moderateMax: 22 },
  hardFlags: [
    {
      id: 'severe-weakness',
      description: 'Q2.1 — significant weakness (arm drops) → high',
      matches: (a) => asString(a['Q2.1']) === Q21_D,
    },
    {
      id: 'unable-to-raise',
      description: 'Q2.1 — unable to raise arm → high',
      matches: (a) => asString(a['Q2.1']) === Q21_E,
    },
    {
      id: 'chronic-with-weakness',
      description: 'Q1.3 chronic + Q2.1 moderate-significant weakness → moderate floor',
      matches: (a) => {
        const dur = asString(a['Q1.3']) === 'More than 12 months — chronic';
        const w = asString(a['Q2.1']);
        return (
          dur && (w === 'Moderate weakness — difficulty lifting above shoulder height' || w === Q21_D)
        );
      },
    },
    {
      id: 'tear-with-weakness',
      description: 'Q1.2 confirmed tear + Q2.1 D or E → high',
      matches: (a) =>
        (asArray(a['Q1.2']).includes('MRI showing rotator cuff tear (partial or full thickness)') ||
          asArray(a['Q1.2']).includes(
            'Ultrasound showing rotator cuff tear or significant tendinopathy',
          )) &&
        (asString(a['Q2.1']) === Q21_D || asString(a['Q2.1']) === Q21_E),
    },
  ],
  conditionTags: [
    {
      tag: 'Tear confirmed',
      matches: (a) =>
        asArray(a['Q1.2']).includes('MRI showing rotator cuff tear (partial or full thickness)'),
    },
    {
      tag: 'Painful-arc impingement',
      matches: (a) =>
        asString(a['Q2.2']) ===
        'Pain in the middle range (shoulder height to overhead) but not at the start or end — classic painful arc',
    },
    {
      tag: 'Night pain',
      matches: (a) =>
        asArray(a['Q2.3']).includes(
          'Night pain — wakes you, especially when lying on the affected shoulder',
        ),
    },
    {
      tag: 'External-rotation weakness',
      matches: (a) =>
        asArray(a['Q2.3']).includes(
          'Weakness specifically when reaching forward or rotating outward (turning a key, reaching seatbelt)',
        ),
    },
    {
      tag: 'Post-injury / sub-acute',
      matches: (a) => asString(a['Q1.1']) === Q11_POSTINJURY,
    },
    {
      tag: 'Overhead-load risk',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'High overhead use — overhead sport 3+ times/week (badminton, cricket, swimming)',
    },
  ],
  routing: {
    low: {
      interpretation:
        'Mild rotator-cuff signal. No major weakness, no functional cliff. Most cuff tendinopathy responds excellently to load management and targeted strengthening.',
      primaryCTA: { label: 'Begin rotator-cuff strengthening', destination: 'kriya-care' },
      secondaryCTA: { label: 'Read: "Overhead load and the cuff"', destination: 'myo-ai' },
      tip: 'Modify, do not stop. Reduce overhead volume by 30-50% for 2-3 weeks while you build cuff and scapular strength.',
    },
    moderate: {
      interpretation:
        'Established rotator-cuff pathology — painful arc, moderate weakness, possibly partial tear. A structured physiotherapy programme is required.',
      primaryCTA: { label: 'Begin Kriya Care — Cuff Rehab Programme', destination: 'kriya-care' },
      secondaryCTA: { label: 'Ask Myo AI about the cuff', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Conservative management is first-line in most partial tears and impingement. Surgery is the exception, not the default.',
    },
    high: {
      interpretation:
        'Significant cuff structural compromise — marked weakness or inability to raise the arm. Orthopaedic specialist assessment is recommended.',
      primaryCTA: { label: 'See an orthopaedic specialist', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Surgery vs conservative management is a shared decision with the specialist — not a predetermined outcome.',
    },
  },
};

export default rotatorCuff;
