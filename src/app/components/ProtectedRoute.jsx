import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { setRedirectIntent } from '@/utils/redirectHelper';

export default function ProtectedRoute({ children, role, primaryOnly = false }) {
  const { authReady, isAuthenticated, isAdmin, isUser, isPrimaryAdmin } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return null;
  }

  const loginPath = role === 'admin' ? '/Zyndex/Admin/Log-In' : '/Zyndex/User/Log-In';

  if (!isAuthenticated) {
    // Capture destination so user returns right here after login
    setRedirectIntent(location.pathname + location.search, { type: 'protected_route' });
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (role === 'admin' && !isAdmin) {
    return <Navigate to="/Zyndex/Admin/Log-In" state={{ from: location }} replace />;
  }

  if (primaryOnly && !isPrimaryAdmin) {
    return <Navigate to="/Zyndex/Admin/Log-In" state={{ from: location }} replace />;
  }

  if (role === 'user' && !isUser) {
    return <Navigate to="/Zyndex/User/Log-In" state={{ from: location }} replace />;
  }

  return children;
}
