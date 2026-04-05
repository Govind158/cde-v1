/**
 * Severity Slider — 0-10 pain scale with custom design
 */

'use client';

import { useState, useRef, useCallback } from 'react';

interface SeveritySliderProps {
  question: { id: string; text: string };
  onSubmit: (questionId: string, answer: string) => void;
}

const LABELS: Record<number, string> = {
  0: 'No pain',
  1: 'Minimal',
  2: 'Mild',
  3: 'Mild',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Moderate',
  7: 'Severe',
  8: 'Severe',
  9: 'Very severe',
  10: 'Worst imaginable',
};

export default function SeveritySlider({ question, onSubmit }: SeveritySliderProps) {
  const [value, setValue] = useState(5);
  const [hasMoved, setHasMoved] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newValue = Math.round(pct * 10);
      setValue(newValue);
      setHasMoved(true);

      // Haptic feedback on mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    handleInteraction(e.clientX);
    const handleMouseMove = (ev: MouseEvent) => handleInteraction(ev.clientX);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleInteraction(e.touches[0].clientX);
    const handleTouchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      handleInteraction(ev.touches[0].clientX);
    };
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="px-4 py-3">
      <p className="mb-4 text-sm text-slate-300">{question.text}</p>

      {/* Current value display */}
      <div className="mb-2 text-center">
        <span className="text-3xl font-bold text-white">{value}</span>
        <span className="ml-2 text-sm text-slate-400">{LABELS[value]}</span>
      </div>

      {/* Slider track */}
      <div className="relative py-3">
        <div
          ref={trackRef}
          className="h-2 w-full cursor-pointer rounded-full"
          style={{
            background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow-lg transition-[left] duration-75"
            style={{ left: `${(value / 10) * 100}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="mt-2 flex justify-between">
          <span className="text-[10px] text-slate-500">0</span>
          <span className="text-[10px] text-slate-500">10</span>
        </div>
      </div>

      {/* Submit button */}
      {hasMoved && (
        <button
          onClick={() => onSubmit(question.id, String(value))}
          className="mt-3 w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-400 animate-fade-in-up"
        >
          Confirm: {value}/10 — {LABELS[value]}
        </button>
      )}
    </div>
  );
}
