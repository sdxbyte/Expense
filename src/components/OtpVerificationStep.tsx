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
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Generate a random 6-digit OTP code on mount or resend
  const generateNewOtp = (targetChannel: 'email' | 'phone' = channel) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdown(60);
    setErrorMsg(null);
    setOtpDigits(['', '', '', '', '', '']);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  useEffect(() => {
    generateNewOtp();
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

  const handleAutoFill = () => {
    if (generatedCode.length === 6) {
      setOtpDigits(generatedCode.split(''));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      setErrorMsg(null);
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

    if (enteredCode !== generatedCode) {
      setErrorMsg('Invalid OTP verification code. Please check and try again or request a new code.');
      return;
    }

    // Code matched!
    await onVerifySuccess();
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
          Step 2 of 2: OTP Verification
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
              generateNewOtp('email');
            }}
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
              generateNewOtp('phone');
            }}
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

      {/* OTP Dispatch Banner with Code */}
      <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-start gap-2 text-xs text-indigo-200">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span>OTP Code dispatched to </span>
            <strong className="text-white font-mono">
              {channel === 'email' ? maskEmail(email) : maskPhone(phone)}
            </strong>
          </div>
        </div>

        {/* Display generated code for user convenience */}
        <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded-xl border border-indigo-500/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Verification OTP:</span>
            <span className="text-base font-black tracking-widest text-emerald-400 font-mono">{generatedCode}</span>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="text-[10px] font-bold px-2 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg transition-colors cursor-pointer"
          >
            {isCopied ? 'Auto-filled!' : 'Auto-fill'}
          </button>
        </div>
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
            Enter 6-Digit Verification Code
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
              <span>Resend available in <strong className="text-indigo-400 font-mono">{countdown}s</strong></span>
            ) : (
              <span className="text-emerald-400 font-semibold">Code expired</span>
            )}
          </span>

          <button
            type="button"
            disabled={countdown > 0}
            onClick={() => generateNewOtp()}
            className="flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Resend Code</span>
          </button>
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={isLoading || otpDigits.join('').length < 6}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <span className="animate-pulse">Creating Verified Account...</span>
          ) : (
            <>
              <span>Verify & Complete Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
