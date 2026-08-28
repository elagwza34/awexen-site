import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { localContent, type Content } from "../lib/api";
import { readStoredSettings, writeStoredSettings } from "../lib/admin";
import type { Service } from "../data/services";
import { supabase } from "../lib/supabase";

type ContentState = Content & {
  /** مصدر البيانات الحالي */
  source: "supabase" | "local";
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const initialState: ContentState = {
  ...localContent,
  settings: { ...localContent.settings, ...readStoredSettings() },
  source: "local",
  loading: false,
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
  const [source, setSource] = useState<"supabase" | "local">("local");
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const syncSettings = () => {
      const nextSettings = { ...localContent.settings, ...readStoredSettings() };
      setData((prev) => ({ ...prev, settings: nextSettings }));

      if (supabase) {
        void supabase
          .from("site_settings")
          .select("name,brand_ar,tagline,description,address,email,phones,hours")
          .eq("id", 1)
          .maybeSingle()
          .then(({ data: remote }) => {
            if (!remote) return;
            setSource("supabase");
            setData((prev) => ({
              ...prev,
              settings: {
                ...prev.settings,
                name: remote.name,
                brandAr: remote.brand_ar,
                tagline: remote.tagline,
                description: remote.description,
                address: remote.address,
                email: remote.email,
                phones: remote.phones,
                hours: remote.hours,
              },
            }));
          });
      }
    };

    syncSettings();
    window.addEventListener("awexen-settings-updated", syncSettings);
    return () => window.removeEventListener("awexen-settings-updated", syncSettings);
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
