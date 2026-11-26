import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import type { ItemField, Localized, Option, Pricing, PricingRule, Project, Question, Settings } from "../../../../supabase/functions/_shared/calculator/engine";
import { Checkbox, EditList, fieldGrid, LocalizedField, MoneyField, NumberField, PercentField, SelectField, TextField } from "./Fields";
import { ConditionFields, PricingFields } from "./RuleFields";
import { billing, blank, choiceKinds, newId, newNamed, ordered, pricingMethods, quantityKinds, questionKinds, reorder, type Config } from "./model";
import { CalculatorPreview } from "./CalculatorPreview";

export const editorViews = [
  ["projects", "أنواع المشاريع"], ["sections", "خطوات الحاسبة"], ["questions", "الأسئلة"], ["options", "الخيارات"],
  ["prices", "أسعار سريعة"], ["pricing", "قواعد التسعير"], ["logic", "المنطق والشروط"], ["templates", "قوالب الأسئلة"],
  ["discounts", "الخصومات"], ["settings", "إعدادات العرض"], ["preview", "معاينة واختبار"],
] as const;
export type EditorView = typeof editorViews[number][0];

const viewHelp: Record<EditorView, string> = {
  projects: "أول ما يراه الزائر: نوع المشروع. فعّل الأنواع التي تقدمها فقط؛ إن لم يوجد نوع مفعّل لن تعمل الحاسبة.",
  sections: "قسّم الأسئلة إلى خطوات قصيرة، خطوة واحدة لكل شاشة، ويرتّبها الزائر بالتنقل بينها. ابدأ بخطوة عامة مثل «تفاصيل المشروع».",
  questions: "هنا تضيف الأسئلة داخل الخطوات. السؤال هو ما تطلبه من الزائر، وله نوع مثل «اختيار واحد» أو «رقم».",
  options: "اختر السؤال لتعديل خياراته. لكل خيار سعر يمكنك ضبطه بسهولة من شاشة «أسعار سريعة».",
  prices: "أسهل شاشة للتسعير: اكتب السعر بالجنيه لكل نوع مشروع ولكل خيار، دون أي مصطلحات تقنية.",
  pricing: "قواعد متقدمة للأسعار المرتبطة بالكمية أو النسب. للأسعار العادية استخدم «أسعار سريعة».",
  logic: "أظهر السؤال أو الخصم فقط عندما يختار الزائر إجابة معينة. هذه الشاشة اختيارية.",
  templates: "احفظ سؤالًا كقالب لإعادة استخدامه في أكثر من مكان. شاشة اختيارية للمستخدم المتقدم.",
  discounts: "خصومات تُطرح تلقائيًا من الإجمالي وفق شروط تحددها.",
  settings: "العملة والضريبة ومدة صلاحية العرض والشروط وبيانات العميل المطلوبة في نموذج الطلب.",
  preview: "جرّب الحاسبة كما يراها الزائر، وتأكد من الأسعار والخطوات قبل النشر.",
};

function listLabel(record: { title: Localized; id: string; active: boolean }) {
  return `${record.title.ar || record.title.en || "بدون عنوان"}${record.active ? "" : " (غير مفعّل)"}`;
}
function NamedFields<T extends { id: string; title: Localized; active: boolean }>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  return <>
    <LocalizedField label="العنوان" value={value.title} onChange={(title) => onChange({ ...value, title })} />
    <Checkbox label="مفعّل" value={value.active} onChange={(active) => onChange({ ...value, active })} />
    <details className="self-center text-xs text-white/45"><summary className="cursor-pointer">المعرّف التقني</summary><p className="mt-1 break-all" dir="ltr">{value.id}</p></details>
  </>;
}

function Assignment({ config, value = [], onChange, label = "أنواع المشاريع" }: { config: Config; value?: string[]; onChange: (value: string[]) => void; label?: string }) {
  return <fieldset className="border border-white/10 px-3 py-1">
    <legend className="px-1 text-xs">{label} · اتركه فارغًا ليُطبق على الكل</legend>
    <div className={fieldGrid}>{config.projects.map((project) => <Checkbox key={project.id}
      label={listLabel(project)} value={value.includes(project.id)}
      onChange={(selected) => onChange(selected ? [...value, project.id] : value.filter((id) => id !== project.id))} />)}</div>
  </fieldset>;
}

function LocalizedList({ value, onChange, title }: { value: Localized[]; onChange: (value: Localized[]) => void; title: string }) {
  return <EditList title={title} items={value} onChange={onChange} create={() => ({ ...blank })}
    label={(entry) => entry.ar || entry.en}
    render={(entry, update) => <div className={fieldGrid}><LocalizedField label="الوصف" value={entry} onChange={update} /></div>} />;
}

function QuestionFields({ value, onChange, config }: { value: Question; onChange: (value: Question) => void; config: Config }) {
  return <>
    <div className={fieldGrid}>
      <NamedFields value={value} onChange={onChange} />
      <SelectField label="نوع السؤال" value={value.kind} options={questionKinds} onChange={(kind) => onChange({ ...value, kind, defaultValue: undefined, required: kind === "info" ? false : value.required })} />
      <SelectField label="الخطوة" value={value.sectionId} empty="اختر خطوة"
        options={config.sections.map((section) => [section.id, listLabel(section)] as const)} onChange={(sectionId) => onChange({ ...value, sectionId })} />
      {value.kind !== "info" && <Checkbox label="مطلوب من الزائر" value={value.required} onChange={(required) => onChange({ ...value, required })} />}
      <LocalizedField label="الوصف" value={value.description} onChange={(description) => onChange({ ...value, description })} />
      <LocalizedField label="نص المساعدة" value={value.help} onChange={(help) => onChange({ ...value, help })} />
      <LocalizedField label="نص داخل الحقل" value={value.placeholder} onChange={(placeholder) => onChange({ ...value, placeholder })} />
      <TextField label="ملاحظات داخلية" help="لا تظهر للزائر." value={value.adminNotes} onChange={(adminNotes) => onChange({ ...value, adminNotes })} />
      {quantityKinds.includes(value.kind) && <>
        <NumberField label="أقل كمية" value={value.min} onChange={(min) => onChange({ ...value, min })} />
        <NumberField label="أقصى كمية" value={value.max} onChange={(max) => onChange({ ...value, max })} />
        {value.kind !== "repeatable" && <NumberField label="خطوة الكمية" value={value.step} onChange={(step) => onChange({ ...value, step })} />}
        <LocalizedField label="الوحدة" value={value.unit} onChange={(unit) => onChange({ ...value, unit })} />
      </>}
      {["text", "textarea"].includes(value.kind) && <>
        <NumberField label="أقل عدد أحرف" value={value.min} onChange={(min) => onChange({ ...value, min })} />
        <NumberField label="أقصى عدد أحرف" value={value.max} onChange={(max) => onChange({ ...value, max })} />
      </>}
      {value.kind === "boolean" && <SelectField<"" | "true" | "false"> label="الإجابة الافتراضية" value={value.defaultValue === undefined ? "" : value.defaultValue ? "true" : "false"}
        empty="بدون افتراضي" options={[["true", "نعم"], ["false", "لا"]]} onChange={(next) => onChange({ ...value, defaultValue: next ? next === "true" : undefined })} />}
      {["text", "textarea"].includes(value.kind) && <TextField label="الإجابة الافتراضية" value={typeof value.defaultValue === "string" ? value.defaultValue : undefined} onChange={(next) => onChange({ ...value, defaultValue: next || undefined })} />}
      {["number", "stepper", "slider"].includes(value.kind) && <NumberField label="الكمية الافتراضية" value={typeof value.defaultValue === "number" ? value.defaultValue : undefined} onChange={(defaultValue) => onChange({ ...value, defaultValue })} />}
    </div>
    <Assignment config={config} value={value.projectIds} onChange={(projectIds) => onChange({ ...value, projectIds })} label="يظهر في" />
    {value.kind !== "info" && <PricingFields allowNone value={value.pricing} onChange={(pricing) => onChange({ ...value, pricing })} />}
    {choiceKinds.includes(value.kind) && <OptionsFields config={config} value={value} onChange={onChange} />}
    {value.kind === "repeatable" && <EditList<ItemField> title="حقول العنصر المتكرر" items={value.itemFields ?? []} create={() => ({ id: newId(), title: { ...blank }, kind: "text" })}
      label={(field) => field.title.ar || field.title.en} keyFor={(field) => field.id} onChange={(itemFields) => onChange({ ...value, itemFields })}
      render={(field, update) => <div className={fieldGrid}>
        <LocalizedField label="العنوان" value={field.title} onChange={(title) => update({ ...field, title })} />
        <SelectField label="نوع الحقل" value={field.kind} options={[["text", "نص"], ["number", "رقم"], ["boolean", "نعم / لا"]]} onChange={(kind) => update({ ...field, kind })} />
        <Checkbox label="مطلوب" value={field.required} onChange={(required) => update({ ...field, required })} />
        {field.kind !== "boolean" && <>
          <NumberField label={field.kind === "text" ? "أقل عدد أحرف" : "الحد الأدنى"} value={field.min} onChange={(min) => update({ ...field, min })} />
          <NumberField label={field.kind === "text" ? "أقصى عدد أحرف" : "الحد الأقصى"} value={field.max} onChange={(max) => update({ ...field, max })} />
        </>}
      </div>} />}
  </>;
}

const quickMethods = [
  ["unconfigured", "لم يُسعّر بعد"], ["fixed", "سعر ثابت"], ["perUnit", "لكل وحدة"],
  ["free", "مجاني"], ["included", "مشمول"], ["manual", "عرض سعر يدوي"],
] as const;
const advancedMethods = new Set(["tiered", "volume", "includedQuantity", "percentage", "multiplier", "minimum", "maximum"]);
const methodLabels = Object.fromEntries(pricingMethods) as Record<string, string>;

function QuickPrices({ config, onChange }: { config: Config; onChange: (value: Config) => void }) {
  const [onlyMissing, setOnlyMissing] = useState(false);
  const projects = ordered(config.projects).filter((project) => project.active && !project.archived);
  const choiceQuestions = ordered(config.questions).filter((question) => question.active && choiceKinds.includes(question.kind) && (question.options?.length ?? 0) > 0);
  const options = choiceQuestions.flatMap((question) => (question.options ?? []).map((option) => ({ question, option })));
  const unpriced = options.filter(({ option }) => !option.pricing || option.pricing.method === "unconfigured").length;
  const setBasePrice = (projectId: string, basePrice: number | undefined) => onChange({
    ...config, projects: config.projects.map((project) => project.id === projectId ? { ...project, basePrice } : project),
  });
  const setPricing = (question: Question, option: Option, pricing: Pricing) => onChange({
    ...config,
    questions: config.questions.map((item) => item.id === question.id
      ? { ...item, options: item.options?.map((current) => current.id === option.id ? { ...current, pricing } : current) }
      : item),
  });
  const changeMethod = (question: Question, option: Option, method: Pricing["method"]) => {
    const current = option.pricing;
    const period = current?.billing ?? "oneTime";
    if (method === "fixed") setPricing(question, option, { method, billing: period, amount: current?.amount });
    else if (method === "perUnit") setPricing(question, option, { method, billing: period, unitPrice: current?.unitPrice });
    else setPricing(question, option, { method, billing: period });
  };
  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3">
      <p className="text-sm"><span className="font-bold text-white">{unpriced}</span> خيار بدون سعر من إجمالي {options.length}.</p>
      <Checkbox label="إظهار غير المسعّر فقط" value={onlyMissing} onChange={setOnlyMissing} />
    </div>
    <section className="grid gap-2">
      <h3 className="font-bold">سعر البداية لكل نوع مشروع</h3>
      <p className="text-xs leading-5 text-white/45">يُضاف قبل أسعار الخيارات. اتركه فارغًا إن لم ترغب بسعر أساسي.</p>
      {projects.length === 0 && <p className="rounded-xl border border-amber-400/30 bg-amber-400/[0.04] p-3 text-sm">لا توجد أنواع مشاريع مفعّلة. أضفها من شاشة «أنواع المشاريع» أولًا.</p>}
      <div className={fieldGrid}>
        {projects.map((project) => <div key={project.id} className="rounded-xl border border-white/10 p-3">
          <p className="mb-2 text-sm font-semibold">{project.title.ar || project.title.en || "بدون عنوان"}</p>
          <MoneyField label="سعر البداية" value={project.basePrice} onChange={(basePrice) => setBasePrice(project.id, basePrice)} />
        </div>)}
      </div>
    </section>
    <section className="grid gap-2">
      <h3 className="font-bold">أسعار الخيارات</h3>
      <p className="text-xs leading-5 text-white/45">السعر المكتوب هنا يُضاف إلى التقدير عندما يختار الزائر هذا الخيار.</p>
      {choiceQuestions.length === 0 && <p className="rounded-xl border border-white/10 p-3 text-sm">لا توجد أسئلة بخيارات بعد. أضف سؤالًا نوعه «اختيار واحد» أو «اختيار متعدد» من شاشة «الأسئلة».</p>}
      <div className="grid gap-2">
        {options.map(({ question, option }) => {
          const pricing = option.pricing;
          const method = pricing?.method ?? "unconfigured";
          if (onlyMissing && pricing && method !== "unconfigured") return null;
          if (advancedMethods.has(method)) {
            return <div key={`${question.id}:${option.id}`} className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-sm font-semibold">{option.title.ar || option.title.en || "بدون عنوان"}</p>
                <p className="text-xs text-white/40">{question.title.ar || question.title.en}</p>
              </div>
              <p className="self-center text-xs leading-5 text-white/50">تسعير متقدم ({methodLabels[method]}) — عدّله من شاشة «قواعد التسعير».</p>
            </div>;
          }
          return <div key={`${question.id}:${option.id}`}
            className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[1.2fr_1fr] ${method === "unconfigured" ? "border-amber-400/30 bg-amber-400/[0.03]" : "border-white/10"}`}>
            <div>
              <p className="text-sm font-semibold">{option.title.ar || option.title.en || "بدون عنوان"}{option.active === false && <span className="text-xs text-white/40"> · غير مفعّل</span>}</p>
              <p className="text-xs text-white/40">{question.title.ar || question.title.en}</p>
              {method === "unconfigured" && <p className="mt-1 text-xs text-amber-200">هذا الخيار بلا سعر ولن يُحسب في التقدير.</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectField label="نوع السعر" value={method} options={quickMethods} onChange={(next) => changeMethod(question, option, next)} />
              {(method === "unconfigured" || method === "fixed") && <MoneyField label="السعر" value={pricing?.amount}
                onChange={(amount) => setPricing(question, option, { method: "fixed", billing: pricing?.billing ?? "oneTime", amount })} />}
              {method === "perUnit" && <MoneyField label="سعر الوحدة" value={pricing?.unitPrice}
                onChange={(unitPrice) => setPricing(question, option, { method: "perUnit", billing: pricing?.billing ?? "oneTime", unitPrice })} />}
              {(method === "unconfigured" || method === "fixed" || method === "perUnit") && <SelectField label="الدفع" value={pricing?.billing ?? "oneTime"} options={billing}
                onChange={(period) => setPricing(question, option, method === "perUnit"
                  ? { method, billing: period, unitPrice: pricing?.unitPrice }
                  : { method: "fixed", billing: period, amount: pricing?.amount })} />}
            </div>
          </div>;
        })}
      </div>
    </section>
  </div>;
}

function OptionsFields({ config, value, onChange }: { config: Config; value: Question; onChange: (value: Question) => void }) {
  return <EditList<Option> title="خيارات السؤال" items={ordered(value.options ?? [])} onChange={(options) => onChange({ ...value, options: reorder(options) })}
    label={listLabel} keyFor={(option) => option.id}
    create={() => ({ ...newNamed(), pricing: { method: "unconfigured", billing: "oneTime" } })}
    duplicate={(option) => ({ ...option, id: newId(), default: false })}
    render={(option, update) => <>
      <div className={fieldGrid}>
        <NamedFields value={option} onChange={update} />
        <LocalizedField label="الوصف" value={option.description} onChange={(description) => update({ ...option, description })} />
        <TextField label="الأيقونة" value={option.icon} onChange={(icon) => update({ ...option, icon })} />
        <Checkbox label="محدد افتراضيًا" value={option.default} onChange={(selected) => onChange({
          ...value,
          defaultValue: undefined,
          options: value.options?.map((item) => item.id === option.id ? { ...item, default: selected } : value.kind === "multiple" || !selected ? item : { ...item, default: false }),
        })} />
      </div>
      <PricingFields value={option.pricing} onChange={(pricing) => update({ ...option, pricing })} />
      <ConditionFields value={option.condition} onChange={(condition) => update({ ...option, condition })} questions={config.questions.filter((question) => question.id !== value.id || value.kind === "multiple")} />
    </>} />;
}

function SettingsFields({ value, onChange }: { value: Settings; onChange: (value: Settings) => void }) {
  const leadFields = [["name", "الاسم"], ["company", "الشركة"], ["phone", "الهاتف"], ["whatsapp", "واتساب"], ["requirements", "متطلبات إضافية"]] as const;
  return <div className={fieldGrid}>
    <TextField label="رمز العملة" help="مثال: EGP" value={value.currency} onChange={(currency) => onChange({ ...value, currency: currency.toUpperCase() })} />
    <NumberField label="عدد خانات الكسور في العملة" help="2 للجنيه المصري." value={value.minorUnits} onChange={(minorUnits) => onChange({ ...value, minorUnits })} />
    <SelectField label="التقريب" value={value.rounding ?? "halfUp"} options={[["halfUp", "نصف لأعلى"], ["floor", "تقريب لأسفل"], ["ceil", "تقريب لأعلى"]]} onChange={(rounding) => onChange({ ...value, rounding })} />
    <NumberField label="صلاحية التقدير (أيام)" value={value.validityDays} onChange={(validityDays) => onChange({ ...value, validityDays })} />
    <NumberField label="عدد أشهر السنة الأولى" help="يُستخدم لحساب إجمالي السنة الأولى." value={value.monthsPerYear} onChange={(monthsPerYear) => onChange({ ...value, monthsPerYear })} />
    <PercentField label="الضريبة %" help="اتركها 0 إن لم توجد ضريبة." value={value.taxBps} onChange={(taxBps) => onChange({ ...value, taxBps })} />
    <PercentField label="أقصى خصم مسموح %" value={value.discountLimitBps} onChange={(discountLimitBps) => onChange({ ...value, discountLimitBps })} />
    <MoneyField label="أدنى قيمة للمشروع" value={value.minimumPrice} onChange={(minimumPrice) => onChange({ ...value, minimumPrice })} />
    <Checkbox label="إظهار تفصيل البنود للعميل" value={value.showBreakdown ?? true} onChange={(showBreakdown) => onChange({ ...value, showBreakdown })} />
    <LocalizedField label="شروط عرض السعر" value={value.terms} onChange={(terms) => onChange({ ...value, terms })} />
    <div className="sm:col-span-2 xl:col-span-3">
      <h3 className="font-bold">بيانات العميل في نموذج «طلب عرض سعر»</h3>
      <p className="mt-1 text-xs leading-5 text-white/45">البريد الإلكتروني مطلوب دائمًا لوصول الطلب إلى صندوق عروض الأسعار.</p>
    </div>
    {leadFields.map(([key, label]) => <SelectField key={key} label={`حقل ${label}`}
      value={value.leadFields?.[key] ?? (key === "name" ? "required" : "optional")}
      options={[["optional", "اختياري"], ["required", "مطلوب"], ["hidden", "مخفي"]]}
      onChange={(next) => onChange({ ...value, leadFields: { ...value.leadFields, [key]: next } })} />)}
  </div>;
}

export function CalculatorEditors({ config, onChange, view }: { config: Config; onChange: (value: Config) => void; view: EditorView }) {
  const [sectionFilter, setSectionFilter] = useState("");
  const [questionFilter, setQuestionFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const sectionOptions = config.sections.map((section) => [section.id, listLabel(section)] as const);
  const orderedSections = ordered(config.sections);
  const questions = ordered(config.questions).filter((question) => !sectionFilter || question.sectionId === sectionFilter);
  const createQuestion = (): Question => ({ ...newNamed(), sectionId: sectionFilter || config.sections[0]?.id || "", projectIds: [], kind: "single", required: false });
  function updateQuestion(value: Question) {
    onChange({ ...config, questions: config.questions.map((question) => question.id === value.id ? value : question) });
  }
  function duplicateProject(project: Project) {
    const id = newId();
    function copyAssignment<T extends { projectIds?: string[] }>(item: T): T {
      return item.projectIds?.includes(project.id) ? { ...item, projectIds: [...item.projectIds, id] } : item;
    }
    onChange({
      ...config,
      projects: reorder([...ordered(config.projects), { ...project, id }]),
      sections: config.sections.map(copyAssignment),
      questions: config.questions.map(copyAssignment),
      rules: config.rules.map(copyAssignment),
    });
  }
  let body: ReactNode;
  if (view === "preview") body = <CalculatorPreview config={config} />;
  else if (view === "settings") body = <SettingsFields value={config.settings} onChange={(settings) => onChange({ ...config, settings })} />;
  else if (view === "prices") body = <QuickPrices config={config} onChange={onChange} />;
  else if (view === "projects") body = <EditList title="أنواع المشاريع" items={ordered(config.projects)} label={listLabel} keyFor={(item) => item.id}
    onChange={(projects) => onChange({ ...config, projects: reorder(projects) })}
    create={() => ({ ...newNamed(), description: { ...blank } })} onDuplicate={duplicateProject}
    render={(item, update) => <>
      <div className={fieldGrid}>
        <NamedFields value={item} onChange={(next) => update({ ...next, archived: next.active ? false : next.archived })} />
        <Checkbox label="مؤرشف" value={item.archived ?? false}
          onChange={(archived) => update({ ...item, archived, active: archived ? false : item.active })} />
        <LocalizedField label="الوصف" value={item.description} onChange={(description) => update({ ...item, description })} />
        <LocalizedField label="مدة التسليم" value={item.delivery} onChange={(delivery) => update({ ...item, delivery })} />
        <TextField label="الأيقونة" value={item.icon} onChange={(icon) => update({ ...item, icon })} />
        <MoneyField label="سعر البداية" help="يُضاف إلى كل تقدير لهذا النوع." value={item.basePrice} onChange={(basePrice) => update({ ...item, basePrice })} />
        <MoneyField label="الحد الأدنى للسعر" help="لن ينزل التقدير تحته." value={item.minimumPrice} onChange={(minimumPrice) => update({ ...item, minimumPrice })} />
      </div>
      <LocalizedList title="الخدمات المشمولة" value={item.included ?? []} onChange={(included) => update({ ...item, included })} />
      <LocalizedList title="الاستثناءات" value={item.exclusions ?? []} onChange={(exclusions) => update({ ...item, exclusions })} />
    </>} />;
  else if (view === "sections") body = <EditList title="خطوات الحاسبة" items={orderedSections} label={listLabel} keyFor={(item) => item.id}
    onChange={(sections) => onChange({ ...config, sections: reorder(sections) })} create={newNamed}
    render={(item, update) => {
      const position = orderedSections.findIndex((section) => section.id === item.id);
      const earlierSections = new Set(orderedSections.slice(0, position).map((section) => section.id));
      const projectIds = item.projectIds ?? [];
      const eligible = config.questions.filter((question) => question.active && earlierSections.has(question.sectionId) &&
        (!projectIds.length || !question.projectIds?.length || question.projectIds.some((id) => projectIds.includes(id))));
      return <>
        <div className={fieldGrid}>
          <NamedFields value={item} onChange={update} />
          <LocalizedField label="الوصف" value={item.description} onChange={(description) => update({ ...item, description })} />
        </div>
        <Assignment config={config} value={item.projectIds} onChange={(projectIds) => update({ ...item, projectIds })} label="تظهر في" />
        <div className="grid gap-2 border-t border-white/10 pt-3">
          <p className="text-sm font-medium">أظهر هذه الخطوة فقط عند تحقق إجابات سابقة. تظل مخفية حتى تتحقق شروطها، وتستخدم أسئلة من خطوات سابقة فقط.</p>
          {eligible.length
            ? <ConditionFields value={item.condition} onChange={(condition) => update({ ...item, condition })} questions={eligible} />
            : <p className="text-xs">لا توجد أسئلة مفعّلة من خطوات سابقة متوافقة مع أنواع مشاريع هذه الخطوة بعد.</p>}
        </div>
      </>;
    }} />;
  else if (view === "questions") body = <div className="grid gap-3">
    <SelectField label="تصفية حسب الخطوة" value={sectionFilter} empty="كل الخطوات" options={sectionOptions} onChange={setSectionFilter} />
    <EditList title="الأسئلة" items={questions} label={listLabel} keyFor={(item) => item.id} create={createQuestion} duplicate={(item) => ({ ...item, id: newId() })}
      onChange={(items) => onChange({ ...config, questions: [...reorder(items), ...config.questions.filter((question) => sectionFilter && question.sectionId !== sectionFilter)] })}
      render={(item, update) => <>
        <QuestionFields value={item} onChange={update} config={config} />
        <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, templates: [...config.templates ?? [], { ...item, id: newId() }] })}>حفظ كقالب قابل لإعادة الاستخدام</button>
      </>} />
  </div>;
  else if (view === "templates") {
    const template = config.templates?.find((item) => item.id === templateFilter);
    body = <div className="grid gap-3">
      <SelectField label="القالب المستخدم" value={templateFilter} empty="اختر قالبًا" options={(config.templates ?? []).map((item) => [item.id, listLabel(item)] as const)} onChange={setTemplateFilter} />
      {template && <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, questions: [...config.questions, { ...template, id: newId(), sectionId: config.sections.some((section) => section.id === template.sectionId) ? template.sectionId : config.sections[0]?.id ?? "" }] })}>إنشاء سؤال من القالب</button>}
      <EditList title="قوالب أسئلة قابلة لإعادة الاستخدام" items={config.templates ?? []} label={listLabel} keyFor={(item) => item.id} create={createQuestion}
        onChange={(templates) => onChange({ ...config, templates })} duplicate={(item) => ({ ...item, id: newId() })}
        render={(item, update) => <QuestionFields value={item} onChange={update} config={config} />} />
    </div>;
  }
  else if (view === "options" || view === "logic") {
    const available = view === "options" ? config.questions.filter((question) => choiceKinds.includes(question.kind)) : config.questions;
    const question = available.find((item) => item.id === questionFilter);
    body = <div className="grid gap-3">
      <SelectField label="السؤال" value={question?.id} empty="اختر سؤالًا" options={available.map((item) => [item.id, listLabel(item)] as const)} onChange={setQuestionFilter} />
      {question && (view === "options" ? <OptionsFields value={question} config={config} onChange={updateQuestion} /> :
        <ConditionFields value={question.condition} onChange={(condition) => updateQuestion({ ...question, condition })} questions={config.questions.filter((item) => item.id !== question.id)} />)}
    </div>;
  }
  else {
    const isDiscount = view === "discounts";
    const rules = ordered(config.rules).filter((rule) => (rule.stage === "discount") === isDiscount);
    body = <EditList<PricingRule> title={isDiscount ? "الخصومات" : "قواعد التسعير"} items={rules} label={listLabel} keyFor={(rule) => rule.id}
      create={() => ({ ...newNamed(), method: "unconfigured", stage: isDiscount ? "discount" : "charge", billing: "oneTime" })}
      duplicate={(rule) => ({ ...rule, id: newId() })} onChange={(items) => onChange({ ...config, rules: [...reorder(items), ...config.rules.filter((rule) => (rule.stage === "discount") !== isDiscount)] })}
      render={(rule, update) => <>
        <div className={fieldGrid}>
          <NamedFields value={rule} onChange={update} />
          <SelectField label="السؤال الذي يفعّل هذه القاعدة" value={rule.questionId} empty="قاعدة على مستوى نوع المشروع"
            options={config.questions.map((question) => [question.id, listLabel(question)] as const)} onChange={(questionId) => update({ ...rule, questionId: questionId || undefined })} />
        </div>
        <Assignment config={config} value={rule.projectIds} onChange={(projectIds) => update({ ...rule, projectIds })} />
        <PricingFields value={rule} onChange={(pricing) => pricing && update({ ...rule, ...pricing })} />
        <ConditionFields value={rule.condition} onChange={(condition) => update({ ...rule, condition })} questions={config.questions} />
      </>} />;
  }
  return <div className="grid gap-4">
    <p className="flex items-start gap-2 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-3 text-sm leading-6">
      <Info className="mt-1 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
      <span>{viewHelp[view]}</span>
    </p>
    {body}
  </div>;
}
