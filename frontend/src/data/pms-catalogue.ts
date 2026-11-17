import type { PMSTierId } from './pms';

export type BillingCycle = 'monthly' | 'yearly';
export interface CataloguePlan {
  id: number;
  key: string;
  name: string;
  nameAr: string | null;
  price: number;
  setupFee: number;
  currency: string;
  maxUsers: number;
  maxBranches: number;
  maxWarehouses: number;
  maxDevices: number;
  system?: { key: string };
  billingOptions: { billingInterval: 'MONTHLY' | 'YEARLY'; price: number }[];
  features: { feature: { key: string; name: string; nameAr: string | null } }[];
  includedServices?: string[];
}
export const PMS_SETUP_SERVICES: Record<string, { ar: string; en: string }> = {
  WOOCOMMERCE_SETUP: { ar: 'خدمة تجهيز ربط متجر WooCommerce', en: 'WooCommerce store connection setup' },
  SHIPPING_SETUP: { ar: 'خدمة تجهيز الربط بشركات الشحن', en: 'Shipping company connection setup' },
};
export const PLAN_KEYS: Record<PMSTierId, string> = {
  starter: 'PMS_STARTER', growth: 'PMS_PRO', scale: 'PMS_BUSINESS',
};
export const planForTier = (plans: CataloguePlan[], id: PMSTierId) =>
  plans.find(plan => plan.key === PLAN_KEYS[id]);

/** Keep the authoritative period total; monthly equivalents are display values only. */
export function billingPrice(plan: CataloguePlan, cycle: BillingCycle) {
  const option = plan.billingOptions.find(x => x.billingInterval === (cycle === 'yearly' ? 'YEARLY' : 'MONTHLY'));
  if (!option || !Number.isSafeInteger(option.price) || option.price <= 0 || !Number.isSafeInteger(plan.setupFee) || plan.setupFee < 0) return null;
  return { periodMinor: option.price, monthlyEquivalent: option.price / (cycle === 'yearly' ? 1200 : 100), setup: plan.setupFee / 100 };
}

export function checkoutUrl(id: PMSTierId, cycle: BillingCycle) {
  const url = new URL('https://licenses.awexen.com/portal/register');
  url.searchParams.set('plan', PLAN_KEYS[id]);
  url.searchParams.set('billingInterval', cycle === 'yearly' ? 'YEARLY' : 'MONTHLY');
  return url.toString();
}

export function selectResourcePlan(plans: CataloguePlan[], requirements: { branches: number; warehouses: number; devices: number }, cycle: BillingCycle) {
  if (Object.values(requirements).some(x => !Number.isSafeInteger(x) || x < 1)) return null;
  return plans.filter(plan => Object.values(PLAN_KEYS).includes(plan.key)
    && plan.maxBranches >= requirements.branches && plan.maxWarehouses >= requirements.warehouses
    && plan.maxDevices >= requirements.devices && billingPrice(plan, cycle))
    .sort((a, b) => billingPrice(a, cycle)!.periodMinor - billingPrice(b, cycle)!.periodMinor || a.id - b.id)[0] ?? null;
}

export function isCataloguePlan(value: unknown): value is CataloguePlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as CataloguePlan;
  return p.system?.key === 'PMS' && Object.values(PLAN_KEYS).includes(p.key)
    && typeof p.name === 'string' && p.currency === 'EGP'
    && [p.id, p.maxUsers, p.maxBranches, p.maxWarehouses, p.maxDevices].every(x => Number.isSafeInteger(x) && x > 0)
    && Number.isSafeInteger(p.setupFee) && p.setupFee >= 0
    && Array.isArray(p.billingOptions) && !!billingPrice(p, 'monthly')
    && (p.includedServices === undefined || (Array.isArray(p.includedServices) && p.includedServices.every(x => typeof x === 'string')))
    && Array.isArray(p.features) && p.features.every(x => typeof x?.feature?.key === 'string' && typeof x.feature.name === 'string');
}
