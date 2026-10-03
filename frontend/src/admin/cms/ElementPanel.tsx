import { useRef, useState } from "react";
import { ColorField, MetricField, SelectField, ToggleField } from "./PropertyControls";
import { uploadPublicImage } from "../../lib/storage";
import {
  readButtons,
  readImage,
  readLocalized,
  readStyle,
  type CmsButton,
  type CmsContent,
  type CmsFieldValue,
  type CmsImage,
  type ElementStyle,
  type LocalizedText,
} from "../../cms/types";

const ALIGN_OPTIONS = [
  { value: "right", label: "يمين" },
  { value: "center", label: "الوسط" },
  { value: "left", label: "يسار" },
] as const;

const FIT_OPTIONS = [
  { value: "cover", label: "ملء" },
  { value: "contain", label: "احتواء" },
  { value: "fill", label: "تمديد" },
  { value: "none", label: "بدون" },
  { value: "scale-down", label: "تصغير" },
] as const;

/** Accent presets. A preset is a starting point, not a lock. */
const BUTTON_PRESETS = ["primary", "secondary", "outline", "ghost", "custom"] as const;
type ButtonPreset = (typeof BUTTON_PRESETS)[number];

const PRESET_STYLE: Record<Exclude<ButtonPreset, "custom">, ElementStyle> = {
  primary: { backgroundColor: "#f97316", color: "#ffffff", borderWidth: 0, borderRadius: 12 },
  secondary: {
    backgroundColor: "transparent",
    color: "#ffffff",
    borderColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderRadius: 12,
  },
  outline: {
    backgroundColor: "transparent",
    color: "#f97316",
    borderColor: "#f97316",
    borderWidth: 2,
    borderRadius: 12,
  },
  ghost: { backgroundColor: "transparent", color: "#ffffff", borderWidth: 0, borderRadius: 12 },
};

function detectPreset(style: ElementStyle): ButtonPreset {
  for (const [name, preset] of Object.entries(PRESET_STYLE)) {
    if (Object.entries(preset).every(([k, v]) => (style as Record<string, unknown>)[k] === v)) {
      return name as ButtonPreset;
    }
  }
  return "custom";
}

/** The kind of element the admin clicked, derived from the element key. */
export type ElementKind = "text" | "button" | "image" | "heading";

export function elementKindOf(element: string): ElementKind {
  if (/button/i.test(element)) return "button";
  if (/image|logo|photo|avatar/i.test(element)) return "image";
  if (/title|heading|headline/i.test(element)) return "heading";
  return "text";
}

/** Bilingual text inputs. */
function TextFields({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  multiline?: boolean;
}) {
  const shared = { className: "admin-input", placeholder: "العربية" };
  return (
    <div className="space-y-1.5">
      <span className="block text-[10px] font-bold text-white/50">{label}</span>
      {multiline ? (
        <textarea
          {...shared}
          value={value.ar}
          onChange={(event) => onChange({ ...value, ar: event.target.value })}
          rows={3}
        />
      ) : (
        <input {...shared} value={value.ar} onChange={(event) => onChange({ ...value, ar: event.target.value })} />
      )}
      {multiline ? (
        <textarea
          dir="ltr"
          className="admin-input"
          placeholder="English"
          value={value.en}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
          rows={3}
        />
      ) : (
        <input
          dir="ltr"
          className="admin-input"
          placeholder="English"
          value={value.en}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
      )}
    </div>
  );
}

/** Button fields: text, link, new tab, preset. */
function ButtonFields({
  elementKey,
  draft,
  onChange,
}: {
  elementKey: string;
  draft: CmsContent;
  onChange: (key: string, value: CmsFieldValue) => void;
}) {
  const buttons = readButtons(draft.buttons);
  const mine = buttons.find((button) => button.id === elementKey) ?? buttons[Number(elementKey.replace(/\D/g, ""))] ?? buttons[0];
  const styleKey = `${elementKey}__style`;
  const style = readStyle(draft[styleKey]) ?? {};
  const [index, setIndex] = useState(0);

  if (!mine) {
    return <p className="text-[10px] text-white/40">مافيش زر في هذا القسم. أضفه من إعدادات القسم.</p>;
  }

  const patch = (changes: Partial<CmsButton>) => {
    const next = buttons.map((button, i) => (i === index ? { ...button, ...changes } : button));
    onChange("buttons", next);
  };

  return (
    <div className="space-y-2.5">
      {buttons.length > 1 && (
        <SelectField
          label="الزر"
          value={String(index)}
          options={buttons.map((button, i) => ({
            value: String(i),
            label: button.text.ar || button.text.en || `زر ${i + 1}`,
          }))}
          onChange={(next) => setIndex(Number(next ?? 0))}
        />
      )}
      <TextFields label="نص الزر" value={mine.text} onChange={(text) => patch({ text })} />
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10px] font-bold text-white/50">الرابط</span>
        <input
          dir="ltr"
          value={mine.link}
          onChange={(event) => patch({ link: event.target.value })}
          placeholder="/quote"
          className="admin-input w-36 py-1 text-[10px]"
        />
      </div>
      <div className="flex items-center gap-3">
        <ToggleField
          label="تبويب جديد"
          checked={mine.newTab}
          onChange={(newTab) => patch({ newTab })}
        />
        <ToggleField
          label="مفعّل"
          checked={mine.enabled}
          onChange={(enabled) => patch({ enabled })}
        />
      </div>
      <SelectField
        label="نمط جاهز"
        value={detectPreset(style)}
        options={BUTTON_PRESETS.map((preset) => ({ value: preset, label: preset }))}
        onChange={(preset) => {
          if (!preset || preset === "custom") return;
          onChange(styleKey, { ...style, ...PRESET_STYLE[preset as Exclude<ButtonPreset, "custom">] } as CmsFieldValue);
        }}
      />
    </div>
  );
}

/** Image fields: source, alt text and fit. */
function ImageFields({
  elementKey,
  draft,
  onChange,
}: {
  elementKey: string;
  draft: CmsContent;
  onChange: (key: string, value: CmsFieldValue) => void;
}) {
  const image = readImage(draft[elementKey]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (changes: Partial<CmsImage>) =>
    onChange(elementKey, { ...image, ...changes } as CmsFieldValue);

  // Reuses the project's upload helper, so type, size and folder rules are
  // identical to every other upload surface in the dashboard.
  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const src = await uploadPublicImage(file, "portfolio-media", "cms");
      patch({ src });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {image.src && (
        <img src={image.src} alt="" className="h-24 w-full rounded-lg object-cover" />
      )}
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10px] font-bold text-white/50">الصورة</span>
        <input
          dir="ltr"
          value={image.src}
          onChange={(event) => patch({ src: event.target.value })}
          placeholder="https://..."
          className="admin-input w-36 py-1 text-[10px]"
        />
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-white/60 hover:bg-white/5">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        {uploading ? "جارٍ الرفع…" : "رفع صورة من الجهاز"}
      </label>
      {uploadError && <p className="text-[10px] text-red-300">{uploadError}</p>}
      <TextFields label="النص البديل" value={image.alt} onChange={(alt) => patch({ alt })} />
      <SelectField
        label="ملء الصورة"
        value={readStyle(draft[`${elementKey}__style`])?.objectFit}
        options={FIT_OPTIONS}
        onChange={(objectFit) =>
          onChange(`${elementKey}__style`, {
            ...(readStyle(draft[`${elementKey}__style`]) ?? {}),
            objectFit,
          } as CmsFieldValue)
        }
      />
    </div>
  );
}

/**
 * The property panel for the selected element.
 *
 * Everything writes into the local draft only. Save is the sole path that
 * touches the database, through the existing saveSection helper.
 */
export default function ElementPanel({
  elementKey,
  draft,
  onChange,
}: {
  /** Element key inside the section, e.g. "title" or "primaryButton". */
  elementKey: string;
  draft: CmsContent;
  onChange: (key: string, value: CmsFieldValue) => void;
}) {
  const kind = elementKindOf(elementKey);
  const styleKey = `${elementKey}__style`;
  const style = readStyle(draft[styleKey]) ?? {};

  const setStyle = (patch: Partial<ElementStyle>) =>
    onChange(styleKey, { ...style, ...patch } as CmsFieldValue);

  const text = readLocalized(draft[elementKey]);

  return (
    <div className="space-y-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.04] p-3">
      <p className="text-[11px] font-black text-white/80">
        {elementKey}
        <span className="mr-2 text-[9px] font-bold text-white/35">{kind}</span>
      </p>

      {kind === "button" ? (
        <ButtonFields elementKey={elementKey} draft={draft} onChange={onChange} />
      ) : kind === "image" ? (
        <ImageFields elementKey={elementKey} draft={draft} onChange={onChange} />
      ) : (
        <TextFields
          label="النص"
          value={text}
          multiline={/desc|subtitle/i.test(elementKey)}
          onChange={(next) => onChange(elementKey, next)}
        />
      )}

      {/* Colours */}
      <div className="space-y-2 rounded-lg border border-white/8 p-2.5">
        <p className="text-[10.5px] font-bold text-white/60">الألوان</p>
        <ColorField
          label="لون النص"
          value={style.color}
          onChange={(color) => setStyle({ color: color || undefined })}
        />
        {kind === "button" && (
          <>
            <ColorField
              label="الخلفية"
              value={style.backgroundColor}
              onChange={(backgroundColor) => setStyle({ backgroundColor: backgroundColor || undefined })}
            />
            <ColorField
              label="خلفية hover"
              value={style.hoverBackgroundColor}
              onChange={(hoverBackgroundColor) => setStyle({ hoverBackgroundColor: hoverBackgroundColor || undefined })}
            />
            <ColorField
              label="نص hover"
              value={style.hoverTextColor}
              onChange={(hoverTextColor) => setStyle({ hoverTextColor: hoverTextColor || undefined })}
            />
          </>
        )}
      </div>

      {/* Typography */}
      {kind !== "image" && (
        <div className="space-y-2.5 rounded-lg border border-white/8 p-2.5">
          <p className="text-[10.5px] font-bold text-white/60">الخط</p>
          <MetricField
            label="حجم الخط"
            metricKey="fontSize"
            value={style.fontSize}
            onChange={(fontSize) => setStyle({ fontSize })}
          />
          <MetricField
            label="سماكة الخط"
            metricKey="fontWeight"
            value={style.fontWeight}
            onChange={(fontWeight) => setStyle({ fontWeight })}
          />
          <MetricField
            label="ارتفاع السطر"
            metricKey="lineHeight"
            value={style.lineHeight}
            onChange={(lineHeight) => setStyle({ lineHeight })}
          />
          <MetricField
            label="تباعد الحروف"
            metricKey="letterSpacing"
            value={style.letterSpacing}
            onChange={(letterSpacing) => setStyle({ letterSpacing })}
          />
          <SelectField
            label="المحاذاة"
            value={style.textAlign}
            options={ALIGN_OPTIONS}
            onChange={(textAlign) => setStyle({ textAlign })}
          />
        </div>
      )}

      {/* Border, radius and spacing for buttons */}
      {kind === "button" && (
        <div className="space-y-2.5 rounded-lg border border-white/8 p-2.5">
          <p className="text-[10.5px] font-bold text-white/60">البوردر والمسافات</p>
          <ColorField
            label="لون البوردر"
            value={style.borderColor}
            onChange={(borderColor) => setStyle({ borderColor: borderColor || undefined })}
          />
          <MetricField
            label="سماكة البوردر"
            metricKey="borderWidth"
            value={style.borderWidth}
            onChange={(borderWidth) => setStyle({ borderWidth })}
          />
          <MetricField
            label="استدارة البوردر"
            metricKey="borderRadius"
            value={style.borderRadius}
            onChange={(borderRadius) => setStyle({ borderRadius })}
          />
          <MetricField
            label="حشو أفقي"
            metricKey="padding"
            value={style.paddingX}
            onChange={(paddingX) => setStyle({ paddingX })}
          />
          <MetricField
            label="حشو رأسي"
            metricKey="padding"
            value={style.paddingY}
            onChange={(paddingY) => setStyle({ paddingY })}
          />
        </div>
      )}

      <ToggleField
        label="ظاهر"
        checked={style.visible !== false}
        onChange={(visible) => setStyle({ visible })}
      />
    </div>
  );
}