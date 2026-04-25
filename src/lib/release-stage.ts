/**
 * Kriya CDE — Release-stage gating.
 *
 * Single source of truth for whether the deployed build is a pre-release
 * (clinical UAT) or live production.  Flipping `NEXT_PUBLIC_KRIYA_RELEASE_STAGE`
 * from 'uat' to 'prod' removes every pre-release marker (banner, blockers
 * panel, footer chip) without touching any other code.
 *
 * Stages:
 *   'uat'        — Clinical UAT.  Banner + blockers visible.  Default.
 *   'prod'       — Public production.  No pre-release markers.
 *
 * Anything else falls back to 'uat' (fail-safe — never accidentally show
 * a prod-clean build with unverified clinical content).
 *
 * IMPORTANT — production go-live checklist:
 *   1. Clinician sign-off on Kriya_CDE_Pain_Risk_Assessment_v4.1.pdf annex.
 *   2. FINDING-1 adjudicated (Peripheral Neuropathy +10 weights).
 *   3. Worked-example replay test in CI (Part VIII reconstructability).
 *   4. Persistent audit-log writer wired (Part VIII artefacts).
 *   5. Meta-request UI handlers in DiagnosticsChat (Part I.2 mandate 1).
 *   6. End-to-end chat-flow walkthrough on a fresh browser session.
 *   7. Annex C knee scoring matrices ready (16 pending) — or knee region
 *      gated separately to "specialist consult only" until they arrive.
 *
 * Only when ALL seven items above are signed off, set
 *   NEXT_PUBLIC_KRIYA_RELEASE_STAGE=prod
 * in the production environment and redeploy.
 */

export type ReleaseStage = 'uat' | 'prod';

export function getReleaseStage(): ReleaseStage {
  const raw = process.env.NEXT_PUBLIC_KRIYA_RELEASE_STAGE;
  if (raw === 'prod') return 'prod';
  return 'uat';
}

export function isPreRelease(): boolean {
  return getReleaseStage() !== 'prod';
}

/**
 * Open blockers shown to the clinical UAT team on every result card so they
 * can adjudicate against what they see.  Update this list as items close.
 * When the array is empty AND stage=prod, the panel disappears completely.
 */
export const OPEN_BLOCKERS: Array<{ id: string; severity: 'block' | 'review'; title: string; detail: string }> = [
  {
    id: 'B1',
    severity: 'block',
    title: 'Clinician sign-off pending',
    detail:
      'The 18-item sign-off page in the v4.1 spec annex has not been signed. Until it is, the engine is not approved for patient-facing use.',
  },
  {
    id: 'B2',
    severity: 'block',
    title: 'FINDING-1: Peripheral Neuropathy weights',
    detail:
      'L030601.A=+10, L030901.A=+10, L190202.A=+10 in Peripheral Neuropathy dominate the worked example. Spec footnote (Part VII) acknowledges the example is illustrative; clinician must adjudicate whether these weights are intended.',
  },
  {
    id: 'B3',
    severity: 'review',
    title: 'Reconstructability test not in CI',
    detail:
      'Part VIII contract requires byte-for-byte replay. Validated by Python replay; Vitest equivalent against runEngine() not yet committed.',
  },
  {
    id: 'B4',
    severity: 'review',
    title: 'No persistent audit-log writer',
    detail:
      'Engine populates trace/gates/engineVersion in the result envelope but no session-store writer exists yet. Audit content visible in this UAT panel; not retrievable post-session.',
  },
  {
    id: 'B5',
    severity: 'review',
    title: 'Meta-request UI not wired',
    detail:
      '/api/extract returns metaRequest, qualitative, and ambiguous (Part I.2 mandate). Orchestrator currently consumes only patches + notes. "Go back" / "skip" / "end session" typed by user are silently ignored in the UI.',
  },
  {
    id: 'B6',
    severity: 'review',
    title: 'Knee region partial — 5 of 21 matrices',
    detail:
      'Spec Annex C lists 16 pending knee scoring matrices. Knee primary-region (rows I/J) currently scores against only 5 conditions — 4 RED-flag + 1 GREEN. Clinical coverage is thin until the remaining 16 arrive.',
  },
];
