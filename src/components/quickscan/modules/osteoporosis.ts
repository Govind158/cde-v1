/**
 * Kriya QuickScan — Osteoporosis Module
 * PRD: docs/Kriya Scan/QuickScan by Condition/kriya_quickscan_osteoporosis_prd_v1.docx
 * Validation: NICE CG146, FRAX, IOF One-Minute Test, OSTA, Garvan, ISCD.
 * Tiers: LOW 0-6, MOD 7-14, HIGH 15+ or hard flag.
 *
 * Risk-factor-dominant model. Single Layer-0 fracture screen.
 */

import { asArray, asString } from '../engine';
import type { QSModule } from '../types';

const Q33_FALLS_D = 'Yes — one or more falls in the past 12 months';
const Q33_FALLS_E = 'I feel unsteady on my feet, have poor balance, or use a walking aid';

const osteoporosis: QSModule = {
  id: 'osteoporosis',
  kind: 'condition',
  displayName: 'Osteoporosis',
  shortDescription: 'Low bone density risk — fragility fracture risk profile.',
  estimatedMinutes: 3,
  accent: '#a855f7',
  instruments: ['NICE CG146', 'FRAX', 'IOF One-Minute Test', 'OSTA', 'Garvan'],
  disclaimer:
    'Kriya QuickScan is a self-reported wellness risk tool and does not constitute a medical diagnosis. Definitive osteoporosis diagnosis requires a DEXA scan. Please consult a qualified clinician.',
  intro: [
    'QuickScan — Osteoporosis. Bone-density loss is silent until a fracture occurs. This 2-3 minute scan estimates your risk profile.',
    "We'll start with a fracture screen, then ask about your risk factors and any signs of bone loss you may have noticed.",
  ],
  questions: [
    {
      id: 'Q0.1',
      layer: 0,
      kind: 'multi-halt',
      prompt:
        'Are you currently experiencing or have you recently experienced any of the following?',
      helper: 'Tick all that apply, or "None of the above".',
      source: 'NICE CG146 fracture recognition; IOF Q7; Garvan height loss',
      haltLabel: 'None of the above',
      haltKind: 'urgent',
      optionHaltKind: {
        'A bone fracture from a minor fall, bump, or impact that would not normally break a bone':
          'urgent',
        'Hip pain after a fall, even a minor one, in the past 2 weeks': 'emergency',
      },
      options: [
        {
          label:
            'A bone fracture from a minor fall, bump, or impact that would not normally break a bone',
          points: 0,
        },
        {
          label: 'Sudden severe back or spine pain that came on without significant injury',
          points: 0,
        },
        {
          label: 'You have lost more than 3 cm in height compared to your tallest adult height',
          points: 0,
        },
        {
          label: 'A noticeable forward stoop or hunch in your upper back, recently developed or worsened',
          points: 0,
        },
        { label: 'Hip pain after a fall, even a minor one, in the past 2 weeks', points: 0 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.1',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Demographic and hormonal — which of these apply? (Select all)',
      source: 'FRAX age/sex; IOF Q1; ISCD criteria',
      options: [
        { label: 'I am a woman who went through menopause before age 45, or am post-menopausal', points: 2 },
        { label: 'I am a man aged 70 or above', points: 2 },
        { label: 'Woman aged 55–70 or man aged 60–70', points: 1 },
        { label: 'I have had both ovaries removed (oophorectomy)', points: 2 },
        { label: 'Irregular or absent periods for more than 12 months (not pregnancy/menopause)', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q1.2',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Have you been diagnosed with or treated for any of the following?',
      source: 'FRAX secondary causes; IOF Q9-Q11',
      options: [
        { label: 'Rheumatoid arthritis', points: 2 },
        { label: 'Long-term steroid use (cortisone / prednisolone) > 3 months', points: 3 },
        { label: 'Hyperthyroidism or thyroxine medication > 5 years', points: 2 },
        { label: 'Type 1 / insulin-dependent diabetes', points: 2 },
        { label: 'Coeliac, Crohn\'s, or other absorption-affecting condition', points: 1 },
        { label: 'Chronic kidney or liver disease', points: 1 },
      ],
    },
    {
      id: 'Q1.3',
      layer: 1,
      kind: 'multi-scored',
      prompt: 'Family history & prior fracture?',
      source: 'FRAX parental hip / prior fracture; IOF Q5/Q7',
      options: [
        { label: 'A parent had a hip fracture', points: 2 },
        { label: 'Osteoporosis runs in my family (parent or sibling diagnosed)', points: 1 },
        { label: 'I have previously broken a bone from a minor fall (a fragility fracture)', points: 3 },
        { label: 'More than one fracture in adulthood from minor impacts', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q2.1',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Diet & lifestyle — which apply? (Select all)',
      source: 'FRAX smoking/alcohol; IOF Q2/Q3',
      options: [
        { label: 'Little or no dairy and no calcium supplement', points: 1 },
        { label: 'Lactose intolerant or vegan without active calcium substitution', points: 1 },
        { label: 'Indoors most of the day; less than 20 minutes of direct sunlight daily', points: 1 },
        { label: 'No Vitamin D supplement; never had Vitamin D levels checked', points: 1 },
        { label: 'Current smoker or smoked regularly in the past', points: 2 },
        { label: 'More than 14 units of alcohol per week', points: 1 },
      ],
    },
    {
      id: 'Q2.2',
      layer: 2,
      kind: 'single-scored',
      prompt: 'Physical activity & balance?',
      source: 'NOF exercise guidelines; Garvan falls items',
      options: [
        {
          label:
            'Regular weight-bearing exercise (walking, running, dancing, strength) at least 3×/week',
          points: 0,
        },
        { label: 'Moderately active — some walking, no structured programme', points: 1 },
        { label: 'Largely sedentary — minimal physical activity beyond housework', points: 2 },
      ],
    },
    {
      id: 'Q2.3',
      layer: 2,
      kind: 'multi-scored',
      prompt: 'Falls & balance — any of the following?',
      source: 'IOF Q6; Garvan falls items',
      options: [
        { label: Q33_FALLS_D, points: 1 },
        { label: Q33_FALLS_E, points: 1 },
        { label: 'No falls or balance concerns', points: 0 },
      ],
    },
    {
      id: 'Q3.1',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Have you noticed any of the following changes over the past few years?',
      source: 'IOF Q8/Q9; NICE CG146 vertebral fracture recognition',
      options: [
        { label: 'I appear to have lost height — family/friends have commented', points: 2 },
        { label: 'A noticeable forward stoop or rounded upper back (kyphosis) developing', points: 2 },
        { label: 'Clothes fit differently — waist appears shorter or clothes bunch around middle', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
    {
      id: 'Q3.2',
      layer: 3,
      kind: 'multi-scored',
      prompt: 'Body build & current symptoms?',
      source: 'FRAX body weight; OSTA; NICE vertebral fracture pain pattern',
      options: [
        { label: 'Small or slim body frame; always been on the lighter side', points: 1 },
        { label: 'Lost > 10% of body weight in the past 2 years without trying', points: 1 },
        { label: 'Back pain that is worse upright and better lying down', points: 1 },
        { label: 'Persistent mid-back / thoracic pain not explained by muscle or disc', points: 1 },
        { label: 'None of the above', points: 0 },
      ],
    },
  ],
  tiers: { lowMax: 6, moderateMax: 14 },
  hardFlags: [
    {
      id: 'prior-fragility-fracture',
      description: 'Q1.3 — prior fragility fracture → moderate floor',
      matches: (a) =>
        asArray(a['Q1.3']).includes(
          'I have previously broken a bone from a minor fall (a fragility fracture)',
        ),
    },
    {
      id: 'height-loss-or-kyphosis',
      description: 'Q3.1 — height loss or kyphosis → moderate floor',
      matches: (a) => {
        const sel = asArray(a['Q3.1']);
        return (
          sel.includes('I appear to have lost height — family/friends have commented') ||
          sel.includes('A noticeable forward stoop or rounded upper back (kyphosis) developing')
        );
      },
    },
    {
      id: 'steroid-postmen',
      description: 'Q1.2 long-term steroid + Q1.1 post-menopausal/elderly male → high',
      matches: (a) => {
        const meds = asArray(a['Q1.2']).includes(
          'Long-term steroid use (cortisone / prednisolone) > 3 months',
        );
        const dem = asArray(a['Q1.1']);
        const high = dem.includes(
          'I am a woman who went through menopause before age 45, or am post-menopausal',
        ) || dem.includes('I am a man aged 70 or above');
        return meds && high;
      },
    },
  ],
  conditionTags: [
    {
      tag: 'Falls risk',
      matches: (a) => {
        const sel = asArray(a['Q2.3']);
        return sel.includes(Q33_FALLS_D) || sel.includes(Q33_FALLS_E);
      },
    },
    {
      tag: 'Vertebral symptom',
      matches: (a) => {
        const sel = asArray(a['Q3.2']);
        return (
          sel.includes('Back pain that is worse upright and better lying down') ||
          sel.includes('Persistent mid-back / thoracic pain not explained by muscle or disc')
        );
      },
    },
    {
      tag: 'Calcium / Vit D risk cluster',
      matches: (a) => {
        const sel = asArray(a['Q2.1']);
        return (
          sel.includes('Little or no dairy and no calcium supplement') &&
          sel.includes('Indoors most of the day; less than 20 minutes of direct sunlight daily')
        );
      },
    },
    {
      tag: 'Hormonal risk',
      matches: (a) =>
        asArray(a['Q1.1']).includes(
          'I am a woman who went through menopause before age 45, or am post-menopausal',
        ),
    },
  ],
  routing: {
    low: {
      interpretation:
        'Few or no risk factors present. Likely adequate bone health for age. Focus on bone-protective lifestyle.',
      primaryCTA: { label: 'Start Muscle Age (weight-bearing focus)', destination: 'kriya-play', subProgram: 'muscle-age' },
      secondaryCTA: { label: 'Read: "Calcium & Vitamin D essentials"', destination: 'myo-ai' },
      tip: 'Weight-bearing activity 3×/week + adequate calcium and Vitamin D is the most effective bone-protective routine at any age.',
    },
    moderate: {
      interpretation:
        'Meaningful accumulation of risk factors. DEXA scan discussion with a physician is recommended.',
      primaryCTA: { label: 'Begin Kriya Care — Bone Health', destination: 'kriya-care', subProgram: 'walk-more' },
      secondaryCTA: { label: 'Ask Myo AI about bone health', destination: 'myo-ai' },
      tertiaryCTA: { label: 'Detailed assessment with DeepScan', destination: 'deepscan' },
      tip: 'A DEXA scan is non-invasive (5-10 minutes) and provides a clear baseline for any bone-density decisions.',
    },
    high: {
      interpretation:
        'High risk-factor burden. Clinical investigation strongly indicated — DEXA scan and specialist assessment.',
      primaryCTA: { label: 'See a physician for DEXA referral', destination: 'specialist' },
      secondaryCTA: { label: 'Begin Kriya Care — Bone Health while you wait', destination: 'kriya-care' },
      tertiaryCTA: { label: 'Strongly recommended — DeepScan', destination: 'deepscan' },
      mandatoryDeepScanPrompt: true,
      tip: 'Falls prevention is as important as bone-density care here — balance training reduces fragility-fracture risk substantially.',
    },
  },
};

export default osteoporosis;
