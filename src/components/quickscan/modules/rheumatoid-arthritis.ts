/**
 * Kriya QuickScan — Rheumatoid Arthritis Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_rheumatoid_arthritis_prd_v1.docx
 * Validation: ACR/EULAR 2010, NICE NG100, DAS28, HAQ-DI, RAPID3, FACIT-Fatigue.
 * Tiers: LOW 0-9, MOD 10-22, HIGH 23+ or hard flag.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q11_OPT_D = 'More than 60 minutes — stiff for an hour or longer most mornings';
const Q11_OPT_E = 'More than 2 hours — severely stiff for much of the morning';
const Q22_NODULES =
  'Firm, painless lumps under the skin near bony prominences (rheumatoid nodules)';
const Q22_CONFIRMED = 'I have been formally diagnosed with Rheumatoid Arthritis';

const rheumatoidArthritis: QSModule = {
  id: 'rheumatoid-arthritis',
  kind: 'condition',
  displayName: 'Rheumatoid Arthritis',
  shortDescription: 'Inflammatory joint disease — symmetric small-joint pattern.',
  estimatedMinutes: 3,
  accent: '#ef4444',
  instruments: ['ACR/EULAR 2010', 'NICE NG100', 'DAS28', 'HAQ-DI', 'RAPID3', 'FACIT-Fatigue'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. RA diagnosis requires clinical examination and blood tests. Please see a rheumatologist if your pattern is suggestive.',
  intro: [
    'QuickScan — Rheumatoid Arthritis. RA is treatable — early diagnosis and treatment dramatically alter long-term outcomes (the "window of opportunity").',
    "We'll start with two safety screens, then ask about your stiffness pattern, joint distribution, blood-test history if any, and how it's affecting daily life.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Before we begin, are you currently experiencing any of the following?',
      source: 'NICE NG100 RA emergency recognition',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        {
          label:
            'A single joint (knee, wrist, ankle, elbow) severely swollen, hot, red in the last 24–48 hours — with or without fever',
          points: 0,
        },
        {
          label:
            'On immunosuppressants (methotrexate, biologics, steroids) AND have fever, chills or signs of infection',
          points: 0,
        },
        { label: 'Sudden severe eye pain, redness, or visual disturbance in the past 48 hours', points: 0 },
        {
          label: 'Chest pain or sudden shortness of breath in the past 24–48 hours (not exertion-related)',
          points: 0,
        },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you experiencing any of the following alongside your joint symptoms?',
      source: 'NICE NG100 systemic red flags',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Unexplained weight loss > 5 kg in the past 3 months', points: 0 },
        { label: 'Known history of cancer', points: 0 },
        { label: 'Persistent fever > 38°C for more than a week without obvious cause', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt:
        'When you wake up in the morning, how long does joint stiffness typically last before you feel able to move freely?',
      source: 'ACR/EULAR 2010 duration; DAS28; OA vs RA discriminator',
      options: [
        { label: 'No significant morning stiffness', points: 0 },
        { label: 'Less than 30 minutes — I loosen up quickly', points: 1 },
        { label: '30–60 minutes — significant but resolves within the hour', points: 2 },
        { label: Q11_OPT_D, points: 4 },
        { label: Q11_OPT_E, points: 5 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Which best describes the joints currently involved?',
      source: 'ACR/EULAR 2010 domain 1 (joint involvement)',
      options: [
        { label: 'A single large joint (one knee, hip, shoulder)', points: 0 },
        { label: '2–10 large joints (knees, hips, shoulders, elbows)', points: 1 },
        { label: '1–3 small joints (one or two knuckles, wrist) — possibly asymmetric', points: 2 },
        {
          label:
            'Multiple small joints SYMMETRICALLY — same joints both sides (both wrists, both knuckles)',
          points: 3,
        },
        {
          label:
            'Many joints (>10) including small joints — symmetric or near-symmetric pattern',
          points: 5,
        },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'How would you describe the joint symptoms? (Up to 2)',
      source: 'Clinical synovitis adapted; DAS28 swollen + tender items',
      options: [
        { label: 'Swelling — joints look puffy or enlarged, not just painful', points: 2 },
        { label: 'Warmth — joints feel warm to touch compared to surrounding skin', points: 2 },
        { label: 'Tenderness — painful when pressed', points: 1 },
        { label: 'Clearly worse in the morning, improves as the day goes on', points: 2 },
        { label: 'Fluctuates — better some days, worse others', points: 1 },
      ],
    },
    {
      id: 'Q1.4',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Have you had any of these blood tests, with the noted result?',
      source: 'ACR/EULAR 2010 domain 2 (serology)',
      options: [
        { label: 'Rheumatoid Factor (RF) — POSITIVE / HIGH', points: 3 },
        { label: 'Anti-CCP antibody — POSITIVE', points: 3 },
        { label: 'RF or Anti-CCP — LOW POSITIVE / BORDERLINE', points: 1 },
        { label: 'ESR or CRP elevated on a blood test', points: 1 },
        { label: 'Tested — all results normal / I have not been tested / I do not know', points: 0 },
      ],
    },
    {
      id: 'Q1.5',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you been experiencing these joint symptoms?',
      source: 'ACR/EULAR 2010 domain 4 (duration); Window of Opportunity',
      options: [
        { label: 'Less than 6 weeks — very recent onset', points: 0 },
        { label: '6–12 weeks — sub-acute', points: 1 },
        { label: 'More than 12 weeks — established', points: 1 },
        { label: 'More than 6 months — long-standing', points: 2 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Have you experienced any of the following alongside joint symptoms?',
      source: 'FACIT-Fatigue; RAPID3 global; NICE NG100',
      options: [
        { label: 'Significant fatigue — exhaustion disproportionate to activity', points: 2 },
        { label: 'Low-grade fever or feeling feverish — not a cold or infection', points: 1 },
        { label: 'Unintentional weight loss of 2–5 kg', points: 1 },
        { label: 'General feeling of being unwell (malaise) hard to attribute', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Do any of the following apply?',
      source: 'ACR/EULAR extra-articular; NICE NG100; family-history literature',
      options: [
        { label: Q22_NODULES, points: 1 },
        { label: 'Dry eyes or dry mouth — or investigated for Sjögren\'s', points: 1 },
        { label: 'Eye inflammation (uveitis or scleritis) at any point', points: 1 },
        { label: 'A doctor has previously suspected or mentioned RA as a possibility', points: 1 },
        { label: Q22_CONFIRMED, points: 2 },
        { label: 'A close family member has been diagnosed with RA', points: 1 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'matrix-scored',
      prompt: 'In the past week, how much difficulty have you had with the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'HAQ-DI domains; RAPID3 physical function',
      subItems: [
        { id: 'A', label: 'Dressing yourself, including buttoning shirts' },
        { id: 'B', label: 'Gripping objects, opening jars, or writing' },
        { id: 'C', label: 'Walking and climbing stairs' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Overall, how much does your joint condition affect your wellbeing?',
      source: 'RAPID3 global assessment; HAQ-DI wellbeing',
      options: [
        { label: 'Minimally — I manage well most of the time', points: 0 },
        { label: 'Moderately — affects some areas of life but I cope', points: 1 },
        { label: 'Substantially — limits independence, work, or relationships', points: 2 },
        { label: 'Severely — dominates my daily life and significantly impacts my mood', points: 3 },
      ],
    },
  ],
  tiers: { lowMax: 9, moderateMax: 22 },
  hardFlags: [
    {
      id: 'prolonged-stiffness-symmetric',
      description: 'Q1.1 prolonged stiffness + Q1.2 symmetric small joints → high',
      matches: (a) => {
        const v = asString(a['Q1.1']);
        const j = asString(a['Q1.2']);
        return (
          (v === Q11_OPT_D || v === Q11_OPT_E) &&
          (j ===
            'Multiple small joints SYMMETRICALLY — same joints both sides (both wrists, both knuckles)' ||
            j === 'Many joints (>10) including small joints — symmetric or near-symmetric pattern')
        );
      },
    },
    {
      id: 'seropositive-symmetric',
      description: 'Q1.4 seropositive + Q1.2 symmetric small joints → high',
      matches: (a) => {
        const sero = asArray(a['Q1.4']);
        const seroPos =
          sero.includes('Rheumatoid Factor (RF) — POSITIVE / HIGH') ||
          sero.includes('Anti-CCP antibody — POSITIVE');
        const j = asString(a['Q1.2']);
        return (
          seroPos &&
          (j ===
            'Multiple small joints SYMMETRICALLY — same joints both sides (both wrists, both knuckles)' ||
            j === 'Many joints (>10) including small joints — symmetric or near-symmetric pattern')
        );
      },
    },
    {
      id: 'rheumatoid-nodules',
      description: 'Q2.2 — rheumatoid nodules → high (pathognomonic)',
      matches: (a) => asArray(a['Q2.2']).includes(Q22_NODULES),
    },
    {
      id: 'confirmed-ra',
      description: 'Q2.2 — confirmed RA → moderate floor (monitoring framing)',
      matches: (a) => asArray(a['Q2.2']).includes(Q22_CONFIRMED),
    },
  ],
  conditionTags: [
    {
      tag: 'Window of Opportunity',
      matches: (a) => {
        const dur = asString(a['Q1.5']);
        return dur === '6–12 weeks — sub-acute' || dur === 'More than 12 weeks — established';
      },
    },
    {
      tag: 'Symmetric small-joint',
      matches: (a) => {
        const j = asString(a['Q1.2']);
        return (
          j ===
            'Multiple small joints SYMMETRICALLY — same joints both sides (both wrists, both knuckles)' ||
          j === 'Many joints (>10) including small joints — symmetric or near-symmetric pattern'
        );
      },
    },
    {
      tag: 'Seropositive',
      matches: (a) => {
        const s = asArray(a['Q1.4']);
        return (
          s.includes('Rheumatoid Factor (RF) — POSITIVE / HIGH') ||
          s.includes('Anti-CCP antibody — POSITIVE')
        );
      },
    },
    {
      tag: 'RA fatigue',
      matches: (a) =>
        asArray(a['Q2.1']).includes(
          'Significant fatigue — exhaustion disproportionate to activity',
        ),
    },
    {
      tag: 'Confirmed RA — monitoring',
      matches: (a) => asArray(a['Q2.2']).includes(Q22_CONFIRMED),
    },
  ],
  routing: {
    low: {
      interpretation:
        'Few or weak inflammatory signals. Pattern not strongly consistent with RA. May represent early OA, post-viral arthralgia, or non-specific joint pain.',
      primaryCTA: { label: 'See your GP if symptoms persist', destination: 'specialist' },
      secondaryCTA: { label: 'Read: "RA vs OA — how to tell the difference"', destination: 'myo-ai' },
      tip: 'Re-scan in 4–6 weeks if symptoms persist or change. Track morning stiffness duration — that is the highest-yield single signal.',
    },
    moderate: {
      interpretation:
        'Meaningful inflammatory pattern. Pattern partially consistent with RA or early inflammatory arthritis — rheumatology evaluation is recommended.',
      primaryCTA: { label: 'GP referral for inflammatory arthritis workup', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care — gentle joint programme', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Bring a list of your symptoms (especially morning stiffness duration and joint distribution) to the consultation — those are the rheumatologist\'s primary signals.',
    },
    high: {
      interpretation:
        'Strong inflammatory pattern — symmetrical small-joint involvement, prolonged stiffness, possible seropositivity. Pattern highly consistent with RA.',
      primaryCTA: { label: 'Urgent rheumatology referral', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care — gentle joint programme', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'The first 12 weeks of RA-like symptoms is the "window of opportunity" — early DMARD treatment can dramatically alter the long-term joint trajectory.',
    },
  },
};

export default rheumatoidArthritis;
