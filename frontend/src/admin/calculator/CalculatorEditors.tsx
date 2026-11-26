import { useState } from "react";
import type { ItemField, Localized, Option, PricingRule, Project, Question, Settings } from "../../../../supabase/functions/_shared/calculator/engine";
import { Checkbox, EditList, fieldGrid, LocalizedField, NumberField, SelectField, TextField } from "./Fields";
import { ConditionFields, PricingFields } from "./RuleFields";
import { blank, choiceKinds, newId, newNamed, ordered, quantityKinds, questionKinds, reorder, type Config } from "./model";
import { CalculatorPreview } from "./CalculatorPreview";

export const editorViews = [
  ["projects", "أنواع المشاريع"], ["sections", "مراحل الحاسبة"], ["questions", "بناء الأسئلة"], ["options", "الخيارات"],
  ["pricing", "قواعد التسعير"], ["logic", "المنطق والشروط"], ["templates", "قوالب الأسئلة"],
  ["discounts", "الخصومات والعروض"], ["settings", "الإعدادات"], ["preview", "معاينة واختبار"],
] as const;
export type EditorView = typeof editorViews[number][0];

function listLabel(record: { title: Localized; id: string; active: boolean }) {
  return `${record.title.ar || record.title.en || "بدون عنوان"}${record.active ? "" : " (غير مفعّل)"}`;
}
function NamedFields<T extends { id: string; title: Localized; active: boolean }>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  return <>
    <LocalizedField label="العنوان" value={value.title} onChange={(title) => onChange({ ...value, title })} />
    <Checkbox label="مفعّل" value={value.active} onChange={(active) => onChange({ ...value, active })} />
    <p className="self-center break-all text-xs">المعرّف <span dir="ltr">{value.id}</span></p>
  </>;
}

function Assignment({ config, value = [], onChange }: { config: Config; value?: string[]; onChange: (value: string[]) => void }) {
  return <fieldset className="border border-white/10 px-3 py-1">
    <legend className="px-1">أنواع المشاريع · تُطبق على الكل عند عدم اختيار أي نوع</legend>
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
      <SelectField label="المرحلة" value={value.sectionId} empty="اختر مرحلة"
        options={config.sections.map((section) => [section.id, listLabel(section)] as const)} onChange={(sectionId) => onChange({ ...value, sectionId })} />
      {value.kind !== "info" && <Checkbox label="مطلوب" value={value.required} onChange={(required) => onChange({ ...value, required })} />}
      <LocalizedField label="الوصف" value={value.description} onChange={(description) => onChange({ ...value, description })} />
      <LocalizedField label="مساعدة" value={value.help} onChange={(help) => onChange({ ...value, help })} />
      <LocalizedField label="النص التوضيحي" value={value.placeholder} onChange={(placeholder) => onChange({ ...value, placeholder })} />
      <TextField label="ملاحظات داخلية" value={value.adminNotes} onChange={(adminNotes) => onChange({ ...value, adminNotes })} />
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
    <Assignment config={config} value={value.projectIds} onChange={(projectIds) => onChange({ ...value, projectIds })} />
    <PricingFields allowNone value={value.pricing} onChange={(pricing) => onChange({ ...value, pricing })} />
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

function OptionsFields({ config, value, onChange }: { config: Config; value: Question; onChange: (value: Question) => void }) {
  return <EditList<Option> title="الخيارات" items={ordered(value.options ?? [])} onChange={(options) => onChange({ ...value, options: reorder(options) })}
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
    <TextField label="رمز العملة" value={value.currency} onChange={(currency) => onChange({ ...value, currency: currency.toUpperCase() })} />
    <NumberField label="عدد الخانات العشرية للعملة" value={value.minorUnits} onChange={(minorUnits) => onChange({ ...value, minorUnits })} />
    <SelectField label="التقريب" value={value.rounding ?? "halfUp"} options={[["halfUp", "نصف لأعلى"], ["floor", "تقريب لأسفل"], ["ceil", "تقريب لأعلى"]]} onChange={(rounding) => onChange({ ...value, rounding })} />
    <NumberField label="صلاحية التقدير (أيام)" value={value.validityDays} onChange={(validityDays) => onChange({ ...value, validityDays })} />
    <NumberField label="عدد أشهر الفوترة في السنة الأولى" value={value.monthsPerYear} onChange={(monthsPerYear) => onChange({ ...value, monthsPerYear })} />
    <NumberField label="الضريبة (نقاط أساس)" value={value.taxBps} onChange={(taxBps) => onChange({ ...value, taxBps })} />
    <NumberField label="حد الخصم (نقاط أساس)" value={value.discountLimitBps} onChange={(discountLimitBps) => onChange({ ...value, discountLimitBps })} />
    <NumberField label="الحد الأدنى لقيمة المشروع (بالوحدات الصغرى)" value={value.minimumPrice} onChange={(minimumPrice) => onChange({ ...value, minimumPrice })} />
    <Checkbox label="إظهار التفصيل للعميل" value={value.showBreakdown ?? true} onChange={(showBreakdown) => onChange({ ...value, showBreakdown })} />
    <LocalizedField label="شروط عرض السعر" value={value.terms} onChange={(terms) => onChange({ ...value, terms })} />
    <p className="self-center text-sm">بريد العميل مطلوب لصندوق عروض الأسعار.</p>
    {leadFields.map(([key, label]) => <SelectField key={key} label={`حقل بيانات العميل · ${label}`}
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
  if (view === "preview") return <CalculatorPreview config={config} />;
  if (view === "settings") return <SettingsFields value={config.settings} onChange={(settings) => onChange({ ...config, settings })} />;
  if (view === "projects") return <EditList title="أنواع المشاريع" items={ordered(config.projects)} label={listLabel} keyFor={(item) => item.id}
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
        <NumberField label="السعر الأساسي (بالوحدات الصغرى)" value={item.basePrice} onChange={(basePrice) => update({ ...item, basePrice })} />
        <NumberField label="الحد الأدنى للسعر (بالوحدات الصغرى)" value={item.minimumPrice} onChange={(minimumPrice) => update({ ...item, minimumPrice })} />
      </div>
      <LocalizedList title="الخدمات المشمولة" value={item.included ?? []} onChange={(included) => update({ ...item, included })} />
      <LocalizedList title="الاستثناءات" value={item.exclusions ?? []} onChange={(exclusions) => update({ ...item, exclusions })} />
    </>} />;
  if (view === "sections") return <EditList title="مراحل الحاسبة" items={orderedSections} label={listLabel} keyFor={(item) => item.id}
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
        <Assignment config={config} value={item.projectIds} onChange={(projectIds) => update({ ...item, projectIds })} />
        <div className="grid gap-2 border-t border-white/10 pt-3">
          <p className="text-sm font-medium">أظهر هذه المرحلة فقط عندما تتطابق إجابات سابقة. تظل المرحلة مخفية حتى تتحقق شروطها، ويمكنها الاعتماد فقط على أسئلة من مراحل سابقة.</p>
          {eligible.length
            ? <ConditionFields value={item.condition} onChange={(condition) => update({ ...item, condition })} questions={eligible} />
            : <p className="text-xs">لا توجد أسئلة مفعّلة من مراحل سابقة متوافقة مع أنواع مشاريع هذه المرحلة بعد.</p>}
        </div>
      </>;
    }} />;
  if (view === "questions") return <div className="grid gap-3">
    <SelectField label="تصفية حسب المرحلة" value={sectionFilter} empty="كل المراحل" options={sectionOptions} onChange={setSectionFilter} />
    <EditList title="الأسئلة" items={questions} label={listLabel} keyFor={(item) => item.id} create={createQuestion} duplicate={(item) => ({ ...item, id: newId() })}
      onChange={(items) => onChange({ ...config, questions: [...reorder(items), ...config.questions.filter((question) => sectionFilter && question.sectionId !== sectionFilter)] })}
      render={(item, update) => <>
        <QuestionFields value={item} onChange={update} config={config} />
        <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, templates: [...config.templates ?? [], { ...item, id: newId() }] })}>حفظ كقالب قابل لإعادة الاستخدام</button>
      </>} />
  </div>;
  if (view === "templates") {
    const template = config.templates?.find((item) => item.id === templateFilter);
    return <div className="grid gap-3">
      <SelectField label="القالب المستخدم" value={templateFilter} empty="اختر قالبًا" options={(config.templates ?? []).map((item) => [item.id, listLabel(item)] as const)} onChange={setTemplateFilter} />
      {template && <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, questions: [...config.questions, { ...template, id: newId(), sectionId: config.sections.some((section) => section.id === template.sectionId) ? template.sectionId : config.sections[0]?.id ?? "" }] })}>إنشاء سؤال من القالب</button>}
      <EditList title="قوالب أسئلة قابلة لإعادة الاستخدام" items={config.templates ?? []} label={listLabel} keyFor={(item) => item.id} create={createQuestion}
        onChange={(templates) => onChange({ ...config, templates })} duplicate={(item) => ({ ...item, id: newId() })}
        render={(item, update) => <QuestionFields value={item} onChange={update} config={config} />} />
    </div>;
  }
  if (view === "options" || view === "logic") {
    const available = view === "options" ? config.questions.filter((question) => choiceKinds.includes(question.kind)) : config.questions;
    const question = available.find((item) => item.id === questionFilter);
    return <div className="grid gap-3">
      <SelectField label="السؤال" value={question?.id} empty="اختر سؤالًا" options={available.map((item) => [item.id, listLabel(item)] as const)} onChange={setQuestionFilter} />
      {question && (view === "options" ? <OptionsFields value={question} config={config} onChange={updateQuestion} /> :
        <ConditionFields value={question.condition} onChange={(condition) => updateQuestion({ ...question, condition })} questions={config.questions.filter((item) => item.id !== question.id)} />)}
    </div>;
  }
  const isDiscount = view === "discounts";
  const rules = ordered(config.rules).filter((rule) => (rule.stage === "discount") === isDiscount);
  return <EditList<PricingRule> title={isDiscount ? "الخصومات والعروض" : "قواعد التسعير"} items={rules} label={listLabel} keyFor={(rule) => rule.id}
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
