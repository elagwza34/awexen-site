import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Estimate, Item, Localized, ScalarAnswer } from "../../../supabase/functions/_shared/calculator/engine.ts";
import { useContent } from "../context/ContentContext";
import type { Lang } from "../context/LanguageContext";
import { whatsappHref } from "../lib/whatsapp";
import { CalculatorApiError, calculatorRequest, trackCalculator, type LeadField, type LeadFields, type Quotation, type SavedEstimate } from "./publicApi";
import { calculatorText } from "./publicCopy";
import type { PdfBlock } from "./publicPdf";

type Text = ReturnType<typeof calculatorText>;

export function calculatorMoney(estimate: Estimate, lang: Lang) {
  const formatter = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: estimate.currency,
    minimumFractionDigits: estimate.minorUnits,
    maximumFractionDigits: estimate.minorUnits,
  });
  return (amount: number) => formatter.format(amount / 10 ** estimate.minorUnits);
}

function totals(estimate: Estimate, t: Text): [string, number][] {
  return [
    [t("oneTime"), estimate.oneTime], [t("monthly"), estimate.monthly],
    [t("annual"), estimate.annual], [t("firstYear"), estimate.firstYear],
  ];
}

function exceptions(estimate: Estimate, t: Text): [string, number][] {
  const rows: [string, number][] = [];
  if (estimate.discount) rows.push([t("discount"), estimate.discount]);
  if (estimate.tax) rows.push([t("taxes"), estimate.tax]);
  return rows;
}

export function CostSummary({ estimate, lang, status, breakdown }: {
  estimate?: Estimate;
  lang: Lang;
  status?: string;
  breakdown: boolean;
}) {
  const t = calculatorText(lang);
  const money = estimate && calculatorMoney(estimate, lang);
  return (
    <aside className="calculator-summary" aria-label={t("total")}>
      <div className="calculator-summary-header">
        <span>{t("total")}</span>
        <strong className="calculator-total"><bdi>{estimate && money ? money(estimate.oneTime) : "—"}</bdi></strong>
      </div>
      {estimate && money && (
        <>
          <dl className="calculator-totals">
            {totals(estimate, t).map(([label, amount]) => (
              <div key={label}><dt>{label}</dt><dd><bdi>{money(amount)}</bdi></dd></div>
            ))}
          </dl>
          {(estimate.manual.length > 0 || estimate.discount !== 0 || estimate.tax !== 0) && (
            <div className="calculator-summary-extra">
              {exceptions(estimate, t).map(([label, amount]) => <span key={label}>{label} <bdi>{money(amount)}</bdi></span>)}
              {estimate.manual.length > 0 && <span>{t("review")} <bdi>{estimate.manual.length}</bdi></span>}
            </div>
          )}
          {(estimate.manual.length > 0 || (breakdown && estimate.items.length > 0)) && (
            <details>
              <summary>{t("breakdown")}</summary>
              <div>
                {breakdown && estimate.items.length > 0 && <PricingTable estimate={estimate} lang={lang} />}
                {estimate.manual.length > 0 && <List title={t("review")} items={estimate.manual.map((item) => item.title[lang])} />}
              </div>
            </details>
          )}
        </>
      )}
      <p aria-live="polite" className="calculator-summary-status calculator-muted">{status}</p>
    </aside>
  );
}

function pricingTable(estimate: Estimate, lang: Lang) {
  const t = calculatorText(lang);
  const money = calculatorMoney(estimate, lang);
  const label = { oneTime: t("oneTime"), monthly: t("monthly"), annual: t("annual") };
  const amount = (item: Item) => item.status === "manual" || item.status === "unconfigured" ? t("review") : money(item.amount);
  return {
    columns: [t("item"), t("quantity"), t("unitPrice"), t("itemTotal"), t("frequency")],
    rows: estimate.items.map((item) => [
      item.title[lang], String(item.quantity), item.unitPrice === undefined ? "—" : money(item.unitPrice), amount(item), label[item.billing],
    ]),
  };
}

function PricingTable({ estimate, lang }: { estimate: Estimate; lang: Lang }) {
  const { columns, rows } = pricingTable(estimate, lang);
  return (
    <div className="calculator-table-frame">
      <table className="calculator-table">
        <thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={estimate.items[index].id}>{row.map((cell, column) => <td key={column}><bdi>{cell}</bdi></td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return items.length > 0 && <section><h3>{title}</h3><ul className="calculator-list">
    {items.map((item, index) => <li key={index}>{item}</li>)}
  </ul></section>;
}

function quotationRequirements(quotation: Quotation, lang: Lang) {
  const t = calculatorText(lang);
  const scalar = (value: ScalarAnswer) => typeof value === "boolean" ? t(value ? "yes" : "no") : String(value);
  return quotation.requirements.map(({ title, answer, options, itemFields }) => {
    const choice = (value: string) => options?.find((option) => option.id === value)?.title[lang] ?? value;
    const label = Array.isArray(answer)
      ? answer.map((value) => typeof value === "string" ? choice(value) : Object.entries(value).map(([id, field]) =>
        `${itemFields?.find((item) => item.id === id)?.title[lang] ?? id} · ${scalar(field)}`).join(", ")).join(" / ")
      : typeof answer === "string" ? choice(answer) : scalar(answer);
    return `${title[lang]} · ${label}`;
  });
}

const leadLabels = {
  name: "leadName", company: "leadCompany", phone: "leadPhone", whatsapp: "leadWhatsapp", email: "leadEmail", requirements: "leadRequirements",
} as const;
const leadLimits: Record<LeadField, number> = { name: 100, company: 160, phone: 30, whatsapp: 30, email: 254, requirements: 1600 };

export function CalculatorQuotation({ saved, lang, sessionId, leadFields, onEdit }: {
  saved: SavedEstimate;
  lang: Lang;
  sessionId: string;
  leadFields?: LeadFields;
  onEdit: () => void;
}) {
  const t = calculatorText(lang);
  const { settings } = useContent();
  const [notice, setNotice] = useState("");
  const [showLead, setShowLead] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { quotation } = saved;
  const { estimate } = quotation;
  const money = calculatorMoney(estimate, lang);
  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" });
  const local = (value?: Localized) => value?.[lang];
  const metadata = [
    [t("reference"), quotation.reference],
    [t("created"), date.format(new Date(quotation.createdAt))],
    [t("validUntil"), date.format(new Date(quotation.validUntil))],
    [t("project"), quotation.project.title[lang]],
    [t("delivery"), local(quotation.project.delivery) || "—"],
    [t("version"), quotation.versionId],
  ];
  const localeList = (value?: Localized[]) => value?.map((item) => item[lang]) ?? [];
  const requirements = quotationRequirements(quotation, lang);
  const included = [...new Set([...localeList(quotation.project.included), ...estimate.items.filter((item) => item.status === "included").map((item) => item.title[lang])])];
  const exclusions = localeList(quotation.project.exclusions);
  const manual = estimate.manual.map((item) => item.title[lang]);
  const costs = [...totals(estimate, t), ...exceptions(estimate, t)];
  const contact = [settings.email, settings.phones, settings.address].filter(Boolean).join(" · ");
  const summary = [t("estimate"), ...metadata.slice(0, 5).map(([label, value]) => `${label} · ${value}`), ...costs.map(([label, amount]) => `${label} · ${money(amount)}`), t("estimateNote")].join("\n");
  const whatsapp = whatsappHref(settings.whatsapp, lang === "ar"
    ? `مرحبًا، أود الاستفسار عن التقدير رقم ${quotation.reference}.`
    : `Hello, I would like to discuss estimate ${quotation.reference}.`);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice(t("copied"));
    } catch {
      setNotice(t("actionFailed"));
    }
  };
  const download = async () => {
    setDownloading(true);
    setNotice("");
    const blocks: PdfBlock[] = [
      { kind: "title", text: t("estimate") },
      { kind: "text", text: t("estimateNote") },
      { kind: "text", text: contact },
      ...metadata.map(([label, value]): PdfBlock => ({ kind: "text", text: `${label} · ${value}` })),
    ];
    if (quotation.settings.showBreakdown !== false && estimate.items.length) blocks.push({ kind: "table", ...pricingTable(estimate, lang) });
    blocks.push({ kind: "heading", text: t("total") },
      ...costs.map(([label, amount]): PdfBlock => ({ kind: "text", text: `${label} · ${money(amount)}` })));
    const lists = [[t("requirements"), requirements], [t("included"), included], [t("exclusions"), exclusions], [t("review"), manual], [t("terms"), localeList(quotation.settings.terms ? [quotation.settings.terms] : [])]] as const;
    for (const [title, items] of lists) {
      if (items.length) blocks.push({ kind: "heading", text: title }, ...items.map((text): PdfBlock => ({ kind: "text", text })));
    }
    try {
      const { downloadCalculatorPdf } = await import("./publicPdf");
      await downloadCalculatorPdf(quotation.reference, lang, blocks);
      trackCalculator("pdf_downloaded", sessionId, quotation.projectId);
    } catch {
      setNotice(t("actionFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <section className="calculator-panel calculator-print-panel" id="calculator-step">
        <article className="calculator-quotation" tabIndex={-1} aria-labelledby="calculator-quotation-title">
          <header><div><h2 id="calculator-quotation-title">{t("estimate")}</h2><p className="calculator-muted">{t("estimateNote")}</p></div><strong>AWEXEN</strong></header>
          <p className="calculator-muted">{contact}</p>
          <dl className="calculator-meta">
            {metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
          </dl>
          {quotation.settings.showBreakdown !== false && estimate.items.length > 0 && <PricingTable estimate={estimate} lang={lang} />}
          <dl className="calculator-totals">
            {costs.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd><bdi>{money(amount)}</bdi></dd></div>)}
          </dl>
          <List title={t("requirements")} items={requirements} />
          <List title={t("included")} items={included} />
          <List title={t("exclusions")} items={exclusions} />
          <List title={t("review")} items={manual} />
          {local(quotation.settings.terms) && <section><h3>{t("terms")}</h3><p>{local(quotation.settings.terms)}</p></section>}
        </article>
        <div className="calculator-actions">
          <button type="button" className="calculator-button calculator-button-primary" aria-expanded={showLead}
            onClick={() => setShowLead(true)}>{t("formal")}</button>
          <button type="button" className="calculator-button" disabled={downloading} onClick={() => void download()}>{t("download")}</button>
          <button type="button" className="calculator-button" onClick={() => window.print()}>{t("print")}</button>
          <button type="button" className="calculator-button" onClick={() => {
            window.open(whatsapp, "_blank", "noopener,noreferrer");
            trackCalculator("whatsapp_clicked", sessionId, quotation.projectId);
          }}>{t("whatsapp")}</button>
          <button type="button" className="calculator-button" onClick={() => void copySummary()}>{t("copy")}</button>
          <button type="button" className="calculator-button" onClick={onEdit}>{t("edit")}</button>
        </div>
        <p aria-live="polite">{notice}</p>
      </section>
      {showLead && <LeadForm saved={saved} lang={lang} sessionId={sessionId} fields={quotation.settings.leadFields ?? leadFields} />}
    </>
  );
}

function LeadForm({ saved, lang, sessionId, fields }: {
  saved: SavedEstimate; lang: Lang; sessionId: string; fields?: LeadFields;
}) {
  const t = calculatorText(lang);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [failure, setFailure] = useState<"actionFailed" | "expired" | "invalidPhone">("actionFailed");
  const submission = useRef<{ signature: string; id: string } | null>(null);
  const inFlight = useRef(false);
  const leadFields = useMemo(() => (Object.keys(leadLabels) as LeadField[]).filter((name) => fields?.[name] !== "hidden" || name === "email"), [fields]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const lead = Object.fromEntries(leadFields.map((name) => [name, String(data.get(name) ?? "").trim()]));
    const signature = JSON.stringify(lead);
    if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() };
    setStatus("sending");
    inFlight.current = true;
    try {
      await calculatorRequest({
        action: "lead", lead, requestId: submission.current.id, website: String(data.get("website") ?? ""),
        reference: saved.quotation.reference, accessToken: saved.accessToken,
      });
      setStatus("sent");
      trackCalculator("quotation_requested", sessionId, saved.quotation.projectId);
    } catch (error) {
      const code = error instanceof CalculatorApiError ? error.code : "";
      if (code === "lead_already_requested") {
        setStatus("sent");
      } else {
        setFailure(code === "quotation_expired" ? "expired" : code === "invalid_phone" ? "invalidPhone" : "actionFailed");
        setStatus("error");
      }
    } finally {
      inFlight.current = false;
    }
  };
  return (
    <section className="calculator-panel">
      <h2>{t("formal")}</h2>
      {status === "sent" ? <p role="status">{t("sent")}</p> : (
        <form className="calculator-lead" onSubmit={(event) => void submit(event)}>
          <div hidden aria-hidden="true"><input name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
          {leadFields.map((name) => {
            const required = name === "email" || (fields?.[name] ?? (name === "name" ? "required" : "optional")) === "required";
            const props = { name, className: "calculator-input", required, maxLength: leadLimits[name] };
            return (
              <label key={name}>
                <span>{t(leadLabels[name])}{required ? " *" : ""}</span>
                {name === "requirements" ? <textarea rows={4} {...props} /> : (
                  <input type={name === "email" ? "email" : name === "phone" || name === "whatsapp" ? "tel" : "text"}
                    autoComplete={name === "company" ? "organization" : name === "whatsapp" ? "off" : name === "phone" ? "tel" : name} {...props} />
                )}
              </label>
            );
          })}
          <p><Link to="/privacy">{t("privacy")}</Link></p>
          <div><button type="submit" className="calculator-button calculator-button-primary" disabled={status === "sending"}>
            {t(status === "sending" ? "sending" : "submit")}
          </button></div>
          {status === "error" && <p className="calculator-error" role="alert">{t(failure)}</p>}
        </form>
      )}
    </section>
  );
}
