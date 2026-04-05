/**
 * Option Selector — Clickable answer options for radio and multi-select questions
 */

'use client';

import { useState } from 'react';
import type { QuestionOption } from '@/types/cde';

interface OptionSelectorProps {
  question: {
    id: string;
    text: string;
    options: QuestionOption[];
    allowMultiple: boolean;
    uiType: string;
  };
  onSubmit: (questionId: string, answer: string | string[]) => void;
  disabled: boolean;
}

export default function OptionSelector({ question, onSubmit, disabled }: OptionSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleSelect = (value: string) => {
    if (disabled) return;

    if (question.allowMultiple) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      // Single select — auto-submit after brief visual feedback
      setSelected([value]);
      setTimeout(() => {
        onSubmit(question.id, value);
      }, 300);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0 || disabled) return;
    onSubmit(question.id, selected);
  };

  const isLongText = question.options.some((o) => o.label.length > 40);

  return (
    <div className="px-4 py-2">
      {question.allowMultiple && (
        <p className="mb-3 text-xs text-slate-400">Select all that apply</p>
      )}
      <div className={`grid gap-2 ${isLongText ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {question.options.map((option) => {
          const isSelected = selected.includes(option.value);
          const isNone = option.value.toLowerCase().includes('none');

          return (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              disabled={disabled}
              className={`
                min-h-[44px] rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all
                active:scale-[0.97]
                ${isNone ? 'col-span-full border-white/5 bg-white/[0.02] text-slate-500' : ''}
                ${
                  isSelected
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-blue-500/30 hover:bg-white/10'
                }
                disabled:opacity-50
              `}
            >
              <div className="flex items-center gap-2">
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{option.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {question.allowMultiple && selected.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="mt-3 w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-400 disabled:opacity-50"
        >
          Submit ({selected.length} selected)
        </button>
      )}
    </div>
  );
}
