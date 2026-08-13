import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  ShieldCheck,
  Search,
  Inbox,
  Lock,
  ExternalLink,
  Sliders,
} from 'lucide-react';

interface DiagnosticSender {
  sender: string;
  email: string;
  count: number;
  sampleSubject: string;
  sampleDate: string;
  sampleMessageId: string;
}

interface DiagnosticResponse {
  success: boolean;
  daysAnalyzed: number;
  totalMessagesFound: number;
  distinctSendersCount: number;
  senders: DiagnosticSender[];
  queryUsed: string;
  error?: string;
  envCheck: {
    hasClientId: boolean;
    hasClientSecret: boolean;
    hasRefreshToken: boolean;
  };
}

interface BankEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankEmailModal: React.FC<BankEmailModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticResponse | null>(null);
  const [days, setDays] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDiagnostic = async (daysToQuery: number = 30) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/gmail/diagnostic?days=${daysToQuery}`);
      const data: DiagnosticResponse = await res.json();
      setDiagnosticData(data);
      if (!data.success && data.error) {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to connect to backend Gmail diagnostic endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostic(days);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const envCheck = diagnosticData?.envCheck || {
    hasClientId: false,
    hasClientSecret: false,
    hasRefreshToken: false,
  };

  const isFullyConfigured = envCheck.hasClientId && envCheck.hasClientSecret && envCheck.hasRefreshToken;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Bank Email Ingestion
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Isolated Service
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Server-side Gmail API alert reader for auto-ingesting transactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Isolated Notice */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-200 leading-relaxed">
              <strong>Isolated Isolation Policy:</strong> Gmail ingestion credentials are read exclusively from server environment variables (<code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300">GMAIL_CLIENT_ID</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300">GMAIL_CLIENT_SECRET</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-300">GMAIL_REFRESH_TOKEN</code>). This service operates completely isolated from your user login and never prompts for email credentials during authentication.
            </div>
          </div>

          {/* Environment Status Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                Backend OAuth Credentials Status
              </h3>
              {isFullyConfigured ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Missing Variables
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">CLIENT_ID</span>
                {envCheck.hasClientId ? (
                  <span className="text-emerald-400 font-medium">Ready</span>
                ) : (
                  <span className="text-rose-400 font-medium">Missing</span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">CLIENT_SECRET</span>
                {envCheck.hasClientSecret ? (
                  <span className="text-emerald-400 font-medium">Ready</span>
                ) : (
                  <span className="text-rose-400 font-medium">Missing</span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">REFRESH_TOKEN</span>
                {envCheck.hasRefreshToken ? (
                  <span className="text-emerald-400 font-medium">Ready</span>
                ) : (
                  <span className="text-rose-400 font-medium">Missing</span>
                )}
              </div>
            </div>
          </div>

          {/* Diagnostic Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-400" />
                Gmail Sender Diagnostic
              </h3>

              <div className="flex items-center gap-2">
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={60}>Last 60 Days</option>
                  <option value={90}>Last 90 Days</option>
                </select>

                <button
                  onClick={() => fetchDiagnostic(days)}
                  disabled={loading}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Run Diagnostic
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {diagnosticData && (
              <div className="p-4 rounded-xl bg-slate-800/40 border border-white/10 space-y-3">
                <div className="text-xs text-slate-300 flex items-center justify-between">
                  <span>
                    Query: <code className="bg-black/30 px-1.5 py-0.5 rounded text-indigo-300">{diagnosticData.queryUsed}</code>
                  </span>
                  <span>
                    <strong>{diagnosticData.totalMessagesFound}</strong> emails from <strong>{diagnosticData.distinctSendersCount}</strong> senders
                  </span>
                </div>

                {diagnosticData.senders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-900/50 rounded-lg border border-white/5">
                    <Inbox className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                    No senders found in the queried time window or credentials not initialized yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {diagnosticData.senders.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-900/70 border border-white/5 text-xs flex flex-col gap-1.5 hover:border-indigo-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">{s.sender}</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                            {s.count} email{s.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          Sample Subject: <span className="text-slate-300">{s.sampleSubject}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Fully Isolated & Secure Server-Side Process
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
