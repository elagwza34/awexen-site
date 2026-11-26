import { useState } from "react";
import type { ItemField, Localized, Option, PricingRule, Project, Question, Settings } from "../../../../supabase/functions/_shared/calculator/engine";
import { Checkbox, EditList, fieldGrid, LocalizedField, NumberField, SelectField, TextField } from "./Fields";
import { ConditionFields, PricingFields } from "./RuleFields";
import { blank, choiceKinds, newId, newNamed, ordered, quantityKinds, questionKinds, reorder, type Config } from "./model";
import { CalculatorPreview } from "./CalculatorPreview";

export const editorViews = [
  ["projects", "Project types"], ["sections", "Sections"], ["questions", "Question builder"], ["options", "Options"],
  ["pricing", "Pricing rules"], ["logic", "Conditional logic"], ["templates", "Templates"],
  ["discounts", "Discounts and promotions"], ["settings", "Settings"], ["preview", "Preview and test"],
] as const;
export type EditorView = typeof editorViews[number][0];

function listLabel(record: { title: Localized; id: string; active: boolean }) {
  return `${record.title.en || record.title.ar || "Untitled"}${record.active ? "" : " (inactive)"}`;
}
function NamedFields<T extends { id: string; title: Localized; active: boolean }>({ value, onChange }: { value: T; onChange: (value: T) => void }) {
  return <>
    <LocalizedField label="Title" value={value.title} onChange={(title) => onChange({ ...value, title })} />
    <Checkbox label="Active" value={value.active} onChange={(active) => onChange({ ...value, active })} />
    <p className="self-center break-all text-xs">ID {value.id}</p>
  </>;
}

function Assignment({ config, value = [], onChange }: { config: Config; value?: string[]; onChange: (value: string[]) => void }) {
  return <fieldset className="border border-white/10 px-3 py-1">
    <legend className="px-1">Project types · all when none are selected</legend>
    <div className={fieldGrid}>{config.projects.map((project) => <Checkbox key={project.id}
      label={listLabel(project)} value={value.includes(project.id)}
      onChange={(selected) => onChange(selected ? [...value, project.id] : value.filter((id) => id !== project.id))} />)}</div>
  </fieldset>;
}

function LocalizedList({ value, onChange, title }: { value: Localized[]; onChange: (value: Localized[]) => void; title: string }) {
  return <EditList title={title} items={value} onChange={onChange} create={() => ({ ...blank })}
    label={(entry) => entry.en || entry.ar}
    render={(entry, update) => <div className={fieldGrid}><LocalizedField label="Description" value={entry} onChange={update} /></div>} />;
}

function QuestionFields({ value, onChange, config }: { value: Question; onChange: (value: Question) => void; config: Config }) {
  return <>
    <div className={fieldGrid}>
      <NamedFields value={value} onChange={onChange} />
      <SelectField label="Question type" value={value.kind} options={questionKinds} onChange={(kind) => onChange({ ...value, kind, defaultValue: undefined, required: kind === "info" ? false : value.required })} />
      <SelectField label="Section" value={value.sectionId} empty="Select section"
        options={config.sections.map((section) => [section.id, listLabel(section)] as const)} onChange={(sectionId) => onChange({ ...value, sectionId })} />
      {value.kind !== "info" && <Checkbox label="Required" value={value.required} onChange={(required) => onChange({ ...value, required })} />}
      <LocalizedField label="Description" value={value.description} onChange={(description) => onChange({ ...value, description })} />
      <LocalizedField label="Help" value={value.help} onChange={(help) => onChange({ ...value, help })} />
      <LocalizedField label="Placeholder" value={value.placeholder} onChange={(placeholder) => onChange({ ...value, placeholder })} />
      <TextField label="Internal notes" value={value.adminNotes} onChange={(adminNotes) => onChange({ ...value, adminNotes })} />
      {quantityKinds.includes(value.kind) && <>
        <NumberField label="Minimum quantity" value={value.min} onChange={(min) => onChange({ ...value, min })} />
        <NumberField label="Maximum quantity" value={value.max} onChange={(max) => onChange({ ...value, max })} />
        {value.kind !== "repeatable" && <NumberField label="Quantity step" value={value.step} onChange={(step) => onChange({ ...value, step })} />}
        <LocalizedField label="Unit" value={value.unit} onChange={(unit) => onChange({ ...value, unit })} />
      </>}
      {["text", "textarea"].includes(value.kind) && <>
        <NumberField label="Minimum characters" value={value.min} onChange={(min) => onChange({ ...value, min })} />
        <NumberField label="Maximum characters" value={value.max} onChange={(max) => onChange({ ...value, max })} />
      </>}
      {value.kind === "boolean" && <SelectField<"" | "true" | "false"> label="Default answer" value={value.defaultValue === undefined ? "" : value.defaultValue ? "true" : "false"}
        empty="No default" options={[["true", "Yes"], ["false", "No"]]} onChange={(next) => onChange({ ...value, defaultValue: next ? next === "true" : undefined })} />}
      {["text", "textarea"].includes(value.kind) && <TextField label="Default answer" value={typeof value.defaultValue === "string" ? value.defaultValue : undefined} onChange={(next) => onChange({ ...value, defaultValue: next || undefined })} />}
      {["number", "stepper", "slider"].includes(value.kind) && <NumberField label="Default quantity" value={typeof value.defaultValue === "number" ? value.defaultValue : undefined} onChange={(defaultValue) => onChange({ ...value, defaultValue })} />}
    </div>
    <Assignment config={config} value={value.projectIds} onChange={(projectIds) => onChange({ ...value, projectIds })} />
    <PricingFields allowNone value={value.pricing} onChange={(pricing) => onChange({ ...value, pricing })} />
    {choiceKinds.includes(value.kind) && <OptionsFields config={config} value={value} onChange={onChange} />}
    {value.kind === "repeatable" && <EditList<ItemField> title="Repeatable item fields" items={value.itemFields ?? []} create={() => ({ id: newId(), title: { ...blank }, kind: "text" })}
      label={(field) => field.title.en || field.title.ar} keyFor={(field) => field.id} onChange={(itemFields) => onChange({ ...value, itemFields })}
      render={(field, update) => <div className={fieldGrid}>
        <LocalizedField label="Title" value={field.title} onChange={(title) => update({ ...field, title })} />
        <SelectField label="Field type" value={field.kind} options={[["text", "Text"], ["number", "Number"], ["boolean", "Yes / No"]]} onChange={(kind) => update({ ...field, kind })} />
        <Checkbox label="Required" value={field.required} onChange={(required) => update({ ...field, required })} />
        {field.kind !== "boolean" && <>
          <NumberField label={field.kind === "text" ? "Minimum characters" : "Minimum"} value={field.min} onChange={(min) => update({ ...field, min })} />
          <NumberField label={field.kind === "text" ? "Maximum characters" : "Maximum"} value={field.max} onChange={(max) => update({ ...field, max })} />
        </>}
      </div>} />}
  </>;
}

function OptionsFields({ config, value, onChange }: { config: Config; value: Question; onChange: (value: Question) => void }) {
  return <EditList<Option> title="Options" items={ordered(value.options ?? [])} onChange={(options) => onChange({ ...value, options: reorder(options) })}
    label={listLabel} keyFor={(option) => option.id}
    create={() => ({ ...newNamed(), pricing: { method: "unconfigured", billing: "oneTime" } })}
    duplicate={(option) => ({ ...option, id: newId(), default: false })}
    render={(option, update) => <>
      <div className={fieldGrid}>
        <NamedFields value={option} onChange={update} />
        <LocalizedField label="Description" value={option.description} onChange={(description) => update({ ...option, description })} />
        <TextField label="Icon" value={option.icon} onChange={(icon) => update({ ...option, icon })} />
        <Checkbox label="Default selection" value={option.default} onChange={(selected) => onChange({
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
  const leadFields = [["name", "Name"], ["company", "Company"], ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["requirements", "Additional requirements"]] as const;
  return <div className={fieldGrid}>
    <TextField label="Currency code" value={value.currency} onChange={(currency) => onChange({ ...value, currency: currency.toUpperCase() })} />
    <NumberField label="Currency decimal places" value={value.minorUnits} onChange={(minorUnits) => onChange({ ...value, minorUnits })} />
    <SelectField label="Rounding" value={value.rounding ?? "halfUp"} options={[["halfUp", "Half up"], ["floor", "Round down"], ["ceil", "Round up"]]} onChange={(rounding) => onChange({ ...value, rounding })} />
    <NumberField label="Estimate validity (days)" value={value.validityDays} onChange={(validityDays) => onChange({ ...value, validityDays })} />
    <NumberField label="Billing months in first year" value={value.monthsPerYear} onChange={(monthsPerYear) => onChange({ ...value, monthsPerYear })} />
    <NumberField label="Tax (basis points)" value={value.taxBps} onChange={(taxBps) => onChange({ ...value, taxBps })} />
    <NumberField label="Discount cap (basis points)" value={value.discountLimitBps} onChange={(discountLimitBps) => onChange({ ...value, discountLimitBps })} />
    <NumberField label="Minimum project charge (minor units)" value={value.minimumPrice} onChange={(minimumPrice) => onChange({ ...value, minimumPrice })} />
    <Checkbox label="Show customer breakdown" value={value.showBreakdown ?? true} onChange={(showBreakdown) => onChange({ ...value, showBreakdown })} />
    <LocalizedField label="Quotation terms" value={value.terms} onChange={(terms) => onChange({ ...value, terms })} />
    <p className="self-center text-sm">Lead email is required for the quotation inbox.</p>
    {leadFields.map(([key, label]) => <SelectField key={key} label={`Lead field · ${label}`}
      value={value.leadFields?.[key] ?? (key === "name" ? "required" : "optional")}
      options={[["optional", "Optional"], ["required", "Required"], ["hidden", "Hidden"]]}
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
  if (view === "projects") return <EditList title="Project types" items={ordered(config.projects)} label={listLabel} keyFor={(item) => item.id}
    onChange={(projects) => onChange({ ...config, projects: reorder(projects) })}
    create={() => ({ ...newNamed(), description: { ...blank } })} onDuplicate={duplicateProject}
    render={(item, update) => <>
      <div className={fieldGrid}>
        <NamedFields value={item} onChange={(next) => update({ ...next, archived: next.active ? false : next.archived })} />
        <Checkbox label="Archived" value={item.archived ?? false}
          onChange={(archived) => update({ ...item, archived, active: archived ? false : item.active })} />
        <LocalizedField label="Description" value={item.description} onChange={(description) => update({ ...item, description })} />
        <LocalizedField label="Delivery timeframe" value={item.delivery} onChange={(delivery) => update({ ...item, delivery })} />
        <TextField label="Icon" value={item.icon} onChange={(icon) => update({ ...item, icon })} />
        <NumberField label="Base price (minor units)" value={item.basePrice} onChange={(basePrice) => update({ ...item, basePrice })} />
        <NumberField label="Minimum price (minor units)" value={item.minimumPrice} onChange={(minimumPrice) => update({ ...item, minimumPrice })} />
      </div>
      <LocalizedList title="Included services" value={item.included ?? []} onChange={(included) => update({ ...item, included })} />
      <LocalizedList title="Exclusions" value={item.exclusions ?? []} onChange={(exclusions) => update({ ...item, exclusions })} />
    </>} />;
  if (view === "sections") return <EditList title="Sections" items={orderedSections} label={listLabel} keyFor={(item) => item.id}
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
          <LocalizedField label="Description" value={item.description} onChange={(description) => update({ ...item, description })} />
        </div>
        <Assignment config={config} value={item.projectIds} onChange={(projectIds) => update({ ...item, projectIds })} />
        <div className="grid gap-2 border-t border-white/10 pt-3">
          <p className="text-sm font-medium">Show this step only when earlier answers match. The step stays hidden until its conditions are met, and it can only depend on questions from previous steps.</p>
          {eligible.length
            ? <ConditionFields value={item.condition} onChange={(condition) => update({ ...item, condition })} questions={eligible} />
            : <p className="text-xs">No active questions from earlier steps match this step's project types yet.</p>}
        </div>
      </>;
    }} />;
  if (view === "questions") return <div className="grid gap-3">
    <SelectField label="Section filter" value={sectionFilter} empty="All sections" options={sectionOptions} onChange={setSectionFilter} />
    <EditList title="Questions" items={questions} label={listLabel} keyFor={(item) => item.id} create={createQuestion} duplicate={(item) => ({ ...item, id: newId() })}
      onChange={(items) => onChange({ ...config, questions: [...reorder(items), ...config.questions.filter((question) => sectionFilter && question.sectionId !== sectionFilter)] })}
      render={(item, update) => <>
        <QuestionFields value={item} onChange={update} config={config} />
        <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, templates: [...config.templates ?? [], { ...item, id: newId() }] })}>Save as reusable template</button>
      </>} />
  </div>;
  if (view === "templates") {
    const template = config.templates?.find((item) => item.id === templateFilter);
    return <div className="grid gap-3">
      <SelectField label="Template to use" value={templateFilter} empty="Select a template" options={(config.templates ?? []).map((item) => [item.id, listLabel(item)] as const)} onChange={setTemplateFilter} />
      {template && <button type="button" className="admin-button-secondary justify-self-start" onClick={() => onChange({ ...config, questions: [...config.questions, { ...template, id: newId(), sectionId: config.sections.some((section) => section.id === template.sectionId) ? template.sectionId : config.sections[0]?.id ?? "" }] })}>Create question from template</button>}
      <EditList title="Reusable question templates" items={config.templates ?? []} label={listLabel} keyFor={(item) => item.id} create={createQuestion}
        onChange={(templates) => onChange({ ...config, templates })} duplicate={(item) => ({ ...item, id: newId() })}
        render={(item, update) => <QuestionFields value={item} onChange={update} config={config} />} />
    </div>;
  }
  if (view === "options" || view === "logic") {
    const available = view === "options" ? config.questions.filter((question) => choiceKinds.includes(question.kind)) : config.questions;
    const question = available.find((item) => item.id === questionFilter);
    return <div className="grid gap-3">
      <SelectField label="Question" value={question?.id} empty="Select question" options={available.map((item) => [item.id, listLabel(item)] as const)} onChange={setQuestionFilter} />
      {question && (view === "options" ? <OptionsFields value={question} config={config} onChange={updateQuestion} /> :
        <ConditionFields value={question.condition} onChange={(condition) => updateQuestion({ ...question, condition })} questions={config.questions.filter((item) => item.id !== question.id)} />)}
    </div>;
  }
  const isDiscount = view === "discounts";
  const rules = ordered(config.rules).filter((rule) => (rule.stage === "discount") === isDiscount);
  return <EditList<PricingRule> title={isDiscount ? "Discounts and promotions" : "Pricing rules"} items={rules} label={listLabel} keyFor={(rule) => rule.id}
    create={() => ({ ...newNamed(), method: "unconfigured", stage: isDiscount ? "discount" : "charge", billing: "oneTime" })}
    duplicate={(rule) => ({ ...rule, id: newId() })} onChange={(items) => onChange({ ...config, rules: [...reorder(items), ...config.rules.filter((rule) => (rule.stage === "discount") !== isDiscount)] })}
    render={(rule, update) => <>
      <div className={fieldGrid}>
        <NamedFields value={rule} onChange={update} />
        <SelectField label="Question that activates this rule" value={rule.questionId} empty="Project-level rule"
          options={config.questions.map((question) => [question.id, listLabel(question)] as const)} onChange={(questionId) => update({ ...rule, questionId: questionId || undefined })} />
      </div>
      <Assignment config={config} value={rule.projectIds} onChange={(projectIds) => update({ ...rule, projectIds })} />
      <PricingFields value={rule} onChange={(pricing) => pricing && update({ ...rule, ...pricing })} />
      <ConditionFields value={rule.condition} onChange={(condition) => update({ ...rule, condition })} questions={config.questions} />
    </>} />;
}
