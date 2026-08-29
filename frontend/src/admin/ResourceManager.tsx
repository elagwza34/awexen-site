import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, FileDown, ImagePlus, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { uploadPublicImage } from "../lib/storage";
import type { AdminRow, FieldDefinition, ResourceDefinition } from "./types";

function normalizeInputValue(field: FieldDefinition, value: unknown) {
  if (field.type === "checkbox") return Boolean(value);
  if (value === null || value === undefined) return "";
  if (field.type === "datetime-local" && typeof value === "string") return value.slice(0, 16);
  return value;
}

function buildPayload(fields: FieldDefinition[], form: AdminRow) {
  return Object.fromEntries(
    fields.map((field) => {
      const value = form[field.key];
      if (field.type === "number") {
        if ((value === "" || value === null || value === undefined) && field.nullable) return [field.key, null];
        return [field.key, Number(value || 0)];
      }
      if (field.type === "checkbox") return [field.key, Boolean(value)];
      if (field.nullable && (value === "" || value === undefined)) return [field.key, null];
      return [field.key, value ?? ""];
    }),
  );
}

function Field({ field, value, onChange, onImageUpload, uploading }: {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onImageUpload?: (file: File) => void;
  uploading?: boolean;
}) {
  const base = "mt-1.5 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2.5 text-[12px] text-white outline-none transition placeholder:text-white/25 focus:border-brand-500";

  if (field.type === "textarea") {
    return <textarea required={field.required} rows={field.key === "body" || field.key === "content" ? 9 : 4} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className={`${base} resize-y leading-6`} />;
  }

  if (field.type === "select") {
    return (
      <select required={field.required} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={base}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="mt-2 h-4 w-4 accent-orange-500" />;
  }

  if (field.type === "image") {
    return (
      <div className="mt-1.5 space-y-2">
        {Boolean(value) && <img src={String(value)} alt="معاينة الصورة" className="aspect-video w-full rounded-xl border border-white/10 object-cover" />}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-brand-500/30 bg-brand-500/[0.04] px-4 py-3 text-[10px] font-black text-brand-500 transition hover:bg-brand-500/10">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "جارٍ رفع الصورة..." : "رفع صورة من الجهاز"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImageUpload?.(file); event.target.value = ""; }} />
        </label>
        <input type="url" dir="ltr" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder="أو الصق رابط الصورة" className={`${base} text-left`} />
      </div>
    );
  }

  return (
    <input
      required={field.required}
      type={field.type ?? "text"}
      min={field.min}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className={base}
      dir={field.type === "url" ? "ltr" : undefined}
    />
  );
}

export default function ResourceManager({ definition }: { definition: ResourceDefinition }) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"content" | "draft">("content");
  const [uploadingField, setUploadingField] = useState("");
  const [form, setForm] = useState<AdminRow>(definition.defaults);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setRows([]);
      setError("اتصال Supabase غير مهيأ.");
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from(definition.table)
      .select("*")
      .order(definition.orderBy ?? "created_at", { ascending: false });

    if (loadError) {
      setRows([]);
      setError(`تعذر تحميل البيانات. شغّل ملف awexen_cms_schema.sql ثم حدّث الصفحة. (${loadError.message})`);
    } else {
      setRows((data ?? []) as AdminRow[]);
    }
    setLoading(false);
  }, [definition]);

  useEffect(() => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(definition.defaults);
    void load();
  }, [definition, load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...definition.defaults });
    setEditorOpen(true);
  };

  const openEdit = (row: AdminRow) => {
    setEditingId(row.id ?? null);
    setForm(Object.fromEntries(definition.fields.map((field) => [field.key, normalizeInputValue(field, row[field.key])])));
    setEditorOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const payload = buildPayload(definition.fields, form);
    const result = editingId
      ? await supabase.from(definition.table).update(payload).eq("id", editingId)
      : await supabase.from(definition.table).insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setEditorOpen(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      await load();
    }
    setSaving(false);
  };

  const remove = async (row: AdminRow) => {
    if (!supabase || !row.id || !window.confirm(`نقل ${definition.singular} «${String(row[definition.titleKey] ?? "") }» إلى Draft؟ سيظل المحتوى محفوظًا ويمكن استرجاعه.`)) return;
    if (!definition.statusKey) {
      setError("هذا النوع لا يدعم المسودات، لذلك لم يتم حذف أي بيانات.");
      return;
    }
    const { error: moveError } = await supabase.from(definition.table).update({ [definition.statusKey]: "draft" }).eq("id", row.id);
    if (moveError) setError(moveError.message);
    else {
      setView("draft");
      await load();
    }
  };

  const uploadImage = async (field: FieldDefinition, file: File) => {
    if (!field.storageBucket) return;
    setUploadingField(field.key);
    setError(null);
    try {
      const url = await uploadPublicImage(file, field.storageBucket, `${definition.table}-${String(editingId ?? "new")}`);
      setForm((current) => ({ ...current, [field.key]: url }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذّر رفع الصورة.");
    } finally {
      setUploadingField("");
    }
  };

  const openStoredFile = async (path: string) => {
    if (!supabase) return;
    const { data, error: signedUrlError } = await supabase.storage.from("knowledge-files").createSignedUrl(path, 60);
    if (signedUrlError) setError(`تعذر فتح الملف: ${signedUrlError.message}`);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const visibleRows = definition.statusKey
    ? rows.filter((row) => view === "draft"
      ? ["draft", "archived"].includes(String(row[definition.statusKey!] ?? ""))
      : !["draft", "archived"].includes(String(row[definition.statusKey!] ?? "")))
    : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold text-white">{definition.title}</h2>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-5 text-white/45">{definition.description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث</button>
          <button type="button" onClick={openNew} className="admin-button-primary"><Plus className="h-3.5 w-3.5" />إضافة {definition.singular}</button>
        </div>
      </div>

      {definition.statusKey && <div className="flex w-fit rounded-xl border border-white/10 bg-white/[0.025] p-1"><button type="button" onClick={() => setView("content")} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${view === "content" ? "bg-brand-500 text-white" : "text-white/45"}`}>المحتوى</button><button type="button" onClick={() => setView("draft")} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${view === "draft" ? "bg-brand-500 text-white" : "text-white/45"}`}>Draft · المسودات</button></div>}

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] leading-5 text-red-200">{error}</div>}

      {editorOpen && (
        <form onSubmit={save} className="rounded-xl border border-brand-500/25 bg-brand-500/[0.04] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-white">{editingId ? `تعديل ${definition.singular}` : `إضافة ${definition.singular}`}</h3>
            <button type="button" onClick={() => setEditorOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {definition.fields.map((field) => (
              <label key={field.key} className={`text-[11px] font-bold text-white/65 ${field.wide ? "md:col-span-2" : ""}`}>
                {field.label}
                <Field field={field} value={form[field.key]} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} onImageUpload={(file) => void uploadImage(field, file)} uploading={uploadingField === field.key} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-white/8 pt-4">
            <button type="button" onClick={() => setEditorOpen(false)} className="admin-button-secondary">إلغاء</button>
            <button disabled={saving} className="admin-button-primary">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "جارٍ الحفظ" : "حفظ"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-white/8 bg-white/[0.02] text-[12px] text-white/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : visibleRows.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 text-center text-[12px] text-white/40">لا توجد بيانات بعد. ابدأ بإضافة أول {definition.singular}.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/8">
          {visibleRows.map((row) => {
            const status = definition.statusKey ? String(row[definition.statusKey] ?? "") : "";
            const slug = typeof row.slug === "string" ? row.slug : null;
            const publicPath = definition.table === "blog_posts" ? `/blog/${slug}` : definition.table === "jobs" ? `/jobs/${slug}` : definition.table === "courses" ? `/courses/${slug}` : definition.table === "content_pages" ? `/pages/${slug}` : null;
            return (
              <div key={String(row.id)} className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.018] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[12.5px] font-bold text-white">{String(row[definition.titleKey] ?? "بدون عنوان")}</h3>
                    {status && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9.5px] text-white/55">{status}</span>}
                  </div>
                  {definition.subtitleKey && <p className="mt-1 truncate text-[10.5px] text-white/35">{String(row[definition.subtitleKey] ?? "")}</p>}
                  {Boolean(row.file_name) && <p dir="ltr" className="mt-1 truncate text-left text-[9.5px] text-brand-300/65">PDF: {String(row.file_name)}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {publicPath && status === "published" && <a href={publicPath} target="_blank" rel="noreferrer" className="admin-icon-button" aria-label="فتح الصفحة"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  {typeof row.file_path === "string" && row.file_path && <button type="button" onClick={() => void openStoredFile(row.file_path as string)} className="admin-icon-button" aria-label="فتح ملف PDF"><FileDown className="h-3.5 w-3.5" /></button>}
                  <button type="button" onClick={() => openEdit(row)} className="admin-icon-button" aria-label="تعديل"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => void remove(row)} className="admin-icon-button text-red-300 hover:bg-red-500/10" aria-label="نقل إلى Draft" title="نقل إلى Draft بدون حذف"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saved && <div className="fixed bottom-5 left-5 z-[80] inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-xl"><Check className="h-3.5 w-3.5" />تم الحفظ</div>}
    </div>
  );
}
