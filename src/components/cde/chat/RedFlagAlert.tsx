/**
 * Red Flag Alert — Emergency alert overlay (SAFETY CRITICAL)
 * Takes over the ENTIRE screen. Cannot be dismissed by accident.
 */

'use client';

interface RedFlagAlertProps {
  emergency: {
    flagId: string;
    urgency: 'immediate' | 'urgent_24h' | 'urgent_48h' | 'specialist_2_4_weeks';
    message: string;
    action: string;
  };
  onAcknowledge: () => void;
}

export default function RedFlagAlert({ emergency, onAcknowledge }: RedFlagAlertProps) {
  const isImmediate = emergency.urgency === 'immediate';
  const isUrgent = emergency.urgency === 'urgent_24h' || emergency.urgency === 'urgent_48h';

  const titleText = isImmediate
    ? 'IMMEDIATE MEDICAL ATTENTION REQUIRED'
    : isUrgent
      ? 'URGENT MEDICAL REVIEW NEEDED'
      : 'SPECIALIST REVIEW RECOMMENDED';

  const primaryButtonText = isImmediate
    ? 'Call 112 Now'
    : isUrgent
      ? 'Find a Specialist'
      : 'Schedule an Appointment';

  const primaryButtonHref = isImmediate ? 'tel:112' : undefined;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="redflag-title"
      aria-describedby="redflag-message"
    >
      <div className="mx-4 max-w-sm w-full">
        {/* Warning icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500/40 animate-pulse">
            <span className="text-4xl">&#9888;&#65039;</span>
          </div>
        </div>

        {/* Title */}
        <h1
          id="redflag-title"
          className="mb-4 text-center text-lg font-bold text-red-400"
        >
          {titleText}
        </h1>

        {/* Divider */}
        <div className="mb-4 h-px w-full bg-white/10" />

        {/* Message */}
        <p id="redflag-message" className="mb-4 text-center text-base text-slate-200 leading-relaxed">
          {emergency.message}
        </p>

        {/* Divider */}
        <div className="mb-4 h-px w-full bg-white/10" />

        {/* Action */}
        <div className="mb-6">
          <p className="mb-1 text-sm font-medium text-slate-400">What to do:</p>
          <p className="text-sm text-slate-300">{emergency.action}</p>
        </div>

        {/* Primary CTA */}
        {isImmediate && (
          <a
            href={primaryButtonHref}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-red-500 animate-pulse-border"
            style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
          >
            <span>&#128222;</span> {primaryButtonText}
          </a>
        )}

        {!isImmediate && (
          <button
            className="mb-3 w-full rounded-xl bg-amber-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-amber-500"
          >
            {primaryButtonText}
          </button>
        )}

        {/* Acknowledge button */}
        <button
          onClick={onAcknowledge}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-slate-300 transition-all hover:bg-white/10"
        >
          I understand — I will seek medical care
        </button>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500">
          &#9888;&#65039; This scan has been stopped. No further assessment will be provided.
          Your responses have been saved securely.
        </p>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-[10px] text-slate-600 leading-relaxed">
          Kriya QuickScan is not a medical diagnosis. It is a self-reported wellness risk
          indicator. Always consult a qualified healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
