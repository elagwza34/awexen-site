import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import {
  loadCmsPages,
  loadPageSections,
  reorderSection,
  saveSection,
  type CmsPageRow,
  type CmsSectionRow,
} from "../../lib/cms";
import { getSectionSchema } from "../../cms/sectionSchemas";
import type { CmsContent } from "../../cms/types";
import SectionEditor from "./SectionEditor";
import PagePreview from "./PagePreview";

/**
 * حاجز أخطاء حوالين لوحة الـ CMS.
 *
 * من غيره، أي exception وقت رسم المحرر بيرمي شجرة React كلها، والمتصفح
 * بيرسم الصفحة من الأول — وده كان بيبان للمستخدم كأنه "الصفحة حملت تاني"
 * بدل ما يشوف رسالة الخطأ. هنا بنعرض السبب الحقيقي ونسمّح بإعادة المحاولة.
 */
class CmsErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[cms] render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="space-y-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-right">
        <p className="text-[13px] font-black text-red-200">تعذر فتح محرّر القسم.</p>
        <p className="text-[11px] leading-6 text-red-200/70">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="admin-button-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          إعادة المحاولة
        </button>
      </div>
    );
  }
}

/**
 * لوحة محتوى الموقع: صفحات ← أقسام ← محرر.
 * بتقرأ من page_sections وبتحفظ في نفس الجدول، والصفحة العامة بتتحدث
 * فورًا لأن الحفظ بيبطل الكاش وبيبعت حدث إعادة جلب.
 */
export default function CmsPanel() {
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [pageId, setPageId] = useState("");
  const [sections, setSections] = useState<CmsSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [draft, setDraft] = useState<CmsContent | null>(null);

  const loadPages = useCallback(async () => {
    try {
      const rows = await loadCmsPages();
      setPages(rows);
      setPageId((current) => current || rows[0]?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الصفحات.");
    }
  }, []);

  useEffect(() => {
    void loadPages().finally(() => setLoading(false));
  }, [loadPages]);

  const loadSections = useCallback(async () => {
    if (!pageId) return;
    const rows = await loadPageSections(pageId, { includeHidden: true });
    setSections(rows);
  }, [pageId]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const toggleVisibility = async (row: CmsSectionRow) => {
    await saveSection({ id: row.id, isVisible: !row.is_visible });
    await loadSections();
  };

  const move = async (row: CmsSectionRow, direction: "up" | "down") => {
    await reorderSection(row.id, direction);
    await loadSections();
  };

  const route = useMemo(() => {
    const slug = pages.find((p) => p.id === pageId)?.slug;
    return slug === "home" ? "/" : `/${slug ?? ""}`;
  }, [pages, pageId]);

  if (loading) {
    return (
      <div className="grid min-h-36 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-white">محتوى الموقع</h2>
          <p className="mt-0.5 text-[11px] text-white/45">
            عدّل نصوص وأزرار وصور الأقسام، والحفظ بيظهر فورًا على الموقع.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadPages();
            void loadSections();
          }}
          className="admin-button-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" />تحديث
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/8 p-2.5 text-[11px] text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <aside className="space-y-1">
          <p className="px-1 text-[10px] font-bold text-white/35">الصفحات</p>
          {pages.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setPageId(row.id);
                setEditing(null);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-right text-[12px] font-bold transition ${
                pageId === row.id
                  ? "border-brand-500/40 bg-brand-500/10 text-white"
                  : "border-white/8 text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{row.title}</span>
              <span className="shrink-0 text-[9.5px] text-white/35">{row.slug}</span>
            </button>
          ))}
        </aside>

        <div className="min-w-0 space-y-3">
          {sections.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[12px] text-white/40">
              مفيش أقسام لهذه الصفحة لسه.
            </p>
          )}

          {sections.map((row, index) => {
            const schema = getSectionSchema(row.section_key);
            const isEditing = editing === row.id;
            const isExpanded = expanded === row.id;
            const title = (row.content as CmsContent)?.title;
            const preview =
              title && typeof title === "object" && "ar" in title
                ? title.ar
                : typeof title === "string"
                  ? title
                  : "";

            return (
              <div key={row.id} className="rounded-xl border border-white/8 bg-white/[0.02]">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : row.id)}
                    aria-expanded={isExpanded}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/30" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
                    )}
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className={`truncate text-[12.5px] font-bold ${row.is_visible ? "text-white" : "text-white/40"}`}>
                          {schema?.label.ar ?? row.name ?? row.section_key}
                        </span>
                        {!row.is_visible && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/45">مخفي</span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/35">
                        {preview || schema?.description?.ar || row.section_key}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void move(row, "up")}
                      disabled={index === 0}
                      aria-label="تحريك لأعلى"
                      className="admin-icon-button"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(row, "down")}
                      disabled={index === sections.length - 1}
                      aria-label="تحريك لأسفل"
                      className="admin-icon-button"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleVisibility(row)}
                      aria-label={row.is_visible ? "إخفاء" : "إظهار"}
                      className="admin-icon-button"
                    >
                      {row.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(isEditing ? null : row.id)}
                      className="admin-button-secondary"
                    >
                      {isEditing ? "إغلاق" : "تعديل"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <p className="border-t border-white/8 px-3 py-2 text-[10.5px] text-white/40">
                    {schema?.description?.ar} — آخر تعديل:{" "}
                    {row.updated_at
                      ? new Date(row.updated_at).toLocaleString("ar-EG", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </p>
                )}

                {isEditing && (
                  <div className="border-t border-white/8 p-4">
                    <CmsErrorBoundary>
                    <SectionEditor
                      sectionKey={row.section_key}
                      initial={(row.content as CmsContent) ?? {}}
                      onDraft={setDraft}
                      onCancel={() => setEditing(null)}
                      onSave={async (content) => {
                        await saveSection({ id: row.id, content: content as Record<string, unknown> });
                        setDraft(null);
                        setEditing(null);
                        await loadSections();
                      }}
                    />

                    <div className="mt-5 border-t border-white/8 pt-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-[10.5px] font-bold text-white/55">معاينة</span>
                        <span className="ml-auto inline-flex rounded-lg border border-white/10 p-0.5">
                          {([
                            ["desktop", Monitor],
                            ["tablet", Tablet],
                            ["mobile", Smartphone],
                          ] as const).map(([code, Icon]) => (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setViewport(code)}
                              aria-label={code}
                              aria-pressed={viewport === code}
                              className={`rounded-md p-1.5 ${
                                viewport === code ? "bg-brand-500 text-white" : "text-white/45"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </span>
                      </div>
                      <PagePreview
                        route={route}
                        viewport={viewport}
                        sectionKey={row.section_key}
                        draft={draft}
                      />
                    </div>
                    </CmsErrorBoundary>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}