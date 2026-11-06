import { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import authService from '@/services/api/authService';

export default function PasswordChangePanel({ user }) {
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const role = user?.role?.toLowerCase() === 'admin' ? 'admin' : 'user';

  const sendOtp = async () => {
    setSendingOtp(true);
    setError('');
    setMessage('');
    try {
      await authService.sendOtp({ email: user.email, role, purpose: 'PASSWORD_RESET' });
      setMessage('OTP sent to your registered email address.');
    } catch (err) {
      setError(err.message || 'Unable to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    setMessage('');
    try {
      await authService.verifyOtp({ email: user.email, otp, role });
      setOtpVerified(true);
      setMessage('OTP verified. Enter your new password.');
    } catch (err) {
      setError(err.message || 'Invalid OTP.');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    try {
      await authService.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpVerified(false);
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err.message || 'Unable to change password.');
    }
  };

  return (
    <section className="mt-8 border-t border-gray-200 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="size-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={otp}
          onChange={(event) => { setOtp(event.target.value); setOtpVerified(false); }}
          inputMode="numeric"
          maxLength={4}
          placeholder="Enter 4-digit OTP"
          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg"
          disabled={otpVerified}
        />
        <button type="button" onClick={sendOtp} disabled={sendingOtp} className="px-4 py-2.5 bg-[#0b1f3a] text-white rounded-lg disabled:opacity-50">
          {sendingOtp ? 'Sending...' : 'Send OTP'}
        </button>
        <button type="button" onClick={verifyOtp} disabled={!otp || otpVerified} className="px-4 py-2.5 bg-orange-600 text-white rounded-lg disabled:opacity-50">
          {otpVerified ? 'Verified' : 'Verify OTP'}
        </button>
      </div>

      {otpVerified && (
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" required />
          </div>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" minLength={8} required />
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" minLength={8} required />
          <button type="submit" className="px-5 py-2.5 bg-orange-600 text-white rounded-lg font-medium">Change Password</button>
        </form>
      )}
      {message && <p className="mt-3 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}