import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileDown,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/** صف طلب عرض سعر كما comes من public.quote_requests */
type QuoteRow = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  project_type?: string;
  industry?: string;
  current_site?: string;
  goals?: string;
  pages?: string;
  languages?: string;
  design_style?: string;
  colors?: string;
  logo?: string;
  content_ready?: string;
  products?: string;
  payments?: string;
  features?: string;
  hosting?: string;
  domain?: string;
  seo?: string;
  analytics?: string;
  maintenance?: string;
  timeline?: string;
  budget?: string;
  reference?: string;
  notes?: string;
  status?: string;
  admin_notes?: string | null;
  quoted_amount?: number | null;
  quote_sent_at?: string | null;
  created_at?: string;
};

const STATUSES = [
  { value: "new", label: "جديد", tone: "bg-blue-500/12 text-blue-300 border-blue-400/25" },
  { value: "reviewed", label: "قيد المراجعة", tone: "bg-amber-500/12 text-amber-300 border-amber-400/25" },
  { value: "quoted", label: "تم إرسال عرض", tone: "bg-brand-500/12 text-brand-300 border-brand-400/25" },
  { value: "accepted", label: "مقبول", tone: "bg-emerald-500/12 text-emerald-300 border-emerald-400/25" },
  { value: "rejected", label: "مرفوض", tone: "bg-red-500/12 text-red-300 border-red-400/25" },
];

const statusTone = (value?: string) => STATUSES.find((s) => s.value === value)?.tone ?? STATUSES[0].tone;
const statusLabel = (value?: string) => STATUSES.find((s) => s.value === value)?.label ?? "جديد";

/** الأعمدة بترتيب العرض، مقسومة لمجموعات بتتحكم في العرض والـ PDF */
const GROUPS: { title: string; fields: { key: keyof QuoteRow; label: string; wide?: boolean }[] }[] = [
  {
    title: "بيانات العميل",
    fields: [
      { key: "name", label: "الاسم" },
      { key: "email", label: "البريد الإلكتروني" },
      { key: "phone", label: "الهاتف" },
      { key: "industry", label: "القطاع" },
    ],
  },
  {
    title: "نطاق المشروع",
    fields: [
      { key: "project_type", label: "نوع المشروع" },
      { key: "goals", label: "الأهداف", wide: true },
      { key: "current_site", label: "الموقع الحالي", wide: true },
      { key: "pages", label: "عدد الصفحات" },
      { key: "languages", label: "اللغات" },
      { key: "timeline", label: "الموعد المطلوب" },
    ],
  },
  {
    title: "الشكل والمحتوى",
    fields: [
      { key: "design_style", label: "ستايل التصميم" },
      { key: "colors", label: "الألوان" },
      { key: "logo", label: "الشعار" },
      { key: "content_ready", label: "المحتوى" },
    ],
  },
  {
    title: "المزايا والوظائف",
    fields: [
      { key: "products", label: "عدد المنتجات" },
      { key: "payments", label: "وسائل الدفع" },
      { key: "features", label: "المزايا المطلوبة", wide: true },
    ],
  },
  {
    title: "الجوانب التقنية",
    fields: [
      { key: "hosting", label: "الاستضافة" },
      { key: "domain", label: "النطاق" },
      { key: "seo", label: "SEO" },
      { key: "analytics", label: "التحليلات" },
      { key: "maintenance", label: "الصيانة", wide: true },
    ],
  },
  {
    title: "الميزانية",
    fields: [
      { key: "budget", label: "الميزانية التقديرية" },
      { key: "reference", label: "روابط مرجعية", wide: true },
      { key: "notes", label: "ملاحظات العميل", wide: true },
    ],
  },
];

const cell = (row: QuoteRow, key: keyof QuoteRow) => {
  const raw = row[key];
  return raw === null || raw === undefined || String(raw).trim() === "" ? "—" : String(raw);
};

/** تفاصيل الطلب داخل المودال — نفس المحتوى اللي بيتبع في الـ PDF */
function QuoteDetails({ row }: { row: QuoteRow }) {
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const filled = group.fields.filter((f) => cell(row, f.key) !== "—");
        if (!filled.length) return null;
        return (
          <section key={group.title}>
            <h3 className="mb-2.5 text-[11px] font-black text-brand-300">{group.title}</h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              {filled.map((f) => (
                <div key={String(f.key)} className={f.wide ? "sm:col-span-2" : ""}>
                  <dt className="text-[9.5px] font-bold text-white/35">{f.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-6 text-white/80">
                    {cell(row, f.key)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
export default function QuoteInbox() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [pendingDelete, setPendingDelete] = useState<QuoteRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("اتصال Supabase غير مهيأ.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) {
      setRows([]);
      setError(`تعذر تحميل الطلبات. تأكد من تشغيل ملف SQL وسياسة الدور الحالي. (${loadError.message})`);
    } else {
      setRows((data ?? []) as QuoteRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Escape يقفل بوب أب التفاصيل أو نافذة الحذف، وأي واحد مفتوح يتقفل الأول.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete]);

  const open = rows.find((row) => row.id === openId) ?? null;

  const patch = (id: number, values: Partial<QuoteRow>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...values } : row)));

  const changeStatus = async (row: QuoteRow, status: string) => {
    if (!supabase || row.id === undefined) return;
    setBusyId(row.id);
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    patch(row.id, { status });
    setNotice(`تم تحديث حالة الطلب إلى «${statusLabel(status)}».`);
  };

  const saveQuote = async () => {
    if (!supabase || open?.id === undefined) return;
    const amount = Number(quoteAmount.replace(/[^\d.]/g, ""));
    const clean = Number.isFinite(amount) && amount > 0 ? amount : null;
    const stamp = new Date().toISOString();
    setBusyId(open.id);
    const { error: updateError } = await supabase
      .from("quote_requests")
      .update({
        status: "quoted",
        quoted_amount: clean,
        admin_notes: quoteNotes.trim() || null,
        quote_sent_at: stamp,
        updated_at: stamp,
      })
      .eq("id", open.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    patch(open.id, {
      status: "quoted",
      quoted_amount: clean,
      admin_notes: quoteNotes.trim() || null,
      quote_sent_at: stamp,
    });
    setNotice("تم حفظ عرض السعر. استخدم زر «رد على العميل» لإرساله.");
  };

  const remove = async (row: QuoteRow) => {
    if (!supabase || row.id === undefined) return;
    setBusyId(row.id);
    const { error: deleteError } = await supabase.from("quote_requests").delete().eq("id", row.id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    if (openId === row.id) setOpenId(null);
    setPendingDelete(null);
    setNotice("تم حذف الطلب نهائيًا.");
  };

  const newCount = useMemo(() => rows.filter((r) => !r.status || r.status === "new").length, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-extrabold text-white">طلبات عرض السعر</h2>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[9.5px] text-white/45">{rows.length}</span>
            {newCount > 0 && (
              <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[9.5px] font-bold text-brand-300">
                {newCount} جديد
              </span>
            )}
          </div>
          <p className="mt-1 text-[11.5px] leading-5 text-white/45">
            كل طلب في سطر مختصر. اضغط «التفاصيل» تشوف كل الحقول وتحمّله PDF أو تسجّل عرض السعر، والسلة بتمسح الطلب.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="admin-button-secondary">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] leading-5 text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3 text-[11.5px] text-emerald-200">{notice}</div>}

      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-white/8 bg-white/[0.02]">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : rows.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[12px] text-white/40">
          لا توجد طلبات حتى الآن.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            return (
              <article key={String(row.id)} className="rounded-xl border border-white/8 bg-white/[0.018]">
                <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[12.5px] font-bold text-white">{row.name || "بدون اسم"}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusTone(row.status)}`}>
                          {statusLabel(row.status)}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/40">
                        {row.email && <span dir="ltr" className="flex items-center gap-1"><Mail className="h-3 w-3" />{row.email}</span>}
                        {row.phone && <span dir="ltr" className="flex items-center gap-1"><Phone className="h-3 w-3" />{row.phone}</span>}
                        {row.project_type && <span>{row.project_type}</span>}
                        {row.budget && <span>{row.budget}</span>}
                        {row.created_at && (
                          <time dateTime={row.created_at}>
                            {new Date(row.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                          </time>
                        )}
                      </span>
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenId(row.id!);
                        setQuoteAmount(row.quoted_amount ? String(row.quoted_amount) : "");
                        setQuoteNotes(row.admin_notes ?? "");
                      }}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white/65 transition hover:border-brand-500/50 hover:text-white"
                    >
                      التفاصيل
                    </button>
                    {row.email && (
                      <a href={`mailto:${row.email}`} aria-label={`رد على ${row.name}`} className="admin-icon-button">
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      aria-label={`حذف طلب ${row.name}`}
                      className="admin-icon-button text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* بوب أب التفاصيل: طلب واحد بس في كل مرة */}
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل طلب ${open.name || ""}`}
          onClick={() => setOpenId(null)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0d111b] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-start justify-between gap-3 border-b border-white/8 pb-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-[16px] font-extrabold text-white">{open.name || "بدون اسم"}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusTone(open.status)}`}>
                    {statusLabel(open.status)}
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] text-white/40">
                  {open.project_type || "—"} · {open.budget || "ميزانية غير محددة"}
                  {open.created_at && ` · ${new Date(open.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPendingDelete(open);
                    setOpenId(null);
                  }}
                  aria-label={`حذف طلب ${open.name}`}
                  className="admin-icon-button text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setOpenId(null)} aria-label="إغلاق التفاصيل" className="admin-icon-button">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div id="quote-print">
              <QuoteDetails row={open} />
            </div>

            <div className="no-print mt-5 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
              <button type="button" onClick={() => window.print()} className="admin-button-secondary">
                <FileDown className="h-3.5 w-3.5" />تحميل PDF
              </button>
              {open.email && (
                <a
                  href={`mailto:${open.email}?subject=${encodeURIComponent("عرض سعر مشروعك — Awexen")}`}
                  className="admin-button-secondary"
                >
                  <Send className="h-3.5 w-3.5" />رد على العميل
                </a>
              )}
              <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
              {STATUSES.filter((s) => s.value !== (open.status ?? "new")).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={busyId === open.id}
                  onClick={() => void changeStatus(open, s.value)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white/60 transition hover:border-brand-500/50 hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* تسجيل عرض السعر على الطلب */}
            <div className="no-print mt-4 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-4">
              <h3 className="text-[12px] font-extrabold text-white">تسجيل عرض السعر</h3>
              <p className="mt-1 text-[10.5px] text-white/45">
                بيتحفظ على الطلب بتاريخ الإرسال، وتقدر ترسله للعميل من زر «رد على العميل».
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                <div>
                  <label htmlFor="quote-amount" className="mb-1.5 block text-[10px] font-bold text-white/50">
                    المبلغ المقترح
                  </label>
                  <input
                    id="quote-amount"
                    dir="ltr"
                    inputMode="decimal"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="15000"
                    className="admin-input"
                  />
                </div>
                <div>
                  <label htmlFor="quote-notes" className="mb-1.5 block text-[10px] font-bold text-white/50">
                    ملاحظات العرض
                  </label>
                  <input
                    id="quote-notes"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="يشمل التصميم والاستضافة وثلاثة أشهر دعم"
                    className="admin-input"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === open.id}
                onClick={() => void saveQuote()}
                className="admin-button-primary mt-3"
              >
                {busyId === open.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                حفظ عرض السعر
              </button>
              {open.quoted_amount ? (
                <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-3 text-[11px] text-emerald-200">
                  عرض مسجّل: <span dir="ltr" className="font-black">{Number(open.quoted_amount).toLocaleString("en-US")}</span>
                  {open.quote_sent_at && ` · بتاريخ ${new Date(open.quote_sent_at).toLocaleString("ar-EG", { dateStyle: "short" })}`}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* تأكيد الحذف قبل التنفيذ */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d111b] p-5">
            <h3 className="text-[15px] font-extrabold text-white">حذف الطلب نهائيًا؟</h3>
            <p className="mt-2 text-[12px] leading-6 text-white/60">
              هيتشال طلب <span className="font-bold text-white">{pendingDelete.name || "بدون اسم"}</span> من القاعدة، ومفيش تراجع.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busyId === pendingDelete.id}
                onClick={() => void remove(pendingDelete)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-red-400"
              >
                {busyId === pendingDelete.id ? "جارٍ الحذف..." : "نعم، احذف"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white/70 transition hover:bg-white/5"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}