import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen } from 'lucide-react';

function TransitionLoader({ duration = 5000, message = 'Loading...' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50"
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Additional floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 bg-orange-500/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.sin(i) * 20, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative text-center space-y-6">
        {/* Logo Animation */}
        <motion.div className="flex justify-center">
          <div className="relative">
            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Icon Container */}
            <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-6 rounded-2xl shadow-2xl">
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <BookOpen className="size-12 text-white" />
              </motion.div>
            </div>

            {/* Orbiting dots */}
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-orange-500 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 60,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 60,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 60,
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Brand */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Zyndex
          </h1>
          <div className="flex items-center justify-center gap-2">
            <p className="text-slate-600 font-medium text-sm">{message}</p>
            {/* Moving dots */}
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 bg-orange-600 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-56 mx-auto">
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-600 to-red-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{
                duration: duration / 1000,
                ease: "easeInOut"
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PageTransitionWrapper({ children, duration = 5000 }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);
  const previousPathRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Check if we should show auth transition animation on first render
    const shouldShowAuthTransition = sessionStorage.getItem('show_auth_transition');
    
    if (shouldShowAuthTransition === 'true') {
      // Clear the flag immediately
      sessionStorage.removeItem('show_auth_transition');
      
      // Trigger the animation
      setIsTransitioning(true);
      isFirstRenderRef.current = false;
      previousPathRef.current = location.pathname;
      setDisplayLocation(location);
      
      const timer = setTimeout(() => {
        console.log('Animation complete - showing dashboard');
        setIsTransitioning(false);
      }, duration);

      return () => {
        console.log('Cleanup called - clearing timeout');
        clearTimeout(timer);
      };
    }

    // Skip animation on first render (if not coming from auth)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousPathRef.current = location.pathname;
      setDisplayLocation(location);
      return;
    }

    // Check if we're navigating FROM authenticator page TO dashboard/home
    // This ensures the book animation plays after successful authentication
    const isAuthToDashboardTransition = 
      previousPathRef.current !== null &&
      (
        (previousPathRef.current.toLowerCase().includes('authenticator') && location.pathname.includes('/Dashboard')) ||
        (previousPathRef.current.toLowerCase().includes('authenticator') && location.pathname.includes('/Home'))
      );

    // Check if we're just switching between login tabs (user/admin)
    const isLoginTabSwitch = 
      previousPathRef.current !== null &&
      (
        (previousPathRef.current.includes('/Zyndex/User/Log-In') && location.pathname.includes('/Zyndex/Admin/Log-In')) ||
        (previousPathRef.current.includes('/Zyndex/Admin/Log-In') && location.pathname.includes('/Zyndex/User/Log-In')) ||
        (previousPathRef.current.includes('/Zyndex/User/Sign-Up') && location.pathname.includes('/Zyndex/Admin/Sign-Up')) ||
        (previousPathRef.current.includes('/Zyndex/Admin/Sign-Up') && location.pathname.includes('/Zyndex/User/Sign-Up')) ||
        (previousPathRef.current.includes('/Zyndex/User/Log-In') && location.pathname.includes('/Zyndex/User/Sign-Up')) ||
        (previousPathRef.current.includes('/Zyndex/User/Sign-Up') && location.pathname.includes('/Zyndex/User/Log-In')) ||
        (previousPathRef.current.includes('/Zyndex/Admin/Log-In') && location.pathname.includes('/Zyndex/Admin/Sign-Up')) ||
        (previousPathRef.current.includes('/Zyndex/Admin/Sign-Up') && location.pathname.includes('/Zyndex/Admin/Log-In'))
      );

    // Skip animation if we're just switching tabs on the login page
    if (isLoginTabSwitch) {
      setDisplayLocation(location);
      previousPathRef.current = location.pathname;
      return;
    }

    // Force animation for authentication to dashboard transition (CRITICAL FIX)
    if (isAuthToDashboardTransition) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
        previousPathRef.current = location.pathname;
      }, duration);

      return () => clearTimeout(timer);
    }

    // Show transition when path changes
    if (previousPathRef.current !== null && location.pathname !== previousPathRef.current) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
        previousPathRef.current = location.pathname;
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, duration]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isTransitioning && <TransitionLoader key="loader" duration={duration} />}
      </AnimatePresence>
      
      {!isTransitioning && (
        <div>
          {children}
        </div>
      )}
    </>
  );
}

// Export TransitionLoader for use in other components
export { TransitionLoader };