export const PLAN_NAMES = {
  FREE: 'Free / Demo',
  STUDENT_BASIC: 'Student Basic',
  STUDENT_PLUS: 'Student Plus',
  RESEARCHER_PRO: 'PhD Scholar / Researcher',
  UNIVERSITY: 'Academic Faculty & Educator',
  ENTERPRISE: 'Distinguished Fellow & Scholar',
};

export const PLAN_HIERARCHY = [
  'FREE',
  'STUDENT_BASIC',
  'STUDENT_PLUS',
  'RESEARCHER_PRO',
  'UNIVERSITY',
  'ENTERPRISE',
];

/**
 * Returns true if the selected user plan tier can access a resource with requiredPlan.
 * For example:
 * - FREE tier accesses only FREE resources.
 * - STUDENT_BASIC accesses FREE and STUDENT_BASIC.
 * - STUDENT_PLUS accesses FREE, STUDENT_BASIC, and STUDENT_PLUS.
 * - RESEARCHER_PRO accesses FREE, STUDENT_BASIC, STUDENT_PLUS, and RESEARCHER_PRO.
 */
export function isResourceAccessibleForPlan(resourcePlan, userSelectedPlan) {
  if (!userSelectedPlan || userSelectedPlan === 'ALL') return true;
  const resKey = String(resourcePlan || 'FREE').trim().toUpperCase();
  const selectedKey = String(userSelectedPlan).trim().toUpperCase();

  const userIndex = PLAN_HIERARCHY.indexOf(selectedKey);
  const resourceIndex = PLAN_HIERARCHY.indexOf(resKey);

  // If unknown, fallback to matching or index comparison
  if (userIndex === -1 || resourceIndex === -1) {
    return resKey === selectedKey;
  }
  return resourceIndex <= userIndex;
}

export const PLATFORM_PLANS = [
  { id: 'FREE', name: 'Free / Demo', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  { id: 'STUDENT_BASIC', name: 'Student Basic', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { id: 'STUDENT_PLUS', name: 'Student Plus', badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  { id: 'RESEARCHER_PRO', name: 'PhD Scholar / Researcher', badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200' },
  { id: 'UNIVERSITY', name: 'Academic Faculty & Educator', badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  { id: 'ENTERPRISE', name: 'Distinguished Fellow & Scholar', badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200' },
];

export function getPlanName(planId) {
  if (!planId) return 'Free / Demo';
  const key = String(planId).trim().toUpperCase();
  if (PLAN_NAMES[key]) return PLAN_NAMES[key];
  if (key === 'BASIC') return PLAN_NAMES.STUDENT_BASIC;
  if (key === 'PLUS') return PLAN_NAMES.STUDENT_PLUS;
  if (key === 'RESEARCHER' || key === 'PHD_SCHOLAR') return PLAN_NAMES.RESEARCHER_PRO;
  if (key === 'FACULTY' || key === 'EDUCATOR') return PLAN_NAMES.UNIVERSITY;
  if (key === 'FELLOW' || key === 'SCHOLAR') return PLAN_NAMES.ENTERPRISE;
  return key.replace(/_/g, ' ');
}

export function getPlanBadgeClass(planId) {
  if (!planId || planId === 'FREE') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  const key = String(planId).trim().toUpperCase();
  const found = PLATFORM_PLANS.find(p => p.id === key);
  return found?.badgeClass || 'bg-orange-50 text-orange-700 border border-orange-200';
}

export function toUrlSlug(text) {
  if (!text) return 'item';
  return String(text)
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildResourceUrl(userName, userEmail, category, title, id) {
  const safeName = userName ? encodeURIComponent(String(userName).trim().replace(/\s+/g, '-')) : 'user';
  const safeEmail = userEmail ? encodeURIComponent(String(userEmail).trim()) : 'email';
  const safeCat = toUrlSlug(category || 'General');
  const safeTitle = toUrlSlug(title || 'Resource');
  const cleanId = String(id || '').replace(/\.php$/i, '');
  return `/Zyndex/User/${safeName}/${safeEmail}/${safeCat}/Resource/${safeTitle}/${cleanId}.php`;
}

/**
 * Maps a User Type selected during registration or account settings to their ideal recommended subscription plan.
 * - Student -> STUDENT_BASIC (Student Basic)
 * - Teacher / Educator -> UNIVERSITY (Academic Faculty & Educator)
 * - Researcher -> RESEARCHER_PRO (PhD Scholar / Researcher)
 * - Professional -> ENTERPRISE (Distinguished Fellow & Scholar)
 * - General Reader -> STUDENT_PLUS (Student Plus)
 * - Other -> STUDENT_PLUS
 */
export function getRecommendedPlanForUserType(userType) {
  if (!userType) return 'STUDENT_BASIC';
  const clean = String(userType).trim().toLowerCase();

  if (clean.includes('student')) {
    return 'STUDENT_BASIC';
  }
  if (clean.includes('teacher') || clean.includes('educator') || clean.includes('faculty') || clean.includes('professor')) {
    return 'UNIVERSITY';
  }
  if (clean.includes('researcher') || clean.includes('phd') || clean.includes('scholar')) {
    return 'RESEARCHER_PRO';
  }
  if (clean.includes('professional') || clean.includes('distinguished') || clean.includes('fellow')) {
    return 'ENTERPRISE';
  }
  if (clean.includes('reader')) {
    return 'STUDENT_PLUS';
  }
  return 'STUDENT_PLUS';
}
