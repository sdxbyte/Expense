import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, ShieldCheck, RefreshCw, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface OtpVerificationStepProps {
  email: string;
  phone: string;
  onVerifySuccess: () => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
  email,
  phone,
  onVerifySuccess,
  onCancel,
  isLoading = false,
}) => {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Dispatch OTP via server API
  const dispatchOtp = async (targetChannel: 'email' | 'phone' = channel) => {
    setIsSending(true);
    setErrorMsg(null);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, channel: targetChannel, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to dispatch verification code.');
      } else {
        setCountdown(60);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch {
      setErrorMsg('Network error dispatching OTP code. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    dispatchOtp();
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned && value !== '') return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned.slice(-1); // keep last digit if pasted/typed
    setOtpDigits(newDigits);
    setErrorMsg(null);

    // Auto focus next box
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP verification code.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: enteredCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.verified) {
        setErrorMsg(data.error || 'Invalid verification code. Please check your email and try again.');
      } else {
        await onVerifySuccess();
      }
    } catch {
      setErrorMsg('Network error verifying passcode. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const maskEmail = (em: string) => {
    const [user, domain] = em.split('@');
    if (!domain) return em;
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  };

  const maskPhone = (ph: string) => {
    if (ph.length < 6) return ph;
    return `${ph.slice(0, 4)} **** ${ph.slice(-3)}`;
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Step Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Identity Verification
        </span>
      </div>

      {/* Target Channel Toggle */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-300">
          Send Verification Code via:
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setChannel('email');
              dispatchOtp('email');
            }}
            disabled={isSending}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              channel === 'email'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Gmail / Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setChannel('phone');
              dispatchOtp('phone');
            }}
            disabled={isSending}
            className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              channel === 'phone'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Phone SMS</span>
          </button>
        </div>
      </div>

      {/* OTP Dispatch Banner */}
      <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-3.5 space-y-1">
        <div className="flex items-start gap-2 text-xs text-indigo-200">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span>6-Digit passcode sent to </span>
            <strong className="text-white font-mono">
              {channel === 'email' ? maskEmail(email) : maskPhone(phone || email)}
            </strong>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
          Please check your inbox or mobile device for the 6-digit security code and type it below to confirm identity.
        </p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 6-Digit OTP Inputs */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
            Enter 6-Digit Verification Passcode
          </label>
          <div className="flex justify-center gap-2">
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                className="w-10 h-12 sm:w-11 sm:h-13 text-center text-lg font-black font-mono bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 rounded-xl text-white transition-all outline-none"
              />
            ))}
          </div>
        </div>

        {/* Resend Timer & Button */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            {countdown > 0 ? (
              <span>Resend code in <strong className="text-indigo-400 font-mono">{countdown}s</strong></span>
            ) : (
              <span className="text-emerald-400 font-semibold">Code expired</span>
            )}
          </span>

          <button
            type="button"
            disabled={countdown > 0 || isSending}
            onClick={() => dispatchOtp()}
            className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Sending...' : 'Resend Code'}</span>
          </button>
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={isLoading || isVerifying || otpDigits.join('').length < 6}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isVerifying || isLoading ? (
            <span className="animate-pulse">Verifying Code...</span>
          ) : (
            <>
              <span>Verify & Complete Access</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
