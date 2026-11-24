import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { deleteAdminRecords, removeUnreferencedUploads, type DeletableAdminTable } from "../lib/adminDeletion";
import { supabase } from "../lib/supabase";
import type { AdminRow, FieldOption } from "./types";

export type InboxField = {
  key: string;
  label: string;
  wide?: boolean;
  kind?: "email" | "phone" | "url" | "text";
  section?: string;
  fallbackKey?: string;
  options?: Record<string, string>;
};

type Props = {
  table: string;
  title: string;
  description: string;
  fields: InboxField[];
  statusOptions?: FieldOption[];
  /** العمود اللي بيظهر كعنوان في السطر المختصر. */
  titleKey?: string;
  /** الحقول اللي بتظهر في السطر المختصر قبل ما تفتح التفاصيل. */
  previewKeys?: string[];
  dateKey?: string;
  titleFallbackKey?: string;
  /** الحذف متاح للمالك والمدير فقط. */
  canDelete?: boolean;
};

function FieldValue({ field, value }: { field: InboxField; value: unknown }) {
  const raw = value === null || value === undefined || value === "" ? "—" : String(value);
  const text = field.options?.[raw] ?? raw;
  if (field.kind === "email" && text !== "—") return <a dir="ltr" href={`mailto:${text}`} className="break-all text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "phone" && text !== "—") return <a dir="ltr" href={`tel:${text}`} className="text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "url" && text !== "—") return <a dir="ltr" href={text} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-left text-brand-300 hover:underline">فتح الرابط <ExternalLink className="h-3 w-3" /></a>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

export default function InboxManager({ table, title, description, fields, statusOptions, titleKey = "name", previewKeys, dateKey = "created_at", titleFallbackKey, canDelete = false }: Props) {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // السطر المختصر بيعرض الحقول دي بس؛ الباقي جوه التفاصيل عند الفتح.
  const previewFields = useMemo(() => {
    const wanted = previewKeys ?? fields.slice(0, 3).map((field) => field.key);
    return fields.filter((field) => wanted.includes(field.key));
  }, [fields, previewKeys]);

  const statusLabels = useMemo(
    () => new Map((statusOptions ?? []).map((option) => [option.value, option.label])),
    [statusOptions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("اتصال Supabase غير مهيأ.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase.from(table).select("*").order(dateKey, { ascending: false, nullsFirst: false });
    if (loadError) {
      setRows([]);
      setError(`تعذر تحميل البيانات. تأكد من تشغيل ملف SQL وسياسة الدور الحالي. (${loadError.message})`);
    } else {
      setRows((data ?? []) as AdminRow[]);
      setSelected(new Set());
    }
    setLoading(false);
  }, [table, dateKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    return rows.filter((row) => {
      if (statusOptions && statusFilter && String(row.status ?? "new") !== statusFilter) return false;
      if (!query) return true;
      const statusText = statusLabels.get(String(row.status ?? "")) ?? "";
      return `${statusText} ${Object.entries(row)
        .filter(([key]) => key !== "id")
        .map(([, value]) => value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value))
        .join(" ")}`.toLocaleLowerCase("ar").includes(query);
    });
  }, [rows, search, statusFilter, statusOptions, statusLabels]);

  const visibleIds = filteredRows.map((row) => String(row.id));
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = visibleIds.some((id) => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const updateStatus = async (id: string | number, status: string) => {
    if (!supabase) return;
    setError(null);
    const { error: updateError } = await supabase.from(table).update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
  };

  const rowLabel = (row: AdminRow) => String(
    row[titleKey] || (titleFallbackKey ? row[titleFallbackKey] : null) || "بدون اسم",
  );

  const askDelete = async (targets: AdminRow[]) => {
    if (!canDelete || deleting || targets.length === 0) return;
    const confirmMessage = targets.length === 1
      ? `سيتم حذف «${rowLabel(targets[0])}» نهائيًا من قاعدة البيانات. لا يمكن التراجع.`
      : `سيتم حذف ${targets.length} سجلًا نهائيًا من قاعدة البيانات. لا يمكن التراجع.`;
    const approved = await confirm({
      title: targets.length === 1 ? "حذف السجل؟" : `حذف ${targets.length} سجل؟`,
      description: confirmMessage,
      confirmLabel: "نعم، احذف",
      cancelLabel: "إلغاء",
      tone: "danger",
    });
    if (!approved) return;

    setDeleting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await deleteAdminRecords(table as DeletableAdminTable, targets.map((row) => String(row.id)));
      const removed = new Set([...result.deleted_ids, ...result.archived_ids]);
      if (removed.size > 0) {
        setRows((current) => current.filter((row) => !removed.has(String(row.id))));
        setSelected((current) => {
          const next = new Set(current);
          removed.forEach((id) => next.delete(id));
          return next;
        });
        if (openId && removed.has(openId)) setOpenId(null);
      }

      const parts: string[] = [];
      if (result.deleted > 0) parts.push(`تم حذف ${result.deleted} سجلًا`);
      if (result.archived > 0) parts.push(`تمت أرشفة ${result.archived} سجل`);
      if (parts.length > 0) setNotice(`${parts.join("، ")}.`);

      const issueMessages = [
        ...(result.blocked.length > 0 ? [`${result.blocked.length} سجل محمي: ${result.blocked.map((item) => item.reason).join(" — ")}`] : []),
        ...result.errors,
      ];
      if (issueMessages.length > 0) setError(`لم يتم حذف بعض السجلات: ${issueMessages.join(" — ")}`);
      if (result.storage_urls.length > 0) void removeUnreferencedUploads(result.storage_urls);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف السجلات. حاول مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-[17px] font-extrabold text-white">{title}</h2><span className="rounded-full bg-white/5 px-2 py-1 text-[9.5px] text-white/45">{rows.length}</span></div>
          <p className="mt-1 text-[11.5px] leading-5 text-white/45">{description}</p>
        </div>
        <button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث</button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setSelected(new Set()); }}
            placeholder="ابحث بالاسم أو البريد أو أي بيانات..."
            aria-label={`بحث في ${title}`}
            className="admin-input pr-9"
          />
        </label>
        {statusOptions && (
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setSelected(new Set()); }}
            aria-label="تصفية بالحالة"
            className="admin-input sm:w-44"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        )}
        {canDelete && filteredRows.length > 0 && (
          <label className="admin-button-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(element) => { if (element) element.indeterminate = someSelected && !allSelected; }}
              onChange={toggleSelectAll}
              className="h-3.5 w-3.5 accent-red-500"
            />
            تحديد الكل
          </label>
        )}
      </div>

      {(search.trim() || statusFilter) && (
        <p className="text-[10.5px] text-white/40">عرض {filteredRows.length} من {rows.length} سجل.</p>
      )}

      {canDelete && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/8 p-3">
          <span className="text-[11.5px] font-bold text-red-200">تم تحديد {selected.size}</span>
          <button type="button" onClick={() => void askDelete(rows.filter((row) => selected.has(String(row.id))))} disabled={deleting} className="admin-button-danger">
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            حذف المحدد ({selected.size})
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="admin-button-secondary">إلغاء التحديد</button>
        </div>
      )}

      {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] leading-5 text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-[11.5px] leading-5 text-emerald-200">{notice}</div>}

      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-white/8 bg-white/[0.02]"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
      ) : rows.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[12px] text-white/40">لا توجد بيانات حتى الآن.</div>
      ) : filteredRows.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[12px] text-white/40">لا توجد سجلات مطابقة للبحث أو التصفية.</div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const isOpen = openId === String(row.id);
            const rowId = String(row.id);
            return (
            <article key={rowId} className="rounded-xl border border-white/8 bg-white/[0.018]">
              <div className="flex items-center gap-2 p-4">
                {canDelete && row.id !== undefined && row.id !== null && (
                  <input
                    type="checkbox"
                    checked={selected.has(rowId)}
                    onChange={() => toggleSelect(rowId)}
                    aria-label={`تحديد ${rowLabel(row)}`}
                    className="h-4 w-4 shrink-0 accent-red-500"
                  />
                )}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : rowId)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-right"
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-white">{rowLabel(row)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/40">
                      {previewFields.map((field) => {
                        const text = row[field.key];
                        if (text === null || text === undefined || String(text).trim() === "") return null;
                        return (
                          <span key={field.key} dir={field.kind === "email" || field.kind === "phone" ? "ltr" : undefined} className="truncate">
                            {field.options?.[String(text)] ?? String(text)}
                          </span>
                        );
                      })}
                      {Boolean(row[dateKey] || row.created_at) && (
                        <time dateTime={String(row[dateKey] || row.created_at)} className="text-white/30">
                          {new Date(String(row[dateKey] || row.created_at)).toLocaleString("ar-EG", { dateStyle: "short" })}
                        </time>
                      )}
                    </span>
                  </span>
                </button>
                {canDelete && row.id !== undefined && row.id !== null && (
                  <button
                    type="button"
                    onClick={() => void askDelete([row])}
                    disabled={deleting}
                    aria-label={`حذف ${rowLabel(row)}`}
                    title="حذف نهائي"
                    className="admin-icon-button shrink-0 text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {statusOptions && row.id !== undefined && row.id !== null && !isOpen && (
                <select
                  value={String(row.status ?? "new")}
                  onChange={(event) => void updateStatus(row.id!, event.target.value)}
                  aria-label="حالة الطلب"
                  className="mx-4 mb-4 rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10.5px] text-white/70 outline-none focus:border-brand-500"
                >
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}

              {isOpen && (
                <div className="border-t border-white/8 px-4 pb-4 pt-4">
                  <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {fields.map((field) => (
                      <div key={field.key} className={field.section || field.wide ? "sm:col-span-2 xl:col-span-3" : ""}>
                        {field.section && <h3 className="mb-3 border-b border-white/10 pb-2 text-sm font-bold text-brand-300">{field.section}</h3>}
                        <dt className="mb-1 text-[9.5px] font-bold text-white/30">{field.label}</dt>
                        <dd className="text-[11.5px] leading-6 text-white/72"><FieldValue field={field} value={row[field.key] || (field.fallbackKey ? row[field.fallbackKey] : row[field.key])} /></dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
                    {statusOptions && row.id !== undefined && row.id !== null && (
                      <>
                        <span className="text-[10px] font-bold text-white/40">الحالة</span>
                        <select
                          value={String(row.status ?? "new")}
                          onChange={(event) => void updateStatus(row.id!, event.target.value)}
                          aria-label="حالة الطلب"
                          className="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10.5px] text-white/70 outline-none focus:border-brand-500"
                        >
                          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </>
                    )}
                    {canDelete && row.id !== undefined && row.id !== null && (
                      <button type="button" onClick={() => void askDelete([row])} disabled={deleting} className="admin-button-danger mr-auto">
                        <Trash2 className="h-3.5 w-3.5" />حذف نهائي
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
            );
          })}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
