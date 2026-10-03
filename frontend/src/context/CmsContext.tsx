import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
}
 from "react";
import { supabase } from "../lib/supabase";
import { loadPageSections, type CmsSectionRow } from "../lib/cms";
import { useLanguage } from "./LanguageContext";
import {
  readButtons,
  readImage,
  readLinks,
  readLocalized,
  readStyle,
  readText,
} from "../cms/types";
import { buildElementStyle } from "../cms/style";
import type { CmsButton, CmsContent, CmsImage, CmsLang, CmsLinkItem, LocalizedText } from "../cms/types";

/**
 * محتوى قسم واحد بعد الدمج: قيم الـ CMS لو موجودة، والترجمة المارد
 * لو الحقل لسه فاضي. الـ components بتاخد من هنا مباشرةً.
 */
export type SectionContent = {
  /** الحقل موجود في قاعدة البيانات؟ */
  has: (key: string) => boolean;
  text: (key: string, fallback?: string) => string;
  /** تاريخ/وقت لو CMS فيه، للـ preview والتشخيص. */
  fromCms: boolean;
};

type CmsState = {
  sections: Record<string, CmsContent>;
  order: string[];
  loading: boolean;
  error: string | null;
  /** بيانات المعاينة قبل الحفظ — تاخد الأولوية على أي حاجة تانية. */
  draft: Record<string, CmsContent> | null;
  setDraft: (draft: Record<string, CmsContent> | null) => void;
};

const emptyState: CmsState = {
  sections: {},
  order: [],
  loading: false,
  error: null,
  draft: null,
  setDraft: () => {},
};

const CmsContext = createContext<CmsState>(emptyState);

/* ------------------------------------------------------------------ */
/* وضع التحرير: بيتشال جوه الـiframe دلوقتي                             */
/* ------------------------------------------------------------------ */

/**
 * بيتحط `true` غير جوه الـpreview بتاع الـCMS.
 *
 * دي الحيلة اللي بتضمن إن طبقة التحرير **مالهاش أي أثر على الموقع العام**:
 * لو الـflag false، الـCmsEditable بيرسم children زي ما هما بالظبط
 * من غير outline ولا listeners ولا أي class زيادة.
 */
const CmsEditingContext = createContext(false);

export const CmsEditingProvider = CmsEditingContext.Provider;

/** بيتقرأ جوه الـiframe عشان يقرر يرسم طبقة الاختيار ولا لا. */
export const useCmsEditing = () => useContext(CmsEditingContext);

export function CmsSectionsProvider({
  pageSlug,
  children,
}: {
  pageSlug: string;
  children: ReactNode;
}) {
  const [sections, setSections] = useState<Record<string, CmsContent>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, CmsContent> | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const rows: CmsSectionRow[] = await loadPageSections(pageSlug);
        if (!active) return;
        const map: Record<string, CmsContent> = {};
        rows.forEach((row) => {
          map[row.section_key] = row.content as CmsContent;
        });
        setSections(map);
        setOrder(rows.map((row) => row.section_key));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الأقسام.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const onChange = () => void load();
    window.addEventListener("awexen-content-updated", onChange);
    return () => {
      active = false;
      window.removeEventListener("awexen-content-updated", onChange);
    };
  }, [pageSlug]);

  useEffect(() => {
    // handshake: بنبلّغ الداشبورد إننا اتحمّلنا ومستعدين نستقبل المسودّة.
    // من غير الرسالة دي، أي تعديل بيحصل قبل ما الـiframe يخلّص تحميله بضيء.
    if (!window.parent || window.parent === window) return;
    window.parent.postMessage(
      { type: "awexen:cms-preview-ready" },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    // معاينة الـ CMS بتبعت مسودّة عن طريق postMessage جوه الـ iframe،
    // فبنسمعها هنا ونحطها فوق البيانات المحفوظة قبل الرسم.
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; sectionKey?: string; draft?: Record<string, CmsContent> | null };
      if (data?.type !== "awexen:cms-preview") return;
      if (!data.draft || !data.sectionKey) {
        setDraft(null);
        return;
      }
      // المسودّة جاية جاهزة بمفتاح القسم. الكود القديم كان بيعيد لفّها
      // فتصير {hero: {hero: ...}}، والتعديلات بتضيع في التداخل ده.
      const section = data.draft[data.sectionKey];
      setDraft(section === undefined ? null : { [data.sectionKey]: section });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const value = useMemo<CmsState>(
    () => ({ sections, order, loading, error, draft, setDraft }),
    [sections, order, loading, error, draft],
  );

  /**
   * وضع التحرير بيتشال غير جوه الـpreview.
   *
   * الـiframe بيفتح الصفحة بـ`?cmsPreview=1`، فده الـmarker. من غيره
   * (الموقع العام) الـflag بيبقى false والـCmsEditable بيرسم children
   * زي ما هما — صفر تأثير على الموقع الحقيقي.
   */
  const editing = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("cmsPreview") === "1";
  }, []);

  return (
    <CmsEditingProvider value={editing}>
      <CmsContext.Provider value={value}>{children}</CmsContext.Provider>
    </CmsEditingProvider>
  );
}

export function useCmsState() {
  return useContext(CmsContext);
}

/**
 * الخطّاف الأساسي للأقسام: بيرجّع الحقل من الـ CMS لو موجود،
 * وإلا بيرجّع النص اللي الأداري مرره كـ fallback (الترجمة المارد).
 */
export function useSection(key: string): SectionContent {
  const { sections, draft } = useCmsState();
  const { lang } = useLanguage();
  const content = draft?.[key] ?? sections[key];

  return useMemo<SectionContent>(() => {
    const has = (fieldKey: string) => Boolean(content?.[fieldKey]);
    return {
      has,
      text: (fieldKey, fallback) => readText(content, fieldKey, lang as CmsLang, fallback),
      fromCms: Boolean(content && Object.keys(content).length > 0),
    };
  }, [content, lang]);
}

/** يقرأ كائن بلغة معيّنة — أدق للـ alt والـ links. */
export function useLocalized(key: string, fieldKey: string, fallback: LocalizedText = { ar: "", en: "" }): LocalizedText {
  const { sections, draft } = useCmsState();
  const content = draft?.[key] ?? sections[key];
  return useMemo(() => {
    const stored = readLocalized(content?.[fieldKey]);
    return { ar: stored.ar || fallback.ar, en: stored.en || fallback.en };
  }, [content, fieldKey, fallback.ar, fallback.en]);
}

export function useSectionImage(key: string, fieldKey: string): CmsImage {
  const { sections, draft } = useCmsState();
  const content = draft?.[key] ?? sections[key];
  return useMemo(() => readImage(content?.[fieldKey]), [content, fieldKey]);
}

export function useSectionButtons(key: string, fieldKey = "buttons"): CmsButton[] {
  const { sections, draft } = useCmsState();
  const content = draft?.[key] ?? sections[key];
  return useMemo(() => readButtons(content?.[fieldKey]), [content, fieldKey]);
}
export function useSectionLinks(key: string, fieldKey = "links"): CmsLinkItem[] {
  const { sections, draft } = useCmsState();
  const content = draft?.[key] ?? sections[key];
  return useMemo(() => readLinks(content?.[fieldKey]), [content, fieldKey]);
}

/* ------------------------------------------------------------------ */
/* Visual hooks: binding a real element to the CMS                      */
/* ------------------------------------------------------------------ */

/**
 * Reads the stored style for one element.
 *
 * The style lives inside the same content JSONB under `element__style`, so no
 * new table and no migration are needed. When nothing was changed it returns
 * undefined, and the site renders exactly as before.
 */
export function useElementStyle(section: string, element: string) {
  const { sections, draft } = useCmsState();
  const content = draft?.[section] ?? sections[section];
  return useMemo(() => readStyle(content?.[`${element}__style`]), [content, element]);
}

/** The style as ready-to-spread CSSProperties. */
export function useCmsStyle(section: string, element: string) {
  const style = useElementStyle(section, element);
  return useMemo(() => buildElementStyle(style).inline, [style]);
}

/** CSS variables for the element, injected into the preview. */
export function useElementVars(section: string, element: string) {
  const style = useElementStyle(section, element);
  return useMemo(() => buildElementStyle(style).vars, [style]);
}

/** Reads an element text with a fallback, same as cms.text but explicit. */
export function useCmsText(section: string, element: string, fallback = "") {
  const { sections, draft } = useCmsState();
  const { lang } = useLanguage();
  const content = draft?.[section] ?? sections[section];
  return useMemo(
    () => readText(content, element, lang as CmsLang, fallback),
    [content, element, lang, fallback],
  );
}
