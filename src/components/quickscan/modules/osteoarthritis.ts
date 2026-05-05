/**
 * Kriya QuickScan — Osteoarthritis Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_osteoarthritis_prd_v1.docx
 * Validation: NICE NG226, ACR OA classification, KOOS, WOMAC, OKS, AIMS2.
 * Tiers: LOW 0-11, MOD 12-24, HIGH 25+ or hard flag.
 *
 * Note: Q0.1 includes an RA/Gout/Septic differentiation screen. Combined
 * symmetric morning stiffness + small-joint pattern halts to RA pathway.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q22_LATE = 'Aching pain at rest or at night (advanced stages)';

const osteoarthritis: QSModule = {
  id: 'osteoarthritis',
  kind: 'condition',
  displayName: 'Osteoarthritis',
  shortDescription: 'Joint OA — knee, hip, hand, spine.',
  estimatedMinutes: 3,
  accent: '#f59e0b',
  instruments: ['NICE NG226', 'ACR OA criteria', 'KOOS', 'WOMAC', 'Oxford Knee Score', 'AIMS2'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Please consult a qualified clinician for assessment, diagnosis, or treatment.',
  intro: [
    "QuickScan — Osteoarthritis. This 2-3 minute scan checks for an OA pattern and rules out conditions that need different care (RA, gout, septic arthritis).",
    "We'll start with two safety screens, then ask about the joints involved, your symptoms and how they're affecting daily life.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Before we begin, please check if any of the following apply to your joint pain:',
      helper: 'Tick all that apply, or "None of the above".',
      source: 'ACR RA / Gout criteria; NICE NG226 referral triggers',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'Sudden severe swelling, redness and intense pain in a single joint (especially big toe, ankle, knee) — particularly at night':
          'urgent',
      },
      options: [
        {
          label:
            'Morning joint stiffness lasts more than 60 minutes most days',
          points: 0,
        },
        {
          label:
            'Joint pain and swelling is symmetrical — same joints on both sides at the same time (both wrists, both knuckles)',
          points: 0,
        },
        {
          label:
            'Systemic symptoms alongside joint pain — fatigue, unexplained fever, or weight loss',
          points: 0,
        },
        {
          label:
            'Sudden severe swelling, redness and intense pain in a single joint (especially big toe, ankle, knee) — particularly at night',
          points: 0,
        },
        {
          label: 'Skin rash, mouth ulcers, or eye redness associated with joint pain',
          points: 0,
        },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q0.2',
      layer: 0,
      kind: 'multi-halt',
      prompt: 'Are you experiencing any of the following?',
      source: 'NICE NG226 red flags; septic arthritis criteria',
      haltLabel: 'None of the above',
      haltKind: 'emergency',
      optionHaltKind: {
        'Joint pain with unexplained weight loss > 5 kg in past 3 months, or known cancer history':
          'urgent',
      },
      options: [
        {
          label:
            'A joint that is severely swollen, hot, red — with fever — coming on within 24–48 hours without injury',
          points: 0,
        },
        {
          label:
            'Joint pain with unexplained weight loss > 5 kg in past 3 months, or known cancer history',
          points: 0,
        },
        { label: 'Severe hip pain after a fall in the past 2 weeks', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Which joints are causing pain, stiffness, or discomfort? (Select all)',
      source: 'AIMS2; NICE NG226; ACR OA',
      options: [
        { label: 'Knee — one or both', points: 0 },
        { label: 'Lower back / lumbar spine', points: 0 },
        { label: 'Hip — one or both', points: 0 },
        { label: 'Shoulder — one or both', points: 0 },
        { label: 'Fingers, knuckles, or thumb base', points: 0 },
        { label: 'Neck / cervical spine', points: 0 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Which of these apply to you? (Select all)',
      source: 'NICE NG226 risk factors; ACR OA criteria',
      options: [
        { label: 'I am aged 50 or above', points: 2 },
        { label: 'I am overweight or obese (BMI > 25)', points: 2 },
        { label: 'I have had a significant joint injury, ligament tear, or prior joint surgery', points: 2 },
        {
          label:
            'My occupation involved repetitive kneeling, squatting, or heavy lifting over many years',
          points: 1,
        },
        { label: 'A parent was diagnosed with osteoarthritis', points: 1 },
        { label: 'I am female and post-menopausal', points: 1 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Have you been diagnosed with or treated for any of the following?',
      source: 'Clinical history intake; AIMS2',
      options: [
        { label: 'Osteoarthritis — confirmed by a doctor or imaging', points: 2 },
        { label: 'Osteopenia or osteoporosis', points: 1 },
        { label: 'Gout — one or more attacks confirmed', points: 1 },
        { label: 'Rheumatoid arthritis or another inflammatory arthritis', points: 1 },
        { label: 'Joint replacement surgery', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'multi-scored',
      maxSelect: 3,
      prompt: 'Which describe your joint pain best? (Select up to 3)',
      source: 'WOMAC pain sub-scale; NICE NG226 OA pain pattern',
      options: [
        { label: 'Pain that worsens with activity and improves with rest', points: 1 },
        { label: 'Pain or aching worse at the end of the day after activity', points: 2 },
        { label: 'Start-up pain or "gelling" — pain when starting movement after rest', points: 2 },
        { label: Q22_LATE, points: 2 },
        { label: 'Feeling of warmth or occasional mild swelling in the joint', points: 1 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Morning joint stiffness — how long does it typically last?',
      source: 'ACR OA criteria (< 30 min); DAS28 stiffness item',
      options: [
        { label: 'No significant morning stiffness', points: 0 },
        { label: 'Less than 15 minutes', points: 1 },
        { label: '15–30 minutes', points: 2 },
        { label: '30–60 minutes', points: 3 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Have you noticed any of the following in the affected joint(s)?',
      source: 'ACR knee OA criteria (crepitus, bony enlargement); KOOS',
      options: [
        { label: 'Grinding, crunching, or grating sensation when you move the joint (crepitus)', points: 2 },
        { label: 'Visible or felt swelling — puffiness that comes and goes', points: 1 },
        { label: 'Joint feels bony / enlarged — bumps or bony outgrowths', points: 1 },
        { label: 'Joint feels less flexible — reduced range of movement', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'matrix-scored',
      prompt: 'How much have your joint symptoms affected the following in the past 2 weeks?',
      helper: 'Rate each: Not at all / A little / Quite a bit / Cannot do at all',
      source: 'WOMAC physical function; KOOS ADL; OKS',
      subItems: [
        { id: 'A', label: 'Walking for usual distances' },
        { id: 'B', label: 'Going up or down stairs' },
        { id: 'C', label: 'Rising from a low chair / floor' },
      ],
      matrixSubScoreThreshold: { min: 7, bonusPoints: 2 },
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'single-scored',
      prompt: 'How is your joint condition affecting your wellbeing?',
      source: 'KOOS QOL; AIMS2 affect',
      options: [
        { label: 'Minimally — I manage well', points: 0 },
        { label: 'Moderately — affects some areas of life but I cope', points: 1 },
        { label: 'Substantially — limits independence, work, relationships', points: 2 },
        { label: 'Severely — dominates my daily life and affects my mood', points: 3 },
      ],
    },
  ],
  tiers: { lowMax: 11, moderateMax: 24 },
  hardFlags: [
    {
      id: 'confirmed-oa',
      description: 'Q1.3 — confirmed OA diagnosis → moderate floor',
      matches: (a) =>
        asArray(a['Q1.3']).includes('Osteoarthritis — confirmed by a doctor or imaging'),
    },
    {
      id: 'late-stage-rest-pain',
      description: 'Q2.1 — rest/night pain pattern → moderate floor',
      matches: (a) => asArray(a['Q2.1']).includes(Q22_LATE),
    },
    {
      id: 'polyarticular-with-burden',
      description: 'Q1.1 — 3+ joints AND Q3.2 substantial impact',
      matches: (a) => {
        const joints = asArray(a['Q1.1']).length;
        const wb = asString(a['Q3.2']);
        return (
          joints >= 3 &&
          (wb === 'Substantially — limits independence, work, relationships' ||
            wb === 'Severely — dominates my daily life and affects my mood')
        );
      },
    },
  ],
  conditionTags: [
    {
      tag: 'Knee OA pattern',
      matches: (a) => asArray(a['Q1.1']).includes('Knee — one or both'),
    },
    {
      tag: 'Hip OA pattern',
      matches: (a) => asArray(a['Q1.1']).includes('Hip — one or both'),
    },
    {
      tag: 'Polyarticular',
      matches: (a) => asArray(a['Q1.1']).length >= 3,
    },
    {
      tag: 'Crepitus',
      matches: (a) =>
        asArray(a['Q2.3']).includes(
          'Grinding, crunching, or grating sensation when you move the joint (crepitus)',
        ),
    },
    {
      tag: 'Weight-load risk',
      matches: (a) => asArray(a['Q1.2']).includes('I am overweight or obese (BMI > 25)'),
    },
    {
      tag: 'Post-traumatic OA',
      matches: (a) =>
        asArray(a['Q1.2']).includes(
          'I have had a significant joint injury, ligament tear, or prior joint surgery',
        ),
    },
  ],
  routing: {
    low: {
      interpretation:
        'Early or mild OA signals. Proactive intervention at this stage has the greatest long-term impact.',
      primaryCTA: { label: 'Start Muscle Mood + joint mobility', destination: 'kriya-play', subProgram: 'muscle-mood' },
      secondaryCTA: { label: 'Read: "OA prevention guide"', destination: 'myo-ai' },
      tip: 'Weight management, regular low-impact exercise, and joint-protective strength work slow OA progression more than any medication.',
    },
    moderate: {
      interpretation:
        'Established OA pattern with meaningful functional limitation. A structured exercise programme is the evidence-based first line.',
      primaryCTA: { label: 'Begin Kriya Care — OA programme', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI about OA management', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'Avoid the rest-and-medicate pattern. Loading the joint progressively under guidance is what restores function.',
    },
    high: {
      interpretation:
        'Significant OA burden with major functional impact. Specialist orthopaedic or rheumatology review is appropriate.',
      primaryCTA: { label: 'See a specialist', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Even at this stage, structured exercise has a substantial effect on pain and function — including pre/post any surgical option.',
    },
  },
};

export default osteoarthritis;
