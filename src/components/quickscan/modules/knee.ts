/**
 * Kriya QuickScan — Knee Pain Module
 *
 * PRD source: docs/Kriya Scan/QuickScan by Location/kriya_quickscan_knee_pain_prd_v1.docx
 * Validation: KOOS, WOMAC, IKDC, Lysholm, Oxford Knee Score, NICE NG226,
 * Ottawa Knee Rules, Gabbett training-load model.
 *
 * Tier thresholds (PRD §5.2):
 *   LOW       0 – 10
 *   MODERATE  11 – 19
 *   HIGH      20+ OR any hard flag
 *
 * Hard flags (PRD §5.2 *):
 *   (a) Q1.4 — knee locking → HIGH
 *   (b) Q1.4 giving-way + Q1.2a medial instability → HIGH
 *   (c) Q3.4 prior ACL/PCL + Q1.4 giving-way → HIGH
 *   (d) Q1.4 locking/giving-way + Q1.1 6+ month chronic → HIGH
 *   (e) Q2.1 'Cannot do' on stairs OR rising → MODERATE floor
 *
 * Notes vs Low Back:
 *   - Q0.1 has acute-injury 72-hr fast-track (sub-checklist) — encoded as a
 *     SECOND multi-halt question Q0.1a, shown only when Q0.1 = "within 72 hours".
 *   - Q1.1 sets ACTIVITY vs DEGENERATIVE stream — used by showWhen for Q3.1/Q3.2
 *     and condition tags.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

// Stream classifier helpers — keep symmetric with PRD Stream Classifier rule.
const Q11_OPTIONS = {
  gradual:
    'Came on gradually over weeks to months — no single injury event',
  postActivity:
    'Started after a specific activity (running, sport, squatting) and has persisted for 2–8 weeks',
  recurring3m: 'Came on gradually but has been present and recurring for more than 3 months',
  progressive6m:
    'Has been present for more than 6 months and is progressively worsening',
} as const;

const Q12_OPTIONS = {
  patellofemoral:
    'Around or behind the kneecap — especially when going downstairs or sitting for long periods',
  medial:
    'On the inner (medial) side of the knee — aching or tenderness along the inner joint line',
  lateral:
    'On the outer (lateral) side of the knee — especially during or after running',
  intraArticular:
    'Deep within the joint — a dull, widespread ache that is hard to pinpoint',
  patellarTendon:
    "Below the kneecap — at the bony bump below the knee, worse after activity",
} as const;

function isActivityStream(a: Record<string, unknown>): boolean {
  return asString(a['Q1.1']) === Q11_OPTIONS.postActivity;
}
function isDegenerativeStream(a: Record<string, unknown>): boolean {
  const v = asString(a['Q1.1']);
  return v === Q11_OPTIONS.gradual || v === Q11_OPTIONS.progressive6m;
}

const kneeModule: QSModule = {
  id: 'knee',
  kind: 'location',
  displayName: 'Knee Pain',
  deepScanRegion: 'Knee or Ankle',
  shortDescription:
    'Activity-related vs degenerative knee patterns — mapped to KOOS / WOMAC / IKDC / NICE NG226.',
  estimatedMinutes: 3,
  accent: '#0ea5e9',
  instruments: [
    'Knee injury and Osteoarthritis Outcome Score (KOOS)',
    'WOMAC',
    'IKDC',
    'Lysholm Scale',
    'Oxford Knee Score',
    'NICE NG226 (OA Guidelines)',
    'Ottawa Knee Rules',
  ],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. The risk signals generated are based on your responses and are intended to guide general awareness only. Please consult a qualified healthcare professional for clinical assessment, diagnosis, or treatment. If your knee pain was caused by a recent injury and you are unable to bear weight, have significant swelling, or feel the knee is unstable, please seek emergency or urgent medical care before proceeding.',
  intro: [
    "QuickScan — Knee. This is a 2–3 minute risk-signal scan, not a diagnosis.",
    "We'll begin by checking for any signs that need urgent care, then ask short questions about how, where and when your knee hurts.",
  ],
  questions: [
    // ── LAYER 0 ──────────────────────────────────────────────────
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'single-scored',
      prompt: 'How and when did your knee pain start?',
      source: 'Ottawa Knee Rules conceptual framework; Lysholm acute presentation',
      options: [
        { label: 'Yes — it started within the last 72 hours after an injury', points: 0 },
        { label: 'Yes — it started after an injury more than 72 hours ago', points: 0 },
        { label: 'No — there was no specific injury event; it came on gradually', points: 0 },
      ],
    },
    {
      id: 'Q0.1a',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'Since the injury, are any of these true right now?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'Ottawa Knee Rules acute injury fast-track checklist',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      showWhen: (a) =>
        asString(a['Q0.1']) === 'Yes — it started within the last 72 hours after an injury',
      options: [
        { label: 'I am unable to put any weight on the leg', points: 0 },
        { label: 'The knee is very swollen compared to normal', points: 0 },
        { label: 'The knee feels locked or stuck — I cannot straighten it fully', points: 0 },
        { label: 'The knee looks visibly deformed or out of shape', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Have you experienced any of the following alongside your knee pain?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'NICE NG226 red flags; DVT clinical decision rules; septic arthritis criteria',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'Fever, significant knee warmth, and redness that is not related to an injury':
          'emergency',
        'Significant swelling in the calf or lower leg (not the knee itself), with redness or warmth':
          'emergency',
      },
      options: [
        {
          label:
            'Fever, significant knee warmth, and redness that is not related to an injury',
          points: 0,
        },
        {
          label:
            'Significant swelling in the calf or lower leg (not the knee itself), with redness or warmth',
          points: 0,
        },
        { label: 'Knee pain in a child or teenager (under 18)', points: 0 },
        { label: 'Known history of cancer', points: 0 },
        { label: 'Unexplained weight loss of more than 5 kg in the past 3 months', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 1 ──────────────────────────────────────────────────
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'When did the pain begin and how has it progressed?',
      source: 'KOOS pain sub-scale P1; WOMAC stiffness; IKDC symptom grading',
      options: [
        { label: Q11_OPTIONS.gradual, points: 1 },
        { label: Q11_OPTIONS.postActivity, points: 2 },
        { label: Q11_OPTIONS.recurring3m, points: 2 },
        { label: Q11_OPTIONS.progressive6m, points: 3 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'Where in or around the knee do you feel the pain? (Select up to 2)',
      source: 'KOOS pain sub-scale P2–P5; Lysholm; IKDC symptom Q',
      options: [
        { label: Q12_OPTIONS.patellofemoral, points: 1 },
        { label: Q12_OPTIONS.medial, points: 2 },
        { label: Q12_OPTIONS.lateral, points: 2 },
        { label: Q12_OPTIONS.intraArticular, points: 2 },
        { label: Q12_OPTIONS.patellarTendon, points: 3 },
      ],
    },
    {
      id: 'Q1.2a',
      layer: 1,
      kind: 'single-scored',
      prompt: 'When does the medial (inner-knee) pain typically come on?',
      source: 'Lysholm instability; IKDC symptoms Q2; clinical MCL / meniscal adaptation',
      // Per PRD: triggered by medial selection AND ACTIVITY_STREAM flag.
      showWhen: (a) =>
        asArray(a['Q1.2']).includes(Q12_OPTIONS.medial) && isActivityStream(a),
      options: [
        { label: 'When changing direction, cutting, or pivoting', points: 1 },
        { label: 'After long runs or sustained activity', points: 1 },
        {
          label:
            "With a sensation that the knee 'gives way' or feels unstable when you change direction",
          points: 2,
        },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Have you noticed swelling in the affected knee?',
      source: 'KOOS symptom S3; Lysholm swelling; Oxford Knee Score item 8',
      options: [
        { label: 'No — I have not noticed any swelling', points: 0 },
        { label: 'Mild swelling occasionally, mostly after activity or by end of day', points: 1 },
        { label: 'Moderate swelling that comes and goes — lasts a day or two then subsides', points: 2 },
        { label: 'Frequent or persistent swelling — knee feels puffy or swollen most of the time', points: 3 },
      ],
    },
    {
      id: 'Q1.4',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'Have you experienced any of the following knee sensations? (Select up to 2)',
      source: 'Lysholm locking & instability; KOOS S1/S2; Oxford Knee Score item 5',
      options: [
        { label: "The knee suddenly 'locks' or gets stuck — you cannot straighten it fully", points: 2 },
        { label: "The knee 'gives way' or buckles unexpectedly — feels like it might collapse", points: 2 },
        { label: 'A clicking, grinding, or crunching sensation when you move the knee', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 2 ──────────────────────────────────────────────────
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'matrix-scored',
      prompt:
        'In the past 2 weeks, how much has your knee pain affected your ability to do the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'KOOS ADL A1/A2/A5; WOMAC physical function; Oxford Knee Score 1, 3, 4, 6',
      subItems: [
        { id: 'A', label: 'Going up or down stairs' },
        {
          id: 'B',
          label:
            'Rising from a low chair or sitting on the floor (squatting for prayer or domestic tasks)',
        },
        { id: 'C', label: 'Walking more than 20 minutes continuously on flat ground' },
        {
          id: 'D',
          label:
            'Bending the knee fully — for example, to sit cross-legged or get into a vehicle',
        },
      ],
      matrixSubScoreThreshold: { min: 8, bonusPoints: 2 },
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'How has your knee pain affected your physical activity and recreation in the past month?',
      source: 'KOOS sport/recreation SP1–SP5; IKDC function Q11; Lysholm running',
      options: [
        { label: 'No impact — I can do all activities I want to without limitation', points: 0 },
        { label: 'Minor limitation — I have modified some activities but can do most things', points: 1 },
        { label: 'Significant limitation — I have stopped one or more activities I used to do regularly', points: 2 },
        { label: 'Major limitation — my knee prevents me from doing most physical activity', points: 3 },
      ],
    },

    // ── LAYER 3 ──────────────────────────────────────────────────
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of these best describes your physical load and weight context?',
      helper: "Weight and joint load are key drivers of degenerative knee patterns.",
      source: 'NICE NG226 OA risk factors; ACR OA criteria; KOOS QOL2',
      // PRD: shown to DEGENERATIVE_STREAM users (we don't have onboarding age yet).
      showWhen: (a) => isDegenerativeStream(a),
      options: [
        {
          label:
            'I maintain a healthy weight and am regularly active (moderate exercise 3+ times/week)',
          points: 0,
        },
        {
          label:
            'I am moderately active but have gained weight in recent years and exercise less than before',
          points: 1,
        },
        {
          label:
            'I am largely sedentary and am aware I am carrying more weight than is ideal for my joints',
          points: 2,
        },
        {
          label:
            'I do heavy manual work or am on my feet for most of the day (standing, lifting, climbing)',
          points: 1,
        },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'How would you describe your training load and sport context?',
      helper: 'Recent changes in load are the strongest activity-related driver.',
      source: 'IKDC return to sport; Gabbett training-load model',
      // PRD: shown to ACTIVITY_STREAM users.
      showWhen: (a) => isActivityStream(a),
      options: [
        { label: 'I have been consistent in my activity with good recovery time between sessions', points: 0 },
        { label: 'I recently increased my training volume or intensity — more distance, frequency, or load', points: 1 },
        { label: 'I play or train on hard surfaces (concrete, astroturf) frequently', points: 2 },
        { label: 'I have had a recent change in footwear or training environment', points: 1 },
        { label: 'I returned to sport or intense activity after a rest period of more than 4 weeks', points: 1 },
      ],
    },
    {
      id: 'Q3.3',
      layer: 3,
      kind: 'single-scored',
      prompt:
        'Thinking about your knee pain, which of these statements feels closest to how you feel?',
      source: 'KOOS QOL1–QOL4; STarT MSK fear-avoidance adaptation',
      // Shown if Q1.1 is recurring/progressive (chronic stream).
      showWhen: (a) => {
        const v = asString(a['Q1.1']);
        return v === Q11_OPTIONS.recurring3m || v === Q11_OPTIONS.progressive6m;
      },
      options: [
        { label: 'I am confident it will improve with the right approach', points: 0 },
        { label: 'I am uncertain — it keeps recurring and I am not sure what triggers it', points: 1 },
        { label: 'I tend to avoid activities I used to enjoy because I worry about making it worse', points: 2 },
        { label: 'My knee pain significantly affects my mood, independence, or confidence in daily activities', points: 3 },
      ],
    },
    {
      id: 'Q3.4',
      layer: 3,
      kind: 'multi-scored',
      prompt:
        'Have you previously been diagnosed with or treated for any of the following?',
      helper: 'Select all that apply.',
      source: 'Clinical history intake; IKDC prior surgery item',
      // Shown if Q0.1 indicates prior injury (>72 hours after injury).
      showWhen: (a) =>
        asString(a['Q0.1']) === 'Yes — it started after an injury more than 72 hours ago',
      options: [
        { label: 'ACL, PCL, or other knee ligament sprain or tear', points: 1 },
        { label: 'Meniscal tear or cartilage damage', points: 1 },
        { label: 'Knee osteoarthritis or knee cartilage degeneration', points: 1 },
        { label: "Patellofemoral pain syndrome (Runner's Knee) or patellar tendinopathy (Jumper's Knee)", points: 1 },
        { label: 'Knee surgery — arthroscopy, replacement, or other procedure', points: 1 },
        { label: 'None of the above / Not sure', points: 0 },
      ],
    },
  ],

  tiers: { lowMax: 10, moderateMax: 19 },

  hardFlags: [
    {
      id: 'knee-locking',
      description: 'Q1.4 — knee locking (structural pathology signal)',
      matches: (a) =>
        asArray(a['Q1.4']).includes(
          "The knee suddenly 'locks' or gets stuck — you cannot straighten it fully",
        ),
    },
    {
      id: 'giving-way-medial',
      description: 'Q1.4 giving-way + Q1.2a medial instability',
      matches: (a) =>
        asArray(a['Q1.4']).includes(
          "The knee 'gives way' or buckles unexpectedly — feels like it might collapse",
        ) &&
        asString(a['Q1.2a']) ===
          "With a sensation that the knee 'gives way' or feels unstable when you change direction",
    },
    {
      id: 'prior-acl-instability',
      description: 'Q3.4 prior ACL/PCL + current giving-way',
      matches: (a) =>
        asArray(a['Q3.4']).includes('ACL, PCL, or other knee ligament sprain or tear') &&
        asArray(a['Q1.4']).includes(
          "The knee 'gives way' or buckles unexpectedly — feels like it might collapse",
        ),
    },
    {
      id: 'mechanical-chronic',
      description: 'Q1.4 mechanical symptom + Q1.1 6+ month progressive',
      matches: (a) => {
        const q14 = asArray(a['Q1.4']);
        const q11 = asString(a['Q1.1']);
        const mech =
          q14.includes(
            "The knee suddenly 'locks' or gets stuck — you cannot straighten it fully",
          ) ||
          q14.includes(
            "The knee 'gives way' or buckles unexpectedly — feels like it might collapse",
          );
        return mech && q11 === Q11_OPTIONS.progressive6m;
      },
    },
  ],

  conditionTags: [
    {
      tag: 'Patellofemoral pattern',
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.patellofemoral),
    },
    {
      tag: "Jumper's Knee signal",
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.patellarTendon),
    },
    {
      tag: "Runner's Knee / ITB",
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.lateral) && isActivityStream(a),
    },
    {
      tag: 'Medial instability',
      matches: (a) =>
        asString(a['Q1.2a']) ===
        "With a sensation that the knee 'gives way' or feels unstable when you change direction",
    },
    {
      tag: 'OA effusion',
      matches: (a) =>
        isDegenerativeStream(a) &&
        asString(a['Q1.3']) ===
          'Frequent or persistent swelling — knee feels puffy or swollen most of the time',
    },
    {
      tag: 'Training-load risk',
      matches: (a) =>
        asArray(a['Q3.2']).includes(
          'I recently increased my training volume or intensity — more distance, frequency, or load',
        ),
    },
    {
      tag: 'Prior knee surgery',
      matches: (a) =>
        asArray(a['Q3.4']).includes(
          'Knee surgery — arthroscopy, replacement, or other procedure',
        ),
    },
  ],

  routing: {
    low: {
      interpretation:
        'Mild or early-stage knee discomfort. No mechanical symptoms or significant functional impact in your responses.',
      primaryCTA: { label: 'Explore Muscle Mood + Balance games', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'Check your Muscle Age', destination: 'kriya-play', subProgram: 'muscle-age' },
      tip: 'Single-leg balance practice (30 seconds per side, daily) is the single highest-yield prevention habit for knee health at this stage.',
    },
    moderate: {
      interpretation:
        'Recurrent or persistent knee pain with measurable impact on daily activities or sport. Structured intervention is indicated.',
      primaryCTA: { label: 'Start your Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Ask Myo AI about your knee signals', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a deeper assessment with DeepScan', destination: 'deepscan' },
      tip: 'Modify, do not stop. Reducing load (volume, intensity, impact) by 30–50% for 2–3 weeks is more effective than full rest for most non-traumatic knee pain.',
    },
    high: {
      interpretation:
        'Significant functional limitation from knee pain with elevated risk signals. Professional evaluation is warranted — imaging may be appropriate.',
      primaryCTA: { label: 'Begin a Kriya Care programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI for clarity now', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Mechanical symptoms (locking, giving way) and chronic OA patterns are best assessed in person. Please book an orthopaedic or physiotherapy review.',
    },
  },
};

export default kneeModule;
