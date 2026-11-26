import { useState } from "react";
import { calculate, visibleQuestions, type Answer, type Answers, type Estimate } from "../../../../supabase/functions/_shared/calculator/engine";
import { CalculatorQuestion } from "../../calculator/publicQuestion";
import "../../calculator/public.css";
import { SelectField, fieldGrid } from "./Fields";
import { translateIssue } from "./issues";
import { ordered, type Config } from "./model";

type Language = "en" | "ar";

const billingLabels: Record<string, string> = { oneTime: "لمرة واحدة", monthly: "شهري", annual: "سنوي" };
const statusLabels: Record<string, string> = { priced: "مسعّر", free: "مجاني", included: "مشمول", manual: "يتطلب عرضًا يدويًا", unconfigured: "غير مُعد" };
const label = (map: Record<string, string>, value: string) => map[value] ?? value;

export function CalculatorPreview({ config }: { config: Config }) {
  const [projectId, setProjectId] = useState("");
  const [locale, setLocale] = useState<Language>("ar");
  const [answers, setAnswers] = useState<Answers>({});
  const [problem, setProblem] = useState("");
  const resolved = projectId ? visibleQuestions(config, projectId, answers) : null;
  let estimate: Estimate | null = null;
  let pricingError = "";
  if (projectId) {
    try {
      estimate = calculate(config, projectId, answers, true);
    } catch (error) {
      pricingError = error instanceof Error ? translateIssue(error.message) : "تعذر حساب المسودة.";
    }
  }
  function update(questionId: string, next: Answer) {
    setAnswers((previous) => ({ ...previous, [questionId]: next }));
  }
  function checkScenario() {
    setProblem(estimate && Object.keys(estimate.errors).length ? "راجع أخطاء الحقول أدناه." : "تم حساب السيناريو من المسودة الحالية.");
  }
  const money = (amount: number) => estimate ? `${(amount / 10 ** estimate.minorUnits).toLocaleString(locale === "ar" ? "ar-EG" : "en")} ${estimate.currency}` : "—";
  return <div className="grid gap-3">
    <div className={fieldGrid}>
      <SelectField label="لغة المعاينة" value={locale} options={[["ar", "العربية"], ["en", "English"]]} onChange={setLocale} />
      <SelectField label="نوع المشروع" value={projectId} empty="اختر نوع مشروع مفعّلًا" options={ordered(config.projects).filter((project) => project.active).map((project) => [project.id, project.title[locale] || project.id] as const)}
        onChange={(id) => { setProjectId(id); setAnswers({}); setProblem(""); }} />
      <div className="flex gap-2 self-end">
        <button type="button" className="admin-button-secondary" onClick={() => { setAnswers({}); setProblem(""); }}>إعادة تعيين الإجابات</button>
        <button type="button" className="admin-button-secondary" disabled={!estimate} onClick={checkScenario}>اختبار السيناريو</button>
      </div>
    </div>
    {pricingError && <p role="alert" className="text-red-300">{pricingError}</p>}
    {problem && <p role="status">{problem}</p>}
    {estimate && <div className="grid gap-2 border border-white/10 p-3" aria-live="polite">
      <dl className={fieldGrid}>{Object.entries({ "لمرة واحدة": estimate.oneTime, "شهري": estimate.monthly, "سنوي": estimate.annual, "السنة الأولى": estimate.firstYear, "الخصم": estimate.discount, "الضريبة": estimate.tax }).map(([heading, value]) =>
        <div key={heading}><dt>{heading}</dt><dd className="font-semibold">{money(value)}</dd></div>)}</dl>
      {estimate.manual.length > 0 && <p>{estimate.manual.length} بنود تتطلب عرض سعر يدوي.</p>}
      <details>
        <summary className="cursor-pointer">تفصيل التسعير</summary>
        <ul className="mt-2 grid gap-1">{estimate.items.map((item) => <li key={item.id}>
          {item.title[locale]} · {label(billingLabels, item.billing)} · {item.status === "priced" ? money(item.amount) : label(statusLabels, item.status)}
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
