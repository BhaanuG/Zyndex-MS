export const PLAN_NAMES = {
  FREE: 'Free / Demo',
  STUDENT_BASIC: 'Student Basic',
  STUDENT_PLUS: 'Student Plus',
  RESEARCHER_PRO: 'PhD Scholar / Researcher',
  UNIVERSITY: 'Academic Faculty & Educator',
  ENTERPRISE: 'Distinguished Fellow & Scholar',
};

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
