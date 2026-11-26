import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { calculatorAdminRequest } from "./api";
import { CalculatorEditors, editorViews, type EditorView } from "./CalculatorEditors";
import { CalculatorRecords, type RecordView } from "./CalculatorRecords";
import { translateIssue } from "./issues";
import { validateDraft, type Config } from "./model";

type Version = { id: string; status: "published" | "archived"; created_at: string; published_at?: string | null };
type State = { draft: { config: Config; revision: string }; versions: Version[] };

const views = [
  ["overview", "نظرة عامة"], ...editorViews,
  ["quotations", "عروض الأسعار"], ["leads", "طلبات العملاء"], ["analytics", "التحليلات"],
  ["versions", "إصدارات الإعدادات"], ["audit", "سجل التغييرات"],
] as const;
type View = typeof views[number][0];

export default function CalculatorAdmin() {
  const [view, setView] = useState<View>("overview");
  const [server, setServer] = useState<State | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { confirm, confirmDialog } = useConfirmDialog();
  const dirty = Boolean(server && config && JSON.stringify(config) !== JSON.stringify(server.draft.config));
  const issues = useMemo(() => config ? validateDraft(config) : [], [config]);

  async function load() {
    const data = await calculatorAdminRequest<State>("admin-list");
    setServer(data);
    setConfig(data.draft.config);
  }

  useEffect(() => {
    void load().catch((failure: Error) => setError(failure.message)).finally(() => setBusy(false));
  }, []);

  async function run(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      await load();
      setMessage(success);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر إكمال طلب الحاسبة.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!server || issues.length || dirty) return;
    if (!await confirm({ title: "نشر هذا الإعداد؟", description: "راجع أسعار الحاسبة واجعل هذا الإصدار المحفوظ متاحًا لزوار الموقع.", confirmLabel: "اعتماد ونشر", cancelLabel: "إلغاء" })) return;
    await run(() => calculatorAdminRequest("admin-publish", { revision: server.draft.revision }), "تم نشر الإعداد.");
  }

  async function restore(version: Version) {
    if (!server) return;
    if (!await confirm({ title: "استعادة هذا الإصدار إلى المسودة؟", description: "سيستبدل هذا المسودة الحالية. راجع الإصدار المستعاد وانشره ليصبح مباشرًا.", confirmLabel: "استعادة إلى المسودة", cancelLabel: "إلغاء" })) return;
    await run(() => calculatorAdminRequest("admin-restore", { versionId: version.id, revision: server.draft.revision }), "تمت استعادة الإصدار إلى المسودة.");
  }

  async function refresh() {
    if (dirty && !await confirm({ title: "تجاهل التعديلات غير المحفوظة؟", description: "سيتم تحميل أحدث مسودة محفوظة وتجاهل التعديلات في هذه الصفحة.", confirmLabel: "تجاهل وتحديث", cancelLabel: "متابعة التحرير" })) return;
    await run(async () => {}, "تم تحديث الإعدادات.");
  }

  const isRecordView = view === "quotations" || view === "leads" || view === "analytics" || view === "audit";
  const published = server?.versions.find((version) => version.status === "published");

  return <section aria-busy={busy} className="grid min-w-0 gap-4">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div><h2 className="text-xl font-bold">حاسبة التكلفة</h2><p className="text-sm">{dirty ? "تغييرات غير محفوظة" : server ? <>مراجعة المسودة <span dir="ltr">{server.draft.revision}</span></> : "جارٍ تحميل الإعدادات…"}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={busy} onClick={() => void refresh()}>تحديث</button>
        <button type="button" className="admin-button-secondary" disabled={!dirty || busy} onClick={() => server && void run(() => calculatorAdminRequest("admin-save", { revision: server.draft.revision, config }), "تم حفظ المسودة.")}>حفظ المسودة</button>
        <button type="button" className="admin-button-primary" disabled={!server || dirty || busy || issues.length > 0} onClick={() => void publish()}>نشر المسودة المحفوظة</button>
      </div>
    </header>
    {error && <p role="alert" className="whitespace-pre-line border border-red-500/40 p-3 text-red-300">{error}</p>}
    {message && <p role="status" className="text-emerald-400">{message}</p>}
    {server && <nav aria-label="إدارة الحاسبة" className="flex flex-wrap gap-2">
      {views.map(([key, label]) => <button type="button" aria-current={key === view ? "page" : undefined} key={key} className={key === view ? "admin-button-primary" : "admin-button-secondary"} onClick={() => setView(key)}>{label}</button>)}
    </nav>}
    {config && server && <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
      {view === "overview" && <>
        <div className="grid gap-2 border border-white/10 p-4">
          <h3 className="font-semibold">حالة النشر</h3>
          <p>{published ? <>الإصدار المباشر <span dir="ltr">{published.id}</span></> : "لا يوجد إعداد منشور للحاسبة."}</p>
          {published && <Link className="underline" to="/project-calculator">فتح الحاسبة العامة</Link>}
        </div>
        <div className="grid gap-2 border border-white/10 p-4">
          <h3 className="font-semibold">فحص ما قبل النشر</h3>
          {issues.length ? <ul className="list-disc space-y-1 ps-5">{issues.map((issue, index) => <li key={index}>{translateIssue(issue)}</li>)}</ul> : <p>نجحت المسودة في الفحص المحلي.</p>}
        </div>
      </>}
      {view === "versions" && <div className="grid gap-2">
        <h3 className="font-bold">سجل الإصدارات</h3>
        {!server.versions.length && <p>لم يتم نشر أي إصدار بعد.</p>}
        {server.versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-3">
          <div><p className="font-semibold">{version.status === "published" ? "منشور" : "مؤرشف"}</p><p className="break-all text-sm"><span dir="ltr">{version.id}</span> · {new Date(version.published_at ?? version.created_at).toLocaleString()}</p></div>
          <button type="button" className="admin-button-secondary" onClick={() => void restore(version)}>نسخ إلى المسودة</button>
        </div>)}
      </div>}
      {isRecordView && <CalculatorRecords key={view} view={view as RecordView} />}
      {editorViews.some(([key]) => key === view) && <CalculatorEditors config={config} onChange={setConfig} view={view as EditorView} />}
    </fieldset>}
    {confirmDialog}
  </section>;
}
