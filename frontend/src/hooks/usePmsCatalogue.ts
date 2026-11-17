import { useEffect, useState } from 'react';
import { pmsTiers as designs, type PMSTier } from '../data/pms';
import { billingPrice, isCataloguePlan, planForTier, type BillingCycle, type CataloguePlan } from '../data/pms-catalogue';
export { checkoutUrl } from '../data/pms-catalogue';

export function usePmsCatalogue(cycle: BillingCycle = 'monthly') {
  const [plans, setPlans] = useState<CataloguePlan[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch('https://licenses.awexen.com/api/v1/portal/public-catalogue', { signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw Error('Catalogue unavailable');
        const body = await response.json();
        const rows = (body.data ?? body).plans;
        if (!Array.isArray(rows)) throw Error('Invalid catalogue');
        const valid = rows.filter(isCataloguePlan);
        if (!valid.length) throw Error('No available PMS plans');
        setPlans(valid);
      })
      .catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => abort.abort();
  }, []);
  const tiers: PMSTier[] = designs.flatMap(design => {
    const plan = planForTier(plans, design.id);
    if (!plan) return [];
    const month = billingPrice(plan, 'monthly')!;
    const year = billingPrice(plan, 'yearly');
    return [{
      ...design, name: { ar: plan.nameAr ?? plan.name, en: plan.name },
      monthly: month.monthlyEquivalent, yearly: year?.monthlyEquivalent ?? 0,
      yearlyTotal: year ? year.periodMinor / 100 : 0, hasYearly: !!year, setup: month.setup,
      includes: [],
      limits: [
        { label: { ar: 'المستخدمون', en: 'Users' }, value: { ar: String(plan.maxUsers), en: String(plan.maxUsers) } },
        { label: { ar: 'الفروع', en: 'Branches' }, value: { ar: String(plan.maxBranches), en: String(plan.maxBranches) } },
        { label: { ar: 'المخازن', en: 'Warehouses' }, value: { ar: String(plan.maxWarehouses), en: String(plan.maxWarehouses) } },
        { label: { ar: 'الأجهزة', en: 'Devices' }, value: { ar: String(plan.maxDevices), en: String(plan.maxDevices) } },
      ],
    }];
  });
  return { plans, tiers, error, ready: tiers.length > 0, cycle };
}
