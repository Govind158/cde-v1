/**
 * Disclaimer Banner — Non-dismissable health disclaimer
 */

'use client';

export default function DisclaimerBanner() {
  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-amber-400 text-sm">&#9888;&#65039;</span>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Kriya QuickScan is a self-reported wellness risk tool. It is{' '}
          <strong className="text-slate-300">not a medical diagnosis</strong> and should not
          replace professional medical advice. If you are experiencing a medical emergency,
          call 112 immediately.
        </p>
      </div>
    </div>
  );
}
