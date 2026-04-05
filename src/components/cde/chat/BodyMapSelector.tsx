/**
 * Body Map Selector — Visual body region picker (simplified SVG)
 */

'use client';

import { useState } from 'react';

interface BodyMapSelectorProps {
  onSelect: (bodyRegion: string) => void;
}

const REGIONS = [
  { id: 'cervical', label: 'Neck', x: 145, y: 65, w: 30, h: 20 },
  { id: 'shoulder_left', label: 'Left Shoulder', x: 100, y: 90, w: 35, h: 25 },
  { id: 'shoulder_right', label: 'Right Shoulder', x: 185, y: 90, w: 35, h: 25 },
  { id: 'upper_back', label: 'Upper Back', x: 130, y: 95, w: 60, h: 35 },
  { id: 'lumbar_spine', label: 'Lower Back', x: 130, y: 140, w: 60, h: 40 },
  { id: 'hip_left', label: 'Left Hip', x: 110, y: 185, w: 35, h: 30 },
  { id: 'hip_right', label: 'Right Hip', x: 175, y: 185, w: 35, h: 30 },
  { id: 'knee_left', label: 'Left Knee', x: 115, y: 260, w: 25, h: 25 },
  { id: 'knee_right', label: 'Right Knee', x: 180, y: 260, w: 25, h: 25 },
  { id: 'heel_foot_left', label: 'Left Foot', x: 110, y: 330, w: 30, h: 20 },
  { id: 'heel_foot_right', label: 'Right Foot', x: 180, y: 330, w: 30, h: 20 },
];

export default function BodyMapSelector({ onSelect }: BodyMapSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center px-4 py-3">
      <p className="mb-4 text-sm text-slate-300">Tap where you feel pain or discomfort</p>

      <div className="relative">
        <svg width="320" height="380" viewBox="0 0 320 380" className="mx-auto">
          {/* Body outline */}
          <ellipse cx="160" cy="35" rx="22" ry="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          {/* Torso */}
          <path d="M120 65 L100 100 L100 190 L130 210 L190 210 L220 190 L220 100 L200 65" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          {/* Arms */}
          <path d="M100 100 L75 160 L70 200" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <path d="M220 100 L245 160 L250 200" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          {/* Legs */}
          <path d="M130 210 L125 280 L120 350" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <path d="M190 210 L195 280 L200 350" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />

          {/* Tappable regions */}
          {REGIONS.map((region) => (
            <g key={region.id}>
              <rect
                x={region.x}
                y={region.y}
                width={region.w}
                height={region.h}
                rx="6"
                fill={selected === region.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.03)'}
                stroke={selected === region.id ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.08)'}
                strokeWidth="1"
                className="cursor-pointer transition-all hover:fill-[rgba(59,130,246,0.15)] hover:stroke-[rgba(59,130,246,0.3)]"
                onClick={() => setSelected(region.id)}
                role="button"
                aria-label={region.label}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(region.id)}
              />
              {selected === region.id && (
                <circle
                  cx={region.x + region.w / 2}
                  cy={region.y + region.h / 2}
                  r="4"
                  fill="rgba(59,130,246,0.8)"
                  className="animate-pulse"
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      {selected && (
        <div className="mt-3 w-full animate-fade-in-up">
          <p className="mb-2 text-center text-sm text-blue-300">
            {REGIONS.find((r) => r.id === selected)?.label}
          </p>
          <button
            onClick={() => onSelect(selected)}
            className="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-400"
          >
            Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
}
