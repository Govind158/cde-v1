/**
 * Kriya Pain Diagnostics — Humanized Insight Messages
 * Ported verbatim from App.jsx (heightInsight, bmiInsight, ACTIVITY_INSIGHTS).
 */

import type { BmiInsight, ActivityInsight } from './types';

/**
 * Returns a height-specific wellness message keyed by gender + height (cm).
 * Thresholds are the same as App.jsx — do not adjust without clinical input.
 */
export function heightInsight(h: number, g: string): string {
  const isShort =
    (g === 'Male' && h < 165) ||
    (g === 'Female' && h < 157) ||
    (g === 'Transgender' && h < 160);
  const isTall =
    (g === 'Male' && h > 178) ||
    (g === 'Female' && h > 170) ||
    (g === 'Transgender' && h > 175);
  if (isShort)
    return 'Shorter individuals have a more compact musculoskeletal structure — muscles, joints and tendons are packed into a smaller frame, requiring emphasis on flexibility and mobility. Your favourable strength-to-mass ratio means faster gains with consistent training 💪';
  if (isTall)
    return 'Your taller frame gives natural leverage during compound lifts, but maintaining form control is important. Focus on joint care, core + lower back strength, and spinal mobility. Regular breaks from desks prevent neck, back and shoulder tension 💪';
  return 'Your height provides a well-balanced frame for efficient movement. Great biomechanical advantage for compound exercises, functional movement and bodyweight control. Visible lean muscle gains are very achievable 💪';
}

/**
 * Maps BMI into a 6-band insight card with title/message/colour/emoji.
 */
export function bmiInsight(b: number): BmiInsight {
  if (b < 18.5)
    return {
      t: "Ohh! Seems you're marginally below the normal BMI range",
      m: "Your body may not be getting all the nutrients or strength it needs right now. A little support through nutrition, muscle care or expert advice can make a big difference. You've got this 💪",
      c: '#f59e0b',
      e: '😟',
    };
  if (b < 25)
    return {
      t: 'Awesome! Your BMI is in the healthy range',
      m: 'This proves you take adequate care of your body — the right balance, energy and movement. Continue nurturing it with good nutrition, regular movement and mindful muscle care. Small, consistent habits go a long way 💚',
      c: '#22c55e',
      e: '🎉',
    };
  if (b < 30)
    return {
      t: 'Uhh Ohh! Slightly above the healthy BMI range',
      m: "A BMI over 25 may put extra load on your joints and muscles. The good news? Small, consistent steps like stretching, mindful eating and staying active make a big difference. You're already on the right track 💪",
      c: '#f59e0b',
      e: '⚠️',
    };
  if (b < 35)
    return {
      t: 'Oops! Your BMI may need urgent attention',
      m: "A BMI over 30 may put strain on your muscles and joints. Even small, steady changes in activity, nutrition and rest can lead to real progress. You deserve to feel strong and we're with you 💪",
      c: '#f97316',
      e: '😬',
    };
  if (b < 40)
    return {
      t: 'This is not good! Class 2 Obese Category',
      m: 'This range can put added stress on muscles, joints and heart. But change is absolutely possible. Small, steady steps in movement, nutrition and rest can help you feel stronger. Every step counts 💪',
      c: '#ef4444',
      e: '🚨',
    };
  return {
    t: 'Our care expert will reach out to you soon',
    m: "This falls under Severe Obesity and can significantly affect muscle health, mobility and well-being. Progress starts with small, steady steps. Your journey matters — we're here to support you with compassion 💪",
    c: '#ef4444',
    e: '🚨',
  };
}

/**
 * Activity-based mini-diagnosis card shown after the L030701 (pain-with-activity) answer.
 * Keys are prefix-matched against the user's selection.
 */
export const ACTIVITY_INSIGHTS: Record<string, ActivityInsight> = {
  'Pain increases during any movement': {
    t: 'Mechanical / Structural Indicator',
    items: [
      'Lumbar disc issues (herniated or bulging disc)',
      'Facet joint irritation or arthritis',
      'Spinal stenosis or spondylolisthesis',
      'Core or hip muscle weakness',
    ],
    c: '#3b82f6',
  },
  'Pain increases in sedentary postures': {
    t: 'Postural / Muscular / Disc Indicator',
    items: [
      'Lumbar disc issues or poor posture',
      'Weak core or glutes, Piriformis syndrome',
      'Facet joint loading or postural fatigue',
      'Inflammatory conditions like Ankylosing Spondylitis',
    ],
    c: '#a855f7',
  },
  'Pain increases only while exercising': {
    t: 'Activity-Related Indicator',
    items: [
      'Muscle strain or overuse injury',
      'Ligament stress or tendinopathy',
      'Joint overloading during exercise',
    ],
    c: '#f97316',
  },
  "Pain doesn't increase": {
    t: 'Great news! 🎉',
    items: [
      "Pain not increasing with activity is a positive indicator — no active mechanical or structural aggravation detected.",
    ],
    c: '#22c55e',
  },
};

export function findActivityInsight(selection: string | undefined): ActivityInsight | null {
  if (!selection) return null;
  const key = Object.keys(ACTIVITY_INSIGHTS).find((k) =>
    selection.includes(k.substring(0, 20)),
  );
  return key ? ACTIVITY_INSIGHTS[key] ?? null : null;
}
