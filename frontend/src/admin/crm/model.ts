export type Client = {
  id: string; name: string; company: string; email: string; phone: string; source: string;
  stage: string; service: string; notes: string; owner_id: string | null; next_follow_up: string | null;
  website: string; address: string; tags: string[]; priority: string; archived_at: string | null;
  created_at: string; updated_at: string;
  origin_table?: string | null; origin_id?: string | null;
};
export type Deal = {
  id: string; client_id: string; title: string; service: string; stage: string; value: number;
  probability: number; expected_close: string | null; owner_id: string | null; notes: string; lost_reason: string;
  created_at: string; updated_at: string;
};
export type Task = {
  id: string; client_id: string; deal_id: string | null; title: string; notes: string;
  due_date: string; priority: string; status: string; assignee_id: string | null; created_at: string;
};
export type Activity = { id: string; client_id: string; kind: string; body: string; created_by: string | null; created_at: string };
export type Payment = { id: string; client_id: string; deal_id: string; invoice_id: string | null; amount: number; paid_on: string; method: string; reference: string; notes: string };
export type InvoiceItem = { description: string; quantity: number; unit_price: number };
export type Invoice = { id: string; invoice_number: number; client_id: string; deal_id: string; issued_on: string; due_on: string; status: string; items: InvoiceItem[]; tax_rate: number; subtotal: number; total: number; notes: string };
export type Contact = { id: string; client_id: string; name: string; job_title: string; phone: string; email: string };
export type Member = { user_id: string; full_name: string; email: string; role: string; is_active: boolean };
export type CrmData = { clients: Client[]; deals: Deal[]; tasks: Task[]; activities: Activity[]; payments: Payment[]; contacts: Contact[]; members: Member[]; invoices: Invoice[] };

export const clientStages = [
  ['lead','عميل محتمل'], ['qualified','مؤهل'], ['proposal','عرض سعر'], ['active','عميل نشط'], ['completed','مكتمل'], ['lost','غير مهتم'],
] as const;
export const dealStages = [
  ['lead','فرصة جديدة',10], ['qualified','تأهيل',30], ['proposal','عرض سعر',50],
  ['negotiation','تفاوض',75], ['won','تم الفوز',100], ['lost','خسارة',0],
] as const;
export const priorities = [['low','منخفضة'],['normal','عادية'],['high','عالية']] as const;
export const activityKinds = [['note','ملاحظة'],['call','مكالمة'],['email','بريد إلكتروني'],['whatsapp','واتساب'],['meeting','اجتماع'],['system','تحديث النظام']] as const;
export const paymentMethods = [['bank','تحويل بنكي'],['cash','نقدي'],['wallet','محفظة إلكترونية'],['card','بطاقة'],['other','أخرى']] as const;
export const labelFor = (options: readonly (readonly [string, string, ...unknown[]])[], value: string) => options.find(([key]) => key === value)?.[1] ?? value;
export const money = (value: number) => new Intl.NumberFormat('ar-EG',{style:'currency',currency:'EGP',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value) || 0);
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeZone:'Africa/Cairo'}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value)) : 'غير محدد';
export const isOverdue = (task: Task, day = today()) => task.status === 'open' && task.due_date < day;
const sumMoney = (values: number[]) => values.reduce((sum,value)=>sum+Math.round(Number(value)*100),0)/100;
export const paidFor = (payments: Payment[], dealId: string) => sumMoney(payments.filter(p => p.deal_id === dealId).map(p=>p.amount));
export function summarize(deals: Deal[], payments: Payment[]) {
  const open = deals.filter(d => !['won','lost'].includes(d.stage));
  const won = deals.filter(d => d.stage === 'won');
  return {
    pipeline: sumMoney(open.map(d=>d.value)),
    weighted: sumMoney(open.map(d=>Number(d.value)*d.probability/100)),
    won: sumMoney(won.map(d=>d.value)),
    paid: sumMoney(payments.map(p=>p.amount)),
    outstanding: sumMoney(won.map(d=>Math.max(0,Number(d.value)-paidFor(payments,d.id)))),
    winRate: won.length + deals.filter(d => d.stage === 'lost').length ? Math.round(won.length / (won.length + deals.filter(d => d.stage === 'lost').length) * 100) : 0,
  };
}
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const quote = (value: string | number) => {
    let text = String(value);
    // Spreadsheet apps execute formulas even in quoted CSV cells.
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g,'""')}"`;
  };
  const csv = '\uFEFF' + [headers,...rows].map(row => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
