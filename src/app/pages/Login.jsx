import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { motion } from 'motion/react';
import { BookOpen, Mail, Lock, ArrowRight, Menu, X, Eye, EyeOff, Shield, User, AlertCircle, GraduationCap } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import authService, { validateLogin as validateLoginRequest } from '@/services/api/authService';
import apiClient from '@/services/api/apiClient';
import { resolveAuthRedirectPath, setRedirectIntent } from '@/utils/redirectHelper';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authReady, isAuthenticated, role, user } = useAuth();
  const [activeTab, setActiveTab] = useState(() =>
    location.pathname.includes('/Admin/') ? 'admin' : 'user'
  );
  const isUserSignUpRoute = location.pathname.includes('/User/Sign-Up');
  const isSignUpMode = activeTab === 'user' && isUserSignUpRoute;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('Student');
  const [otherDescription, setOtherDescription] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Capture incoming redirect intentions from location state or query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect') || params.get('returnTo');
    const fromState = location.state?.from;

    if (redirectParam) {
      setRedirectIntent(redirectParam, { type: 'query_param' });
    } else if (fromState) {
      const fromPath = typeof fromState === 'string' ? fromState : (fromState.pathname + (fromState.search || ''));
      setRedirectIntent(fromPath, { type: 'protected_route' });
    }
  }, [location]);

  useEffect(() => {
    setActiveTab(location.pathname.includes('/Admin/') ? 'admin' : 'user');
  }, [location.pathname]);

  useEffect(() => {
    const path = location.pathname;
    const targetPath = activeTab === 'user'
      ? (path.includes('/User/Sign-Up') ? '/Zyndex/User/Sign-Up' : '/Zyndex/User/Log-In')
      : '/Zyndex/Admin/Log-In';
    if (path !== targetPath && (path.includes('/Log-In') || path.includes('/Sign-In') || path.includes('/Sign-Up'))) {
      navigate(targetPath, { replace: true });
    }
  }, [activeTab, navigate, location.pathname]);

  useEffect(() => {
    if (!authReady) return;
    sessionStorage.removeItem('pending_auth');
  }, [authReady]);

  useEffect(() => {
    if (location.state?.signupSuccess) {
      setSuccessMessage(location.state.signupSuccess);
    }
  }, [location.state]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;

    const targetPath = resolveAuthRedirectPath(user);

    if (location.pathname.includes('/Log-In') || location.pathname.includes('/Sign-In')) {
      navigate(targetPath, { replace: true });
    }
  }, [authReady, isAuthenticated, role, user, location.pathname, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isSignUpMode) {
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        // Password complexity validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
          setError('Password must be at least 8 characters long, contain at least one uppercase letter, one digit, and one special character.');
          setSubmitting(false);
          return;
        }

        const effectiveRoleLabel = userType === 'Other' && otherDescription.trim() ? otherDescription.trim() : userType;

        // Send registration OTP with pre-check that email does not already exist
        await apiClient.post('/send-otp', {
          email: trimmedEmail,
          role: 'user',
          purpose: 'SIGNUP',
          name: trimmedName,
          userType: effectiveRoleLabel,
          force: true,
        });

        // Store pending signup payload and route to OTP verification
        sessionStorage.setItem('pending_auth', JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role: 'user',
          userType: effectiveRoleLabel,
          profession: otherDescription.trim(),
          collegeName: institutionName.trim(),
          isSignUp: true,
        }));
        sessionStorage.setItem('human_verification_passed', 'true');
        sessionStorage.removeItem('mail_otp_request_state');

        navigate('/Zyndex/User/Mail-OTP-Verification');
        return;
      }

      const loginValidator =
        typeof authService?.validateLogin === 'function'
          ? authService.validateLogin
          : validateLoginRequest;

      await loginValidator({
        email: email.trim(),
        password,
        role: activeTab,
      });

      sessionStorage.setItem('pending_auth', JSON.stringify({
        name: '',
        email: email.trim(),
        password,
        role: activeTab,
        isLogin: true,
      }));
      sessionStorage.removeItem('mail_otp_request_state');

      navigate(activeTab === 'admin' 
        ? '/Zyndex/Admin/Authenticator-Verification-Page' 
        : '/Zyndex/User/Authenticator-Verification-Page');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:32px_32px]" />
      </div>

      <motion.header className="relative z-10 py-6 px-8 backdrop-blur-sm border-b border-orange-200/50 depth-3d-elevated glass-3d" initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-600/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-2.5 rounded-xl shadow-lg">
                <BookOpen className="size-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Zyndex</h1>
              <p className="text-xs text-slate-500 font-medium">Educational Excellence</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 flex-wrap">
            <Link to="/Zyndex/About/About-Us" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">About Us</Link>
            <Link to="/Zyndex/About/Contact" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Contact</Link>
            <Link to="/Zyndex/About/Pricing" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Pricing</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Resources/Browse" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Browse</Link>
            <Link to="/Zyndex/Resources/Categories" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Categories</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Support/Help-Center" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Help Center</Link>
            <Link to="/Zyndex/Support/FAQ" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">FAQ</Link>
            <span className="text-slate-300 px-1">|</span>
            <Link to="/Zyndex/Legal/Privacy" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Privacy</Link>
            <Link to="/Zyndex/Legal/Terms" className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all">Terms</Link>
          </nav>

          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden p-2 hover:bg-orange-50 rounded-lg transition-colors">
            {showMobileMenu ? <X className="size-6 text-slate-600" /> : <Menu className="size-6 text-slate-600" />}
          </button>
        </div>
      </motion.header>

      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[calc(100vh-200px)]">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-slate-900">Educational Resource</span>
                <br />
                <span className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent">Library Platform</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Create your account, explore educational resources, and access uploaded PDFs and articles from the Zyndex library.
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-3xl opacity-10" />
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-8 lg:p-10 depth-3d-float glass-3d surface-highlight">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h2>
                <p className="text-slate-600">
                  {isSignUpMode ? 'Create your Zyndex user account with your name, email, and password.' : 'Sign in with your Zyndex account.'}
                </p>
              </div>

              <div className="relative mb-8 p-1 bg-slate-100 rounded-2xl">
                <motion.div className={`absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl shadow-md ${activeTab === 'user' ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`} animate={{ x: activeTab === 'user' ? '0.25rem' : 'calc(100% + 0.25rem)' }} transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                <div className="relative flex gap-2">
                  <button type="button" onClick={() => setActiveTab('user')} className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold z-10 flex items-center justify-center gap-2 ${activeTab === 'user' ? 'text-white' : 'text-slate-600'}`}>
                    <User className="size-4" />User Access
                  </button>
                  <button type="button" onClick={() => setActiveTab('admin')} className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold z-10 flex items-center justify-center gap-2 ${activeTab === 'admin' ? 'text-white' : 'text-slate-600'}`}>
                    <Shield className="size-4" />Admin Access
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignUpMode && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-4 size-5 text-slate-400" />
                        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Enter your full name" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">I am a</label>
                      <div className="relative flex items-center">
                        <GraduationCap className="absolute left-4 size-5 text-slate-400" />
                        <select value={userType} onChange={(e) => { setUserType(e.target.value); setError(''); setSuccessMessage(''); }} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input">
                          <option>Student</option>
                          <option>Teacher / Educator</option>
                          <option>Researcher</option>
                          <option>Professional</option>
                          <option>General Reader</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    {userType === 'Other' && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">What best describes you?</label>
                        <input type="text" value={otherDescription} onChange={(e) => { setOtherDescription(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Tell us what best describes you" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">University / College name <span className="font-normal text-slate-400">(optional)</span></label>
                      <input type="text" value={institutionName} onChange={(e) => { setInstitutionName(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Enter your university or college name" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 size-5 text-slate-400" />
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); setSuccessMessage(''); }} placeholder="Enter your email" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 size-5 text-slate-400 z-10" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); setSuccessMessage(''); }} placeholder={isSignUpMode ? 'Create your password' : 'Enter your password'} className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-orange-600 focus:ring-4 focus:ring-orange-600/10 outline-none transition-all depth-3d-input" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 p-1 text-slate-400 hover:text-orange-600 transition-colors z-10">
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    <AlertCircle className="size-4" />
                    <span>{error}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    <span>{successMessage}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting} className="w-full relative group disabled:opacity-70">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30">
                    {submitting ? (isSignUpMode ? 'Creating account...' : 'Checking...') : (isSignUpMode ? 'Create Account' : 'Sign In')}
                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <div className="text-center pt-4">
                  {isSignUpMode ? (
                    <div className="mt-3">
                      <Link to="/Zyndex/User/Log-In" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                        Already have an account? Sign in
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 flex flex-col gap-2">
                        <Link to="/Zyndex/Auth/Forgot-Password" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                          Reset or Forgot your password?
                        </Link>
                        {activeTab === 'user' && (
                          <Link to="/Zyndex/User/Sign-Up" className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                            Need a new user account? <span className="text-orange-600 font-semibold">Create Account</span>
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {activeTab === 'admin' && (
                  <div className="text-center pt-2">
                    <Link to="/Zyndex/Admin/Sign-Up" className="text-sm text-slate-600 hover:text-orange-600 font-medium transition-colors">
                      Need admin access? <span className="text-orange-600 font-semibold">Request Here</span>
                    </Link>
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-orange-200/30 text-center text-xs text-slate-500 bg-white/20 backdrop-blur-sm mt-8">
        © 2026 Zyndex • A ScholarSphere Digital Company • All rights reserved.
      </footer>
    </div>
  );
}



