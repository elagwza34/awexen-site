import { useCallback, useEffect, useState } from "react";
import { Monitor, RotateCcw, Save, Smartphone, Tablet, X } from "lucide-react";
import PagePreview from "./PagePreview";
import ElementPanel from "./ElementPanel";
import type { CmsContent } from "../../cms/types";
import type { CmsSectionRow } from "../../lib/cms";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: { key: Viewport; Icon: typeof Monitor; label: string }[] = [
  { key: "desktop", Icon: Monitor, label: "كمبيوتر" },
  { key: "tablet", Icon: Tablet, label: "تابلت" },
  { key: "mobile", Icon: Smartphone, label: "موبايل" },
];

/**
 * A full canvas editor, closer to how Elementor feels than a form list.
 *
 * The page renders at full height and the admin clicks an element straight on
 * it. Properties open in a side panel, and the top bar carries the section
 * switcher, the viewport controls, and save or cancel.
 *
 * The canvas stays inside an iframe on purpose: the dashboard is a separate
 * React tree, so a crash in a page cannot take the editor down with it.
 */
export default function VisualEditor({
  route,
  sections,
  sectionKey,
  onSectionChange,
  draft,
  onDraftChange,
  onSave,
  onClose,
}: {
  route: string;
  sections: CmsSectionRow[];
  /** Section currently being edited, e.g. "hero". */
  sectionKey: string | null;
  onSectionChange: (key: string) => void;
  draft: CmsContent | null;
  onDraftChange: (draft: CmsContent | null) => void;
  onSave: (sectionId: string, content: CmsContent) => Promise<void>;
  onClose: () => void;
}) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = sections.find((row) => row.section_key === sectionKey);
  const dirty = draft !== null;

  // Changing section drops the in progress selection so nothing leaks across.
  useEffect(() => {
    setSelectedElement(null);
  }, [sectionKey]);

  const handleSave = useCallback(async () => {
    if (!active || !draft) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(active.id, draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر الحفظ.");
    } finally {
      setSaving(false);
    }
  }, [active, draft, onSave]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink-950">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0d111b] px-4 py-2.5">
        <button type="button" onClick={onClose} aria-label="إغلاق المحرر" className="admin-icon-button">
          <X className="h-4 w-4" />
        </button>

        <span className="text-[12.5px] font-extrabold text-white" dir="ltr">
          {route === "/" ? "Home" : route}
        </span>

        <div className="flex flex-1 flex-wrap items-center gap-1">
          {sections.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSectionChange(row.section_key)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                row.section_key === sectionKey
                  ? "bg-brand-500 text-white"
                  : "text-white/55 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              {row.name}
            </button>
          ))}
        </div>

        <span className="inline-flex rounded-lg border border-white/10 p-0.5">
          {VIEWPORTS.map(({ key, Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setViewport(key)}
              aria-label={label}
              aria-pressed={viewport === key}
              className={`rounded-md p-1.5 ${
                viewport === key ? "bg-brand-500 text-white" : "text-white/45"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </span>

        <button
          type="button"
          onClick={() => {
            onDraftChange(null);
            setSelectedElement(null);
          }}
          disabled={!dirty}
          className="admin-button-secondary disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          تراجع
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="admin-button-primary disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </header>

      {error && (
        <p role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] text-red-200">
          {error}
        </p>
      )}

      <Canvas
        route={route}
        active={active}
        viewport={viewport}
        draft={draft}
        dirty={dirty}
        sectionKey={sectionKey}
        selectedElement={selectedElement}
        onSelectElement={setSelectedElement}
        onDraftChange={onDraftChange}
      />
    </div>
  );
}

/** The page canvas plus the properties panel beside it. */
function Canvas({
  route,
  active,
  viewport,
  draft,
  dirty,
  sectionKey,
  selectedElement,
  onSelectElement,
  onDraftChange,
}: {
  route: string;
  active: CmsSectionRow | undefined;
  viewport: Viewport;
  draft: CmsContent | null;
  dirty: boolean;
  sectionKey: string | null;
  selectedElement: string | null;
  onSelectElement: (elementId: string | null) => void;
  onDraftChange: (draft: CmsContent | null) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1 overflow-auto bg-[#0a0d15] p-4">
        {active ? (
          <PagePreview
            route={route}
            viewport={viewport}
            sectionKey={active.section_key}
            draft={draft}
            onSelectElement={onSelectElement}
          />
        ) : (
          <p className="grid h-full place-items-center text-[12px] text-white/40">
            اختر قسم من الشريط العلوي.
          </p>
        )}
      </div>

      <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-white/10 bg-[#0d111b] p-4">
        {selectedElement && active ? (
          <ElementPanel
            elementKey={selectedElement.slice(active.section_key.length + 1)}
            draft={draft ?? (active.content as CmsContent) ?? {}}
            onChange={(key, value) => onDraftChange({ ...(draft ?? {}), [key]: value })}
          />
        ) : (
          <PanelHint dirty={dirty} hasSection={Boolean(sectionKey)} />
        )}
      </aside>
    </div>
  );
}

/** Shown before anything is selected, so the panel is never a blank box. */
function PanelHint({ dirty, hasSection }: { dirty: boolean; hasSection: boolean }) {
  return (
    <div className="space-y-3 text-right">
      <p className="text-[12px] font-bold text-white/70">لم يتم تحديد عنصر</p>
      <p className="text-[11px] leading-6 text-white/40">
        اضغط على أي نص أو زر أو صورة في الصفحة عشان تعدّلها من هنا. التعديلات
        تظهر على الصفحة فورًا، وما تتسجلش في قاعدة البيانات إلا لما تضغط حفظ.
      </p>
      {!hasSection && (
        <p className="text-[11px] leading-6 text-white/40">
          ابدأ باختيار قسم من الشريط العلوي.
        </p>
      )}
      {dirty && (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-[10.5px] leading-6 text-amber-200">
          عندك تعديلات في المتصفح بس. اضغط حفظ لتثبيتها، أو تراجع للرجوع
          للنسخة الأصلية.
        </p>
      )}
    </div>
  );
}