import { useState } from "react";
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { uploadPublicImage } from "../../lib/storage";
import { getSectionSchema } from "../../cms/sectionSchemas";
import type {
  CmsButton,
  CmsContent,
  CmsFieldDef,
  CmsFieldValue,
  CmsImage,
  CmsLang,
  CmsLinkItem,
  LocalizedText,
} from "../../cms/types";

type Props = {
  sectionKey: string;
  initial: CmsContent;
  onSave: (content: CmsContent) => Promise<void>;
  onCancel: () => void;
  /** لو موجود، المحرر في وضع معاينة: بيبعت مسودّة بدل ما يحفظ. */
  onDraft?: (content: CmsContent | null) => void;
};

const emptyText = (): LocalizedText => ({ ar: "", en: "" });
const newButton = (index: number): CmsButton => ({
  id: `b${Date.now()}-${index}`,
  text: emptyText(),
  link: "",
  newTab: false,
  enabled: true,
});
const newLink = (index: number): CmsLinkItem => ({
  id: `l${Date.now()}-${index}`,
  text: emptyText(),
  link: "",
});

/**
 * محرّر القسم: بيبني الفورم من تعريف القسم في السجل، مش من كود مكتوب
 * لكل قسم. بيدعم العربي والإنجليزي، والصور، والأزرار، والروابط.
 */
export default function SectionEditor({ sectionKey, initial, onSave, onCancel, onDraft }: Props) {
  const schema = getSectionSchema(sectionKey);
  const [form, setForm] = useState<CmsContent>(initial);
  const [lang, setLang] = useState<CmsLang>("ar");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isPreview = Boolean(onDraft);

  const update = (patch: CmsContent) => {
    const next = { ...form, ...patch };
    setForm(next);
    onDraft?.(next);
  };

  const setLocalized = (key: string, value: LocalizedText) => update({ [key]: value });

  const setTextValue = (key: string, lang: CmsLang, value: string) => {
    const current = form[key];
    const base: LocalizedText =
      current && typeof current === "object" && !Array.isArray(current) && "ar" in current
        ? { ...(current as LocalizedText) }
        : emptyText();
    update({ [key]: { ...base, [lang]: value } });
  };

  const validate = (): boolean => {
    if (!schema) return false;
    const next: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const value = form[field.key];
      if (field.kind === "localized-text") {
        const localized = value as LocalizedText | undefined;
        if (!localized?.ar?.trim() || !localized?.en?.trim()) {
          next[field.key] = "لازم تكتب النص بالعربي والإنجليزي.";
        }
      } else if (!value || (typeof value === "string" && !value.trim())) {
        next[field.key] = "الحقل ده مطلوب.";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(form);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (field: Extract<CmsFieldDef, { kind: "image" }>, file: File) => {
    setUploading(field.key);
    setError(null);
    try {
      const src = await uploadPublicImage(file, field.bucket, "cms");
      const current = form[field.key];
      const image: CmsImage =
        current && typeof current === "object" && !Array.isArray(current) && "src" in current
          ? { ...(current as CmsImage), src }
          : { src, alt: emptyText() };
      update({ [field.key]: image });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(null);
    }
  };

  if (!schema) {
    return <p className="text-[12px] text-red-300">مفيش تعريف لهذا القسم في السجل.</p>;
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
        <h3 className="text-[14px] font-extrabold text-white">{schema.label.ar}</h3>
        {isPreview && (
          <div className="inline-flex rounded-lg border border-white/10 p-0.5" role="tablist">
            {(["ar", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={lang === code}
                onClick={() => setLang(code)}
                className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${
                  lang === code ? "bg-brand-500 text-white" : "text-white/55"
                }`}
              >
                {code === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/8 p-2.5 text-[11px] text-red-200">
          {error}
        </p>
      )}

      {schema.fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={form[field.key]}
          lang={lang}
          error={fieldErrors[field.key]}
          uploading={uploading === field.key}
          onLocalized={(value) => setLocalized(field.key, value)}
          onText={(value) => setTextValue(field.key, lang, value)}
          onChange={(value) => update({ [field.key]: value })}
          onUpload={(file) => (field.kind === "image" ? uploadImage(field, file) : undefined)}
        />
      ))}

      <footer className="flex items-center justify-end gap-2 border-t border-white/8 pt-3">
        <button
          type="button"
          onClick={() => {
            onDraft?.(null);
            onCancel();
          }}
          className="admin-button-secondary"
        >
          <XIcon className="h-3.5 w-3.5" />إلغاء
        </button>
        <button type="button" disabled={busy} onClick={() => void submit()} className="admin-button-primary">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          حفظ
        </button>
      </footer>
    </div>
  );
}

/** رسم حقل واحد حسب نوعه. كل الأنواع معرّفة في السجل، مش هنا. */
function FieldControl({
  field,
  value,
  lang,
  error,
  uploading,
  onLocalized,
  onText,
  onChange,
  onUpload,
}: {
  field: CmsFieldDef;
  value: CmsFieldValue | undefined;
  lang: CmsLang;
  error?: string;
  uploading: boolean;
  onLocalized: (value: LocalizedText) => void;
  onText: (value: string) => void;
  onChange: (value: CmsFieldValue) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const label = field.label.ar;
  const asText: LocalizedText =
    value && typeof value === "object" && !Array.isArray(value) && "ar" in value
      ? (value as LocalizedText)
      : { ar: "", en: "" };
  const asImage: CmsImage | null =
    value && typeof value === "object" && !Array.isArray(value) && "src" in value
      ? (value as CmsImage)
      : null;
  const items = Array.isArray(value) ? (value as (CmsButton | CmsLinkItem)[]) : [];

  const frame = "space-y-1.5";

  if (field.kind === "text") {
    return (
      <div className={frame}>
        <label className="block text-[10.5px] font-bold text-white/60">{label}</label>
        <input
          dir="ltr"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onText(event.target.value)}
          placeholder={field.placeholder?.en}
          className="admin-input"
        />
        {error && <FieldError message={error} />}
      </div>
    );
  }

  if (field.kind === "localized-text") {
    return (
      <div className={frame}>
        <label className="block text-[10.5px] font-bold text-white/60">
          {label}
          {field.required && <span className="mr-1 text-brand-400">*</span>}
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={asText.ar}
            onChange={(event) => onLocalized({ ...asText, ar: event.target.value })}
            placeholder="العربية"
            className="admin-input"
          />
          <input
            dir="ltr"
            value={asText.en}
            onChange={(event) => onLocalized({ ...asText, en: event.target.value })}
            placeholder="English"
            className="admin-input"
          />
        </div>
        {error && <FieldError message={error} />}
      </div>
    );
  }

  if (field.kind === "textarea") {
    return (
      <div className={frame}>
        <label className="block text-[10.5px] font-bold text-white/60">{label}</label>
        <textarea
          rows={field.rows ?? 3}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onText(event.target.value)}
          aria-label={`${label} (${lang})`}
          className="admin-input"
        />
      </div>
    );
  }

  if (field.kind === "image") {
    return (
      <div className={frame}>
        <span className="block text-[10.5px] font-bold text-white/60">{label}</span>
        <div className="flex items-start gap-3">
          <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {asImage?.src ? (
              <img src={asImage.src} alt={asImage.alt.ar} className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5 text-white/25" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <label className="admin-button-secondary cursor-pointer">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5" />
              )}
              {uploading ? "جارٍ الرفع..." : asImage?.src ? "استبدال الصورة" : "رفع صورة"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
            {asImage?.src && (
              <button
                type="button"
                onClick={() => onChange({ src: "", alt: asImage.alt })}
                className="flex items-center gap-1 text-[10.5px] text-red-300"
              >
                <XIcon className="h-3 w-3" />إزالة الصورة
              </button>
            )}
            <input
              value={asImage?.alt.ar ?? ""}
              onChange={(event) =>
                onChange({ src: asImage?.src ?? "", alt: { ...(asImage?.alt ?? { ar: "", en: "" }), ar: event.target.value } })
              }
              placeholder="النص البديل بالعربية"
              className="admin-input"
            />
            <input
              dir="ltr"
              value={asImage?.alt.en ?? ""}
              onChange={(event) =>
                onChange({ src: asImage?.src ?? "", alt: { ...(asImage?.alt ?? { ar: "", en: "" }), en: event.target.value } })
              }
              placeholder="Alt text in English"
              className="admin-input"
            />
          </div>
        </div>
      </div>
    );
  }
  // buttons and links share one shape: an id, bilingual text, and a link.
  if (field.kind === "buttons" || field.kind === "links") {
    const isButton = field.kind === "buttons";
    const max = field.max;
    return (
      <div className={frame}>
        <span className="block text-[10.5px] font-bold text-white/60">{label}</span>
        {items.map((item, index) => {
          const patch = (changes: Partial<CmsButton & CmsLinkItem>) => {
            const next = [...items];
            next[index] = { ...next[index], ...changes };
            onChange(next as CmsFieldValue);
          };
          return (
            <div key={item.id} className="space-y-2 rounded-lg border border-white/8 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/45">
                  {isButton ? `زرار ${index + 1}` : `رابط ${index + 1}`}
                </span>
                <div className="flex items-center gap-2">
                  {isButton && (
                    <label className="flex items-center gap-1 text-[10px] text-white/50">
                      <input
                        type="checkbox"
                        checked={(item as CmsButton).enabled}
                        onChange={(event) => patch({ enabled: event.target.checked } as Partial<CmsButton>)}
                      />
                      مفعّل
                    </label>
                  )}
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => onChange(items.filter((_, i) => i !== index) as CmsFieldValue)}
                    className="text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={item.text.ar}
                  onChange={(event) => patch({ text: { ...item.text, ar: event.target.value } })}
                  placeholder="العربية"
                  className="admin-input"
                />
                <input
                  dir="ltr"
                  value={item.text.en}
                  onChange={(event) => patch({ text: { ...item.text, en: event.target.value } })}
                  placeholder="English"
                  className="admin-input"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  dir="ltr"
                  value={item.link}
                  onChange={(event) => patch({ link: event.target.value })}
                  placeholder="/contact أو https://example.com"
                  className="admin-input"
                />
                {isButton && (
                  <label className="flex shrink-0 items-center gap-1 text-[10px] text-white/50">
                    <input
                      type="checkbox"
                      checked={(item as CmsButton).newTab}
                      onChange={(event) => patch({ newTab: event.target.checked } as Partial<CmsButton>)}
                    />
                    تاب جديد
                  </label>
                )}
              </div>
            </div>
          );
        })}
        {items.length < max && (
          <button
            type="button"
            onClick={() =>
              onChange([
                ...items,
                isButton ? newButton(items.length) : newLink(items.length),
              ] as CmsFieldValue)
            }
            className="admin-button-secondary"
          >
            <Plus className="h-3.5 w-3.5" />
            {isButton ? "إضافة زرار" : "إضافة رابط"}
          </button>
        )}
      </div>
    );
  }

  return null;
}

function FieldError({ message }: { message: string }) {
  return <p className="text-[10px] text-red-300">{message}</p>;
}