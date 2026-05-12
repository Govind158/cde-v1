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
 *   1. Clinician sign-off on Kriya_CDE_Pain_Risk_Assessment_v4.4.pdf annex
 *      (the 22-item sign-off page at the end of the v4.4 spec).
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
  // Production go-live: clinical team has signed off on Kriya_CDE_Pain_Risk_Assessment_v4.4.
  // Default to 'prod' so banners and UAT blockers do not appear unless an
  // operator explicitly re-enables UAT with NEXT_PUBLIC_KRIYA_RELEASE_STAGE=uat.
  if (raw === 'uat') return 'uat';
  return 'prod';
}

export function isPreRelease(): boolean {
  return getReleaseStage() !== 'prod';
}

/**
 * Open blockers were shown to the clinical UAT team on every result card so
 * they could adjudicate against what they saw.  Cleared after clinical
 * sign-off; the panel disappears completely whenever this list is empty.
 */
export const OPEN_BLOCKERS: Array<{ id: string; severity: 'block' | 'review'; title: string; detail: string }> = [];
