/**
 * Kriya QuickScan — Neck Pain Module
 *
 * PRD source: docs/Kriya Scan/QuickScan by Location/kriya_quickscan_neck_pain_prd_v1.docx
 * Validation: NDI, NPQ, CNFDS, STarT MSK (Neck), NICE NG59/CKS, Quebec Task Force,
 *             Spurling Test conceptual framework.
 *
 * Tier thresholds (PRD §5.2):
 *   LOW       0 – 9
 *   MODERATE  10 – 18
 *   HIGH      19+ OR any hard flag
 *
 * Hard flags (PRD §5.2 *):
 *   (a) Q1.2a Option C — hand/finger symptoms → HIGH
 *   (b) Q2.2 Option D — severe sleep disruption → HIGH
 *   (c) Q3.2 Option D — pain affects mood/daily life → HIGH
 *   (d) Q3.3 — any 2+ prior cervical conditions → HIGH
 *   (e) Q1.1 Option D + Q1.2 Option D — chronic + arm radiation → HIGH
 *
 * Notes:
 *   - Layer 0 is a TWO-question multi-halt battery. Q0.1 is the
 *     neurological / vascular (VBI) emergency screen. Q0.2 is the systemic
 *     / trauma screen. Either question's positive response halts the scan
 *     via the standard evaluateHalt pipeline.
 *   - Q2.1 sub-item B carries `cannotDoSideEffect: 'driving-safety'` — when
 *     a user rates this 'Cannot do at all' the engine emits the driving-safety
 *     callout per PRD §6.4.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q11_OPTIONS = {
  acute: 'Less than 2 weeks — this is a new episode',
  subAcute: '2–6 weeks (sub-acute episode)',
  persistent: '6 weeks to 3 months',
  chronic: 'More than 3 months (persistent or recurring)',
} as const;

const Q12_OPTIONS = {
  stiffness:
    'Stiffness or tightness in the neck, mostly when sitting or looking at a screen',
  aching: 'Aching or throbbing pain in the neck and upper shoulders',
  headache: 'Pain that spreads into the back of the head or causes headaches',
  armRadiation:
    'Pain, tingling, or numbness that travels into one or both arms or hands',
  sharpTurn: 'Sharp pain when turning the head to one side',
} as const;

const Q12A_OPTIONS = {
  shoulderOnly: 'Only into the shoulder or upper arm',
  toElbow: 'Down to the elbow or forearm',
  toHand:
    'Into the hand or fingers — including pins and needles or numbness in specific fingers',
} as const;

const neckModule: QSModule = {
  id: 'neck',
  kind: 'location',
  displayName: 'Neck Pain',
  deepScanRegion: 'Neck',
  shortDescription:
    'Cervical and tech-neck signals — mapped to NDI / NPQ / Quebec Task Force / NICE NG59.',
  estimatedMinutes: 3,
  accent: '#14b8a6',
  instruments: [
    'Neck Disability Index (NDI)',
    'Northwick Park Neck Pain Questionnaire (NPQ)',
    'Copenhagen Neck Functional Disability Scale (CNFDS)',
    'STarT MSK Tool (Neck adaptation)',
    'NICE Neck Pain Guidelines (NG59 / CKS)',
    'Quebec Task Force Classification',
    'Spurling Test conceptual framework',
  ],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. The risk signals generated are based on your responses and are intended to guide general awareness only. Please consult a qualified healthcare professional for clinical assessment, diagnosis, or treatment. If you are experiencing sudden severe neck pain, loss of arm or hand function, dizziness, difficulty swallowing, or visual disturbances alongside your neck pain, please seek emergency medical care immediately.',
  intro: [
    'QuickScan — Neck. This is a 2–3 minute risk-signal scan, not a diagnosis.',
    "We'll start with two safety screens, then short questions about how, where and when your neck hurts.",
  ],
  questions: [
    // ── LAYER 0 — RED FLAG SCREENS ───────────────────────────────
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'In relation to your neck pain or stiffness, are you currently experiencing any of the following?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE CKS Neck Pain Red Flags; VBI clinical screening criteria',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        { label: 'Weakness in one or both arms, or loss of hand grip strength', points: 0 },
        { label: 'Difficulty walking, loss of balance, or feeling unsteady on your feet', points: 0 },
        { label: 'Dizziness, blurred vision, or blackouts when you turn or move your neck', points: 0 },
        { label: 'Difficulty swallowing, speaking, or breathing alongside your neck pain', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Have you experienced any of the following alongside your neck pain?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE NG59 red flags; SAH Ottawa Rule adaptation; cervical trauma criteria',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'Severe headache that came on suddenly — described as the worst of your life': 'emergency',
        'Neck stiffness with fever, severe headache, and sensitivity to light': 'emergency',
        'Neck pain following a fall, road accident, or significant head impact': 'emergency',
      },
      options: [
        { label: 'Severe headache that came on suddenly — described as the worst of your life', points: 0 },
        { label: 'Neck stiffness with fever, severe headache, and sensitivity to light', points: 0 },
        { label: 'Neck pain following a fall, road accident, or significant head impact', points: 0 },
        { label: 'Unexplained weight loss of more than 5 kg in the past 3 months', points: 0 },
        { label: 'History of cancer', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 1 — SYMPTOM PROFILE ────────────────────────────────
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you been experiencing neck pain or stiffness?',
      source: 'NDI duration classification; Quebec Task Force chronicity criteria',
      options: [
        { label: Q11_OPTIONS.acute, points: 1 },
        { label: Q11_OPTIONS.subAcute, points: 2 },
        { label: Q11_OPTIONS.persistent, points: 3 },
        { label: Q11_OPTIONS.chronic, points: 4 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'How would you describe your neck pain or discomfort? (Select up to 2)',
      source: 'NDI pain intensity; Spurling test conceptual adaptation; NPQ radiation items',
      options: [
        { label: Q12_OPTIONS.stiffness, points: 1 },
        { label: Q12_OPTIONS.aching, points: 2 },
        { label: Q12_OPTIONS.headache, points: 2 },
        { label: Q12_OPTIONS.armRadiation, points: 3 },
        { label: Q12_OPTIONS.sharpTurn, points: 3 },
      ],
    },
    {
      id: 'Q1.2a',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Where does the tingling, numbness, or pain travel to?',
      source: 'NDI arm symptom item; cervical dermatomal mapping adapted for self-report',
      // Triggered only if Q1.2 contained the arm-radiation option.
      showWhen: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.armRadiation),
      options: [
        { label: Q12A_OPTIONS.shoulderOnly, points: 1 },
        { label: Q12A_OPTIONS.toElbow, points: 2 },
        { label: Q12A_OPTIONS.toHand, points: 3 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Do you experience headaches in association with your neck pain?',
      source: 'NPQ headache item; CNFDS adaptation; IHS cervicogenic headache criteria (self-report adaptation)',
      options: [
        { label: 'No — I do not get headaches related to my neck', points: 0 },
        { label: 'Occasionally — mild headaches that seem to start from the neck or base of skull', points: 1 },
        { label: 'Frequently — headaches that come on when my neck pain worsens', points: 2 },
        { label: 'Almost always — my neck pain and headaches occur together regularly', points: 2 },
      ],
    },

    // ── LAYER 2 — FUNCTIONAL IMPACT ──────────────────────────────
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'matrix-scored',
      prompt:
        'In the past 2 weeks, how much has your neck pain affected your ability to do the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'NDI Sections 1, 4, 5, 6, 9; CNFDS items 3, 5, 7',
      subItems: [
        { id: 'A', label: 'Looking down at a phone or book for more than 15 minutes' },
        {
          id: 'B',
          label: 'Turning your head fully to check traffic while driving or crossing the road',
          cannotDoSideEffect: 'driving-safety',
        },
        { id: 'C', label: 'Sitting at a desk or computer for more than 45 minutes' },
        { id: 'D', label: 'Concentrating on work or reading due to neck pain or headache' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt:
        'Does your neck pain disturb your sleep or make it difficult to find a comfortable position to rest?',
      source: 'NDI sleeping section; NPQ rest pain item',
      options: [
        { label: 'No — my sleep is unaffected by neck pain', points: 0 },
        { label: 'Occasionally — I sometimes wake up with a stiff neck but can get back to sleep', points: 1 },
        { label: 'Regularly — I wake up due to neck pain and struggle to get comfortable', points: 2 },
        { label: 'Severely — I cannot find a position to sleep comfortably and wake multiple times', points: 3 },
      ],
    },

    // ── LAYER 3 — RISK MODIFIERS ─────────────────────────────────
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of the following best describes your daily screen and posture habits?',
      source: 'NDI work-related items; Nordic MSQ occupational exposure; tech neck posture research adaptation',
      options: [
        {
          label:
            'Mostly active — limited screen time, regular breaks, varied postures throughout the day',
          points: 0,
        },
        {
          label:
            'Moderate screen use — desk work with some movement breaks (every 1–2 hours)',
          points: 1,
        },
        {
          label:
            'High screen exposure — sitting at screen 6+ hours daily with infrequent breaks',
          points: 2,
        },
        {
          label:
            'Predominantly mobile screen use — extended phone use with head frequently tilted downward',
          points: 2,
        },
        {
          label:
            'Frequent long-distance travel — regular driving or flying 4+ hours at a time',
          points: 1,
        },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt:
        'Thinking about your neck pain, which of these statements feels closest to how you feel?',
      helper: 'Honest self-reflection helps the scan tune to your situation.',
      source: 'STarT MSK Tool psychosocial items; NDI concentration and work sections',
      // PRD: shown if Q1.1 = Option C or D (persistent/chronic) OR total score ≥ 8.
      // Engine has no running total at predicate time; gate on chronicity per PRD primary trigger.
      showWhen: (a) => {
        const v = asString(a['Q1.1']);
        return v === Q11_OPTIONS.persistent || v === Q11_OPTIONS.chronic;
      },
      options: [
        { label: 'I am confident it will improve with some care and attention', points: 0 },
        { label: 'I am not sure — it seems to keep coming back and I am not sure why', points: 1 },
        { label: 'I tend to avoid certain movements because I worry they will make it worse', points: 2 },
        {
          label:
            'My neck pain regularly affects my mood, concentration, or ability to engage with daily life',
          points: 3,
        },
      ],
    },
    {
      id: 'Q3.3',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Have you previously been diagnosed with or treated for any of the following?',
      helper: 'Select all that apply.',
      source: 'Clinical history intake; NDI prior treatment items; Quebec Task Force prior episode criteria',
      options: [
        { label: 'Cervical disc bulge, herniation, or degeneration', points: 1 },
        { label: 'Cervical spondylosis or cervical osteoarthritis', points: 1 },
        { label: 'Whiplash injury or cervical strain from an accident', points: 1 },
        { label: 'Nerve compression or cervical radiculopathy', points: 1 },
        { label: 'Neck surgery or cervical procedure', points: 1 },
        { label: 'None of the above / Not sure', points: 0 },
      ],
    },
  ],

  tiers: { lowMax: 9, moderateMax: 18 },

  hardFlags: [
    {
      id: 'hand-finger-symptoms',
      description: 'Q1.2a Option C — hand/finger tingling or numbness (cervical radiculopathy signal)',
      matches: (a) => asString(a['Q1.2a']) === Q12A_OPTIONS.toHand,
    },
    {
      id: 'severe-sleep-disruption',
      description: 'Q2.2 Option D — cannot find a position to sleep comfortably',
      matches: (a) =>
        asString(a['Q2.2']) ===
        'Severely — I cannot find a position to sleep comfortably and wake multiple times',
    },
    {
      id: 'psychosocial-life-impact',
      description: 'Q3.2 Option D — neck pain significantly affects mood and daily life',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'My neck pain regularly affects my mood, concentration, or ability to engage with daily life',
    },
    {
      id: 'multi-prior-cervical',
      description: 'Q3.3 — two or more prior cervical conditions selected',
      matches: (a) => {
        const sel = asArray(a['Q3.3']).filter((s) => s !== 'None of the above / Not sure');
        return sel.length >= 2;
      },
    },
    {
      id: 'chronic-arm-radiation',
      description: 'Q1.1 chronic + Q1.2 arm radiation — chronic pain with arm radiation',
      matches: (a) =>
        asString(a['Q1.1']) === Q11_OPTIONS.chronic &&
        asArray(a['Q1.2']).includes(Q12_OPTIONS.armRadiation),
    },
  ],

  conditionTags: [
    {
      tag: 'Tech Neck',
      matches: (a) => {
        const v = asString(a['Q3.1']);
        return (
          v === 'High screen exposure — sitting at screen 6+ hours daily with infrequent breaks' ||
          v ===
            'Predominantly mobile screen use — extended phone use with head frequently tilted downward'
        );
      },
    },
    {
      tag: 'Cervicogenic Headache',
      matches: (a) => {
        const q12 = asArray(a['Q1.2']);
        const q13 = asString(a['Q1.3']);
        const headacheFlag =
          q13 === 'Frequently — headaches that come on when my neck pain worsens' ||
          q13 === 'Almost always — my neck pain and headaches occur together regularly';
        return q12.includes(Q12_OPTIONS.headache) && headacheFlag;
      },
    },
    {
      tag: 'Cervical Radiculopathy',
      matches: (a) =>
        asArray(a['Q1.2']).includes(Q12_OPTIONS.armRadiation) &&
        (asString(a['Q1.2a']) === Q12A_OPTIONS.toElbow ||
          asString(a['Q1.2a']) === Q12A_OPTIONS.toHand),
    },
    {
      tag: 'Cervical Disc Involvement',
      matches: (a) => asString(a['Q1.2a']) === Q12A_OPTIONS.toHand,
    },
    {
      tag: 'Psychosocial Risk',
      matches: (a) => {
        const v = asString(a['Q3.2']);
        return (
          v === 'I tend to avoid certain movements because I worry they will make it worse' ||
          v ===
            'My neck pain regularly affects my mood, concentration, or ability to engage with daily life'
        );
      },
    },
    {
      tag: 'Post-Whiplash',
      matches: (a) => asArray(a['Q3.3']).includes('Whiplash injury or cervical strain from an accident'),
    },
    {
      tag: 'Travel Posture Risk',
      matches: (a) =>
        asString(a['Q3.1']) ===
        'Frequent long-distance travel — regular driving or flying 4+ hours at a time',
    },
  ],

  routing: {
    low: {
      interpretation:
        'Mild or early-stage neck discomfort. Likely postural, screen-related, or acute muscle tension — no radiculopathy or neurological signals in your responses.',
      primaryCTA: { label: 'Explore Muscle Mood games', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'Check your Muscle Age', destination: 'kriya-play', subProgram: 'muscle-age' },
      tip: 'Try a 5-minute Tech Neck Reset every hour — gentle chin tucks, shoulder rolls and a deep look up at the ceiling reduces cumulative screen-posture load.',
    },
    moderate: {
      interpretation:
        'Sub-acute or recurrent neck pain with measurable functional impact. May include cervicogenic headache or early radiculopathy signals — structured intervention is indicated.',
      primaryCTA: { label: 'Start your Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Ask Myo AI about your risk signals', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a deeper look with DeepScan', destination: 'deepscan' },
      tip: 'Cervical Range of Motion exercises — gentle rotations and lateral flexion within pain-free range — are the highest-yield self-management habit at this stage.',
    },
    high: {
      interpretation:
        'Persistent, functionally limiting neck pain with neurological or significant psychosocial signal components. Professional clinical evaluation is warranted.',
      primaryCTA: { label: 'Begin a Kriya Care programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI for clarity now', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Arm or hand tingling, persistent night pain, and balance signals are best assessed in person. Please arrange an orthopaedic, neurologist, or physiotherapy review.',
    },
  },
};

export default neckModule;
