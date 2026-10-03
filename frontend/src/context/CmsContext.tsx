import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { loadPageSections, type CmsSectionRow } from "../lib/cms";
import { useLanguage } from "./LanguageContext";
import { readButtons, readImage, readLinks, readLocalized, readText } from "../cms/types";
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
      setDraft({ [data.sectionKey]: data.draft[data.sectionKey] ?? data.draft });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const value = useMemo<CmsState>(
    () => ({ sections, order, loading, error, draft, setDraft }),
    [sections, order, loading, error, draft],
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
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