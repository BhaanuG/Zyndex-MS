import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { TransitionLoader } from '@/app/components/PageTransitionWrapper';
import SessionTimeoutModal from '@/app/components/SessionTimeoutModal';
import SessionWarningModal from '@/app/components/SessionWarningModal';
import authService from '@/services/api/authService';
import userService from '@/services/api/userService';
import { getOrCreateDeviceToken, getDeviceInfo } from '@/utils/deviceHelper';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [role, setRole] = useState(() => {
    const savedUser = localStorage.getItem('user_data');
    return savedUser ? JSON.parse(savedUser)?.role || null : null;
  });
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  }, [user]);

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  useEffect(() => {
    async function hydrateUser() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setRole(currentUser.role);
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);
      } finally {
        setAuthReady(true);
      }
    }

    hydrateUser();
  }, []);

  useEffect(() => {
    if (!user || !localStorage.getItem('auth_token')) return undefined;
    // Background heartbeat every 15 seconds to check maintenance mode
    const interval = window.setInterval(async () => {
      // If not primary admin, check if maintenance mode has officially started
      if (!user.isPrimaryAdmin) {
        try {
          const res = await userService.getMaintenanceMode();
          if (res?.maintenanceMode) {
            // Check if 15 minutes window has elapsed
            let isOfficiallyOffline = false;
            if (res?.scheduledAt) {
              const startTime = new Date(res.scheduledAt).getTime();
              const elapsed = Date.now() - startTime;
              if (elapsed >= 15 * 60 * 1000) {
                isOfficiallyOffline = true;
              }
            } else {
              isOfficiallyOffline = true;
            }

            if (isOfficiallyOffline) {
              const currentRole = user.role || 'user';
              localStorage.removeItem('auth_token');
              localStorage.removeItem('user_data');
              setUser(null);
              setRole(null);
              window.dispatchEvent(
                new CustomEvent('zyndex:session-expired', {
                  detail: {
                    role: currentRole,
                    reason: 'The platform is currently in maintenance mode. We are sorry for the inconvenience, please check back shortly.'
                  }
                })
              );
            }
          }
        } catch (ignored) {}
      }
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [user?.id, user?.isPrimaryAdmin, user?.role]);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setRole(currentUser.role);
      return currentUser;
    } catch (err) {
      // If getCurrentUser failed with 401/403/503 or inactive account or maintenance, apiClient already handles or we clear here
      if (err?.status === 401 || err?.status === 403 || err?.status === 503 || err?.message?.toLowerCase().includes('maintenance') || err?.message?.toLowerCase().includes('logged out') || err?.message?.toLowerCase().includes('session')) {
        const savedRole = role || user?.role || 'user';
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);
        window.dispatchEvent(
          new CustomEvent('zyndex:session-expired', {
            detail: {
              role: savedRole,
              reason: err.message || (err?.status === 503 ? 'The platform is currently under scheduled maintenance mode. Kindly check back later or contact the main administrator.' : 'Your session was terminated by an administrator. Please log in again.')
            }
          })
        );
      }
    }
  };

  const login = async (email, password, selectedRole) => {
    let devicePayload = {};
    try {
      const deviceToken = getOrCreateDeviceToken();
      const info = getDeviceInfo();
      devicePayload = {
        deviceToken,
        deviceName: info.deviceName,
        browser: info.browser,
        os: info.os,
      };
    } catch (e) {}

    const response = await authService.login({
      email,
      password,
      role: selectedRole,
      ...devicePayload,
    });
    setUser(response.user);
    setRole(response.user.role);
    return response.user;
  };

  const logout = () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      try {
        await authService.logout();
      } catch {
        // Frontend state should still clear on logout even if the request fails.
      } finally {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);
        setIsLoggingOut(false);
        window.location.href = '/Zyndex/User/Log-In';
      }
    }, 10000);
  };

  const register = async (name, email, password, selectedRole) => {
    const response = await authService.register({
      name,
      email,
      password,
      role: selectedRole,
    });
    if (response.token && response.user) {
      setUser(response.user);
      setRole(response.user.role);
      return response.user;
    }

    return response.user;
  };

  const updateProfile = async (updatedData) => {
    const response = await userService.updateProfile(updatedData);
    const updatedUser = {
      ...response,
      role: response.role || role,
    };
    setUser(updatedUser);
    setRole(updatedUser.role);
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    return updatedUser;
  };

  // Helper function to generate URL-safe strings
  const getUrlSafeName = () => {
    return user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
  };

  const getUrlSafeEmail = () => {
    return user?.email ? encodeURIComponent(user.email) : 'email';
  };

  const value = {
    user,
    role,
    login,
    logout,
    register,
    updateProfile,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: (role || user?.role || '').toLowerCase() === 'admin',
    isUser: (role || user?.role || '').toLowerCase() !== 'admin',
    isPrimaryAdmin: !!user?.isPrimaryAdmin,
    isLoggingOut,
    authReady,
    getUrlSafeName,
    getUrlSafeEmail,
  };

  // 2 hours 30 minutes (150 minutes) Inactivity Protection Tracker
  // At 2 hours (120 minutes) of inactivity: sends pop-up warning "session will close within 30 min"
  // At 2 hours 30 minutes (150 minutes) if no response: automatically terminates session with Session Time-Out modal
  const lastActivityRef = useRef(Date.now());
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!user || !localStorage.getItem('auth_token')) return undefined;

    const WARNING_TIMEOUT_MS = 120 * 60 * 1000;   // 2 hours (120 minutes)
    const TERMINATION_TIMEOUT_MS = 150 * 60 * 1000; // 2 hours 30 minutes (150 minutes)

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      hasWarnedRef.current = false;
    };

    const handleContinueSession = () => {
      lastActivityRef.current = Date.now();
      hasWarnedRef.current = false;
      refreshUser();
    };

    const handleForceLogout = () => {
      logout();
    };

    window.addEventListener('zyndex:session-continue', handleContinueSession);
    window.addEventListener('zyndex:session-force-logout', handleForceLogout);

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    const checkInterval = window.setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;

      // 1. Send warning pop up at 2 hours
      if (idleTime >= WARNING_TIMEOUT_MS && idleTime < TERMINATION_TIMEOUT_MS) {
        if (!hasWarnedRef.current) {
          hasWarnedRef.current = true;
          window.dispatchEvent(
            new CustomEvent('zyndex:session-warning', {
              detail: { role: role || 'user' }
            })
          );
        }
      }

      // 2. Automatic termination at 2 hours 30 minutes
      if (idleTime >= TERMINATION_TIMEOUT_MS) {
        const currentRole = role || 'user';
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setRole(null);

        window.dispatchEvent(
          new CustomEvent('zyndex:session-expired', {
            detail: {
              role: currentRole,
              reason: 'Your session has expired due to 2 hours and 30 minutes of inactivity. Please log in again to continue.'
            }
          })
        );
      }
    }, 15000); // Check idle time every 15 seconds

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, updateActivity));
      window.removeEventListener('zyndex:session-continue', handleContinueSession);
      window.removeEventListener('zyndex:session-force-logout', handleForceLogout);
      window.clearInterval(checkInterval);
    };
  }, [user?.id, role]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionWarningModal />
      <SessionTimeoutModal />
      {/* Logout Loader */}
      <AnimatePresence>
        {isLoggingOut && (
          <TransitionLoader 
            duration={10000} 
            message={`Logging out ${user?.name || 'user'}...`} 
          />
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
};
