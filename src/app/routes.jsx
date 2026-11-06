import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransitionWrapper from './components/PageTransitionWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import RootLayout from './components/RootLayout';
// Route configuration for Zyndex application
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AdminRequest from './pages/AdminRequest';
import UserAuthenticator from './pages/UserAuthenticator';
import AdminAuthenticator from './pages/AdminAuthenticator';
import MailOtpVerification from './pages/MailOtpVerification';
import About from './pages/About';
import Contact from './pages/Contact';
import Browse from './pages/Browse';
import BrowseCategory from './pages/BrowseCategory';
import HelpCenter from './pages/HelpCenter';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Pricing from './pages/Pricing';
import AdminDashboard from './pages/admin/AdminDashboard';
import UploadResource from './pages/admin/UploadResource';
import ResourceManagement from './pages/admin/ResourceManagement';
import UserAccessManagement from './pages/admin/UserAccessManagement';
import FeedbackReview from './pages/admin/FeedbackReview';
import AdminProfile from './pages/admin/AdminProfile';
import AdminLogs from './pages/admin/AdminLogs';
import AdminPayments from './pages/admin/AdminPayments';
import UserHome from './pages/user/UserHome';
import SearchResults from './pages/user/SearchResults';
import ResourceDetail from './pages/user/ResourceDetail';
import UserProfile from './pages/user/UserProfile';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/Zyndex/User/Log-In" replace />
      },
      // User Login/Sign-Up Routes
      {
        path: "Zyndex/User/Log-In",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Sign-In",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Sign-Up",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      // Admin Login/Sign-Up Routes
      {
        path: "Zyndex/Admin/Log-In",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Sign-Up",
        element: <PageTransitionWrapper duration={5000}><AdminRequest /></PageTransitionWrapper>
      },
      // Forgot Password Route
      {
        path: "Zyndex/Auth/Forgot-Password",
        element: <PageTransitionWrapper duration={5000}><ForgotPassword /></PageTransitionWrapper>
      },
      // Legacy route for backward compatibility
      {
        path: "Zyndex/Log-In",
        element: <Navigate to="/Zyndex/User/Log-In" replace />
      },
      {
        path: "admin-request",
        element: <Navigate to="/Zyndex/Admin/Sign-Up" replace />
      },
      {
        path: "Zyndex/User/authenticator-page",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page" replace />
      },
      {
        path: "Zyndex/Admin/authenticator-page",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Zyndex/User/authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page" replace />
      },
      {
        path: "Zyndex/Admin/Authenticator-Zyndex/User/authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Verification-Page",
        element: <PageTransitionWrapper duration={5000}><UserAuthenticator /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Authenticator-Verification-Page",
        element: <PageTransitionWrapper duration={5000}><AdminAuthenticator /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Mail-OTP-Verification",
        element: <PageTransitionWrapper duration={5000}><MailOtpVerification /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Mail-OTP-Verification",
        element: <PageTransitionWrapper duration={5000}><MailOtpVerification /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/About/Pricing",
        element: <PageTransitionWrapper duration={5000}><Pricing /></PageTransitionWrapper>
      },
      {
        path: "ScholarSphere/Pricing",
        element: <Navigate to="/Zyndex/About/Pricing" replace />
      },
      {
        path: "Zyndex/Pricing",
        element: <Navigate to="/Zyndex/About/Pricing" replace />
      },
      {
        path: "Zyndex/About/About-Us",
        element: <PageTransitionWrapper duration={5000}><About /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/About/Contact",
        element: <PageTransitionWrapper duration={5000}><Contact /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Contact/Contact-Us",
        element: <PageTransitionWrapper duration={5000}><Contact /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Resources/Browse",
        element: <PageTransitionWrapper duration={5000}><Browse /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Resources/Categories",
        element: <PageTransitionWrapper duration={5000}><BrowseCategory /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Browse-Category/:category",
        element: <PageTransitionWrapper duration={5000}><BrowseCategory /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Help-Center",
        element: <PageTransitionWrapper duration={5000}><HelpCenter /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/Help-Center",
        element: <PageTransitionWrapper duration={5000}><HelpCenter /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/FAQ",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/FAQ",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/Frequently-Asked-Questions",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Privacy-Policy",
        element: <PageTransitionWrapper duration={5000}><Privacy /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Legal/Privacy",
        element: <PageTransitionWrapper duration={5000}><Privacy /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Terms-of-Service",
        element: <PageTransitionWrapper duration={5000}><Terms /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Legal/Terms",
        element: <PageTransitionWrapper duration={5000}><Terms /></PageTransitionWrapper>
      },
      // Admin Routes
      {
        path: "Zyndex/Admin/:name/:email/Dashboard",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminDashboard /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Upload-Resource",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><UploadResource /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Resource-Management",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><ResourceManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Content-Management",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><ResourceManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Access",
        element: <ProtectedRoute role="admin" primaryOnly><PageTransitionWrapper duration={5000}><UserAccessManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Management",
        element: <ProtectedRoute role="admin" primaryOnly><PageTransitionWrapper duration={5000}><UserAccessManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Feedback-Review",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><FeedbackReview /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Payments",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminPayments /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Logs",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminLogs /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Profile",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      // User Routes
      {
        path: "Zyndex/User/:name/:email/Home",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserHome /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Search",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><SearchResults /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Resource/:id",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><ResourceDetail /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/My-Favorites",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Account-Settings",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/Pricing",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><Pricing /></PageTransitionWrapper></ProtectedRoute>
      }
    ]
  }
]);
