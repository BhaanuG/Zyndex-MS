import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { User, Mail, Settings, Save, Heart, Edit, X, GraduationCap, Building, CreditCard, Hash, FileText, Download, Receipt, Printer } from 'lucide-react';
import UserLayout from '@/app/components/UserLayout';
import InvoiceModal from '@/app/components/InvoiceModal';
import StatementModal from '@/app/components/StatementModal';
import { generateSingleInvoiceHtml, openPrintableDocument } from '@/utils/invoiceGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/app/context/AuthContext';
import userService from '@/services/api/userService';
import subscriptionService from '@/services/api/subscriptionService';
import PasswordChangePanel from '@/app/components/PasswordChangePanel';

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [favourites, setFavourites] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({ 
    name: '', 
    email: '', 
    bio: '', 
    collegeName: '', 
    universityName: '',
    registrationNo: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        collegeName: user.collegeName || '',
        universityName: user.universityName || '',
        registrationNo: user.registrationNo || '',
      });
    }
  }, [user]);

  useEffect(() => {
    async function loadFavorites() {
      try {
        const response = await userService.getFavorites();
        setFavourites(response.resources || []);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }

    loadFavorites();
  }, []);

  const loadBillingData = async () => {
    setLoadingBilling(true);
    setBillingError(null);
    try {
      const [subRes, pmtsRes] = await Promise.all([
        subscriptionService.getMe(),
        subscriptionService.getPayments()
      ]);
      setActiveSub(subRes);
      setPayments(pmtsRes || []);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      setBillingError('Failed to fetch current subscription details. Please retry.');
    } finally {
      setLoadingBilling(false);
    }
  };

  useEffect(() => {
    if (getActiveTabFromPath() === 'billing') {
      loadBillingData();
    }
  }, [location.pathname]);

  const handleCancelSub = async () => {
    setCancelLoading(true);
    try {
      await subscriptionService.cancelSubscription();
      setCancelModalOpen(false);
      await loadBillingData();
    } catch (err) {
      alert(err.message || "Failed to cancel subscription.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      alert(error.message || 'Failed to update profile.');
    }
  };

  // Base profile URL components
  const userName = user?.name ? encodeURIComponent(user.name.replace(/\s+/g, '-')) : 'user';
  const userEmail = user?.email ? encodeURIComponent(user.email) : 'email';
  const profileBaseUrl = `/Zyndex/User/${userName}/${userEmail}/Profile`;

  // Get active tab from path URL
  const getActiveTabFromPath = () => {
    if (location.pathname.endsWith('/My-Favorites')) return 'favourites';
    if (location.pathname.endsWith('/Account-Settings')) return 'settings';
    if (location.pathname.endsWith('/Billing')) return 'billing';
    return 'favourites'; // fallback/default
  };

  // Sync tab clicks to router navigation
  const handleTabChange = (val) => {
    if (val === 'favourites') navigate(`${profileBaseUrl}/My-Favorites`);
    else if (val === 'settings') navigate(`${profileBaseUrl}/Account-Settings`);
    else if (val === 'billing') navigate(`${profileBaseUrl}/Billing`);
  };

  // Check if user is subscribed to student or university plan
  const isStudentOrUnivPlan = user?.subscriptionPlan && 
    (user.subscriptionPlan.includes('STUDENT') || user.subscriptionPlan.includes('UNIVERSITY'));

  const getPlanPrice = (plan) => {
    if (!plan || plan === 'FREE') return '₹0';
    if (plan.includes('BASIC')) return '₹99';
    if (plan.includes('PLUS')) return '₹199';
    if (plan.includes('PRO') || plan.includes('RESEARCHER')) return '₹499';
    if (plan.includes('UNIVERSITY')) return '₹1,00,000';
    return '₹3 - 5 Lakh';
  };

  const getPlanDuration = (plan) => {
    if (!plan || plan === 'FREE') return 'Forever';
    if (plan.includes('UNIVERSITY') || plan.includes('ENTERPRISE')) return '365 Days';
    return '30 Days';
  };

  const handleCollegeUnivChange = (val) => {
    setProfileData({ ...profileData, collegeName: val, universityName: val });
  };

  return (
    <UserLayout>
      <div className="py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-semibold text-gray-900 mb-8">My Profile</h1>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <div className="size-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4">
                {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{profileData.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{profileData.email}</p>
              {isStudentOrUnivPlan && profileData.collegeName && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full inline-flex items-center gap-1 mb-4">
                  ✓ Verified Student
                </span>
              )}
            </div>

            <div className="lg:col-span-3 bg-white rounded-xl shadow-md">
              <Tabs value={getActiveTabFromPath()} onValueChange={handleTabChange} className="w-full">
                <div className="border-b border-gray-100 px-6 pt-4">
                  <TabsList className="bg-orange-50/60 p-1 rounded-xl">
                    <TabsTrigger
                      value="favourites"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all"
                    >
                      <Heart className="size-4 mr-1.5" />
                      My Favourites
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all"
                    >
                      <Settings className="size-4 mr-1.5" />
                      Account Settings
                    </TabsTrigger>
                    <TabsTrigger
                      value="billing"
                      className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm transition-all"
                    >
                      <CreditCard className="size-4 mr-1.5" />
                      Billing & Plans
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="favourites" className="p-6">
                  {favourites.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Heart className="size-16 mx-auto mb-4 text-orange-200" />
                      <p className="text-lg font-medium mb-2">No favourites yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {favourites.map((favourite) => (
                        <div key={favourite.id} className="border border-gray-200 rounded-lg p-4">
                          <p className="font-semibold text-gray-900">{favourite.title}</p>
                          <p className="text-sm text-gray-500">{favourite.category} | Author of Resource: {favourite.subject}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="settings" className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium"><Edit className="size-4" />Edit Profile</button>
                    ) : (
                      <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"><X className="size-4" />Cancel</button>
                    )}
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input type="text" name="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input type="email" name="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" />
                    </div>

                    {isStudentOrUnivPlan && (
                      <>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <input 
                            type="text" 
                            name="collegeName" 
                            value={profileData.collegeName} 
                            onChange={(e) => handleCollegeUnivChange(e.target.value)} 
                            disabled={!isEditing} 
                            placeholder="College / University Name" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" 
                            required 
                          />
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <input 
                            type="text" 
                            name="registrationNo" 
                            value={profileData.registrationNo} 
                            onChange={(e) => setProfileData({ ...profileData, registrationNo: e.target.value })} 
                            disabled={!isEditing} 
                            placeholder="Student ID / Registration Number" 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" 
                            required 
                          />
                        </div>
                      </>
                    )}

                    {isEditing && <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"><Save className="size-4" />Save Changes</button>}
                  </form>
                  <PasswordChangePanel user={user} />
                </TabsContent>

                <TabsContent value="billing" className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Billing & Subscriptions</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Authoritative subscription status, payment receipts, and tax invoices</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStatementModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors text-xs flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                        title="View and Download Consolidated Billing Statement"
                      >
                        <Receipt className="size-4 text-slate-600" /> Total Billing Statement
                      </button>
                      <Link 
                        to={`/Zyndex/User/${userName}/${userEmail}/Profile/Billing/Pricing`} 
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold transition-colors text-xs shadow-xs"
                      >
                        Change / Upgrade Plan
                      </Link>
                    </div>
                  </div>

                  {loadingBilling ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                      <div className="size-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-medium text-slate-600">Retrieving authoritative subscription status...</p>
                    </div>
                  ) : billingError ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-red-700 text-sm">
                        <p className="font-semibold">Unable to fetch live subscription status</p>
                        <p className="text-xs text-red-600 mt-0.5">{billingError}</p>
                      </div>
                      <button 
                        onClick={loadBillingData}
                        className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shrink-0"
                      >
                        Retry Fetch
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Subscription Plan</p>
                          <p className="text-xl font-bold text-slate-800 mt-1">
                            {activeSub?.planName || activeSub?.plan_name || 'Free / Demo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pricing / Interval</p>
                          <p className="text-base text-slate-700 mt-1">
                            {activeSub?.pricePaise !== undefined && activeSub.pricePaise > 0
                              ? `₹${activeSub.pricePaise / 100}`
                              : activeSub?.price_paise !== undefined && activeSub.price_paise > 0
                              ? `₹${activeSub.price_paise / 100}`
                              : getPlanPrice(activeSub?.planId || user?.subscriptionPlan)} / {activeSub?.billingInterval || activeSub?.billing_interval || 'Forever'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Status</p>
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              activeSub?.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : activeSub?.status === 'CANCELLED'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <span className={`size-2 rounded-full ${
                                activeSub?.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' :
                                activeSub?.status === 'CANCELLED' ? 'bg-amber-500' : 'bg-slate-400'
                              }`} />
                              {activeSub?.status === 'ACTIVE' 
                                ? 'Active' 
                                : activeSub?.status === 'CANCELLED'
                                ? 'Cancelled (Active until expiry)'
                                : 'Free Tier'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription Validity</p>
                          <p className="text-base text-slate-700 mt-1">
                            {activeSub?.endDate || activeSub?.end_date 
                              ? `Expires on ${new Date(activeSub.endDate || activeSub.end_date).toLocaleDateString()}` 
                              : 'Lifetime / Free Tier Access'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!loadingBilling && activeSub?.status === 'ACTIVE' && activeSub?.planId !== 'FREE' && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Subscription Expiration & Renewal Policy</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Zyndex never automatically charges your payment method. When your plan period expires, your account will automatically revert to the Free plan. A reminder email will be sent 1 day before your plan ends.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Billing History & Invoices</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      {payments.length === 0 ? (
                        <p className="text-sm text-slate-500 py-8 text-center">No payment transactions recorded.</p>
                      ) : (
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4 font-semibold text-slate-600">Date</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Payment ID</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">UTR Number</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Amount</th>
                              <th className="py-3 px-4 font-semibold text-slate-600">Status</th>
                              <th className="py-3 px-4 font-semibold text-slate-600 text-right">Tax Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((pmt) => (
                              <tr key={pmt.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3.5 px-4 text-slate-500 text-xs">
                                  {new Date(pmt.created_at || pmt.createdAt).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 text-slate-800 font-mono text-xs">
                                  {pmt.gateway_payment_id || pmt.id}
                                </td>
                                <td className="py-3.5 px-4">
                                  {pmt.utr ? (
                                    <span className="font-mono text-xs font-bold text-orange-900 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded select-all">
                                      {pmt.utr}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">Pending</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-slate-800 font-bold">
                                  ₹{pmt.amount_paise / 100}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border uppercase ${
                                    pmt.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    pmt.status === 'PAYMENT_INITIATED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    pmt.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    pmt.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-200' :
                                    pmt.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    pmt.status === 'REVIEW_REQUIRED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    pmt.status === 'EXPIRED' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}>
                                    {pmt.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedInvoice({
                                          id: pmt.id,
                                          paymentId: pmt.gateway_payment_id || pmt.id,
                                          orderId: pmt.gateway_order_id || 'ORD_HIST',
                                          date: new Date(pmt.created_at || pmt.createdAt).toLocaleString(),
                                          planName: pmt.plan_id ? pmt.plan_id.replace(/_/g, ' ') : (activeSub?.planName || 'Student Plus'),
                                          amount: (pmt.amount_paise / 100).toFixed(2),
                                          customerName: user?.name,
                                          customerEmail: user?.email,
                                          paymentMethod: pmt.payment_method || 'UPI',
                                          status: pmt.status || 'PAID'
                                        });
                                        setInvoiceModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold transition-all shadow-xs"
                                      title="Tax Invoice"
                                      aria-label="Tax Invoice"
                                    >
                                      <FileText className="size-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Single Tax Invoice Viewer & Downloader Modal */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoiceData={selectedInvoice}
      />

      {/* Total Consolidated Billing Statement Modal */}
      <StatementModal
        isOpen={statementModalOpen}
        onClose={() => setStatementModalOpen(false)}
        userData={user}
        payments={payments}
        activeSub={activeSub}
      />
    </UserLayout>
  );
}
