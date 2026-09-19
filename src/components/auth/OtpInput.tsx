// ==============================================================================
// src/components/auth/OtpInput.tsx
// Reusable 6-Digit OTP Input with Auto-Focus, Paste, and Delete Support
// ==============================================================================

'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split the value string into an array of digits
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Focus the first empty box on mount
  useEffect(() => {
    if (autoFocus) {
      const firstEmpty = digits.findIndex((d) => !d);
      const focusIndex = firstEmpty === -1 ? length - 1 : firstEmpty;
      inputRefs.current[focusIndex]?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (disabled) return;
      const cleaned = char.replace(/\D/g, '').slice(-1); // only digits, last char
      const newDigits = [...digits];
      newDigits[index] = cleaned;
      onChange(newDigits.join(''));

      // Move focus forward if a digit was entered
      if (cleaned && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, disabled, length, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (digits[index]) {
          // Clear current box
          const newDigits = [...digits];
          newDigits[index] = '';
          onChange(newDigits.join(''));
        } else if (index > 0) {
          // Move to previous box and clear it
          const newDigits = [...digits];
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
          inputRefs.current[index - 1]?.focus();
        }
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits, disabled, length, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (disabled) return;
      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, length);
      if (!pasted) return;
      onChange(pasted.padEnd(length, '').slice(0, length));
      // Focus last filled or last box
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [disabled, length, onChange]
  );

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            'w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-black rounded-xl border-2',
            'outline-none transition-all duration-150 font-mono',
            'focus:scale-105',
            disabled
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : hasError
              ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : digit
              ? 'border-brand-500 bg-brand-50 text-brand-900 focus:border-brand-600 focus:ring-2 focus:ring-brand-200'
              : 'border-slate-200 bg-white text-slate-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
          ].join(' ')}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
