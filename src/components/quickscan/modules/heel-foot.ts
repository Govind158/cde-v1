/**
 * Kriya QuickScan — Heel & Foot Pain Module
 *
 * PRD source: docs/Kriya Scan/QuickScan by Location/kriya_quickscan_heel_foot_prd_v1.docx
 * Validation: FAAM, FFI, MFPDI, VISA-A, NICE Plantar Fasciitis / CKS Heel Pain,
 *             ADA Diabetic Foot Risk Classification, Edinburgh Claudication
 *             Questionnaire, Ottawa Ankle/Foot Rules, Simmond's test adaptation,
 *             ACR Gout adaptation, STarT MSK psychosocial.
 *
 * Tier thresholds (PRD §5.2):
 *   LOW       0 – 9
 *   MODERATE  10 – 17
 *   HIGH      18+ OR any hard flag
 *
 * Hard flags (PRD §5.2 *):
 *   (a) Diabetic Cross-Layer Trigger: Q3.3 Option A (diabetes) + Q1.2 Option C
 *       (nerve/burning) → forces HIGH RISK and emits the Diabetic Neuropathy
 *       Urgent condition tag. (Per current engine architecture, the closest
 *       analogue to the PRD's "bypass risk tier entirely" is a hard flag —
 *       this is documented as a known approximation.)
 *   (b) Q2.1 Sub-item A 'Cannot do at all' — cannot walk 15 minutes → HIGH
 *   (c) Q1.1a Option C — Achilles pain at rest + Q1.3 ≥ 3 months → HIGH
 *   (d) Q1.2 Option C + non-diabetic — nerve involvement signal → HIGH
 *   (e) Q1.3 Option D (>6 months) + Q2.1 Sub-item A ≥ 'Quite a bit' → HIGH
 *
 * Notes:
 *   - Q0.1 PRD describes a TWO-PART cascading Yes/No screen (Part A: PAD
 *     claudication, Part B: Achilles rupture). Modelled as two sequential
 *     multi-halt questions Q0.1a / Q0.1b, with Q0.1b only shown if Q0.1a
 *     was answered "No or not sure" — preserving the cascade behaviour.
 *   - Q1.1 stream classifier (HEEL / MIDFOOT / FOREFOOT) is non-scored — it
 *     gates downstream questions and tags per PRD §4.3.
 *   - Q3.3 Option A is a multi-select option; the diabetic cross-layer hard
 *     flag matches on its presence + Q1.2 Option C.
 */

import { asArray, asString } from '../engine';
import type { QSModule, QSAnswers } from '../types';
import { asMatrix } from '../engine';

const Q11_OPTIONS = {
  heelPlantar:
    'Under or at the bottom of my heel — when I stand or take my first steps',
  heelAchilles:
    'At the back of my heel — where my heel meets my calf, or along the Achilles tendon',
  midfootArch: 'In the arch of my foot — the inner side from heel to ball',
  forefootBall: 'In the ball of my foot — under the toes or between the toes',
  midfootDorsal: 'Across the top of my foot',
  forefootHallux: 'In my big toe or bunion area',
} as const;

const Q11A_OPTIONS = {
  earlyTendinopathy:
    'Stiffness and mild aching at the start of activity that warms up and improves',
  midPortion:
    'Pain during and after activity — worsens with increased training or hill running',
  established:
    'Persistent pain even at rest or with light daily walking — difficult to walk without limping',
  tendonThickening:
    'A thickened, tender lump felt on the Achilles tendon with pain on compression',
} as const;

const Q12_OPTIONS = {
  plantarFirstStep:
    'Sharp, stabbing pain with the very first steps in the morning — eases after a few minutes of walking',
  dullAche:
    'A dull ache or tiredness in the foot that builds through the day — especially after prolonged standing',
  nerveBurning:
    'Burning, tingling, or electric-shock pain — particularly in the arch, heel, or toes',
  forefootSharp:
    'Sharp pain specifically in the ball of the foot or between toes — worse in tight footwear or heels',
  stiffness:
    'Stiffness and aching after rest that improves with movement but returns after long activity',
} as const;

const Q13_OPTIONS = {
  recent: 'Less than 4 weeks — came on recently, possibly after a change in activity or footwear',
  subAcute: '4–12 weeks — sub-acute; has not resolved despite rest or self-management attempts',
  persistent: 'More than 3 months — persistent; present most days with varying intensity',
  chronic: 'More than 6 months — chronic; has significantly affected my daily routine or activity level',
} as const;

const Q33_OPTIONS = {
  diabetes: 'Diabetes (Type 1 or Type 2) — on medication or diet-controlled',
  preDiabetes: 'Pre-diabetes or borderline blood sugar',
  inflammatory: 'Rheumatoid arthritis or other inflammatory joint condition',
  gout: 'Gout or a history of gout attacks in the foot or ankle',
  thyroid: 'Thyroid condition',
  none: 'None of the above',
} as const;

const Q35_OPTIONS = {
  priorPF: 'Plantar fasciitis or heel spur',
  priorAchilles: 'Achilles tendinopathy or Achilles tendon injury',
  priorNeuroma: "Morton's neuroma or metatarsalgia",
  priorBunion: 'Bunion (hallux valgus) or toe deformity',
  priorFlatFeet: 'Flat feet (pes planus) or custom orthotics prescribed',
  priorSurgery: 'Foot or ankle surgery',
  none: 'None of the above / Not sure',
} as const;

function isHeelStream(a: QSAnswers): boolean {
  const sel = asArray(a['Q1.1']);
  return sel.includes(Q11_OPTIONS.heelPlantar) || sel.includes(Q11_OPTIONS.heelAchilles);
}
function isForefootStream(a: QSAnswers): boolean {
  const sel = asArray(a['Q1.1']);
  return sel.includes(Q11_OPTIONS.forefootBall) || sel.includes(Q11_OPTIONS.forefootHallux);
}

const heelFootModule: QSModule = {
  id: 'heel-foot',
  kind: 'location',
  // 'Heel & Foot' kept consistent with picker label.
  displayName: 'Heel & Foot Pain',
  // No dedicated foot region in DeepScan PAIN_REGIONS — closest anatomical
  // neighbour is Knee or Ankle, matching the picker's deepScanRegion listing.
  deepScanRegion: 'Knee or Ankle',
  shortDescription:
    'Plantar fasciitis, Achilles, metatarsalgia, neuroma & diabetic foot patterns — mapped to FAAM / FFI / VISA-A / NICE.',
  estimatedMinutes: 3,
  accent: '#f59e0b',
  instruments: [
    'Foot and Ankle Ability Measure (FAAM)',
    'Foot Function Index (FFI)',
    'Manchester Foot Pain and Disability Index (MFPDI)',
    'Victorian Institute of Sport Assessment — Achilles (VISA-A)',
    'NICE Plantar Fasciitis / CKS Heel Pain',
    'Edinburgh Claudication Questionnaire (conceptual)',
    'Ottawa Ankle/Foot Rules',
    "Simmond's test self-report adaptation",
    'ADA Diabetic Foot Risk Classification',
    'STarT MSK psychosocial adaptation',
  ],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. The risk signals generated are based on your responses and are intended to guide general awareness only. Please consult a qualified healthcare professional for clinical assessment, diagnosis, or treatment. If you have diabetes and notice numbness, a non-healing wound, sudden colour change or sudden severe foot pain, please seek prompt medical care — same-day if a wound is present.',
  intro: [
    'QuickScan — Heel & Foot. This is a 2–3 minute risk-signal scan, not a diagnosis.',
    "We'll start with two safety screens — a quick blood-flow / Achilles check, then a broader systemic screen — before short questions about where, when and how your foot hurts.",
  ],
  questions: [
    // ── LAYER 0 — VASCULAR / ACHILLES / SYSTEMIC ─────────────────
    {
      id: 'Q0.1a',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'Does your leg or foot pain occur mainly during walking and then completely go away when you stop and rest?',
      helper:
        'Tick if this matches your experience. If it does not (or you are not sure), tick "No or not sure".',
      source: 'Edinburgh Claudication Questionnaire conceptual framework',
      haltLabel: 'No or not sure',
      haltKind: 'urgent',
      options: [
        {
          label:
            'Yes — pain reliably comes on during walking and goes away fully with rest',
          points: 0,
        },
        { label: 'No or not sure', points: 0 },
      ],
    },
    {
      id: 'Q0.1b',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        "Have you recently felt or heard a sudden 'pop' or tearing sensation in your heel or back of your lower leg, and now have difficulty pushing off your foot or standing on tiptoe?",
      helper: 'Tick if this matches your experience. Otherwise tick "No".',
      source: "Ottawa Ankle Rules; Simmond's test self-report adaptation",
      haltLabel: 'No',
      haltKind: 'emergency',
      // Only shown if Q0.1a was safely cleared.
      showWhen: (a) => asArray(a['Q0.1a']).includes('No or not sure'),
      options: [
        {
          label:
            'Yes — I felt a pop or tearing in my heel/calf and cannot push off properly',
          points: 0,
        },
        { label: 'No', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you currently experiencing any of the following alongside your foot or heel pain?',
      helper: 'Tick every one that applies. If none apply, tick "None of the above".',
      source: 'ADA Diabetic Foot Risk Classification; NICE diabetic foot guidelines; Ottawa Ankle/Foot Rules; DVT clinical criteria',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'I have diabetes and have a wound, blister, or sore on my foot that does not seem to be healing':
          'emergency',
        'My foot or ankle became very swollen, red, and warm — not after an injury and not related to activity':
          'emergency',
        'My foot or heel pain started after a fall, twist, or direct impact and I cannot bear weight':
          'emergency',
      },
      // Only shown if both Q0.1a and Q0.1b were safely cleared.
      showWhen: (a) =>
        asArray(a['Q0.1a']).includes('No or not sure') &&
        asArray(a['Q0.1b']).includes('No'),
      options: [
        {
          label: 'I have diabetes and am experiencing numbness, burning, or loss of feeling in my feet',
          points: 0,
        },
        {
          label:
            'I have diabetes and have a wound, blister, or sore on my foot that does not seem to be healing',
          points: 0,
        },
        {
          label:
            'My foot or ankle became very swollen, red, and warm — not after an injury and not related to activity',
          points: 0,
        },
        {
          label:
            'My foot or heel pain started after a fall, twist, or direct impact and I cannot bear weight',
          points: 0,
        },
        {
          label:
            'Foot pain with unexplained weight loss of more than 5 kg in the past 3 months or known cancer history',
          points: 0,
        },
        { label: 'This is affecting a child or teenager (under 18)', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },

    // ── LAYER 1 — SYMPTOM PROFILE + LOCATION CLASSIFIER ──────────
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 3,
      prompt: 'Where in your foot or heel is your pain mainly located? (Select all that apply)',
      source: 'MFPDI pain location items; VAS Foot location mapping; FAAM ADL sub-scale anatomical reference',
      options: [
        // Stream classifier — non-scored; stream drives downstream weighting per PRD §4.3.
        { label: Q11_OPTIONS.heelPlantar, points: 0 },
        { label: Q11_OPTIONS.heelAchilles, points: 0 },
        { label: Q11_OPTIONS.midfootArch, points: 0 },
        { label: Q11_OPTIONS.forefootBall, points: 0 },
        { label: Q11_OPTIONS.midfootDorsal, points: 0 },
        { label: Q11_OPTIONS.forefootHallux, points: 0 },
      ],
    },
    {
      id: 'Q1.1a',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Can you describe your Achilles or back-of-heel pain more specifically?',
      source: 'VISA-A items 1–4; Victorian Institute of Sport tendinopathy classification',
      // Triggered only if Q1.1 contained the Achilles option.
      showWhen: (a) => asArray(a['Q1.1']).includes(Q11_OPTIONS.heelAchilles),
      options: [
        { label: Q11A_OPTIONS.earlyTendinopathy, points: 1 },
        { label: Q11A_OPTIONS.midPortion, points: 2 },
        { label: Q11A_OPTIONS.established, points: 3 },
        { label: Q11A_OPTIONS.tendonThickening, points: 2 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'Which of the following best describes your heel or foot pain? (Select up to 2)',
      source: 'NICE CKS Heel Pain recognition; MFPDI pain character items; FFI pain sub-scale P1–P9',
      options: [
        { label: Q12_OPTIONS.plantarFirstStep, points: 2 },
        { label: Q12_OPTIONS.dullAche, points: 1 },
        { label: Q12_OPTIONS.nerveBurning, points: 2 },
        { label: Q12_OPTIONS.forefootSharp, points: 2 },
        { label: Q12_OPTIONS.stiffness, points: 1 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt: 'How long have you had your heel or foot pain, and how did it start?',
      source: 'VISA-A duration items; FFI disability sub-scale D1; MFPDI duration classification',
      options: [
        { label: Q13_OPTIONS.recent, points: 1 },
        { label: Q13_OPTIONS.subAcute, points: 2 },
        { label: Q13_OPTIONS.persistent, points: 3 },
        { label: Q13_OPTIONS.chronic, points: 4 },
      ],
    },

    // ── LAYER 2 — FUNCTIONAL IMPACT ──────────────────────────────
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'matrix-scored',
      prompt:
        'In the past 2 weeks, how much has your foot or heel pain affected your ability to do the following?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'FAAM ADL sub-scale items 1, 4, 7; FFI disability sub-scale D4, D5',
      subItems: [
        { id: 'A', label: 'Walking on flat ground for more than 15 minutes continuously' },
        { id: 'B', label: 'Climbing or descending stairs without pain' },
        { id: 'C', label: 'Standing for more than 20 minutes (e.g., cooking, queuing, at work)' },
        { id: 'D', label: 'Walking barefoot on hard floors — e.g., in the morning at home' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'matrix-scored',
      prompt: 'How has your heel or foot pain affected the following in the past month?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'FAAM Sports sub-scale SP1–SP8; MFPDI footwear concern items; FFI activity limitation sub-scale AL1–AL3',
      subItems: [
        { id: 'A', label: 'Physical activity or sport — running, walking for exercise, or recreational sport' },
        { id: 'B', label: 'Your choice of footwear — forced to avoid certain shoes due to pain' },
        { id: 'C', label: 'Work performance — especially if your job involves prolonged standing or walking' },
      ],
      matrixSubScoreThreshold: { min: 5, bonusPoints: 1 },
    },

    // ── LAYER 3 — RISK MODIFIERS ─────────────────────────────────
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of the following best describes your usual footwear and daily surface exposure?',
      source: 'MFPDI footwear concern items; NICE plantar fasciitis risk factors; clinical load management research adaptation',
      options: [
        {
          label:
            'I wear well-fitted, supportive footwear with cushioning and spend limited time on hard surfaces',
          points: 0,
        },
        {
          label:
            'I wear mostly casual or office footwear — moderate support, some hard floor exposure',
          points: 1,
        },
        {
          label:
            'I frequently wear flat unsupportive footwear (flip-flops, flat ballerinas, worn-out shoes) or walk barefoot on hard floors for extended periods',
          points: 2,
        },
        { label: 'I regularly wear high heels (more than 5 cm) for extended periods', points: 2 },
        {
          label:
            'My work involves standing or walking on concrete, stone, or tiled hard floors for 6+ hours daily',
          points: 2,
        },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'Which of the following best describes your body load and activity pattern?',
      source: 'NICE plantar fasciitis BMI risk factor; VISA-A training load items; FFI pain sub-scale load items',
      options: [
        { label: 'Healthy weight range and moderately active — regular walking or exercise with good recovery', points: 0 },
        {
          label:
            'Moderately active but have gained weight recently — feet feel the impact of longer standing or walking',
          points: 1,
        },
        {
          label:
            'Largely sedentary with elevated body weight — aware that my weight may be affecting my feet',
          points: 2,
        },
        { label: 'Very active — high training volume (running, sport) that has recently increased', points: 1 },
        {
          label:
            'Occupationally active — on feet most of the day in a demanding standing or walking job',
          points: 1,
        },
      ],
    },
    {
      id: 'Q3.3',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Do you have any of the following health conditions?',
      helper: 'Multi-select. This context is a critical safety check — please answer accurately.',
      source: 'ADA Diabetic Foot Risk Classification; ACR Gout diagnostic criteria adaptation; NICE diabetic foot care guidelines',
      options: [
        { label: Q33_OPTIONS.diabetes, points: 1 },
        { label: Q33_OPTIONS.preDiabetes, points: 0 },
        { label: Q33_OPTIONS.inflammatory, points: 1 },
        { label: Q33_OPTIONS.gout, points: 1 },
        { label: Q33_OPTIONS.thyroid, points: 0 },
        { label: Q33_OPTIONS.none, points: 0 },
      ],
    },
    {
      id: 'Q3.4',
      layer: 3,
      kind: 'single-scored',
      prompt:
        'Thinking about your heel or foot pain, which statement feels closest to how you feel?',
      source: 'STarT MSK psychosocial adaptation; MFPDI concern sub-scale C1–C3; FFI disability sub-scale psychological items',
      // PRD: shown if Q1.3 = Option C or D (persistent/chronic) OR total score ≥ 9.
      // Engine has no running total at predicate time; gate on chronicity per PRD primary trigger.
      showWhen: (a) => {
        const v = asString(a['Q1.3']);
        return v === Q13_OPTIONS.persistent || v === Q13_OPTIONS.chronic;
      },
      options: [
        { label: 'I am confident it will improve — I just need to know the right steps to take', points: 0 },
        { label: 'I am not sure — it keeps coming back despite my efforts and I am uncertain why', points: 1 },
        { label: 'I avoid activities I used to enjoy because I worry about making my foot pain worse', points: 2 },
        {
          label:
            'My foot pain significantly restricts my independence and affects my mood on a regular basis',
          points: 3,
        },
      ],
    },
    {
      id: 'Q3.5',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Have you previously been diagnosed with or treated for any of the following?',
      helper: 'Select all that apply.',
      source: 'Clinical history intake; VISA-A prior treatment items; FAAM prior condition items',
      // PRD: shown if prior foot issue flagged in onboarding. Onboarding unavailable here;
      // surface to all users so prior-condition signals can contribute to scoring.
      options: [
        { label: Q35_OPTIONS.priorPF, points: 1 },
        { label: Q35_OPTIONS.priorAchilles, points: 1 },
        { label: Q35_OPTIONS.priorNeuroma, points: 1 },
        { label: Q35_OPTIONS.priorBunion, points: 1 },
        { label: Q35_OPTIONS.priorFlatFeet, points: 1 },
        { label: Q35_OPTIONS.priorSurgery, points: 1 },
        { label: Q35_OPTIONS.none, points: 0 },
      ],
    },
  ],

  tiers: { lowMax: 9, moderateMax: 17 },

  hardFlags: [
    {
      id: 'diabetic-neuropathy-cross-layer',
      description:
        'Q3.3 diabetes + Q1.2 nerve symptoms — Diabetic Neuropathy urgent referral pattern',
      matches: (a) =>
        asArray(a['Q3.3']).includes(Q33_OPTIONS.diabetes) &&
        asArray(a['Q1.2']).includes(Q12_OPTIONS.nerveBurning),
    },
    {
      id: 'cannot-walk-15min',
      description: "Q2.1 Sub-item A 'Cannot do at all' — cannot walk 15 minutes",
      matches: (a) => asMatrix(a['Q2.1'])['A'] === 'Cannot do at all',
    },
    {
      id: 'achilles-rest-pain-chronic',
      description: 'Q1.1a established + Q1.3 ≥ 3 months — established Achilles tendinopathy',
      matches: (a) => {
        const dur = asString(a['Q1.3']);
        return (
          asString(a['Q1.1a']) === Q11A_OPTIONS.established &&
          (dur === Q13_OPTIONS.persistent || dur === Q13_OPTIONS.chronic)
        );
      },
    },
    {
      id: 'nerve-non-diabetic',
      description: 'Q1.2 nerve symptoms without diabetes — tarsal tunnel / nerve involvement signal',
      matches: (a) =>
        asArray(a['Q1.2']).includes(Q12_OPTIONS.nerveBurning) &&
        !asArray(a['Q3.3']).includes(Q33_OPTIONS.diabetes),
    },
    {
      id: 'chronic-debilitating',
      description: "Q1.3 > 6 months + Q2.1 Sub-item A ≥ 'Quite a bit'",
      matches: (a) => {
        const rowA = asMatrix(a['Q2.1'])['A'];
        return (
          asString(a['Q1.3']) === Q13_OPTIONS.chronic &&
          (rowA === 'Quite a bit' || rowA === 'Cannot do at all')
        );
      },
    },
  ],

  conditionTags: [
    {
      tag: 'Plantar Fasciitis Candidate',
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.plantarFirstStep),
    },
    {
      tag: 'Plantar Fasciitis Confirmed Candidate',
      matches: (a) =>
        isHeelStream(a) && asMatrix(a['Q2.1'])['D'] === 'Cannot do at all',
    },
    {
      tag: 'Achilles Tendinopathy — Early',
      matches: (a) => asString(a['Q1.1a']) === Q11A_OPTIONS.earlyTendinopathy,
    },
    {
      tag: 'Achilles Tendinopathy — Established',
      matches: (a) => {
        const v = asString(a['Q1.1a']);
        return v === Q11A_OPTIONS.established || v === Q11A_OPTIONS.tendonThickening;
      },
    },
    {
      tag: 'Forefoot / Neuroma Signal',
      matches: (a) =>
        isForefootStream(a) || asArray(a['Q1.2']).includes(Q12_OPTIONS.forefootSharp),
    },
    {
      tag: 'Nerve Involvement',
      matches: (a) => asArray(a['Q1.2']).includes(Q12_OPTIONS.nerveBurning),
    },
    {
      tag: 'Diabetic Foot Risk',
      matches: (a) => asArray(a['Q3.3']).includes(Q33_OPTIONS.diabetes),
    },
    {
      tag: 'Diabetic Neuropathy Urgent',
      matches: (a) =>
        asArray(a['Q3.3']).includes(Q33_OPTIONS.diabetes) &&
        asArray(a['Q1.2']).includes(Q12_OPTIONS.nerveBurning),
    },
    {
      tag: 'Gout',
      matches: (a) => asArray(a['Q3.3']).includes(Q33_OPTIONS.gout),
    },
    {
      tag: 'Inflammatory Arthritis',
      matches: (a) => asArray(a['Q3.3']).includes(Q33_OPTIONS.inflammatory),
    },
    {
      tag: 'Footwear Risk',
      matches: (a) => {
        const v = asString(a['Q3.1']);
        return (
          v ===
            'I frequently wear flat unsupportive footwear (flip-flops, flat ballerinas, worn-out shoes) or walk barefoot on hard floors for extended periods' ||
          v === 'I regularly wear high heels (more than 5 cm) for extended periods' ||
          v ===
            'My work involves standing or walking on concrete, stone, or tiled hard floors for 6+ hours daily'
        );
      },
    },
    {
      tag: 'Body Load',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'Largely sedentary with elevated body weight — aware that my weight may be affecting my feet',
    },
    {
      tag: 'Training Load',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'Very active — high training volume (running, sport) that has recently increased',
    },
    {
      tag: 'Occupational Load',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'Occupationally active — on feet most of the day in a demanding standing or walking job',
    },
    {
      tag: 'Psychosocial Risk',
      matches: (a) => {
        const v = asString(a['Q3.4']);
        return (
          v === 'I avoid activities I used to enjoy because I worry about making my foot pain worse' ||
          v ===
            'My foot pain significantly restricts my independence and affects my mood on a regular basis'
        );
      },
    },
  ],

  routing: {
    low: {
      interpretation:
        'Mild heel or foot discomfort — likely early plantar fasciitis, minor forefoot irritation from footwear, or sub-acute Achilles irritation. Minimal functional limitation in your responses.',
      primaryCTA: { label: 'Explore Muscle Mood + Balance games', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'Check your Muscle Age', destination: 'kriya-play', subProgram: 'muscle-age' },
      tip: 'Supportive, cushioned footwear and a daily 60-second calf-and-plantar-fascia stretch are the highest-yield changes you can make at this stage.',
    },
    moderate: {
      interpretation:
        'Persistent or recurrent heel/foot pain with meaningful impact on walking, standing, or activity. May include sub-acute plantar fasciitis, mid-portion Achilles tendinopathy, or metatarsalgia — structured conservative management is indicated.',
      primaryCTA: { label: 'Start a foot & ankle conditioning programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Ask Myo AI about your foot signals', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a deeper assessment with DeepScan', destination: 'deepscan' },
      tip: 'Load management beats rest. Reduce high-impact running by 30–50% for 2–3 weeks while adding daily calf raises and intrinsic foot work — most non-traumatic heel/foot pain responds to this within 6–8 weeks.',
    },
    high: {
      interpretation:
        'Chronic and functionally limiting heel/foot pain. Patterns include established plantar fasciitis or Achilles tendinopathy unresponsive to conservative care, nerve involvement, or significant ADL restriction — professional clinical evaluation is warranted.',
      primaryCTA: { label: 'Begin Kriya Care — Foot Programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI for clarity now', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Diabetic foot symptoms, nerve involvement, and established Achilles tendinopathy are best assessed in person. Please book a podiatry or physiotherapy review — if you have diabetes with numbness, see your diabetologist within 48 hours.',
    },
  },
};

export default heelFootModule;
