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
import PaymentPage from './pages/PaymentPage';
import InvoiceViewPage from './pages/InvoiceViewPage';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/Zyndex/User/Log-In.php" replace />
      },
      // User Login/Sign-Up Routes
      {
        path: "Zyndex/User/Log-In",
        element: <Navigate to="/Zyndex/User/Log-In.php" replace />
      },
      {
        path: "Zyndex/User/Log-In.php",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Sign-In",
        element: <Navigate to="/Zyndex/User/Sign-In.php" replace />
      },
      {
        path: "Zyndex/User/Sign-In.php",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Sign-Up",
        element: <Navigate to="/Zyndex/User/Sign-Up.php" replace />
      },
      {
        path: "Zyndex/User/Sign-Up.php",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      // Admin Login/Sign-Up Routes
      {
        path: "Zyndex/Admin/Log-In",
        element: <Navigate to="/Zyndex/Admin/Log-In.php" replace />
      },
      {
        path: "Zyndex/Admin/Log-In.php",
        element: <PageTransitionWrapper duration={5000}><Login /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Sign-Up",
        element: <Navigate to="/Zyndex/Admin/Sign-Up.php" replace />
      },
      {
        path: "Zyndex/Admin/Sign-Up.php",
        element: <PageTransitionWrapper duration={5000}><AdminRequest /></PageTransitionWrapper>
      },
      // Forgot Password Route
      {
        path: "Zyndex/Auth/Forgot-Password",
        element: <Navigate to="/Zyndex/Auth/Forgot-Password.php" replace />
      },
      {
        path: "Zyndex/Auth/Forgot-Password.php",
        element: <PageTransitionWrapper duration={5000}><ForgotPassword /></PageTransitionWrapper>
      },
      // Legacy route for backward compatibility
      {
        path: "Zyndex/Log-In",
        element: <Navigate to="/Zyndex/User/Log-In.php" replace />
      },
      {
        path: "Zyndex/Log-In.php",
        element: <Navigate to="/Zyndex/User/Log-In.php" replace />
      },
      {
        path: "admin-request",
        element: <Navigate to="/Zyndex/Admin/Sign-Up.php" replace />
      },
      {
        path: "admin-request.php",
        element: <Navigate to="/Zyndex/Admin/Sign-Up.php" replace />
      },
      {
        path: "Zyndex/User/authenticator-page",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/User/authenticator-page.php",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/Admin/authenticator-page",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/Admin/authenticator-page.php",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Zyndex/User/authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Zyndex/User/authenticator-Verification-Page.php",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/Admin/Authenticator-Zyndex/User/authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/Admin/Authenticator-Zyndex/User/authenticator-Verification-Page.php",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/User/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/User/Authenticator-Verification-Page.php",
        element: <PageTransitionWrapper duration={5000}><UserAuthenticator /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Authenticator-Verification-Page",
        element: <Navigate to="/Zyndex/Admin/Authenticator-Verification-Page.php" replace />
      },
      {
        path: "Zyndex/Admin/Authenticator-Verification-Page.php",
        element: <PageTransitionWrapper duration={5000}><AdminAuthenticator /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/Mail-OTP-Verification",
        element: <Navigate to="/Zyndex/User/Mail-OTP-Verification.php" replace />
      },
      {
        path: "Zyndex/User/Mail-OTP-Verification.php",
        element: <PageTransitionWrapper duration={5000}><MailOtpVerification /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Admin/Mail-OTP-Verification",
        element: <Navigate to="/Zyndex/Admin/Mail-OTP-Verification.php" replace />
      },
      {
        path: "Zyndex/Admin/Mail-OTP-Verification.php",
        element: <PageTransitionWrapper duration={5000}><MailOtpVerification /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/About/Pricing",
        element: <Navigate to="/Zyndex/About/Pricing.php" replace />
      },
      {
        path: "Zyndex/About/Pricing.php",
        element: <PageTransitionWrapper duration={5000}><Pricing /></PageTransitionWrapper>
      },
      {
        path: "ScholarSphere/Pricing",
        element: <Navigate to="/Zyndex/About/Pricing.php" replace />
      },
      {
        path: "ScholarSphere/Pricing.php",
        element: <Navigate to="/Zyndex/About/Pricing.php" replace />
      },
      {
        path: "Zyndex/Pricing",
        element: <Navigate to="/Zyndex/About/Pricing.php" replace />
      },
      {
        path: "Zyndex/Pricing.php",
        element: <Navigate to="/Zyndex/About/Pricing.php" replace />
      },
      {
        path: "Zyndex/About/About-Us",
        element: <Navigate to="/Zyndex/About/About-Us.php" replace />
      },
      {
        path: "Zyndex/About/About-Us.php",
        element: <PageTransitionWrapper duration={5000}><About /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/About/Contact",
        element: <Navigate to="/Zyndex/About/Contact.php" replace />
      },
      {
        path: "Zyndex/About/Contact.php",
        element: <PageTransitionWrapper duration={5000}><Contact /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Contact/Contact-Us",
        element: <Navigate to="/Zyndex/Contact/Contact-Us.php" replace />
      },
      {
        path: "Zyndex/Contact/Contact-Us.php",
        element: <PageTransitionWrapper duration={5000}><Contact /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Features",
        element: <Navigate to="/Zyndex/Features.php" replace />
      },
      {
        path: "Zyndex/Features.php",
        element: <PageTransitionWrapper duration={5000}><Browse /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Resources/Features",
        element: <Navigate to="/Zyndex/Features.php" replace />
      },
      {
        path: "Zyndex/Resources/Features.php",
        element: <Navigate to="/Zyndex/Features.php" replace />
      },
      {
        path: "Zyndex/Resources/Browse",
        element: <Navigate to="/Zyndex/Resources/Browse.php" replace />
      },
      {
        path: "Zyndex/Resources/Browse.php",
        element: <PageTransitionWrapper duration={5000}><Browse /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Resources/Categories",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Zyndex/Resources/Categories.php",
        element: <PageTransitionWrapper duration={5000}><BrowseCategory /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Categories",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Zyndex/Categories.php",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Resources/Categories",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Resources/Categories.php",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Categories",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Categories.php",
        element: <Navigate to="/Zyndex/Resources/Categories.php" replace />
      },
      {
        path: "Zyndex/Browse-Category/:category",
        element: <Navigate to="/Zyndex/Browse-Category/:category.php" replace />
      },
      {
        path: "Zyndex/Browse-Category/:category.php",
        element: <PageTransitionWrapper duration={5000}><BrowseCategory /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Help-Center",
        element: <Navigate to="/Zyndex/Help-Center.php" replace />
      },
      {
        path: "Zyndex/Help-Center.php",
        element: <PageTransitionWrapper duration={5000}><HelpCenter /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/Help-Center",
        element: <Navigate to="/Zyndex/Support/Help-Center.php" replace />
      },
      {
        path: "Zyndex/Support/Help-Center.php",
        element: <PageTransitionWrapper duration={5000}><HelpCenter /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/FAQ",
        element: <Navigate to="/Zyndex/FAQ.php" replace />
      },
      {
        path: "Zyndex/FAQ.php",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/FAQ",
        element: <Navigate to="/Zyndex/Support/FAQ.php" replace />
      },
      {
        path: "Zyndex/Support/FAQ.php",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Support/Frequently-Asked-Questions",
        element: <Navigate to="/Zyndex/Support/Frequently-Asked-Questions.php" replace />
      },
      {
        path: "Zyndex/Support/Frequently-Asked-Questions.php",
        element: <PageTransitionWrapper duration={5000}><FAQ /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Privacy-Policy",
        element: <Navigate to="/Zyndex/Privacy-Policy.php" replace />
      },
      {
        path: "Zyndex/Privacy-Policy.php",
        element: <PageTransitionWrapper duration={5000}><Privacy /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Legal/Privacy",
        element: <Navigate to="/Zyndex/Legal/Privacy.php" replace />
      },
      {
        path: "Zyndex/Legal/Privacy.php",
        element: <PageTransitionWrapper duration={5000}><Privacy /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Terms-of-Service",
        element: <Navigate to="/Zyndex/Terms-of-Service.php" replace />
      },
      {
        path: "Zyndex/Terms-of-Service.php",
        element: <PageTransitionWrapper duration={5000}><Terms /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Legal/Terms",
        element: <Navigate to="/Zyndex/Legal/Terms.php" replace />
      },
      {
        path: "Zyndex/Legal/Terms.php",
        element: <PageTransitionWrapper duration={5000}><Terms /></PageTransitionWrapper>
      },
      // Admin Routes
      {
        path: "Zyndex/Admin/:name/:email/Dashboard",
        element: <Navigate to="Dashboard.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Dashboard.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminDashboard /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Upload-Resource",
        element: <Navigate to="Upload-Resource.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Upload-Resource.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><UploadResource /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Resource-Management",
        element: <Navigate to="Resource-Management.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Resource-Management.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><ResourceManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Content-Management",
        element: <Navigate to="Content-Management.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Content-Management.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><ResourceManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Access",
        element: <Navigate to="User-Access.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Access.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><UserAccessManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Management",
        element: <Navigate to="User-Management.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/User-Management.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><UserAccessManagement /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Feedback-Review",
        element: <Navigate to="Feedback-Review.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Feedback-Review.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><FeedbackReview /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Payments",
        element: <Navigate to="Payments.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Payments.php",
        element: <ProtectedRoute role="admin" primaryOnly><PageTransitionWrapper duration={5000}><AdminPayments /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Logs",
        element: <Navigate to="Logs.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Logs.php",
        element: <ProtectedRoute role="admin" primaryOnly><PageTransitionWrapper duration={5000}><AdminLogs /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Admin/:name/:email/Profile",
        element: <Navigate to="Profile.php" replace />
      },
      {
        path: "Zyndex/Admin/:name/:email/Profile.php",
        element: <ProtectedRoute role="admin"><PageTransitionWrapper duration={5000}><AdminProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      // User Routes
      {
        path: "Zyndex/User/:name/:email/Home",
        element: <Navigate to="Home.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Home.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserHome /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Search",
        element: <Navigate to="Search.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Search.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><SearchResults /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Resource/:id",
        element: <Navigate to="Resource/:id.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Resource/:id.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><ResourceDetail /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile",
        element: <Navigate to="Profile.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/My-Favorites",
        element: <Navigate to="My-Favorites.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/My-Favorites.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Account-Settings",
        element: <Navigate to="Account-Settings.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Account-Settings.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Security-and-Devices",
        element: <Navigate to="Security-and-Devices.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Security-and-Devices.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Sessions",
        element: <Navigate to="Sessions.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Sessions.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing",
        element: <Navigate to="Billing.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><UserProfile /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/Pricing",
        element: <Navigate to="Pricing.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/Pricing.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><Pricing /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/UTR/*",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/UTR/*.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/UTR",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/UTR.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/*",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId/*.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/:amount/Payment/:orderId.php",
        element: <ProtectedRoute role="user"><PageTransitionWrapper duration={5000}><PaymentPage /></PageTransitionWrapper></ProtectedRoute>
      },
      {
        path: "Zyndex/Invoice/:paymentId",
        element: <Navigate to="/Zyndex/Invoice/:paymentId.php" replace />
      },
      {
        path: "Zyndex/Invoice/:paymentId.php",
        element: <PageTransitionWrapper duration={5000}><InvoiceViewPage /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/Billing/Invoice/:paymentId",
        element: <Navigate to="/Zyndex/Billing/Invoice/:paymentId.php" replace />
      },
      {
        path: "Zyndex/Billing/Invoice/:paymentId.php",
        element: <PageTransitionWrapper duration={5000}><InvoiceViewPage /></PageTransitionWrapper>
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/Invoice/:paymentId",
        element: <Navigate to="Invoice/:paymentId.php" replace />
      },
      {
        path: "Zyndex/User/:name/:email/Profile/Billing/Invoice/:paymentId.php",
        element: <PageTransitionWrapper duration={5000}><InvoiceViewPage /></PageTransitionWrapper>
      },
      // Catch-all route to gracefully redirect invalid or outdated paths to appropriate portal instead of throwing 404 to ErrorBoundary
      {
        path: "*",
        element: <Navigate to="/Zyndex/User/Log-In.php" replace />
      }
    ]
  }
]);
