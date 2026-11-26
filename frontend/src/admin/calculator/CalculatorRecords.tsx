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
  ["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"],
  ["proposal_sent", "Proposal sent"], ["negotiation", "Negotiation"], ["accepted", "Accepted"],
  ["rejected", "Rejected"], ["closed", "Closed"],
] as const;

function pretty(value: string) {
  return value.replace(/[_-]/g, " ").replace(/^./, (first) => first.toUpperCase());
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
      setError(failure instanceof Error ? failure.message : "Lead status could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  return <div className="grid gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold">{view === "audit" ? "Audit log" : view === "leads" ? "Customer leads" : pretty(view)}</h3>
      <button type="button" className="admin-button-secondary" onClick={() => { setError(""); setRefresh((count) => count + 1); }}>Refresh records</button>
    </div>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {!error && (view === "analytics" ? !metrics : !records) && <p role="status">Loading records…</p>}
    {view === "analytics" && metrics && <Analytics metrics={metrics} />}
    {view === "quotations" && records && <>
      {!records.quotations.length && <p>No calculator quotations.</p>}
      {records.quotations.map((quote) => <details className="border border-white/10 p-3" key={quote.reference}>
        <summary className="cursor-pointer">{quote.reference} · {quote.snapshot.project.title.en} · {time(quote.created_at)}</summary>
        <div className="mt-3 grid gap-2">
          <p>Valid until {time(quote.valid_until)} · Configuration {quote.snapshot.versionId}</p>
          <QuoteSummary snapshot={quote.snapshot} />
        </div>
      </details>)}
    </>}
    {view === "leads" && records && <>
      <Link className="underline" to="?section=quotes">Open the quotation inbox for customer follow-up</Link>
      {!records.leads.length && <p>No calculator leads.</p>}
      {records.leads.map((lead) => {
        const reference = lead.quotation?.reference;
        return <article className="grid gap-2 border border-white/10 p-3" key={lead.id}>
        <p className="font-semibold">{time(lead.created_at)}{lead.quote_request_id && ` · Inbox request ${lead.quote_request_id}`}
          {reference && ` · ${reference}`}</p>
        <dl className="grid gap-1">{Object.entries(lead.details).filter(([, value]) => typeof value === "string" && value).map(([key, value]) => <div key={key}><dt className="inline font-medium">{pretty(key)} </dt><dd className="inline break-words">{String(value)}</dd></div>)}</dl>
        <fieldset disabled={saving !== null} className="max-w-xs">
          <SelectField label="Lead status" options={statuses} value={lead.status} onChange={(value) => void changeStatus(lead, value)} />
        </fieldset>
      </article>;
      })}
    </>}
    {view === "audit" && records && <ul className="grid gap-2">
      {!records.audit.length && <li>No calculator audit entries.</li>}
      {records.audit.map((entry) => <li className="border border-white/10 p-3" key={entry.id}>
        <p className="font-semibold">{pretty(entry.action)} · {time(entry.created_at)}</p>
        <p className="break-all text-sm">Actor {entry.actor_id}{entry.version_id && ` · Version ${entry.version_id}`}{entry.revision && ` · Revision ${entry.revision}`}</p>
      </li>)}
    </ul>}
    {view !== "analytics" && records && (offset > 0 || records.more[view]) &&
      <nav aria-label="Calculator record pages" className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={offset === 0 || saving !== null}
          onClick={() => changePage(offset - 100)}>Previous</button>
        <button type="button" className="admin-button-secondary" disabled={!records.more[view] || saving !== null}
          onClick={() => changePage(offset + 100)}>Next</button>
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
    <p className="text-sm">Last 30 days. Session metrics cover visitors who opted into optional analytics.</p>
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries({ "Calculator starts": starts, "Completion rate": percentage(completions, starts), "Quotation requests": requests, "Tracked lead conversion rate": percentage(trackedRequests, completions) }).map(([label, value]) =>
        <div key={label} className="border border-white/10 p-3"><dt>{label}</dt><dd className="text-xl font-bold">{value}</dd></div>)}
    </dl>
    {([["Events", metrics.events], ["Popular project types", metrics.projects], ["Section completions", metrics.sections], ["Average estimated project value", metrics.estimateAverages], ["Lead statuses", metrics.leads]] as const).map(([label, entries]) => <div key={label} className="border border-white/10 p-3">
      <h4 className="mb-2 font-bold">{label}</h4>
      <dl className="grid gap-1">{Object.entries(entries ?? {}).map(([key, value]) => <div className="flex justify-between gap-2" key={key}><dt>{pretty(key)}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl>
    </div>)}
    {metrics.sectionDropoff && Object.keys(metrics.sectionDropoff).length > 0 && <div className="border border-white/10 p-3">
      <h4 className="mb-2 font-bold">Drop-off by section</h4>
      <dl className="grid gap-1">{Object.entries(metrics.sectionDropoff).map(([section, rate]) => <div className="flex justify-between gap-2" key={section}><dt>{pretty(section)}</dt><dd>{rate.toLocaleString()}%</dd></div>)}</dl>
    </div>}
  </>;
}

function QuoteSummary({ snapshot }: { snapshot: Quotation }) {
  const { estimate } = snapshot;
  const money = (amount: number) => new Intl.NumberFormat("en", { style: "currency", currency: estimate.currency }).format(amount / 10 ** estimate.minorUnits);
  return <>
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {Object.entries({ "One-time": estimate.oneTime, "Monthly": estimate.monthly, "Annual": estimate.annual, "First year": estimate.firstYear, "Discount": estimate.discount, "Tax": estimate.tax }).map(([label, value]) =>
        <div key={label}><dt className="text-sm">{label}</dt><dd className="font-semibold">{money(value)}</dd></div>)}
    </dl>
    {!!estimate.items.length && <ul className="grid gap-1">
      {estimate.items.map((item) => <li className="border-t border-white/10 pt-1 text-sm" key={item.id}>
        {item.title.en} · {item.quantity} · {pretty(item.billing)} · {item.status === "priced" ? money(item.amount) : pretty(item.status)}
      </li>)}
    </ul>}
    {!!snapshot.requirements.length && <details><summary className="cursor-pointer">Selected requirements</summary>
      <dl className="grid gap-1">{snapshot.requirements.map((entry) => {
        const format = (value: string | number | boolean) => typeof value === "string" ? entry.options?.find((option) => option.id === value)?.title.en ?? value : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
        const answer = Array.isArray(entry.answer) ? entry.answer.map((item) => typeof item === "object" ? JSON.stringify(item) : format(item)).join(", ") : format(entry.answer);
        return <div className="text-sm" key={entry.questionId}><dt className="inline font-medium">{entry.title.en} </dt><dd className="inline break-words">{answer}</dd></div>;
      })}</dl>
    </details>}
  </>;
}
