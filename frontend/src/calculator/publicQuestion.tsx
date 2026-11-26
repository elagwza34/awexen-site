import { useId } from "react";
import type { Answer, Localized, Question, ScalarAnswer } from "../../../supabase/functions/_shared/calculator/engine.ts";
import type { Lang } from "../context/LanguageContext";
import { calculatorText } from "./publicCopy";

type QuestionProps = {
  question: Question;
  value?: Answer;
  issue?: string;
  lang: Lang;
  onChange: (value: Answer) => void;
};

export function CalculatorQuestion({ question, value, issue, lang, onChange }: QuestionProps) {
  const id = useId();
  const t = calculatorText(lang);
  const local = (value?: Localized) => value?.[lang];
  const description = local(question.description);
  const help = local(question.help);
  const describedBy = [description && `${id}-description`, help && `${id}-help`, issue && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const inputProps = { "aria-describedby": describedBy, "aria-invalid": Boolean(issue), "aria-required": question.required };
  const title = `${question.title[lang]}${question.required ? " *" : ""}`;
  const min = question.min ?? 0;
  const max = question.max ?? 1_000_000;
  const step = question.step ?? 1;
  const options = question.options ?? [];
  const number = typeof value === "number" ? value : "";
  const numericControls = { min, max, step };
  const numberChange = (target: HTMLInputElement) => onChange(Number.isFinite(target.valueAsNumber) ? target.valueAsNumber : "");

  if (question.kind === "info") {
    return (
      <section className="calculator-field">
        <h3>{question.title[lang]}</h3>
        {description && <p>{description}</p>}
        {help && <p className="calculator-muted">{help}</p>}
      </section>
    );
  }

  return (
    <fieldset id={`calculator-question-${question.id}`} className="calculator-field" aria-describedby={describedBy}>
      <legend>{title}</legend>
      {description && <p id={`${id}-description`} className="calculator-muted">{description}</p>}
      {question.kind === "dropdown" && (
        <select className="calculator-input" aria-label={title} {...inputProps} value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">{t("choose")}</option>
          {options.map((option) => <option key={option.id} value={option.id}>{option.title[lang]}</option>)}
        </select>
      )}
      {(question.kind === "single" || question.kind === "multiple") && options.map((option) => {
        const multiple = question.kind === "multiple";
        const selection = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && options.some((candidate) => candidate.id === item)) : [];
        return (
          <label className="calculator-choice" key={option.id}>
            <input
              {...inputProps}
              type={multiple ? "checkbox" : "radio"}
              name={id}
              checked={multiple ? selection.includes(option.id) : value === option.id}
              aria-required={multiple ? undefined : question.required}
              onChange={(event) => onChange(multiple
                ? event.target.checked ? [...selection, option.id] : selection.filter((entry) => entry !== option.id)
                : option.id)}
            />
            <span>
              {option.title[lang]}
              {local(option.description) && <small className="calculator-muted block">{local(option.description)}</small>}
            </span>
          </label>
        );
      })}
      {question.kind === "single" && !question.required && (
        <label className="calculator-choice">
          <input type="radio" name={id} checked={value === undefined || value === ""} onChange={() => onChange("")} />
          <span>{t("choose")}</span>
        </label>
      )}
      {question.kind === "multiple" && !question.required && Array.isArray(value) && value.length > 0 && (
        <div><button className="calculator-button" type="button" onClick={() => onChange([])}>{t("clear")}</button></div>
      )}
      {question.kind === "boolean" && [true, false, ...(!question.required ? [""] as const : [])].map((option) => (
        <label className="calculator-choice" key={String(option)}>
          <input type="radio" name={id} {...inputProps} checked={option === "" ? value === "" || value === undefined : value === option} onChange={() => onChange(option)} />
          <span>{option === "" ? t("choose") : t(option ? "yes" : "no")}</span>
        </label>
      ))}
      {(question.kind === "number" || question.kind === "stepper" || question.kind === "slider") && (
        <>
          {question.kind === "slider" && (
            <input type="range" className="calculator-range" aria-label={title} {...inputProps} {...numericControls}
              value={number === "" ? min : number} onChange={(event) => numberChange(event.currentTarget)} />
          )}
          <div className="calculator-stepper">
            {question.kind === "stepper" && (
              <button type="button" className="calculator-button" aria-label={t("minus")} disabled={number === "" || number <= min}
                onClick={() => onChange(Math.max(min, Number(number) - step))}>−</button>
            )}
            <input type="number" className="calculator-input" aria-label={[title, local(question.unit)].filter(Boolean).join(" · ")}
              inputMode="numeric" {...inputProps} {...numericControls} value={number} onChange={(event) => numberChange(event.currentTarget)} />
            {question.kind === "stepper" && (
              <button type="button" className="calculator-button" aria-label={t("plus")} disabled={number !== "" && number >= max}
                onClick={() => onChange(number === "" ? min : Math.min(min + Math.floor((max - min) / step) * step, number + step))}>+</button>
            )}
            {local(question.unit) && <span>{local(question.unit)}</span>}
          </div>
        </>
      )}
      {question.kind === "text" && (
        <input className="calculator-input" aria-label={title} {...inputProps} value={typeof value === "string" ? value : ""}
          placeholder={local(question.placeholder)} minLength={question.min} maxLength={question.max ?? 4000}
          onChange={(event) => onChange(event.target.value)} />
      )}
      {question.kind === "textarea" && (
        <textarea className="calculator-input" aria-label={title} {...inputProps} rows={4} value={typeof value === "string" ? value : ""}
          placeholder={local(question.placeholder)} minLength={question.min} maxLength={question.max ?? 4000}
          onChange={(event) => onChange(event.target.value)} />
      )}
      {question.kind === "repeatable" && (
        <RepeatableRows question={question} value={value} lang={lang} onChange={onChange} />
      )}
      {help && <p id={`${id}-help`} className="calculator-muted text-sm">{help}</p>}
      {issue && <p id={`${id}-error`} className="calculator-error">{issue}</p>}
    </fieldset>
  );
}

function RepeatableRows({ question, value, lang, onChange }: QuestionProps) {
  const t = calculatorText(lang);
  const rows = Array.isArray(value) ? value.filter((row): row is Record<string, ScalarAnswer> => typeof row === "object") : [];
  const update = (index: number, field: string, value?: ScalarAnswer) => {
    const row = { ...rows[index] };
    if (value === undefined) delete row[field];
    else row[field] = value;
    onChange(rows.map((entry, rowIndex) => index === rowIndex ? row : entry));
  };
  return (
    <div className="calculator-repeat">
      {rows.map((row, index) => (
        <div key={index}>
          {(question.itemFields ?? []).map((field) => {
            const fieldValue = row[field.id];
            return (
            <label className="mb-2 block" key={field.id}>
              <span>{field.title[lang]}{field.required ? " *" : ""}</span>
              {field.kind === "boolean" ? (
                <select className="calculator-input block" aria-required={field.required} value={String(row[field.id] ?? "")}
                  onChange={(event) => update(index, field.id, event.target.value ? event.target.value === "true" : undefined)}>
                  <option value="">{t("choose")}</option>
                  <option value="true">{t("yes")}</option>
                  <option value="false">{t("no")}</option>
                </select>
              ) : field.kind === "number" ? (
                <input type="number" className="calculator-input block" aria-required={field.required} min={field.min ?? 0} max={field.max ?? 1_000_000}
                  value={typeof fieldValue === "number" ? fieldValue : ""}
                  onChange={(event) => update(index, field.id, Number.isFinite(event.currentTarget.valueAsNumber) ? event.currentTarget.valueAsNumber : undefined)} />
              ) : (
                <input className="calculator-input block" aria-required={field.required} minLength={field.min} maxLength={field.max ?? 4000}
                  value={typeof fieldValue === "string" ? fieldValue : ""}
                  onChange={(event) => update(index, field.id, event.target.value || undefined)} />
              )}
            </label>
            );
          })}
          <div className="calculator-actions">
            <button type="button" className="calculator-button" onClick={() => onChange(rows.filter((_, rowIndex) => index !== rowIndex))}>{t("remove")}</button>
          </div>
        </div>
      ))}
      <div>
        <button type="button" className="calculator-button" disabled={rows.length >= (question.max ?? 100)} onClick={() => onChange([...rows, {}])}>{t("add")}</button>
      </div>
    </div>
  );
}
