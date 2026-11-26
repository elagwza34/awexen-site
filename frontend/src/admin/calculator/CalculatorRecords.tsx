import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Quotation } from "../../calculator/publicApi";
import { calculatorAdminRequest } from "./api";
import { SelectField } from "./Fields";

export type RecordView = "quotations" | "leads" | "analytics" | "audit";

type Lead = { id: string; quotation_id: string; quote_request_id?: string | number; quotation?: { reference: string } | null; details: Record<string, unknown>; status: string; created_at: string };
type Records = {
  quotations: { id: string; reference: string; project_id: string; created_at: string; valid_until: string; snapshot: Quotation }[];
  leads: Lead[];
  audit: { id: string; actor_id: string; action: string; revision?: string; version_id?: string; created_at: string }[];
  more: Record<Exclude<RecordView, "analytics">, boolean>;
};
type Metrics = {
  events: Record<string, number>;
  projects: Record<string, number>;
  sections: Record<string, number>;
  sectionDropoff?: Record<string, number>;
  estimateAverages: Record<string, number>;
  leads: Record<string, number>;
};

const statuses = [
  ["new", "جديد"], ["contacted", "تم التواصل"], ["qualified", "مؤهل"],
  ["proposal_sent", "تم إرسال العرض"], ["negotiation", "تفاوض"], ["accepted", "مقبول"],
  ["rejected", "مرفوض"], ["closed", "مغلق"],
] as const;

const leadStatusLabels: Record<string, string> = Object.fromEntries(statuses);
const billingLabels: Record<string, string> = { oneTime: "لمرة واحدة", monthly: "شهري", annual: "سنوي" };
const statusLabels: Record<string, string> = { priced: "مسعّر", free: "مجاني", included: "مشمول", manual: "يتطلب عرضًا يدويًا", unconfigured: "غير مُعد" };
const actionLabels: Record<string, string> = { save: "حفظ", publish: "نشر", restore: "استعادة", lead_status: "تحديث حالة طلب" };
const detailLabels: Record<string, string> = { name: "الاسم", company: "الشركة", phone: "الهاتف", whatsapp: "واتساب", email: "البريد", requirements: "المتطلبات" };
const eventLabels: Record<string, string> = { started: "بدء الاستخدام", completed: "إكمال الحاسبة", quotation_requested: "طلب عرض سعر", lead_submitted: "إرسال بيانات العميل" };

function pretty(value: string) {
  return value.replace(/[_-]/g, " ").replace(/^./, (first) => first.toUpperCase());
}

function label(map: Record<string, string>, value: string) {
  return map[value] ?? pretty(value);
}

function time(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

export function CalculatorRecords({ view }: { view: RecordView }) {
  const [records, setRecords] = useState<Records | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (view === "analytics") {
      void calculatorAdminRequest<{ metrics: Metrics }>("admin-analytics")
        .then((data) => { if (!cancelled) setMetrics(data.metrics); })
        .catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    } else {
      void calculatorAdminRequest<Records>("admin-records", { offset })
        .then((data) => { if (!cancelled) setRecords(data); })
        .catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    }
    return () => { cancelled = true; };
  }, [view, refresh, offset]);

  function changePage(next: number) {
    setError("");
    setRecords(null);
    setOffset(next);
  }

  async function changeStatus(lead: Lead, status: string) {
    setSaving(lead.id);
    setError("");
    try {
      await calculatorAdminRequest("admin-lead-status", { id: lead.id, status });
      setRecords((previous) => previous && { ...previous, leads: previous.leads.map((item) => item.id === lead.id ? { ...item, status } : item) });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر حفظ حالة الطلب.");
    } finally {
      setSaving(null);
    }
  }

  return <div className="grid gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">{view === "audit" ? "سجل التغييرات" : view === "leads" ? "طلبات العملاء" : view === "quotations" ? "عروض أسعار الحاسبة" : "تحليلات الحاسبة"}</h3>
      <button type="button" className="admin-button-secondary" onClick={() => { setError(""); setRefresh((count) => count + 1); }}>تحديث السجلات</button>
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!error && (view === "analytics" ? !metrics : !records) && <p role="status">جارٍ تحميل السجلات…</p>}
    {view === "analytics" && metrics && <Analytics metrics={metrics} />}
    {view === "quotations" && records && <>
      {!records.quotations.length && <p>لا توجد عروض أسعار من الحاسبة.</p>}
      {records.quotations.map((quote) => <details className="border border-white/10 p-3" key={quote.reference}>
        <summary className="cursor-pointer">{quote.reference} · {quote.snapshot.project.title.ar || quote.snapshot.project.title.en} · {time(quote.created_at)}</summary>
        <div className="mt-3 grid gap-2">
          <p>صالح حتى {time(quote.valid_until)} · الإعداد <span dir="ltr">{quote.snapshot.versionId}</span></p>
          <QuoteSummary snapshot={quote.snapshot} />
        </div>
      </details>)}
    </>}
    {view === "leads" && records && <>
      <Link className="underline" to="?section=quotes">فتح صندوق عروض الأسعار لمتابعة العميل</Link>
      {!records.leads.length && <p>لا توجد طلبات عملاء من الحاسبة.</p>}
      {records.leads.map((lead) => {
        const reference = lead.quotation?.reference;
        return <article className="grid gap-2 border border-white/10 p-3" key={lead.id}>
        <p className="font-semibold">{time(lead.created_at)}{lead.quote_request_id && ` · طلب وارد ${lead.quote_request_id}`}
          {reference && ` · ${reference}`}</p>
        <dl className="grid gap-1">{Object.entries(lead.details).filter(([, value]) => typeof value === "string" && value).map(([key, value]) => <div key={key}><dt className="inline font-medium">{label(detailLabels, key)} </dt><dd className="inline break-words">{String(value)}</dd></div>)}</dl>
        <fieldset disabled={saving !== null} className="max-w-xs">
          <SelectField label="حالة الطلب" options={statuses} value={lead.status} onChange={(value) => void changeStatus(lead, value)} />
        </fieldset>
      </article>;
      })}
    </>}
    {view === "audit" && records && <ul className="grid gap-2">
      {!records.audit.length && <li>لا توجد مدخلات في سجل التغييرات.</li>}
      {records.audit.map((entry) => <li className="border border-white/10 p-3" key={entry.id}>
        <p className="font-semibold">{label(actionLabels, entry.action)} · {time(entry.created_at)}</p>
        <p className="break-all text-sm">المنفّذ <span dir="ltr">{entry.actor_id}</span>{entry.version_id && <> · الإصدار <span dir="ltr">{entry.version_id}</span></>}{entry.revision && <> · المراجعة <span dir="ltr">{entry.revision}</span></>}</p>
      </li>)}
    </ul>}
    {view !== "analytics" && records && (offset > 0 || records.more[view]) &&
      <nav aria-label="صفحات سجلات الحاسبة" className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={offset === 0 || saving !== null}
          onClick={() => changePage(offset - 100)}>السابق</button>
        <button type="button" className="admin-button-secondary" disabled={!records.more[view] || saving !== null}
          onClick={() => changePage(offset + 100)}>التالي</button>
      </nav>}
  </div>;
}

function Analytics({ metrics }: { metrics: Metrics }) {
  const starts = metrics.events.started ?? 0;
  const completions = metrics.events.completed ?? 0;
  const requests = Object.values(metrics.leads).reduce((total, count) => total + count, 0);
  const trackedRequests = metrics.events.quotation_requested ?? 0;
  const percentage = (numerator: number, denominator: number) => denominator > 0 ? `${(numerator / denominator * 100).toFixed(1)}%` : "—";
  return <>
    <p className="text-sm">آخر 30 يومًا. مقاييس الجلسات تغطي الزوار الذين وافقوا على التحليلات الاختيارية.</p>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries({ "بدايات استخدام الحاسبة": starts, "معدل الإكمال": percentage(completions, starts), "طلبات عروض الأسعار": requests, "معدل تحويل الطلبات المتتبعة": percentage(trackedRequests, completions) }).map(([heading, value]) =>
        <div key={heading} className="border border-white/10 p-3"><dt>{heading}</dt><dd className="text-xl font-bold">{value}</dd></div>)}
    </dl>
    {([["الأحداث", metrics.events], ["أنواع المشاريع الأكثر استخدامًا", metrics.projects], ["إكمال المراحل", metrics.sections], ["متوسط قيمة المشروع التقديرية", metrics.estimateAverages], ["حالات الطلبات", metrics.leads]] as const).map(([heading, entries]) => <div key={heading} className="border border-white/10 p-3">
      <h4 className="mb-2 font-bold">{heading}</h4>
      <dl className="grid gap-1">{Object.entries(entries ?? {}).map(([key, value]) => <div className="flex justify-between gap-2" key={key}><dt>{heading === "الأحداث" ? label(eventLabels, key) : heading === "حالات الطلبات" ? label(leadStatusLabels, key) : pretty(key)}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>
    </div>)}
    {metrics.sectionDropoff && Object.keys(metrics.sectionDropoff).length > 0 && <div className="border border-white/10 p-3">
      <h4 className="mb-2 font-bold">التسرب حسب المرحلة</h4>
      <dl className="grid gap-1">{Object.entries(metrics.sectionDropoff).map(([section, rate]) => <div className="flex justify-between gap-2" key={section}><dt>{pretty(section)}</dt><dd>{rate.toLocaleString()}%</dd></div>)}</dl>
    </div>}
  </>;
}

function QuoteSummary({ snapshot }: { snapshot: Quotation }) {
  const { estimate } = snapshot;
  const money = (amount: number) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: estimate.currency }).format(amount / 10 ** estimate.minorUnits);
  return <>
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {Object.entries({ "لمرة واحدة": estimate.oneTime, "شهري": estimate.monthly, "سنوي": estimate.annual, "السنة الأولى": estimate.firstYear, "الخصم": estimate.discount, "الضريبة": estimate.tax }).map(([heading, value]) =>
        <div key={heading}><dt className="text-sm">{heading}</dt><dd className="font-semibold">{money(value)}</dd></div>)}
    </dl>
    {!!estimate.items.length && <ul className="grid gap-1">
      {estimate.items.map((item) => <li className="border-t border-white/10 pt-1 text-sm" key={item.id}>
        {item.title.ar || item.title.en} · {item.quantity} · {label(billingLabels, item.billing)} · {item.status === "priced" ? money(item.amount) : label(statusLabels, item.status)}
      </li>)}
    </ul>}
    {!!snapshot.requirements.length && <details><summary className="cursor-pointer">المتطلبات المحددة</summary>
      <dl className="grid gap-1">{snapshot.requirements.map((entry) => {
        const format = (value: string | number | boolean) => typeof value === "string" ? (entry.options?.find((option) => option.id === value)?.title.ar || entry.options?.find((option) => option.id === value)?.title.en) ?? value : typeof value === "boolean" ? value ? "نعم" : "لا" : String(value);
        const answer = Array.isArray(entry.answer) ? entry.answer.map((item) => typeof item === "object" ? JSON.stringify(item) : format(item)).join(", ") : format(entry.answer);
        return <div className="text-sm" key={entry.questionId}><dt className="inline font-medium">{entry.title.ar || entry.title.en} </dt><dd className="inline break-words">{answer}</dd></div>;
      })}</dl>
    </details>}
  </>;
}
