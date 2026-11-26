import { useEffect, useMemo, useState } from "react";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { calculatorAdminRequest } from "./api";
import { editorViews, CalculatorEditors, type EditorView } from "./CalculatorEditors";
import { CalculatorOverview } from "./CalculatorOverview";
import { CalculatorRecords, type RecordView } from "./CalculatorRecords";
import { CalculatorCurrencyProvider } from "./Fields";
import { validateDraft, type Config } from "./model";

type Version = { id: string; status: "published" | "archived"; created_at: string; published_at?: string | null };
type State = { draft: { config: Config; revision: string; updated_at?: string }; versions: Version[] };

const navGroups = [
  { title: "البداية", views: [["overview", "ابدأ من هنا"]] },
  { title: "إعداد الحاسبة", views: [["projects", "أنواع المشاريع"], ["sections", "خطوات الحاسبة"], ["questions", "الأسئلة"], ["options", "الخيارات"]] },
  { title: "الأسعار", views: [["prices", "أسعار سريعة"], ["pricing", "قواعد التسعير"], ["discounts", "الخصومات"]] },
  { title: "متقدم (اختياري)", views: [["logic", "المنطق والشروط"], ["templates", "قوالب الأسئلة"]] },
  { title: "العميل", views: [["settings", "إعدادات العرض"], ["preview", "معاينة واختبار"]] },
  { title: "المتابعة", views: [["quotations", "عروض الأسعار"], ["leads", "طلبات العملاء"], ["analytics", "التحليلات"]] },
  { title: "النشر والسجل", views: [["versions", "سجل النشر"], ["audit", "سجل الأحداث"]] },
] as const;
type View = typeof navGroups[number]["views"][number][0];

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

  function saveDraft() {
    if (!server || !config) return;
    void run(() => calculatorAdminRequest("admin-save", { revision: server.draft.revision, config }), "تم حفظ المسودة. لن يراها الزوار حتى تنشرها.");
  }

  async function publish() {
    if (!server || !config || issues.length || busy) return;
    const changed = dirty;
    if (!await confirm({
      title: changed ? "حفظ ونشر التعديلات؟" : "نشر المسودة؟",
      description: changed
        ? "سيتم حفظ التعديلات الحالية ثم نشرها ليتمكن الزوار من رؤيتها في صفحة الحاسبة."
        : "سيتم نشر المسودة المحفوظة ليتمكن الزوار من رؤيتها في صفحة الحاسبة.",
      confirmLabel: "اعتماد ونشر",
      cancelLabel: "إلغاء",
    })) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let revision = server.draft.revision;
      if (changed) {
        const saved = await calculatorAdminRequest<{ draft: { revision: string } }>("admin-save", { revision, config });
        revision = saved.draft.revision;
      }
      await calculatorAdminRequest("admin-publish", { revision });
      await load();
      setMessage(changed ? "تم حفظ التعديلات ونشرها. الحاسبة الآن محدثة للزوار." : "تم نشر المسودة. الحاسبة الآن متاحة للزوار.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "تعذر إكمال طلب الحاسبة.");
    } finally {
      setBusy(false);
    }
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
  const status = !server ? "جارٍ تحميل الإعدادات…"
    : dirty ? "لديك تغييرات غير محفوظة. استخدم «حفظ ونشر» لتظهر للزوار."
    : published ? "التعديلات محفوظة. أي تعديل جديد يظهر للزوار بعد النشر فقط."
    : "المسودة محفوظة ولم تُنشر بعد. انشرها ليتمكن الزوار من استخدام الحاسبة.";

  return <section aria-busy={busy} className="grid min-w-0 gap-4">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div className="min-w-0"><h2 className="text-xl font-bold">حاسبة التكلفة</h2><p className="text-sm">{status}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={busy} onClick={() => void refresh()}>تحديث</button>
        <button type="button" className="admin-button-secondary" disabled={!dirty || busy} onClick={saveDraft}>حفظ المسودة</button>
        <button type="button" className="admin-button-primary" disabled={!server || !config || busy || issues.length > 0} onClick={() => void publish()}>
          {dirty ? "حفظ ونشر" : "نشر المسودة"}
        </button>
      </div>
    </header>
    {error && <p role="alert" className="whitespace-pre-line border border-red-500/40 p-3 text-red-300">{error}</p>}
    {message && <p role="status" className="text-emerald-400">{message}</p>}
    {server && issues.length > 0 && view !== "overview" && <p className="text-xs text-amber-200">النشر متوقف: {issues.length} ملاحظة تحتاج إصلاحًا. راجع شاشة «ابدأ من هنا».</p>}
    {server && <nav aria-label="إدارة الحاسبة" className="grid gap-3">
      {navGroups.map((group) => <div key={group.title} className="grid gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{group.title}</p>
        <div className="flex flex-wrap gap-1.5">
          {group.views.map(([key, label]) => <button type="button" aria-current={key === view ? "page" : undefined} key={key}
            className={key === view ? "admin-button-primary" : "admin-button-secondary"} onClick={() => setView(key)}>{label}</button>)}
        </div>
      </div>)}
    </nav>}
    {config && server && <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
      {view === "overview" && <CalculatorOverview config={config} published={published} draftRevision={server.draft.revision}
        draftUpdatedAt={server.draft.updated_at} dirty={dirty} busy={busy} issues={issues}
        onGo={(next) => setView(next)} onSave={saveDraft} onPublish={() => void publish()} />}
      {view === "versions" && <div className="grid gap-2">
        <h3 className="font-bold">سجل النشر</h3>
        <p className="text-sm text-white/50">كل مرة تنشر فيها تُحفظ نسخة يمكنك استعادتها لاحقًا إن حدث خطأ.</p>
        {!server.versions.length && <p>لم يتم نشر أي إصدار بعد.</p>}
        {server.versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-3">
          <div><p className="font-semibold">{version.status === "published" ? "منشور حاليًا" : "نسخة مؤرشفة"}</p><p className="break-all text-sm"><span dir="ltr">{version.id}</span> · {new Date(version.published_at ?? version.created_at).toLocaleString("ar-EG")}</p></div>
          <button type="button" className="admin-button-secondary" onClick={() => void restore(version)}>استعادة للمسودة</button>
        </div>)}
      </div>}
      {isRecordView && <CalculatorRecords key={view} view={view as RecordView} />}
      {editorViews.some(([key]) => key === view) && <CalculatorCurrencyProvider value={{ minorUnits: config.settings.minorUnits ?? 2, currency: config.settings.currency }}>
        <CalculatorEditors config={config} onChange={setConfig} view={view as EditorView} />
      </CalculatorCurrencyProvider>}
    </fieldset>}
    {confirmDialog}
  </section>;
}
