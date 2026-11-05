import assert from 'node:assert/strict';
import { isOverdue, paidFor, summarize, labelFor, dealStages } from '../src/admin/crm/model.ts';

const deals = [
  { id: 'open', stage: 'proposal', value: 10000, probability: 50 },
  { id: 'won', stage: 'won', value: 5000, probability: 100 },
  { id: 'lost', stage: 'lost', value: 9000, probability: 0 },
];
const payments = [{ deal_id: 'won', amount: 2000 }, { deal_id: 'open', amount: 1000 }];
assert.deepEqual(summarize(deals, payments), {
  pipeline: 10000, weighted: 5000, won: 5000, paid: 3000, outstanding: 3000, winRate: 50,
});
assert.equal(summarize(deals, [{ deal_id: 'won', amount: 6000 }]).outstanding, 0, 'Overpayments never create negative debt');
assert.equal(summarize([], []).winRate, 0);
assert.equal(paidFor(payments, 'won'), 2000, 'Payments are scoped to the correct deal');
assert.equal(paidFor([{deal_id:'cents',amount:0.1},{deal_id:'cents',amount:0.2}], 'cents'), 0.3, 'Currency sums preserve cents');
assert.equal(isOverdue({ status: 'open', due_date: '2026-11-04' }, '2026-11-05'), true);
assert.equal(isOverdue({ status: 'open', due_date: '2026-11-05' }, '2026-11-05'), false, 'Today is not overdue');
assert.equal(isOverdue({ status: 'done', due_date: '2026-11-04' }, '2026-11-05'), false);
assert.equal(labelFor(dealStages, 'won'), 'تم الفوز');
console.log('CRM calculations, stage labels, payment allocation and follow-up boundaries passed.');
