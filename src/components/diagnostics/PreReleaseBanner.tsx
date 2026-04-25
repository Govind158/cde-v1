/**
 * Persistent pre-release banner.  Visible on every page when
 * NEXT_PUBLIC_KRIYA_RELEASE_STAGE !== 'prod'.  Disappears entirely in prod.
 *
 * Communicates three things to anyone who reaches the app:
 *   1. This is NOT a final medical diagnostic — it is a clinical-team UAT build.
 *   2. They should not act on the result without consulting a clinician.
 *   3. The build version + open-blockers reference for clinician feedback.
 */

import { isPreRelease, getReleaseStage } from '@/lib/release-stage';
import { ENGINE_VERSION } from './types';

export default function PreReleaseBanner() {
  if (!isPreRelease()) return null;
  const stage = getReleaseStage();
  return (
    <div
      role="alert"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.20), rgba(239,68,68,0.20))',
        borderBottom: '1px solid rgba(245,158,11,0.55)',
        color: '#fde68a',
        padding: '8px 14px',
        fontSize: 12,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.35 }}>
        <span style={{ fontSize: 14 }}>⚠️</span>
        <span>
          <strong style={{ color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Clinical UAT
          </strong>
          {'  '}— Pre-release build for clinical-team testing only. Not for patient use. Results are not a diagnosis.
        </span>
      </span>
      <span
        style={{
          fontSize: 10,
          color: '#fde68a',
          opacity: 0.75,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {ENGINE_VERSION} · stage={stage}
      </span>
    </div>
  );
}
