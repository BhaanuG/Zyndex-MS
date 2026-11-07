import { useNavigate } from 'react-router';
import Authenticator from '@/app/components/Authenticator';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import authService from '@/services/api/authService';
import { getOrCreateDeviceToken } from '@/utils/deviceHelper';
import { resolveAuthRedirectPath } from '@/utils/redirectHelper';

export default function AdminAuthenticator() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [checkingDevice, setCheckingDevice] = useState(false);

  // Check if there's pending authentication
  useEffect(() => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (!pendingAuth) {
      // No pending auth, redirect to login
      navigate('/');
    }
  }, [navigate]);

  const handleAuthSuccess = async () => {
    const rawPending = sessionStorage.getItem('pending_auth');
    if (!rawPending) {
      navigate('/');
      return;
    }

    const pendingAuth = JSON.parse(rawPending);

    // If logging in (not signup/admin request), check if this browser device is already trusted for 24 hours
    if (!pendingAuth.isSignUp) {
      setCheckingDevice(true);
      try {
        const deviceToken = getOrCreateDeviceToken();
        const normalizedEmail = (pendingAuth.email || '').trim().toLowerCase();
        const checkRes = await authService.checkTrustedDevice(normalizedEmail, deviceToken);

        if (checkRes?.trusted) {
          // Device is trusted! Bypass Mail OTP, perform direct authenticated login
          const userData = await login(normalizedEmail, pendingAuth.password, 'admin');
          sessionStorage.removeItem('pending_auth');
          sessionStorage.removeItem('human_verification_passed');
          sessionStorage.removeItem('mail_otp_request_state');
          sessionStorage.setItem('show_auth_transition', 'true');

          const targetDestination = resolveAuthRedirectPath(userData);
          navigate(targetDestination, { replace: true });
          return;
        }
      } catch (err) {
        console.warn('Could not verify admin trusted device status, proceeding to OTP:', err);
      } finally {
        setCheckingDevice(false);
      }
    }

    // Unrecognized or untrusted device: proceed to Mail OTP Verification
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    sessionStorage.setItem('human_verification_passed', 'true');
    navigate('/Zyndex/Admin/Mail-OTP-Verification');
  };

  const handleAuthBack = () => {
    // Clear pending auth and go back to login
    sessionStorage.removeItem('pending_auth');
    navigate('/Zyndex/Admin/Log-In');
  };

  return <Authenticator onSuccess={handleAuthSuccess} onBack={handleAuthBack} loading={checkingDevice} />;
}
