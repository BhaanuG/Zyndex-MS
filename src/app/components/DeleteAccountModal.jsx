import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Mail, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import apiClient from '@/services/api/apiClient';
import userService from '@/services/api/userService';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigate } from 'react-router';

const COMMON_REASONS = [
  'I have completed my academic degree or coursework',
  'I am switching to another platform or tool',
  'The resources I need are not available here',
  'Privacy, data retention, or security considerations',
  'Difficulty using or navigating the website',
  'Cost or pricing of premium subscription tiers',
  'Other (Please describe in feedback comments below)'
];

export default function DeleteAccountModal({ isOpen, onClose, user }) {
  const { logout, isPrimaryAdmin } = useAuth();
  const navigate = useNavigate();

  // Step 1: Feedback & reasons, Step 2: OTP & CONFIRM check
  const [step, setStep] = useState(1);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [comments, setComments] = useState('');
  
  // OTP state
  const [otp, setOtp] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedReasons([]);
      setComments('');
      setOtp('');
      setConfirmText('');
      setError('');
      setSuccess('');
      setOtpSent(false);
      setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  if (isPrimaryAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-red-200">
          <div className="size-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="size-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Primary Administrator Account</h3>
          <p className="text-sm text-gray-600 mb-6">
            The Primary Administrator account cannot be self-deleted to prevent platform lockout and maintain enterprise continuity.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const toggleReason = (reason) => {
    setError('');
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleProceedToOtp = async () => {
    if (selectedReasons.length === 0 && !comments.trim()) {
      setError('Please select at least one reason or provide feedback so we can learn how to improve.');
      return;
    }
    setError('');
    setSendingOtp(true);

    try {
      await apiClient.post('/send-otp', {
        email: user?.email,
        role: user?.role || 'user',
        purpose: 'ACCOUNT_DELETION',
        name: user?.name || user?.username || 'User',
        force: true
      });
      setOtpSent(true);
      setCountdown(120);
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Failed to dispatch deletion verification OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setSendingOtp(true);
    try {
      await apiClient.post('/send-otp', {
        email: user?.email,
        role: user?.role || 'user',
        purpose: 'ACCOUNT_DELETION',
        name: user?.name || user?.username || 'User',
        force: true
      });
      setCountdown(120);
    } catch (err) {
      setError(err?.message || 'Failed to resend OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleExecuteDeletion = async (e) => {
    e.preventDefault();
    if (confirmText.trim() !== 'CONFIRM') {
      setError('Please type CONFIRM in capital letters to verify permanent deletion.');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 4) {
      setError('Please enter the 4-digit verification code sent to your email.');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await userService.deleteOwnAccount({
        otp: otp.trim(),
        confirmText: confirmText.trim(),
        reasons: selectedReasons.join('; '),
        comments: comments.trim()
      });

      setSuccess('Your account has been deleted successfully. Logging out...');
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err?.message || 'Account deletion failed. Please check your verification code.');
      setDeleting(false);
    }
  };

  const isOtherSelected = selectedReasons.some((r) => r.startsWith('Other'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-red-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-11 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Account</h2>
              <p className="text-xs text-gray-500">Permanent removal of your profile and library data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertTriangle className="size-4 text-amber-600" />
                We are sorry to lose an amazing scholar!
              </p>
              <p className="text-amber-800 leading-relaxed">
                Before deleting your account, please tell us why you are leaving. Your feedback helps our academic team improve the experience for everyone.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                Why are you deleting your account? (Select all that apply)
              </label>
              <div className="space-y-2">
                {COMMON_REASONS.map((reason, idx) => {
                  const checked = selectedReasons.includes(reason);
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        checked
                          ? 'bg-orange-50/70 border-orange-300 text-gray-900 font-medium'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleReason(reason)}
                        className="mt-0.5 size-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500 cursor-pointer"
                      />
                      <span>{reason}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isOtherSelected ? 'Additional Comments / Explanation (Required for "Other")' : 'Additional Feedback or Comments (Optional)'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Share any additional thoughts or suggestions with the Zyndex administrative team..."
                className="w-full p-3 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToOtp}
                disabled={sendingOtp}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {sendingOtp ? 'Dispatching OTP...' : 'Next: Verify Security OTP'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleExecuteDeletion} className="space-y-5">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-red-950">
                <Mail className="size-4 text-red-600" />
                Security Verification Code Dispatched
              </p>
              <p className="text-red-800 leading-relaxed">
                A 4-digit authorization OTP was sent to <b>{user?.email}</b>. It is valid for exactly 120 seconds.
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Enter 4-Digit Deletion OTP
                </label>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || sendingOtp}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-40 cursor-pointer"
                >
                  {countdown > 0 ? `Resend code (${countdown}s)` : 'Resend OTP'}
                </button>
              </div>
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                className="w-full text-center tracking-widest text-xl font-bold py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              />
            </div>

            {/* CONFIRM Text Challenge */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Type <span className="text-red-600 font-extrabold">CONFIRM</span> to verify permanent deletion
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className="w-full py-2.5 px-3 border border-gray-300 rounded-xl text-xs font-bold tracking-wider uppercase focus:ring-2 focus:ring-red-500 focus:outline-none"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">
                This action cannot be undone. All active sessions, reading history, and saved preferences will be purged.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-600 hover:text-gray-900 font-semibold cursor-pointer"
              >
                ← Back to Feedback
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || confirmText.trim() !== 'CONFIRM' || otp.trim().length !== 4}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-2 disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                  {deleting ? 'Deleting Account...' : 'Permanently Delete Account'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
