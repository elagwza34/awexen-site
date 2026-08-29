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
    const syncContent = () => {
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

        void supabase
          .from("portfolio_projects")
          .select("id,slug,title_ar,title_en,description_ar,description_en,category_ar,category_en,client_name_ar,client_name_en,image_url,project_url,technologies,completed_at,accent,sort_order")
          .eq("status", "published")
          .order("sort_order", { ascending: true })
          .then(({ data: remoteProjects, error: projectsError }) => {
            if (projectsError || !remoteProjects) return;
            setSource("supabase");
            setData((prev) => ({
              ...prev,
              projects: remoteProjects.map((project) => ({
                id: String(project.id),
                slug: String(project.slug),
                title: String(project.title_ar ?? ""),
                titleEn: String(project.title_en ?? ""),
                desc: String(project.description_ar ?? ""),
                descEn: String(project.description_en ?? ""),
                tag: String(project.category_ar ?? ""),
                tagEn: String(project.category_en ?? ""),
                image: String(project.image_url ?? ""),
                site: String(project.project_url ?? ""),
                accent: String(project.accent ?? "from-orange-500/80 to-amber-600/80"),
                client: String(project.client_name_ar ?? ""),
                clientEn: String(project.client_name_en ?? ""),
                technologies: String(project.technologies ?? ""),
                completedAt: String(project.completed_at ?? ""),
              })),
            }));
          });
      }
    };

    syncContent();
    window.addEventListener("awexen-settings-updated", syncContent);
    window.addEventListener("awexen-content-updated", syncContent);
    return () => {
      window.removeEventListener("awexen-settings-updated", syncContent);
      window.removeEventListener("awexen-content-updated", syncContent);
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
