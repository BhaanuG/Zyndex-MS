import { useNavigate } from 'react-router';
import Authenticator from '@/app/components/Authenticator';
import { useEffect } from 'react';

export default function AdminAuthenticator() {
  const navigate = useNavigate();

  // Check if there's pending authentication
  useEffect(() => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (!pendingAuth) {
      // No pending auth, redirect to login
      navigate('/');
    }
  }, [navigate]);

  const handleAuthSuccess = async () => {
    const pendingAuth = sessionStorage.getItem('pending_auth');
    if (!pendingAuth) {
      navigate('/');
      return;
    }

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

  return <Authenticator onSuccess={handleAuthSuccess} onBack={handleAuthBack} />;
}
