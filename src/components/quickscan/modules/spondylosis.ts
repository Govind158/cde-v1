/**
 * Kriya QuickScan — Spondylosis Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_spondylosis_prd_v1.docx
 * Validation: NICE NG59, Quebec Task Force, NDI/ODI, Lumbar Stenosis Score.
 * Tiers: LOW 0-10, MOD 11-22, HIGH 23+ or hard flag.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q24_MOTOR = 'Moderate to significant weakness — difficulty with specific movements';
const Q22_RADIC = 'Pain, tingling, or numbness reaching into the foot or fingers';

const spondylosis: QSModule = {
  id: 'spondylosis',
  kind: 'condition',
  displayName: 'Spondylosis',
  shortDescription: 'Cervical or lumbar age-related spinal degeneration.',
  estimatedMinutes: 3,
  accent: '#14b8a6',
  instruments: ['NICE NG59', 'Quebec Task Force', 'NDI', 'ODI', 'Neurogenic Claudication Score'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Spondylosis on imaging is common with age and is often not the source of symptoms. Please consult a qualified clinician for assessment.',
  intro: [
    'QuickScan — Spondylosis. Age-related spinal changes are extremely common and often incidental. This 2-3 minute scan separates an imaging finding from a clinically significant problem.',
    "We'll start with two safety screens, then ask about your symptoms and how they're affecting daily activity.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you currently experiencing any of the following?',
      source: 'NICE NG59 CES + cervical myelopathy',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        { label: 'Loss of control over bladder or bowels', points: 0 },
        { label: 'Difficulty walking — legs feel clumsy or unsteady', points: 0 },
        { label: 'Difficulty with fine hand movements (buttons, keys, small objects)', points: 0 },
        { label: 'Sudden severe weakness in arms or legs', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Have you experienced any of the following?',
      source: 'NICE NG59 systemic + AS differentiation',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Pain that wakes you in the second half of the night and improves with movement', points: 0 },
        { label: 'Morning back stiffness > 60 minutes most mornings (in someone under 45)', points: 0 },
        { label: 'Fever, night sweats, or unexplained weight loss > 5 kg', points: 0 },
        { label: 'Known history of cancer', points: 0 },
        { label: 'Pain following a fall, accident, or significant trauma', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Which region is affected?',
      source: 'Clinical region classification',
      options: [
        { label: 'Lower back (lumbar spondylosis)', points: 0 },
        { label: 'Neck (cervical spondylosis)', points: 0 },
        { label: 'Both — multi-level / multi-region', points: 2 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you had this condition?',
      source: 'NDI / ODI duration items',
      options: [
        { label: 'Less than 1 year', points: 1 },
        { label: '1–3 years', points: 2 },
        { label: '3–5 years', points: 3 },
        { label: 'More than 5 years', points: 4 },
        { label: 'More than 5 years AND severe ongoing symptoms', points: 5 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'What did your imaging show? (Select all that apply)',
      source: 'NASS imaging adaptation',
      options: [
        { label: 'Single-level disc-space narrowing or osteophyte', points: 1 },
        { label: 'Multi-level degenerative changes (2 or more levels)', points: 2 },
        { label: 'Foraminal narrowing or nerve-root encroachment', points: 2 },
        { label: 'Spinal canal narrowing / stenosis noted', points: 3 },
        { label: 'No imaging done', points: 0 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'single-scored',
      prompt: 'How would you describe your typical pain pattern?',
      source: 'Quebec Task Force; NDI/ODI pain items',
      options: [
        { label: 'Mild stiffness, mostly in the morning, eases with movement', points: 1 },
        { label: 'Aching pain that builds during the day with activity', points: 2 },
        { label: 'Pain present most of the day; varies in intensity', points: 3 },
        { label: 'Severe pain affecting most daily activities', points: 4 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Do symptoms travel into your limbs?',
      source: 'NICE NG59 radiculopathy criteria',
      options: [
        { label: 'No — pain stays in the back/neck', points: 0 },
        { label: 'Discomfort into the shoulder/buttock area only', points: 1 },
        { label: 'Pain or tingling above the elbow / above the knee', points: 2 },
        { label: Q22_RADIC, points: 3 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'single-scored',
      prompt: 'When walking, does leg pain or heaviness build up after a distance and ease when you sit or lean forward?',
      source: 'Neurogenic Claudication Score',
      options: [
        { label: 'No — walking does not trigger leg symptoms', points: 0 },
        { label: 'Occasionally on long walks', points: 1 },
        { label: 'Yes — clearly limits how far I can walk', points: 3 },
      ],
    },
    {
      id: 'Q2.4',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Any limb weakness — actual difficulty moving, not just pain?',
      source: 'NICE NG59 motor sign criteria',
      options: [
        { label: 'No weakness', points: 0 },
        { label: 'Mild weakness — slightly weaker but functional', points: 1 },
        { label: Q24_MOTOR, points: 4 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'matrix-scored',
      prompt: 'How much have your symptoms affected the following in the past 2 weeks?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'NDI / ODI functional items',
      subItems: [
        { id: 'A', label: 'Sitting / standing for typical durations' },
        { id: 'B', label: 'Walking for usual distances' },
        { id: 'C', label: 'Sleeping comfortably' },
      ],
      matrixSubScoreThreshold: { min: 6, bonusPoints: 2 },
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'How is the trend over the past few months?',
      source: 'NICE NG59 trajectory',
      options: [
        { label: 'Improving or stable', points: 0 },
        { label: 'Fluctuating — good days and bad days', points: 1 },
        { label: 'Slowly worsening', points: 2 },
        { label: 'Clearly worsening', points: 3 },
      ],
    },
  ],
  tiers: { lowMax: 10, moderateMax: 22 },
  hardFlags: [
    {
      id: 'motor-weakness',
      description: 'Q2.4 — moderate to significant motor weakness',
      matches: (a) => asString(a['Q2.4']) === Q24_MOTOR,
    },
    {
      id: 'stenosis-with-chronicity',
      description: 'Q2.3 neurogenic claudication + Q1.2 long duration',
      matches: (a) => {
        const claud = asString(a['Q2.3']) === 'Yes — clearly limits how far I can walk';
        const v = asString(a['Q1.2']);
        return claud && (v === 'More than 5 years' || v === 'More than 5 years AND severe ongoing symptoms');
      },
    },
    {
      id: 'multi-level-progressive',
      description: 'Both regions + multi-level imaging + clearly worsening',
      matches: (a) =>
        asString(a['Q1.1']) === 'Both — multi-level / multi-region' &&
        asArray(a['Q1.3']).includes('Multi-level degenerative changes (2 or more levels)') &&
        asString(a['Q3.2']) === 'Clearly worsening',
    },
    {
      id: 'radiculopathy-floor',
      description: 'Q2.2 — radiculopathy reaching foot/fingers → moderate floor',
      matches: (a) => asString(a['Q2.2']) === Q22_RADIC,
    },
  ],
  conditionTags: [
    {
      tag: 'Multi-level degeneration',
      matches: (a) =>
        asArray(a['Q1.3']).includes('Multi-level degenerative changes (2 or more levels)'),
    },
    {
      tag: 'Stenosis signal',
      matches: (a) => asString(a['Q2.3']) === 'Yes — clearly limits how far I can walk',
    },
    {
      tag: 'Foraminal radiculopathy',
      matches: (a) => asString(a['Q2.2']) === Q22_RADIC,
    },
    {
      tag: 'Progressive trend',
      matches: (a) => asString(a['Q3.2']) === 'Clearly worsening',
    },
  ],
  routing: {
    low: {
      interpretation:
        'Early or mild spondylosis with minimal current impact. Imaging changes are common with age and often incidental.',
      primaryCTA: { label: 'Start Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Read: "Exercise as Protection"', destination: 'myo-ai' },
      tip: 'Spinal mobility and core stability work is the highest-yield intervention. Avoid catastrophising imaging findings.',
    },
    moderate: {
      interpretation:
        'Established spondylosis with meaningful symptom burden. Structured exercise with clinical guidance is appropriate.',
      primaryCTA: { label: 'Begin Kriya Care — Spondylosis programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI about spondylosis', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Multi-level changes do not equal severe disease. Symptom-led management (not imaging-led) is the norm.',
    },
    high: {
      interpretation:
        'Significant spondylosis burden with neurological compromise or major functional limitation.',
      primaryCTA: { label: 'See a spine specialist', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Neurogenic claudication or progressive weakness warrants imaging review and specialist input.',
    },
  },
};

export default spondylosis;
