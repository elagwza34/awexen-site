import { useState } from "react";
import { calculate, visibleQuestions, type Answer, type Answers, type Estimate } from "../../../../supabase/functions/_shared/calculator/engine";
import { CalculatorQuestion } from "../../calculator/publicQuestion";
import "../../calculator/public.css";
import { SelectField, fieldGrid } from "./Fields";
import { ordered, type Config } from "./model";

type Language = "en" | "ar";

export function CalculatorPreview({ config }: { config: Config }) {
  const [projectId, setProjectId] = useState("");
  const [locale, setLocale] = useState<Language>("en");
  const [answers, setAnswers] = useState<Answers>({});
  const [problem, setProblem] = useState("");
  const resolved = projectId ? visibleQuestions(config, projectId, answers) : null;
  let estimate: Estimate | null = null;
  let pricingError = "";
  if (projectId) {
    try {
      estimate = calculate(config, projectId, answers, true);
    } catch (error) {
      pricingError = error instanceof Error ? error.message : "The draft could not be calculated.";
    }
  }
  function update(questionId: string, next: Answer) {
    setAnswers((previous) => ({ ...previous, [questionId]: next }));
  }
  function checkScenario() {
    setProblem(estimate && Object.keys(estimate.errors).length ? "Review the field errors below." : "Scenario calculated from the current draft.");
  }
  const money = (amount: number) => estimate ? `${(amount / 10 ** estimate.minorUnits).toLocaleString(locale)} ${estimate.currency}` : "—";
  return <div className="grid gap-3">
    <div className={fieldGrid}>
      <SelectField label="Preview language" value={locale} options={[["en", "English"], ["ar", "العربية"]]} onChange={setLocale} />
      <SelectField label="Project type" value={projectId} empty="Choose an active project" options={ordered(config.projects).filter((project) => project.active).map((project) => [project.id, project.title[locale] || project.id] as const)}
        onChange={(id) => { setProjectId(id); setAnswers({}); setProblem(""); }} />
      <div className="flex gap-2 self-end">
        <button type="button" className="admin-button-secondary" onClick={() => { setAnswers({}); setProblem(""); }}>Reset answers</button>
        <button type="button" className="admin-button-secondary" disabled={!estimate} onClick={checkScenario}>Test scenario</button>
      </div>
    </div>
    {pricingError && <p role="alert" className="text-red-300">{pricingError}</p>}
    {problem && <p role="status">{problem}</p>}
    {estimate && <div className="grid gap-2 border border-white/10 p-3" aria-live="polite">
      <dl className={fieldGrid}>{Object.entries({ "One-time": estimate.oneTime, "Monthly": estimate.monthly, "Annual": estimate.annual, "First year": estimate.firstYear, "Discount": estimate.discount, "Tax": estimate.tax }).map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
      {estimate.manual.length > 0 && <p>{estimate.manual.length} items require a manual quotation.</p>}
      <details>
        <summary className="cursor-pointer">Itemized pricing</summary>
        <ul className="mt-2 grid gap-1">{estimate.items.map((item) => <li key={item.id}>
          {item.title[locale]} · {item.billing} · {item.status === "priced" ? money(item.amount) : item.status}
        </li>)}</ul>
      </details>
    </div>}
    {resolved && <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="project-calculator grid gap-2" style={{ minHeight: 0, paddingBlock: 0 }}>
      {ordered(config.sections).map((section) => {
        const questions = resolved.questions.filter((question) => question.sectionId === section.id);
        return questions.length > 0 && <details className="border border-white/10 p-3" open key={section.id}>
          <summary className="cursor-pointer font-bold">{section.title[locale]}</summary>
          {section.description?.[locale] && <p>{section.description[locale]}</p>}
          <div className={`mt-3 ${fieldGrid}`}>
            {questions.map((question) => <CalculatorQuestion key={question.id} question={question} lang={locale}
              value={answers[question.id] ?? resolved.answers[question.id]} issue={problem ? estimate?.errors[question.id] : undefined}
              onChange={(next) => update(question.id, next)} />)}
          </div>
        </details>;
      })}
    </div>}
  </div>;
}
