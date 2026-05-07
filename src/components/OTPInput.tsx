import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
}

export default function OTPInput({ length = 6, onComplete }: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const [timer, setTimer] = useState(59);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value.substring(element.value.length - 1);
    setOtp(newOtp);

    // Focus next
    if (element.value && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newOtp.every(v => v !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, length).split('');
    const newOtp = [...otp];
    data.forEach((char, i) => {
      if (!isNaN(Number(char))) {
        newOtp[i] = char;
      }
    });
    setOtp(newOtp);
    if (newOtp[length - 1]) inputs.current[length - 1]?.focus();
    if (newOtp.every(v => v !== '')) onComplete(newOtp.join(''));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-3">
        {otp.map((data, index) => (
          <motion.input
            key={index}
            type="text"
            maxLength={1}
            ref={(el) => { inputs.current[index] = el; }}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="w-12 h-16 md:w-16 md:h-20 bg-[var(--glass-1)] border border-[var(--border-1)] rounded-2xl text-center text-3xl font-black focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all outline-none"
            style={{ color: 'var(--text-1)' }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-3)' }}>
           Resend available in <span className="text-brand">00:{timer < 10 ? `0${timer}` : timer}</span>
        </div>
        <button 
          disabled={timer > 0}
          className="text-xs font-bold uppercase tracking-widest text-brand disabled:opacity-20 hover:underline transition-all"
          onClick={() => setTimer(59)}
        >
          Resend Code
        </button>
      </div>
    </div>
  );
}
