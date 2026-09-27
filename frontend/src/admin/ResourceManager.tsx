import { useCallback, useEffect, useId, useState } from "react";
import {
  Check,
  Clock3,
  ExternalLink,
  FileDown,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { uploadPublicImage } from "../lib/storage";
import { ADMIN_DRAFT_PREFIX } from "../lib/adminSession";
import { useConfirmDialog } from "../components/ConfirmDialog";
import type { AdminRow, FieldDefinition, ResourceDefinition } from "./types";

const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type StoredResourceDraft = {
  version: 1;
  userId: string;
  table: string;
  editingId: string | number | null;
  form: AdminRow;
  savedAt: number;
};

function normalizeInputValue(field: FieldDefinition, value: unknown) {
  if (field.type === "checkbox") return Boolean(value);
  if (value === null || value === undefined) return "";
  if (field.type === "datetime-local" && typeof value === "string") return value.slice(0, 16);
  return value;
}

function normalizeRow(definition: ResourceDefinition, row: AdminRow) {
  return Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      normalizeInputValue(field, row[field.key] ?? definition.defaults[field.key]),
    ]),
  );
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");
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
      const normalizedValue = typeof value === "string" && field.type !== "textarea"
        ? value.trim()
        : value;
      return [field.key, normalizedValue ?? ""];
    }),
  );
}

function getDraftStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function draftKey(userId: string, table: string) {
  return `${ADMIN_DRAFT_PREFIX}${userId}:${table}`;
}

function clearStoredDraft(userId: string, table: string) {
  getDraftStorage()?.removeItem(draftKey(userId, table));
}

function readStoredDraft(userId: string, definition: ResourceDefinition): StoredResourceDraft | null {
  const storage = getDraftStorage();
  if (!storage) return null;

  try {
    const draft = JSON.parse(storage.getItem(draftKey(userId, definition.table)) ?? "null") as StoredResourceDraft | null;
    const valid = Boolean(
      draft
      && draft.version === 1
      && draft.userId === userId
      && draft.table === definition.table
      && draft.form
      && typeof draft.form === "object"
      && Number.isFinite(draft.savedAt)
      && Date.now() - draft.savedAt < DRAFT_TTL_MS,
    );
    if (!valid) {
      storage.removeItem(draftKey(userId, definition.table));
      return null;
    }
    return draft;
  } catch {
    storage.removeItem(draftKey(userId, definition.table));
    return null;
  }
}

function writeStoredDraft(userId: string, definition: ResourceDefinition, editingId: string | number | null, form: AdminRow) {
  const storage = getDraftStorage();
  if (!storage) return null;
  const savedAt = Date.now();
  const draft: StoredResourceDraft = {
    version: 1,
    userId,
    table: definition.table,
    editingId,
    form: normalizeRow(definition, form),
    savedAt,
  };
  storage.setItem(draftKey(userId, definition.table), JSON.stringify(draft));
  return savedAt;
}

function fingerprint(value: AdminRow) {
  return JSON.stringify(value);
}

function Field({ field, value, onChange, onImageUpload, uploading }: {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onImageUpload?: (file: File) => void;
  uploading?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const base = "mt-1.5 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2.5 text-[12px] text-white outline-none transition placeholder:text-white/25 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10";

  if (field.type === "textarea") {
    return (
      <textarea
        name={field.key}
        aria-label={field.label}
        required={field.required}
        rows={field.key === "body" || field.key === "content" ? 9 : 4}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className={`${base} resize-y leading-6`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select name={field.key} aria-label={field.label} required={field.required} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={base}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return <input name={field.key} aria-label={field.label} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="mt-2 h-4 w-4 accent-orange-500" />;
  }

  if (field.type === "image") {
    const selectFile = (file: File | undefined) => {
      if (file && !uploading) onImageUpload?.(file);
    };

    return (
      <div className="mt-1.5 space-y-3">
        {Boolean(value) && (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-950/70">
            <img src={String(value)} alt="معاينة صورة المشروع" className="aspect-video w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-2 text-[9px] font-black text-white shadow-lg backdrop-blur transition hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> إزالة الصورة
            </button>
          </div>
        )}
        <label
          htmlFor={inputId}
          onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragging(true); }}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            selectFile(event.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-28 items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${uploading ? "cursor-wait border-brand-500/25 bg-brand-500/[0.03] opacity-70" : dragging ? "cursor-copy border-brand-400 bg-brand-500/15" : "cursor-pointer border-brand-500/35 bg-brand-500/[0.05] hover:border-brand-400 hover:bg-brand-500/10"}`}
          aria-busy={uploading}
        >
          <span className="flex flex-col items-center gap-2">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-brand-400" /> : <ImagePlus className="h-6 w-6 text-brand-400" />}
            <span className="text-[11px] font-black text-white/80">{uploading ? "جارٍ رفع الصورة من الكمبيوتر..." : value ? "اضغط أو اسحب صورة جديدة لاستبدال الحالية" : "اضغط لاختيار صورة من الكمبيوتر أو اسحبها هنا"}</span>
            <span className="text-[9px] font-medium text-white/35">JPG أو PNG أو WebP أو AVIF · بحد أقصى 8MB</span>
          </span>
          <input
            id={inputId}
            aria-label={field.label}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <details className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
          <summary className="cursor-pointer text-[9.5px] font-bold text-white/40">استخدام رابط صورة بدل الرفع</summary>
          <input name={field.key} aria-label={`${field.label} كرابط`} type="url" dir="ltr" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} placeholder="https://example.com/project.webp" className={`${base} text-left`} />
        </details>
      </div>
    );
  }

  const isSlug = field.key === "slug";
  return (
    <input
      name={field.key}
      aria-label={field.label}
      required={field.required}
      type={field.type ?? "text"}
      min={field.min}
      pattern={isSlug ? "[a-z0-9]+(?:-[a-z0-9]+)*" : undefined}
      title={isSlug ? "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطة فقط" : undefined}
      value={String(value ?? "")}
      onChange={(event) => onChange(isSlug ? normalizeSlug(event.target.value) : event.target.value)}
      placeholder={field.placeholder}
      className={base}
      dir={field.type === "url" || isSlug ? "ltr" : undefined}
    />
  );
}

export default function ResourceManager({ definition, draftOwnerId }: { definition: ResourceDefinition; draftOwnerId: string }) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<"content" | "draft">("content");
  const [uploadingField, setUploadingField] = useState("");
  const [form, setForm] = useState<AdminRow>({ ...definition.defaults });
  const [initialForm, setInitialForm] = useState<AdminRow>({ ...definition.defaults });
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  const statusField = definition.statusKey
    ? definition.fields.find((field) => field.key === definition.statusKey)
    : undefined;
  const supportsDrafts = Boolean(statusField?.options?.some((option) => option.value === "draft"));
  const dirty = editorOpen && fingerprint(form) !== fingerprint(initialForm);

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
      .order(definition.orderBy ?? "created_at", { ascending: definition.orderAscending ?? false });

    if (loadError) {
      setRows([]);
      setError(`تعذر تحميل ${definition.title}. تأكد من تطبيق أحدث Supabase migrations ثم حدّث الصفحة. (${loadError.message})`);
    } else {
      setRows((data ?? []) as AdminRow[]);
    }
    setLoading(false);
  }, [definition]);

  useEffect(() => {
    setEditorOpen(false);
    setEditingId(null);
    setView("content");
    setRestoredDraft(false);
    setDraftSavedAt(null);

    const storedDraft = readStoredDraft(draftOwnerId, definition);
    if (storedDraft) {
      const restoredForm = normalizeRow(definition, storedDraft.form);
      setEditingId(storedDraft.editingId);
      setForm(restoredForm);
      setInitialForm({ ...definition.defaults });
      setEditorOpen(true);
      setRestoredDraft(true);
      setDraftSavedAt(storedDraft.savedAt);
    } else {
      setForm({ ...definition.defaults });
      setInitialForm({ ...definition.defaults });
    }

    void load();
  }, [definition, draftOwnerId, load]);

  useEffect(() => {
    if (!editorOpen || !dirty) return;
    const savedAt = writeStoredDraft(draftOwnerId, definition, editingId, form);
    if (savedAt) setDraftSavedAt(savedAt);
  }, [definition, dirty, draftOwnerId, editingId, editorOpen, form]);

  const confirmReplacingEditor = async () => (
    !editorOpen
    || !dirty
    || confirm({
      title: "تغييرات غير محفوظة",
      description: "سيتم تجاهل التغييرات الحالية وفتح نموذج آخر. توجد نسخة مؤقتة محفوظة داخل هذا التبويب حتى تؤكد الاستبدال.",
      confirmLabel: "تجاهل وفتح النموذج",
      tone: "danger",
    })
  );

  const openNew = async () => {
    if (!await confirmReplacingEditor()) return;
    clearStoredDraft(draftOwnerId, definition.table);
    const nextForm = { ...definition.defaults };
    setEditingId(null);
    setForm(nextForm);
    setInitialForm(nextForm);
    setRestoredDraft(false);
    setDraftSavedAt(null);
    setError(null);
    setEditorOpen(true);
  };

  const openEdit = async (row: AdminRow) => {
    if (!await confirmReplacingEditor()) return;
    clearStoredDraft(draftOwnerId, definition.table);
    const nextForm = normalizeRow(definition, row);
    setEditingId(row.id ?? null);
    setForm(nextForm);
    setInitialForm(nextForm);
    setRestoredDraft(false);
    setDraftSavedAt(null);
    setError(null);
    setEditorOpen(true);
  };

  const closeEditor = async () => {
    if (dirty && !await confirm({
      title: "إغلاق المحرر؟",
      description: "سيتم حذف المسودة المؤقتة غير المحفوظة والعودة إلى آخر نسخة محفوظة.",
      confirmLabel: "إغلاق وتجاهل التغييرات",
      tone: "danger",
    })) return;
    clearStoredDraft(draftOwnerId, definition.table);
    setEditorOpen(false);
    setEditingId(null);
    setRestoredDraft(false);
    setDraftSavedAt(null);
    setError(null);
  };

  const discardRestoredDraft = async () => {
    if (!await confirm({
      title: "استعادة النسخة الأصلية؟",
      description: "ستُحذف المسودة المؤقتة من هذا التبويب ويُستعاد آخر محتوى محفوظ في قاعدة البيانات.",
      confirmLabel: "استعادة النسخة الأصلية",
      tone: "danger",
    })) return;
    clearStoredDraft(draftOwnerId, definition.table);
    const existingRow = editingId === null ? null : rows.find((row) => row.id === editingId);
    const nextForm = existingRow ? normalizeRow(definition, existingRow) : { ...definition.defaults };
    setForm(nextForm);
    setInitialForm(nextForm);
    setRestoredDraft(false);
    setDraftSavedAt(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || saving || uploadingField) return;
    const missingRequiredField = definition.fields.find((field) => {
      if (!field.required) return false;
      const value = form[field.key];
      return value === null
        || value === undefined
        || (typeof value === "string" && !value.trim());
    });
    if (missingRequiredField) {
      setError(`أكمل الحقل المطلوب: ${missingRequiredField.label}.`);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = buildPayload(definition.fields, form);
    const result = editingId
      ? await supabase.from(definition.table).update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from(definition.table).insert(payload).select("id").single();

    if (result.error) {
      setError(result.error.message);
    } else if (!result.data) {
      setError("لم يتم حفظ التغييرات. ربما تغير العنصر أو لم تعد تملك صلاحية تعديله.");
    } else {
      // الكورسات بتشتغل من جدولين: الموقع public.courses والحجز courses_course.
      // لو المزامنة(DB trigger) مش متطبّقة، الكورس هيبان في الموقع بس
      // صفحة الحجز هترفضه. بنتحقق ونقول للاداري بوضوح.
      if (definition.table === "courses" && String(payload[definition.statusKey ?? ""] ?? "") === "published") {
        await verifyBookable(supabase, String(form.slug ?? ""));
      }
      clearStoredDraft(draftOwnerId, definition.table);
      setEditorOpen(false);
      setEditingId(null);
      setRestoredDraft(false);
      setDraftSavedAt(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      if (supportsDrafts && definition.statusKey) {
        setView(["draft", "archived"].includes(String(payload[definition.statusKey] ?? "")) ? "draft" : "content");
      }
      await load();
      window.dispatchEvent(new Event("awexen-content-updated"));
    }
    setSaving(false);
  };

  /**
   * يتأكد إن الكورس بقى قابل للحجز فعلًا.
   * لو مش متزامن بيحذّر بدل ما المستخدم يفصل ويكتشف بعدين.
   */
  const verifyBookable = async (client: NonNullable<typeof supabase>, slug: string) => {
    if (!slug.trim()) return;
    const view = await client
      .from("lms_catalog_sync_status")
      .select("bookable, reason")
      .eq("slug", slug.trim())
      .maybeSingle();
    if (view.error || !view.data) return; // الـ view غير متاحة — ما نزعّلش المستخدم
    if (view.data.bookable) return;
    setError(
      `تم حفظ الكورس، لكنه لسه غير قابل للحجز: ${view.data.reason}. ` +
      "شغّل migration 202609270002 على Supabase عشان يتزامن الكتالوج.",
    );
  };

  const moveToDraft = async (row: AdminRow) => {
    if (!supabase || !row.id || !definition.statusKey || !supportsDrafts) return;
    if (!await confirm({
      title: `نقل ${definition.singular} إلى المسودات؟`,
      description: `سيختفي «${String(row[definition.titleKey] ?? "") }» من الموقع العام، لكن سيظل المحتوى محفوظًا بالكامل ويمكن تعديله أو نشره مرة أخرى.`,
      confirmLabel: "نقل إلى المسودات",
      tone: "danger",
    })) return;
    const { error: moveError } = await supabase.from(definition.table).update({ [definition.statusKey]: "draft" }).eq("id", row.id);
    if (moveError) setError(moveError.message);
    else {
      setView("draft");
      await load();
      window.dispatchEvent(new Event("awexen-content-updated"));
    }
  };

  const uploadImage = async (field: FieldDefinition, file: File) => {
    if (!field.storageBucket || uploadingField) return;
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

  const visibleRows = supportsDrafts && definition.statusKey
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
          <button type="button" onClick={() => void load()} disabled={loading} className="admin-button-secondary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث</button>
          <button type="button" onClick={() => void openNew()} className="admin-button-primary"><Plus className="h-3.5 w-3.5" />إضافة {definition.singular}</button>
        </div>
      </div>

      {supportsDrafts && <div className="flex w-fit rounded-xl border border-white/10 bg-white/[0.025] p-1"><button type="button" onClick={() => setView("content")} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${view === "content" ? "bg-brand-500 text-white" : "text-white/45"}`}>المحتوى</button><button type="button" onClick={() => setView("draft")} className={`rounded-lg px-4 py-2 text-[10px] font-black transition ${view === "draft" ? "bg-brand-500 text-white" : "text-white/45"}`}>Draft · المسودات</button></div>}

      {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] leading-5 text-red-200">{error}</div>}

      {editorOpen && (
        <form onSubmit={save} className="rounded-xl border border-brand-500/25 bg-brand-500/[0.04] p-4">
          <div className="mb-4 flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[13px] font-bold text-white">{editingId ? `تعديل ${definition.singular}` : `إضافة ${definition.singular}`}</h3>
              {dirty && draftSavedAt && (
                <p aria-live="polite" className="mt-1 flex items-center gap-1.5 text-[9.5px] text-emerald-300/80">
                  <Clock3 className="h-3 w-3" /> محفوظة تلقائيًا داخل هذا التبويب · {new Date(draftSavedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <button type="button" onClick={() => void closeEditor()} className="grid h-10 w-10 place-items-center self-end rounded-lg text-white/50 hover:bg-white/5 hover:text-white sm:self-auto" aria-label="إغلاق المحرر"><X className="h-4 w-4" /></button>
          </div>

          {restoredDraft && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-[10.5px] leading-5 text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
              <span>تم استعادة البيانات التي كتبتها قبل إعادة تحميل الصفحة.</span>
              <button type="button" onClick={() => void discardRestoredDraft()} className="inline-flex shrink-0 items-center gap-1.5 font-black text-emerald-300 hover:text-white"><RotateCcw className="h-3.5 w-3.5" />استعادة النسخة الأصلية</button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {definition.fields.map((field) => (
              <div key={field.key} className={`text-[11px] font-bold text-white/65 ${field.wide ? "md:col-span-2" : ""}`}>
                <span>{field.label}{field.required && <span className="mr-1 text-brand-400" aria-hidden="true">*</span>}</span>
                <Field
                  field={field}
                  value={form[field.key]}
                  onChange={(value) => {
                    setError(null);
                    setForm((current) => ({ ...current, [field.key]: value }));
                  }}
                  onImageUpload={(file) => void uploadImage(field, file)}
                  uploading={uploadingField === field.key}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 border-t border-white/8 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => void closeEditor()} disabled={saving || Boolean(uploadingField)} className="admin-button-secondary justify-center">إلغاء</button>
            <button type="submit" disabled={saving || Boolean(uploadingField) || !dirty} className="admin-button-primary justify-center">
              {saving || uploadingField ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {uploadingField ? "جارٍ رفع الصورة" : saving ? "جارٍ الحفظ" : editingId ? "حفظ التعديلات" : "إنشاء المسودة"}
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
            const slug = typeof row.slug === "string" && row.slug ? row.slug : null;
            const publicPath = slug && definition.table === "portfolio_projects" ? `/portfolio/${slug}` : slug && definition.table === "blog_posts" ? `/blog/${slug}` : slug && definition.table === "jobs" ? `/jobs/${slug}` : slug && definition.table === "courses" ? `/courses/${slug}` : slug && definition.table === "content_pages" ? `/pages/${slug}` : null;
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
                  <button type="button" onClick={() => void openEdit(row)} className="admin-icon-button" aria-label="تعديل"><Pencil className="h-3.5 w-3.5" /></button>
                  {supportsDrafts && status !== "draft" && <button type="button" onClick={() => void moveToDraft(row)} className="admin-icon-button text-red-300 hover:bg-red-500/10" aria-label="نقل إلى المسودات" title="نقل إلى المسودات بدون حذف"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {saved && <div aria-live="polite" className="fixed bottom-5 left-5 z-[80] inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-xl"><Check className="h-3.5 w-3.5" />تم الحفظ</div>}
      {confirmDialog}
    </div>
  );
}
