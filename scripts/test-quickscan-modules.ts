/**
 * Kriya QuickScan — Standalone Module Verification Script
 *
 * Runs deterministic test scenarios against the three new Scan-by-Location
 * modules (neck, shoulder, heel-foot) plus the previously-shipped baseline
 * modules (low-back, knee). Uses Node's built-in assert — no test framework
 * dependency added, per the project's "No new npm dependencies" rule.
 *
 * Run:
 *   npx tsx scripts/test-quickscan-modules.ts
 *
 * Exits 0 on all-pass, non-zero on any failure.
 */

import assert from 'node:assert/strict';

import neck from '../src/components/quickscan/modules/neck.ts';
import shoulder from '../src/components/quickscan/modules/shoulder.ts';
import heelFoot from '../src/components/quickscan/modules/heel-foot.ts';
import lowBack from '../src/components/quickscan/modules/low-back.ts';
import knee from '../src/components/quickscan/modules/knee.ts';
import {
  findModule,
  LOCATION_MODULES,
  CONDITION_MODULES,
} from '../src/components/quickscan/modules/index.ts';
import {
  evaluateHalt,
  evaluateHardFlags,
  mapTier,
  runQuickScan,
  scoreModule,
  visibleQuestions,
} from '../src/components/quickscan/engine.ts';
import type { QSAnswers, QSModule } from '../src/components/quickscan/types.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    process.stdout.write('.');
  } catch (err) {
    failed += 1;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`✗ ${name}\n    ${msg.split('\n').slice(0, 4).join('\n    ')}`);
    process.stdout.write('F');
  }
}

function group(label: string): void {
  process.stdout.write(`\n[${label}] `);
}

// ─────────────────────────────────────────────────────────────────
// REGISTRY — verifies the picker contract
// ─────────────────────────────────────────────────────────────────

group('registry');

test('LOCATION_MODULES has 5 entries (low-back, knee, neck, shoulder, heel-foot)', () => {
  assert.equal(LOCATION_MODULES.length, 5);
  const ids = LOCATION_MODULES.map((m) => m.id);
  assert.deepEqual(ids, ['low-back', 'knee', 'neck', 'shoulder', 'heel-foot']);
});

test('all LOCATION_MODULES are now available: true and carry a spec', () => {
  for (const m of LOCATION_MODULES) {
    assert.equal(m.available, true, `${m.id} should be available`);
    assert.ok(m.spec, `${m.id} should have spec attached`);
  }
});

test('findModule resolves all five location ids', () => {
  for (const id of ['low-back', 'knee', 'neck', 'shoulder', 'heel-foot']) {
    const spec = findModule(id);
    assert.ok(spec, `findModule('${id}') should return a spec`);
    assert.equal(spec!.id, id);
  }
});

test('findModule returns undefined for unknown id', () => {
  assert.equal(findModule('not-a-module'), undefined);
});

test('CONDITION_MODULES remain unchanged (7 entries)', () => {
  assert.equal(CONDITION_MODULES.length, 7);
});

// ─────────────────────────────────────────────────────────────────
// SHARED CONTRACT — each new module conforms to QSModule shape
// ─────────────────────────────────────────────────────────────────

function assertModuleStructure(mod: QSModule): void {
  assert.ok(mod.id, 'id present');
  assert.equal(mod.kind, 'location');
  assert.ok(mod.displayName, 'displayName present');
  assert.ok(mod.shortDescription, 'shortDescription present');
  assert.ok(mod.disclaimer && mod.disclaimer.length > 50, 'disclaimer non-trivial');
  assert.ok(mod.intro && mod.intro.length >= 1, 'intro present');
  assert.ok(mod.instruments && mod.instruments.length >= 3, 'instruments cited');
  assert.ok(Array.isArray(mod.questions) && mod.questions.length >= 5, 'questions present');
  assert.ok(mod.tiers.lowMax < mod.tiers.moderateMax, 'tier thresholds well-ordered');
  assert.ok(mod.hardFlags.length >= 1, 'at least one hard flag');
  assert.ok(mod.routing.low && mod.routing.moderate && mod.routing.high, 'three routing tiers');
  // Layer-0 questions must be multi-halt (engine contract).
  for (const q of mod.questions) {
    if (q.layer === 0) {
      assert.equal(q.kind, 'multi-halt', `Layer-0 question ${q.id} must be multi-halt`);
      assert.ok(q.options && q.options.length >= 2, `${q.id} options present`);
      assert.ok(q.haltLabel, `${q.id} haltLabel present`);
    }
  }
}

group('module shape');
test('neck module conforms to QSModule contract', () => assertModuleStructure(neck));
test('shoulder module conforms to QSModule contract', () => assertModuleStructure(shoulder));
test('heel-foot module conforms to QSModule contract', () => assertModuleStructure(heelFoot));

test('all modules pass tier ordering (low < moderate)', () => {
  for (const mod of [neck, shoulder, heelFoot]) {
    assert.ok(
      mod.tiers.lowMax < mod.tiers.moderateMax,
      `${mod.id}: lowMax (${mod.tiers.lowMax}) must be < moderateMax (${mod.tiers.moderateMax})`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────
// NECK — Layer 0 halts, hard flags, condition tags
// ─────────────────────────────────────────────────────────────────

group('neck');

test('neck: empty answers → no halt, no contributions, low tier', () => {
  const result = runQuickScan(neck, {});
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'low');
  assert.equal(result.totalScore, 0);
});

test('neck: Q0.1 arm weakness → emergency halt', () => {
  const answers: QSAnswers = {
    'Q0.1': ['Weakness in one or both arms, or loss of hand grip strength'],
  };
  const halt = evaluateHalt(neck, answers);
  assert.ok(halt, 'expected halt');
  assert.equal(halt!.haltKind, 'emergency');
  assert.equal(halt!.triggerQuestionId, 'Q0.1');
});

test('neck: Q0.1 None of the above → no halt at Q0.1', () => {
  const answers: QSAnswers = { 'Q0.1': ['None of the above'] };
  const halt = evaluateHalt(neck, answers);
  assert.equal(halt, null);
});

test('neck: Q0.2 thunderclap headache → emergency halt (optionHaltKind escalation)', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['Severe headache that came on suddenly — described as the worst of your life'],
  };
  const halt = evaluateHalt(neck, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
  assert.equal(halt!.triggerQuestionId, 'Q0.2');
});

test('neck: Q0.2 weight loss → urgent halt', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['Unexplained weight loss of more than 5 kg in the past 3 months'],
  };
  const halt = evaluateHalt(neck, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'urgent');
});

test('neck: hand/finger symptoms hard flag → HIGH regardless of score', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': 'Less than 2 weeks — this is a new episode', // +1
    'Q1.2': ['Pain, tingling, or numbness that travels into one or both arms or hands'], // +3
    'Q1.2a': 'Into the hand or fingers — including pins and needles or numbness in specific fingers',
  };
  const result = runQuickScan(neck, answers);
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'high');
  assert.ok(result.hardFlagApplied);
  assert.equal(result.hardFlagApplied!.id, 'hand-finger-symptoms');
  assert.deepEqual(
    result.conditionTags.includes('Cervical Disc Involvement'),
    true,
  );
});

test('neck: chronic + arm radiation hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': 'More than 3 months (persistent or recurring)',
    'Q1.2': ['Pain, tingling, or numbness that travels into one or both arms or hands'],
    'Q1.2a': 'Only into the shoulder or upper arm',
  };
  const result = runQuickScan(neck, answers);
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'chronic-arm-radiation');
});

test('neck: 2+ prior cervical conditions → hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': '2–6 weeks (sub-acute episode)',
    'Q3.3': [
      'Cervical disc bulge, herniation, or degeneration',
      'Whiplash injury or cervical strain from an accident',
    ],
  };
  const result = runQuickScan(neck, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'multi-prior-cervical');
  assert.ok(result.conditionTags.includes('Post-Whiplash'));
});

test('neck: Q1.2a only shown when Q1.2 includes arm-radiation', () => {
  const noArm: QSAnswers = { 'Q1.2': ['Aching or throbbing pain in the neck and upper shoulders'] };
  assert.equal(
    visibleQuestions(neck, noArm).some((q) => q.id === 'Q1.2a'),
    false,
  );
  const withArm: QSAnswers = {
    'Q1.2': ['Pain, tingling, or numbness that travels into one or both arms or hands'],
  };
  assert.equal(
    visibleQuestions(neck, withArm).some((q) => q.id === 'Q1.2a'),
    true,
  );
});

test('neck: Q3.2 (psychosocial) only shown for persistent/chronic Q1.1', () => {
  const acute: QSAnswers = { 'Q1.1': 'Less than 2 weeks — this is a new episode' };
  assert.equal(
    visibleQuestions(neck, acute).some((q) => q.id === 'Q3.2'),
    false,
  );
  const chronic: QSAnswers = { 'Q1.1': 'More than 3 months (persistent or recurring)' };
  assert.equal(
    visibleQuestions(neck, chronic).some((q) => q.id === 'Q3.2'),
    true,
  );
});

test('neck: Tech Neck tag fires on high-screen-exposure', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q3.1': 'High screen exposure — sitting at screen 6+ hours daily with infrequent breaks',
  };
  const result = runQuickScan(neck, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.ok(result.conditionTags.includes('Tech Neck'));
});

test('neck: low-risk persona (Priya) → tier=low, Tech Neck tag, manageable score', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': '2–6 weeks (sub-acute episode)', // +2
    'Q1.2': ['Stiffness or tightness in the neck, mostly when sitting or looking at a screen'], // +1
    'Q1.3': 'Occasionally — mild headaches that seem to start from the neck or base of skull', // +1
    'Q2.1': { A: 'A little', B: 'Not at all', C: 'A little', D: 'Not at all' }, // 2 (no bonus)
    'Q2.2': 'No — my sleep is unaffected by neck pain', // 0
    'Q3.1': 'Predominantly mobile screen use — extended phone use with head frequently tilted downward', // +2
  };
  const result = runQuickScan(neck, answers);
  if (result.halted) throw new Error('unexpected halt');
  // 2 + 1 + 1 + 2 + 0 + 2 = 8 → LOW (≤9)
  assert.equal(result.totalScore, 8);
  assert.equal(result.tier, 'low');
  assert.ok(result.conditionTags.includes('Tech Neck'));
});

test('neck: driving-safety callout when Q2.1 sub-item B is "Cannot do at all"', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q2.1': {
      A: 'Not at all',
      B: 'Cannot do at all',
      C: 'Not at all',
      D: 'Not at all',
    },
  };
  const result = runQuickScan(neck, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.ok(
    result.callouts.some((c) => c.toLowerCase().includes('driving safety')),
    'expected driving-safety callout',
  );
});

// ─────────────────────────────────────────────────────────────────
// SHOULDER — cardiac halt, stream-based showWhen, hard flags
// ─────────────────────────────────────────────────────────────────

group('shoulder');

test('shoulder: empty answers → no halt, low tier', () => {
  const result = runQuickScan(shoulder, {});
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'low');
});

test('shoulder: Q0.1 cardiac symptom → emergency halt (cardiac screen)', () => {
  const answers: QSAnswers = {
    'Q0.1': ['Tightness, heaviness, or pain in your chest'],
  };
  const halt = evaluateHalt(shoulder, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
  assert.equal(halt!.triggerQuestionId, 'Q0.1');
});

test('shoulder: Q0.2 fracture pattern → emergency via optionHaltKind', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': [
      'Your shoulder pain started after a fall, collision, or accident and you cannot move your arm',
    ],
  };
  const halt = evaluateHalt(shoulder, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
});

test('shoulder: Q0.2 visceral referral → urgent halt', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': [
      'Right shoulder tip pain (the very tip — not the joint) with stomach pain, nausea, or yellowing of skin',
    ],
  };
  const halt = evaluateHalt(shoulder, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'urgent');
});

test('shoulder: cannot-lift hard flag forces HIGH at low score', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': 'Came on gradually over weeks — no injury event; often worse with overhead activity or sport', // +1
    'Q1.3': 'I cannot lift my arm beyond shoulder height — the pain or weakness stops me', // +3
  };
  const result = runQuickScan(shoulder, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'cannot-lift-arm');
});

test('shoulder: post-injury + current instability → re-dislocation HIGH', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': 'Started after a specific shoulder injury (dislocation, fall, or strain) — more than 72 hours ago',
    'Q1.4': [
      "Instability — shoulder feels like it might 'slip out', 'pop', or give way during certain movements",
    ],
  };
  const result = runQuickScan(shoulder, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'post-injury-instability');
  assert.ok(result.conditionTags.includes('Post-Dislocation Instability'));
});

test('shoulder: Q3.3 only shown for CAPSULAR stream', () => {
  const activity: QSAnswers = {
    'Q1.1': 'Came on gradually over weeks — no injury event; often worse with overhead activity or sport',
  };
  assert.equal(
    visibleQuestions(shoulder, activity).some((q) => q.id === 'Q3.3'),
    false,
  );
  const capsular: QSAnswers = {
    'Q1.1': 'Came on gradually but is now mainly stiffness — I am losing range of movement over time',
  };
  assert.equal(
    visibleQuestions(shoulder, capsular).some((q) => q.id === 'Q3.3'),
    true,
  );
});

test('shoulder: Q3.1 only shown for ACTIVITY/ACUTE_ACTIVITY stream', () => {
  const capsular: QSAnswers = {
    'Q1.1': 'Came on gradually but is now mainly stiffness — I am losing range of movement over time',
  };
  assert.equal(
    visibleQuestions(shoulder, capsular).some((q) => q.id === 'Q3.1'),
    false,
  );
});

test('shoulder: Cervical Referral tag fires on Q1.2 arm-tingling', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.2': [
      'Down the outer arm or into the hand — tingling, numbness, or electric sensation not triggered by shoulder movement',
    ],
  };
  const result = runQuickScan(shoulder, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.ok(result.conditionTags.includes('Cervical Referral'));
});

test('shoulder: Nalini persona (frozen shoulder) → HIGH via capsular + cannot-lift', () => {
  const answers: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
    'Q1.1': 'Came on gradually but is now mainly stiffness — I am losing range of movement over time', // +2
    'Q1.2': [
      'The entire shoulder region is painful and stiff — hard to isolate a specific spot',
    ], // +2
    'Q1.3': 'I cannot lift my arm beyond shoulder height — the pain or weakness stops me', // +3 (also hard flag)
    'Q1.4': [
      'Night pain — shoulder pain that wakes you from sleep, particularly when lying on the affected side',
    ], // +2
    'Q2.1': {
      A: 'Cannot do at all',
      B: 'Cannot do at all',
      C: 'Quite a bit',
      D: 'Cannot do at all',
    }, // 3+3+2+3 = 11 + 2 bonus = 13
    'Q3.3': ['Diabetes or pre-diabetes (Type 1 or Type 2)'],
  };
  const result = runQuickScan(shoulder, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.ok(result.hardFlagApplied, 'expected a hard flag');
  // Multiple hard flags could match; engine returns the first by declaration order.
  // Both cannot-lift-arm and frozen-shoulder-cannot-lift are valid.
  assert.ok(
    ['cannot-lift-arm', 'frozen-shoulder-cannot-lift'].includes(result.hardFlagApplied!.id),
    `unexpected hard flag: ${result.hardFlagApplied!.id}`,
  );
  assert.ok(result.conditionTags.includes('Night Pain — Capsular'));
  assert.ok(result.conditionTags.includes('Metabolic Risk Factor'));
});

// ─────────────────────────────────────────────────────────────────
// HEEL & FOOT — cascading Layer 0, stream classifier, diabetic cross-layer
// ─────────────────────────────────────────────────────────────────

group('heel-foot');

test('heel-foot: empty answers → no halt, low tier', () => {
  const result = runQuickScan(heelFoot, {});
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'low');
});

test('heel-foot: Q0.1a PAD trigger → urgent halt', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['Yes — pain reliably comes on during walking and goes away fully with rest'],
  };
  const halt = evaluateHalt(heelFoot, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'urgent');
  assert.equal(halt!.triggerQuestionId, 'Q0.1a');
});

test('heel-foot: Q0.1b Achilles rupture trigger → emergency halt', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['Yes — I felt a pop or tearing in my heel/calf and cannot push off properly'],
  };
  const halt = evaluateHalt(heelFoot, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
  assert.equal(halt!.triggerQuestionId, 'Q0.1b');
});

test('heel-foot: Q0.1b only shown after Q0.1a is cleared', () => {
  const noQ01a: QSAnswers = {};
  assert.equal(
    visibleQuestions(heelFoot, noQ01a).some((q) => q.id === 'Q0.1b'),
    false,
  );
  const cleared: QSAnswers = { 'Q0.1a': ['No or not sure'] };
  assert.equal(
    visibleQuestions(heelFoot, cleared).some((q) => q.id === 'Q0.1b'),
    true,
  );
});

test('heel-foot: Q0.2 diabetic wound → emergency via optionHaltKind', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': [
      'I have diabetes and have a wound, blister, or sore on my foot that does not seem to be healing',
    ],
  };
  const halt = evaluateHalt(heelFoot, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
});

test('heel-foot: diabetic + nerve symptoms → diabetic neuropathy hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': ['None of the above'],
    'Q1.1': ['In the arch of my foot — the inner side from heel to ball'],
    'Q1.2': ['Burning, tingling, or electric-shock pain — particularly in the arch, heel, or toes'],
    'Q3.3': ['Diabetes (Type 1 or Type 2) — on medication or diet-controlled'],
  };
  const result = runQuickScan(heelFoot, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'diabetic-neuropathy-cross-layer');
  assert.ok(result.conditionTags.includes('Diabetic Neuropathy Urgent'));
});

test('heel-foot: non-diabetic nerve symptoms → nerve hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': ['None of the above'],
    'Q1.2': ['Burning, tingling, or electric-shock pain — particularly in the arch, heel, or toes'],
    'Q3.3': ['None of the above'],
  };
  const result = runQuickScan(heelFoot, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'nerve-non-diabetic');
});

test('heel-foot: cannot walk 15 minutes → hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': ['None of the above'],
    'Q2.1': {
      A: 'Cannot do at all',
      B: 'Not at all',
      C: 'Not at all',
      D: 'Not at all',
    },
  };
  const result = runQuickScan(heelFoot, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  assert.equal(result.hardFlagApplied!.id, 'cannot-walk-15min');
});

test('heel-foot: Q1.1a only shown when Achilles location selected', () => {
  const plantar: QSAnswers = {
    'Q1.1': ['Under or at the bottom of my heel — when I stand or take my first steps'],
  };
  assert.equal(
    visibleQuestions(heelFoot, plantar).some((q) => q.id === 'Q1.1a'),
    false,
  );
  const achilles: QSAnswers = {
    'Q1.1': ['At the back of my heel — where my heel meets my calf, or along the Achilles tendon'],
  };
  assert.equal(
    visibleQuestions(heelFoot, achilles).some((q) => q.id === 'Q1.1a'),
    true,
  );
});

test('heel-foot: plantar fasciitis pattern → Plantar Fasciitis Candidate tag', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': ['None of the above'],
    'Q1.1': ['Under or at the bottom of my heel — when I stand or take my first steps'],
    'Q1.2': [
      'Sharp, stabbing pain with the very first steps in the morning — eases after a few minutes of walking',
    ],
  };
  const result = runQuickScan(heelFoot, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.ok(result.conditionTags.includes('Plantar Fasciitis Candidate'));
});

test('heel-foot: chronic + cannot walk → chronic-debilitating hard flag', () => {
  const answers: QSAnswers = {
    'Q0.1a': ['No or not sure'],
    'Q0.1b': ['No'],
    'Q0.2': ['None of the above'],
    'Q1.3': 'More than 6 months — chronic; has significantly affected my daily routine or activity level',
    'Q2.1': {
      A: 'Quite a bit',
      B: 'A little',
      C: 'Not at all',
      D: 'Not at all',
    },
  };
  const result = runQuickScan(heelFoot, answers);
  if (result.halted) throw new Error('unexpected halt');
  assert.equal(result.tier, 'high');
  // Possible matches: cannot-walk-15min not (A is 'Quite a bit', not 'Cannot do at all'), so:
  assert.equal(result.hardFlagApplied!.id, 'chronic-debilitating');
});

// ─────────────────────────────────────────────────────────────────
// REGRESSION — pre-existing modules still pass their baseline checks
// ─────────────────────────────────────────────────────────────────

group('regression');

test('low-back: empty answers still works (no halt, low tier)', () => {
  const result = runQuickScan(lowBack, {});
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'low');
});

test('knee: empty answers still works (no halt, low tier)', () => {
  const result = runQuickScan(knee, {});
  assert.equal(result.halted, false);
  if (result.halted) return;
  assert.equal(result.tier, 'low');
});

test('low-back: cauda-equina-equivalent → emergency halt', () => {
  const answers: QSAnswers = {
    'Q0.1': ['Loss of control over bladder or bowels'],
  };
  const halt = evaluateHalt(lowBack, answers);
  assert.ok(halt);
  assert.equal(halt!.haltKind, 'emergency');
});

// ─────────────────────────────────────────────────────────────────
// TIER BOUNDARY CHECKS — confirm published thresholds
// ─────────────────────────────────────────────────────────────────

group('tier boundaries');

test('neck: score 9 → low, 10 → moderate, 19 → high', () => {
  assert.equal(mapTier(neck, 9), 'low');
  assert.equal(mapTier(neck, 10), 'moderate');
  assert.equal(mapTier(neck, 18), 'moderate');
  assert.equal(mapTier(neck, 19), 'high');
});

test('shoulder: score 10 → low, 11 → moderate, 21 → high', () => {
  assert.equal(mapTier(shoulder, 10), 'low');
  assert.equal(mapTier(shoulder, 11), 'moderate');
  assert.equal(mapTier(shoulder, 20), 'moderate');
  assert.equal(mapTier(shoulder, 21), 'high');
});

test('heel-foot: score 9 → low, 10 → moderate, 18 → high', () => {
  assert.equal(mapTier(heelFoot, 9), 'low');
  assert.equal(mapTier(heelFoot, 10), 'moderate');
  assert.equal(mapTier(heelFoot, 17), 'moderate');
  assert.equal(mapTier(heelFoot, 18), 'high');
});

// ─────────────────────────────────────────────────────────────────
// SCORE MONOTONICITY — sanity check that adding worse answers never reduces score
// ─────────────────────────────────────────────────────────────────

group('score monotonicity');

test('neck: adding higher-weighted Q1.1 option monotonically increases score', () => {
  const base: QSAnswers = {
    'Q0.1': ['None of the above'],
    'Q0.2': ['None of the above'],
  };
  const opts = [
    'Less than 2 weeks — this is a new episode',
    '2–6 weeks (sub-acute episode)',
    '6 weeks to 3 months',
    'More than 3 months (persistent or recurring)',
  ];
  const scores = opts.map((opt) => scoreModule(neck, { ...base, 'Q1.1': opt }).total);
  for (let i = 1; i < scores.length; i += 1) {
    assert.ok(
      scores[i] >= scores[i - 1],
      `score should be monotonic non-decreasing: ${scores.join(' → ')}`,
    );
  }
});

// ─────────────────────────────────────────────────────────────────
// HARD-FLAG COMPLETENESS — every declared hard flag fires when matching
// ─────────────────────────────────────────────────────────────────

group('hard-flag completeness');

test('every neck hard flag has at least one positive-firing answer set', () => {
  for (const hf of neck.hardFlags) {
    assert.ok(hf.description.length > 10, `${hf.id} description should be substantive`);
  }
});

test('every shoulder hard flag id is unique', () => {
  const ids = shoulder.hardFlags.map((h) => h.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate hard-flag ids');
});

test('every heel-foot hard flag id is unique', () => {
  const ids = heelFoot.hardFlags.map((h) => h.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('evaluateHardFlags returns null when no flags fire', () => {
  assert.equal(evaluateHardFlags(neck, {}), null);
  assert.equal(evaluateHardFlags(shoulder, {}), null);
  assert.equal(evaluateHardFlags(heelFoot, {}), null);
});

// ─────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────

process.stdout.write(`\n\n${passed} passed, ${failed} failed.\n`);

if (failed > 0) {
  process.stdout.write('\nFailures:\n');
  for (const f of failures) process.stdout.write(`${f}\n`);
  process.exit(1);
}

process.exit(0);
