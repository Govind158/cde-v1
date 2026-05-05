/**
 * Kriya Scan — Entry route.
 *
 * State machine for the scan flow:
 *
 *   chooser            ──→  location-picker  ──→  quickscan(<module>)  ──→  result
 *                       ├→  condition-picker ──→  quickscan(<module>)  ──→  result
 *                       └→  deepscan
 *
 * Result CTAs:
 *   - DeepScan         → switch state to 'deepscan' with deepScanRegion pre-fill
 *   - Kriya Play/Care  → toast (handled in QuickScanResult via onStubCTA)
 *
 * The page is a single client component; routing happens in-component to
 * keep transitions snappy and avoid query-param state. A hard refresh
 * always lands the user back at the chooser, which is correct for v1
 * (no resumable scan sessions yet).
 */

'use client';

import { useCallback, useState } from 'react';
import DiagnosticsChat from '@/components/diagnostics/DiagnosticsChat';
import { ScanChooser } from '@/components/scan/ScanChooser';
import type { ScanMode } from '@/components/scan/ScanChooser';
import { ModulePicker } from '@/components/scan/ModulePicker';
import { CONDITION_MODULES, LOCATION_MODULES, findModule } from '@/components/quickscan/modules';
import QuickScanRunner from '@/components/quickscan/QuickScanRunner';
import type { PatientData } from '@/components/diagnostics/types';

type Stage =
  | { kind: 'chooser' }
  | { kind: 'location-picker' }
  | { kind: 'condition-picker' }
  | { kind: 'quickscan'; moduleId: string }
  | { kind: 'deepscan'; initialData?: Partial<PatientData> };

export default function ScanPage() {
  const [stage, setStage] = useState<Stage>({ kind: 'chooser' });
  const [toast, setToast] = useState<string | null>(null);

  const goToChooser = useCallback(() => setStage({ kind: 'chooser' }), []);

  const handleChooserSelect = useCallback((mode: ScanMode) => {
    if (mode === 'quickscan-location') setStage({ kind: 'location-picker' });
    else if (mode === 'quickscan-condition') setStage({ kind: 'condition-picker' });
    else setStage({ kind: 'deepscan' });
  }, []);

  const handleModuleSelect = useCallback((moduleId: string) => {
    setStage({ kind: 'quickscan', moduleId });
  }, []);

  const handleLaunchDeepScan = useCallback((regionHint?: string) => {
    const initialData: Partial<PatientData> = regionHint
      ? { L030201: regionHint }
      : {};
    setStage({ kind: 'deepscan', initialData });
  }, []);

  const handleStubCTA = useCallback((destination: string, label: string) => {
    setToast(
      `${label} — coming soon. (${destination} integration is scheduled for v1.1.)`,
    );
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <>
      {stage.kind === 'chooser' && <ScanChooser onSelect={handleChooserSelect} />}

      {stage.kind === 'location-picker' && (
        <ModulePicker
          title="Where does it hurt?"
          subtitle="Pick the area that bothers you most. Each scan is calibrated to that location's clinical patterns."
          modules={LOCATION_MODULES}
          onSelect={handleModuleSelect}
          onBack={goToChooser}
        />
      )}

      {stage.kind === 'condition-picker' && (
        <ModulePicker
          title="Which condition?"
          subtitle="Pick a condition you have been told you have or that you suspect. We'll check the risk pattern against the validated criteria for that condition."
          modules={CONDITION_MODULES}
          onSelect={handleModuleSelect}
          onBack={goToChooser}
        />
      )}

      {stage.kind === 'quickscan' &&
        (() => {
          const mod = findModule(stage.moduleId);
          if (!mod) {
            return (
              <FallbackError
                message="That module is not available yet."
                onBack={goToChooser}
              />
            );
          }
          return (
            <QuickScanRunner
              key={mod.id}
              module={mod}
              onExit={goToChooser}
              onLaunchDeepScan={handleLaunchDeepScan}
              onStubCTA={handleStubCTA}
            />
          );
        })()}

      {stage.kind === 'deepscan' && (
        <DiagnosticsChat
          key={JSON.stringify(stage.initialData ?? {})}
          initialData={stage.initialData}
          onExit={goToChooser}
        />
      )}

      {/* Toast — outside the scrollable card */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.92)',
            border: '1px solid rgba(20,184,166,0.30)',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 12,
            fontSize: 13,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            zIndex: 999,
            maxWidth: 360,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────

function FallbackError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        flexDirection: 'column',
        gap: 16,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 16, color: '#fcd34d' }}>{message}</div>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '10px 20px',
          borderRadius: 9999,
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          color: '#f8fafc',
          border: 'none',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Back to scan menu
      </button>
    </div>
  );
}
