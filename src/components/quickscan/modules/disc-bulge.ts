/**
 * Kriya QuickScan — Disc Bulge Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_disc_bulge_prd_v1.docx
 * Validation: NICE NG59, NASS disc herniation criteria, ODI, NDI, FABQ.
 * Tiers: LOW 0-9, MOD 10-20, HIGH 21+ or hard flag.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q22_OPTS = {
  motorE: 'Mild weakness — slightly weaker than normal but functional',
  motorF: 'Moderate weakness — difficulty with specific movements (lifting foot, gripping, fine hand use)',
  sensoryC: "Significant numbness — an area that feels completely numb or 'wooden'",
};

const discBulge: QSModule = {
  id: 'disc-bulge',
  kind: 'condition',
  displayName: 'Disc Bulge',
  shortDescription: 'Disc herniation / prolapse / annular tear (lumbar or cervical).',
  estimatedMinutes: 3,
  accent: '#0ea5e9',
  instruments: ['NICE NG59', 'NASS Disc Herniation Criteria', 'ODI', 'NDI', 'FABQ', 'Sciatica & Low Back / Neck QuickScan alignment'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Many disc bulges are incidental imaging findings and resolve with conservative management. Please consult a qualified clinician for assessment, diagnosis, or treatment.',
  intro: [
    'QuickScan — Disc Bulge. Many disc findings on imaging are not the cause of pain. This 2-3 minute scan separates a disc finding from a clinically significant disc problem.',
    "We'll start with two safety screens, then ask about your imaging context, symptoms and how they're affecting you.",
  ],
  questions: [
    // Layer 0
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you currently experiencing any of the following?',
      helper: 'Tick all that apply, or "None of the above".',
      source: 'NICE NG59 CES + cervical myelopathy criteria',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      options: [
        { label: 'Loss of control over bladder or bowels', points: 0 },
        { label: 'Numbness or tingling in the groin, inner thighs, or between the legs', points: 0 },
        { label: 'Sudden severe weakness in both legs', points: 0 },
        { label: 'Difficulty walking — legs feel clumsy, unsteady, or you are tripping', points: 0 },
        { label: 'Difficulty with fine hand movements — fumbling with buttons or keys', points: 0 },
        { label: 'Weakness or heaviness in both arms — not just one', points: 0 },
        { label: 'Shock-like sensation down the spine when you bend your neck forward', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Have you experienced any of the following alongside your back / neck pain?',
      source: 'NICE NG59 systemic + progressive deficit criteria',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      options: [
        { label: 'Rapidly worsening leg or arm weakness over the past 48–72 hours', points: 0 },
        { label: 'Fever, night sweats, or unexplained weight loss > 5 kg in the past 3 months', points: 0 },
        { label: 'Known history of cancer', points: 0 },
        { label: 'Pain following a fall, road accident, or significant trauma', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    // Layer 1
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Where is your disc issue?',
      source: 'Clinical region classification',
      options: [
        { label: 'Lower back / lumbar spine', points: 0 },
        { label: 'Neck / cervical spine', points: 0 },
        { label: 'Both — lower back and neck', points: 1 },
        { label: 'I am not sure / no imaging', points: 0 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'What is your imaging history? (Select all that apply)',
      source: 'NASS imaging adaptation',
      options: [
        { label: 'MRI showing disc bulge, herniation, protrusion, or prolapse', points: 2 },
        { label: 'CT showing disc changes or nerve compression', points: 1 },
        { label: 'X-ray showing disc-space narrowing or degenerative changes', points: 1 },
        { label: 'Doctor told me I have a disc problem but I have not had imaging', points: 1 },
        { label: 'My imaging was done more than 2 years ago', points: 1 },
        { label: 'No imaging — not sure if I have a disc issue', points: 0 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'single-scored',
      prompt: 'Episode and recurrence history?',
      source: 'NASS natural history; ODI episode history',
      options: [
        { label: 'First episode', points: 0 },
        { label: 'One previous episode that resolved with conservative care', points: 1 },
        { label: 'Multiple recurring episodes (2 or more) over recent years', points: 2 },
        { label: 'Chronic for more than 12 months with varying intensity', points: 3 },
      ],
    },
    // Layer 2
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Where does the pain or tingling travel to?',
      source: 'Sciatica + Neck QuickScan radiation alignment',
      options: [
        { label: 'No radiation — pain is local to my back/neck', points: 0 },
        { label: 'Into the buttock / shoulder area only', points: 1 },
        { label: 'Above the knee / above the elbow', points: 2 },
        { label: 'Below the knee / below the elbow', points: 4 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'multi-scored',
      maxSelect: 2,
      prompt: 'Neurological signs — pick up to 2 that apply.',
      source: 'NICE NG59 neurological criteria; Sciatica module Q2.1/Q2.2',
      options: [
        { label: 'Occasional tingling or pins-and-needles — comes and goes', points: 2 },
        { label: 'Persistent tingling or numbness in part of the limb', points: 2 },
        { label: Q22_OPTS.sensoryC, points: 3 },
        { label: 'No — limb feels strong even if painful', points: 0 },
        { label: Q22_OPTS.motorE, points: 1 },
        { label: Q22_OPTS.motorF, points: 3 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'single-scored',
      prompt: 'How are your symptoms trending over the past few weeks?',
      source: 'NASS natural history; NICE NG59 trajectory',
      options: [
        { label: 'Improving — clearly getting better week by week', points: 0 },
        { label: 'Stable — about the same as when it started', points: 1 },
        { label: 'Fluctuating — good days and bad days', points: 2 },
        { label: 'Worsening — pain or neurological symptoms increasing', points: 3 },
      ],
    },
    // Layer 3
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'matrix-scored',
      prompt: 'How much have your symptoms affected the following in the past 2 weeks?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'ODI + NDI functional items',
      subItems: [
        { id: 'A', label: 'Sitting / standing / walking for typical durations' },
        { id: 'B', label: 'Sleeping comfortably' },
        { id: 'C', label: 'Lifting, reaching, or bending' },
      ],
      matrixSubScoreThreshold: { min: 6, bonusPoints: 2 },
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'How are you feeling about your disc condition?',
      helper: 'Many users with disc findings over-restrict from anxiety. Honest reflection helps tune the recommendation.',
      source: 'STarT Back; FABQ; imaging anxiety adaptation',
      options: [
        { label: 'Confident — I understand it can be managed', points: 0 },
        { label: 'Unsure — I have had conflicting advice', points: 1 },
        { label: 'Worried — I avoid many activities as a precaution', points: 2 },
        { label: 'Anxious about MRI findings; I worry my spine is seriously damaged', points: 3 },
      ],
    },
  ],
  tiers: { lowMax: 9, moderateMax: 20 },
  hardFlags: [
    {
      id: 'motor-weakness',
      description: 'Q2.2 — moderate motor weakness present',
      matches: (a) => asArray(a['Q2.2']).includes(Q22_OPTS.motorF),
    },
    {
      id: 'worsening-with-motor',
      description: 'Q2.3 worsening + Q2.2 any motor sign',
      matches: (a) =>
        asString(a['Q2.3']) === 'Worsening — pain or neurological symptoms increasing' &&
        (asArray(a['Q2.2']).includes(Q22_OPTS.motorE) ||
          asArray(a['Q2.2']).includes(Q22_OPTS.motorF)),
    },
    {
      id: 'chronic-pattern',
      description: 'Q1.3 — chronic for more than 12 months → moderate floor',
      matches: (a) =>
        asString(a['Q1.3']) === 'Chronic for more than 12 months with varying intensity',
    },
  ],
  conditionTags: [
    {
      tag: 'Radiculopathy signal',
      matches: (a) =>
        asString(a['Q2.1']) === 'Below the knee / below the elbow' ||
        asString(a['Q2.1']) === 'Above the knee / above the elbow',
    },
    {
      tag: 'Imaging anxiety',
      matches: (a) =>
        asString(a['Q3.2']) ===
        'Anxious about MRI findings; I worry my spine is seriously damaged',
    },
    {
      tag: 'Recurrent disc episode',
      matches: (a) => {
        const v = asString(a['Q1.3']);
        return (
          v === 'Multiple recurring episodes (2 or more) over recent years' ||
          v === 'Chronic for more than 12 months with varying intensity'
        );
      },
    },
    {
      tag: 'Stale imaging',
      matches: (a) => asArray(a['Q1.2']).includes('My imaging was done more than 2 years ago'),
    },
  ],
  routing: {
    low: {
      interpretation:
        'Disc finding with minimal current clinical impact. Many disc bulges seen on imaging are incidental — symptoms here suggest a favourable trajectory.',
      primaryCTA: { label: 'Start a Muscle Memory programme', destination: 'kriya-play', subProgram: 'muscle-memory' },
      secondaryCTA: { label: 'Read: "Stay active — rest does not heal discs"', destination: 'myo-ai' },
      tip: 'Movement and activity maintenance are the strongest interventions at this stage. Avoid prolonged bed rest.',
    },
    moderate: {
      interpretation:
        'Disc condition with current radiculopathy signals. Conservative management with physiotherapy is strongly indicated.',
      primaryCTA: { label: 'Begin Kriya Care — Disc Rehabilitation', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI — disc Q&A', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Get a deeper assessment with DeepScan', destination: 'deepscan' },
      tip: 'Progress is typically measured in weeks, not days. A structured 6-8 week programme is appropriate.',
    },
    high: {
      interpretation:
        'Significant disc-related compromise. Specialist neurosurgical or orthopaedic evaluation is recommended.',
      primaryCTA: { label: 'See a spine specialist', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Bring your imaging report (or imaging request) to the consultation. Symptoms — not imaging alone — drive the decision.',
    },
  },
};

export default discBulge;
