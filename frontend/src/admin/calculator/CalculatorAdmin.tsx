import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useConfirmDialog } from "../../components/ConfirmDialog";
import { calculatorAdminRequest } from "./api";
import { CalculatorEditors, editorViews, type EditorView } from "./CalculatorEditors";
import { CalculatorRecords, type RecordView } from "./CalculatorRecords";
import { validateDraft, type Config } from "./model";

type Version = { id: string; status: "published" | "archived"; created_at: string; published_at?: string | null };
type State = { draft: { config: Config; revision: string }; versions: Version[] };

const views = [
  ["overview", "Overview"], ...editorViews,
  ["quotations", "Quotations"], ["leads", "Customer leads"], ["analytics", "Analytics"],
  ["versions", "Configuration versions"], ["audit", "Audit log"],
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
      setError(failure instanceof Error ? failure.message : "Calculator request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!server || issues.length || dirty) return;
    if (!await confirm({ title: "Publish this configuration?", description: "Confirm the calculator prices and make this saved version available to site visitors.", confirmLabel: "Approve and publish", cancelLabel: "Cancel" })) return;
    await run(() => calculatorAdminRequest("admin-publish", { revision: server.draft.revision }), "Configuration published.");
  }

  async function restore(version: Version) {
    if (!server) return;
    if (!await confirm({ title: "Restore this version to draft?", description: "This replaces the current draft. Review and publish the restored version to make it live.", confirmLabel: "Restore to draft", cancelLabel: "Cancel" })) return;
    await run(() => calculatorAdminRequest("admin-restore", { versionId: version.id, revision: server.draft.revision }), "Version restored to draft.");
  }

  async function refresh() {
    if (dirty && !await confirm({ title: "Discard unsaved edits?", description: "Refreshing loads the latest saved draft and discards edits in this tab.", confirmLabel: "Discard and refresh", cancelLabel: "Keep editing" })) return;
    await run(async () => {}, "Configuration refreshed.");
  }

  const isRecordView = view === "quotations" || view === "leads" || view === "analytics" || view === "audit";
  const published = server?.versions.find((version) => version.status === "published");

  return <section dir="ltr" aria-busy={busy} className="grid min-w-0 gap-4">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div><h2 className="text-xl font-bold">Cost calculator</h2><p className="text-sm">{dirty ? "Unsaved changes" : server ? `Draft revision ${server.draft.revision}` : "Loading configuration…"}</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={busy} onClick={() => void refresh()}>Refresh</button>
        <button type="button" className="admin-button-secondary" disabled={!dirty || busy} onClick={() => server && void run(() => calculatorAdminRequest("admin-save", { revision: server.draft.revision, config }), "Draft saved.")}>Save draft</button>
        <button type="button" className="admin-button-primary" disabled={!server || dirty || busy || issues.length > 0} onClick={() => void publish()}>Publish saved draft</button>
      </div>
    </header>
    {error && <p role="alert" className="whitespace-pre-line border border-red-500/40 p-3 text-red-300">{error}</p>}
    {message && <p role="status" className="text-emerald-400">{message}</p>}
    {server && <nav aria-label="Calculator management" className="flex flex-wrap gap-2">
      {views.map(([key, label]) => <button type="button" aria-current={key === view ? "page" : undefined} key={key} className={key === view ? "admin-button-primary" : "admin-button-secondary"} onClick={() => setView(key)}>{label}</button>)}
    </nav>}
    {config && server && <fieldset disabled={busy} className="grid min-w-0 gap-4 border-0 p-0">
      {view === "overview" && <>
        <div className="grid gap-2 border border-white/10 p-4">
          <h3 className="font-semibold">Publication status</h3>
          <p>{published ? `Live version ${published.id}` : "The calculator has no published configuration."}</p>
          {published && <Link className="underline" to="/project-calculator">Open public calculator</Link>}
        </div>
        <div className="grid gap-2 border border-white/10 p-4">
          <h3 className="font-semibold">Publish validation</h3>
          {issues.length ? <ul className="list-disc space-y-1 ps-5">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : <p>The draft passed local validation.</p>}
        </div>
      </>}
      {view === "versions" && <div className="grid gap-2">
        <h3 className="font-bold">Version history</h3>
        {!server.versions.length && <p>No versions have been published.</p>}
        {server.versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-3">
          <div><p className="font-semibold capitalize">{version.status}</p><p className="break-all text-sm">{version.id} · {new Date(version.published_at ?? version.created_at).toLocaleString()}</p></div>
          <button type="button" className="admin-button-secondary" onClick={() => void restore(version)}>Copy to draft</button>
        </div>)}
      </div>}
      {isRecordView && <CalculatorRecords key={view} view={view as RecordView} />}
      {editorViews.some(([key]) => key === view) && <CalculatorEditors config={config} onChange={setConfig} view={view as EditorView} />}
    </fieldset>}
    {confirmDialog}
  </section>;
}
