import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  API_ENABLED,
  loadContent,
  localContent,
  type Content,
  type LoadResult,
} from "../lib/api";
import { readStoredSettings, writeStoredSettings } from "../lib/admin";
import type { Service } from "../data/services";

type ContentState = Content & {
  /** مصدر البيانات الحالي */
  source: "database" | "local";
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const initialState: ContentState = {
  ...localContent,
  settings: { ...localContent.settings, ...readStoredSettings() },
  source: "local",
  loading: API_ENABLED,
  error: null,
  refresh: () => {},
};

const ContentContext = createContext<ContentState>(initialState);

export function ContentProvider({ children }: { children: ReactNode }) {
  // نبدأ دائماً بالبيانات المحلية حتى يظهر الموقع فوراً بدون شاشة تحميل،
  // ثم نستبدلها ببيانات قاعدة البيانات فور وصولها.
  const [data, setData] = useState<Content>({
    ...localContent,
    settings: { ...localContent.settings, ...readStoredSettings() },
  });
  const [source, setSource] = useState<"database" | "local">("local");
  const [loading, setLoading] = useState(API_ENABLED);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const syncSettings = () => {
      const nextSettings = { ...localContent.settings, ...readStoredSettings() };
      setData((prev) => ({ ...prev, settings: nextSettings }));
    };

    syncSettings();
    window.addEventListener("awexen-settings-updated", syncSettings);
    return () => window.removeEventListener("awexen-settings-updated", syncSettings);
  }, []);

  useEffect(() => {
    if (!API_ENABLED) return;

    let alive = true;
    setLoading(true);

    loadContent()
      .then((res: LoadResult) => {
        if (!alive) return;
        const { source: src, error: err, ...content } = res;
        const mergedSettings = {
          ...content.settings,
          ...readStoredSettings(),
        };
        setData({ ...content, settings: mergedSettings });
        setSource(src);
        setError(err);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [tick]);

  const value = useMemo<ContentState>(
    () => ({
      ...data,
      source,
      loading,
      error,
      refresh: () => setTick((t) => t + 1),
    }),
    [data, source, loading, error],
  );

  useEffect(() => {
    writeStoredSettings(data.settings);
  }, [data.settings]);

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}

/** الوصول لكل محتوى الموقع */
export function useContent() {
  return useContext(ContentContext);
}

/** الحصول على خدمة واحدة عبر الـ slug */
export function useService(slug?: string): Service | undefined {
  const { services } = useContent();
  return services.find((s) => s.slug === slug);
}
