import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Check,
  Globe,
  House,
  LayoutDashboard,
  Link2,
  Lock,
  LogOut,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { Reveal } from "../components/ui";
import { useContent } from "../context/ContentContext";
import {
  defaultAdminSettings,
  readStoredSettings,
  writeStoredSettings,
} from "../lib/admin";
import { logoutAdmin } from "../lib/auth";

type SectionKey = "general" | "seo" | "tracking" | "integrations" | "pages";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { settings } = useContent();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionKey>("general");
  const [form, setForm] = useState(() => ({
    ...defaultAdminSettings,
    ...settings,
    ...readStoredSettings(),
  }));

  const cards = useMemo(
    () => [
      { label: "عنوان الموقع", value: form.name || "awexen.com" },
      { label: "البريد", value: form.email || "info@awexen.com" },
      { label: "Google Analytics", value: form.analyticsId ? "مفعّل" : "غير مفعّل" },
      { label: "Meta Pixel", value: form.metaPixelId ? "مفعّل" : "غير مفعّل" },
    ],
    [form],
  );

  const navItems = [
    { key: "general", label: "الإعدادات العامة", icon: Settings },
    { key: "seo", label: "SEO وظهور الموقع", icon: Search },
    { key: "tracking", label: "التحليلات والتتبع", icon: BarChart3 },
    { key: "integrations", label: "التكاملات", icon: Link2 },
    { key: "pages", label: "إدارة الصفحات", icon: LayoutDashboard },
  ] as const;

  const handleChange = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const saveSettings = () => {
    const payload = {
      name: form.name,
      brandAr: form.brandAr,
      tagline: form.tagline,
      description: form.description,
      address: form.address,
      email: form.email,
      phones: form.phones,
      hours: form.hours,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      facebook: form.facebook,
      primaryColor: form.primaryColor,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      canonicalUrl: form.canonicalUrl,
      analyticsId: form.analyticsId,
      metaPixelId: form.metaPixelId,
      googleTagId: form.googleTagId,
      customHead: form.customHead,
    };

    writeStoredSettings(payload);
    window.dispatchEvent(new Event("awexen-settings-updated"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const logout = () => {
    logoutAdmin();
    navigate("/login");
  };

  return (
    <section className="bg-ink-950 py-8 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.28em] text-brand-300">
                  WordPress-style Admin
                </p>
                <h1 className="text-[28px] font-black">لوحة التحكم</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[13px] text-white/80">
                <span className="font-bold text-brand-300">الحالة:</span> مباشر
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[13px] font-bold text-red-200 transition hover:bg-red-500/15"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[260px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-500/10 p-3 text-brand-100">
              <House className="h-5 w-5" />
              <span className="font-bold">مركز التحكم</span>
            </div>

            <nav className="space-y-2">
              {navItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-[14px] font-bold transition ${
                    activeTab === key
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                      : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-8 rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4 text-[13px] leading-7 text-brand-100">
              <div className="mb-2 flex items-center gap-2 font-bold text-white">
                <ShieldCheck className="h-4 w-4" />
                حالة الأمان
              </div>
              الوصول محمي محلياً بواسطة جلسة إدارية داخل الموقع.
            </div>
          </aside>

          <main className="space-y-8">
            <Reveal>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/55">
                      {card.label}
                    </p>
                    <p className="mt-3 text-[20px] font-extrabold text-white">{card.value}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
                {activeTab === "general" && (
                  <div className="space-y-6">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-300">
                        <Settings className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-[22px] font-extrabold">تكوين الموقع الأساسي</h2>
                        <p className="text-[13px] text-white/60">إدارة اسم الموقع، العنوان، التواصل، والهوية</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        اسم الموقع
                        <input value={form.name} onChange={handleChange("name")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        الاسم بالعربي
                        <input value={form.brandAr} onChange={handleChange("brandAr")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        السطر التعريفي
                        <input value={form.tagline} onChange={handleChange("tagline")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        وصف الموقع
                        <textarea value={form.description} onChange={handleChange("description")} rows={4} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        العنوان
                        <input value={form.address} onChange={handleChange("address")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        البريد الإلكتروني
                        <input value={form.email} onChange={handleChange("email")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        الهاتف
                        <input value={form.phones} onChange={handleChange("phones")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        ساعات العمل
                        <input value={form.hours} onChange={handleChange("hours")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "seo" && (
                  <div className="space-y-6">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
                        <Search className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-[22px] font-extrabold">SEO والظهور في البحث</h2>
                        <p className="text-[13px] text-white/60">تحكم في عنوان الموقع، الوصف، والـ canonical</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        عنوان الصفحة الرئيسي
                        <input value={form.seoTitle} onChange={handleChange("seoTitle")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        وصف الـ Meta
                        <textarea value={form.seoDescription} onChange={handleChange("seoDescription")} rows={3} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        Canonical URL
                        <input value={form.canonicalUrl} onChange={handleChange("canonicalUrl")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "tracking" && (
                  <div className="space-y-6">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                        <BarChart3 className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-[22px] font-extrabold">التحليلات والتتبع</h2>
                        <p className="text-[13px] text-white/60">تفعيل Google Analytics وGTM وMeta Pixel</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        Google Analytics ID
                        <input value={form.analyticsId} onChange={handleChange("analyticsId")} placeholder="G-XXXXXXXXXX" className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        Google Tag Manager ID
                        <input value={form.googleTagId} onChange={handleChange("googleTagId")} placeholder="GTM-XXXXXXX" className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75 md:col-span-2">
                        Meta Pixel ID
                        <input value={form.metaPixelId} onChange={handleChange("metaPixelId")} placeholder="123456789012345" className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "integrations" && (
                  <div className="space-y-6">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">
                        <Link2 className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-[22px] font-extrabold">التكاملات الخارجية</h2>
                        <p className="text-[13px] text-white/60">واتساب، إنستغرام، فيسبوك، وألوان الهوية</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        WhatsApp
                        <input value={form.whatsapp} onChange={handleChange("whatsapp")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        Instagram
                        <input value={form.instagram} onChange={handleChange("instagram")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        Facebook
                        <input value={form.facebook} onChange={handleChange("facebook")} className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500" />
                      </label>

                      <label className="space-y-2 text-[13px] font-bold text-white/75">
                        اللون الأساسي
                        <input type="color" value={form.primaryColor || "#6d5efc"} onChange={handleChange("primaryColor")} className="h-[52px] w-full cursor-pointer rounded-xl border border-white/10 bg-ink-900/60 px-2 py-2" />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === "pages" && (
                  <div className="space-y-6">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-[22px] font-extrabold">إدارة الصفحات والواجهات</h2>
                        <p className="text-[13px] text-white/60">محتوى الموقع، الصفحات القانونية، وأقسام الصفحة الرئيسية</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-white">
                          <Target className="h-4 w-4 text-brand-300" />
                          الصفحة الرئيسية
                        </div>
                        <p className="text-[13px] leading-7 text-white/65">
                          هيدر، خدمات، أعمال، شهادات، CTA، وآخر الأخبار يمكن إدارتها من هنا في مرحلة لاحقة.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-white">
                          <Globe className="h-4 w-4 text-brand-300" />
                          الصفحات القانونية
                        </div>
                        <p className="text-[13px] leading-7 text-white/65">
                          سياسة الخصوصية، الشروط، وربط الصفحات الدائمة سيتم إدارته من نفس لوحة التحكم.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-white">
                          <UserCheck className="h-4 w-4 text-brand-300" />
                          إعدادات العملاء
                        </div>
                        <p className="text-[13px] leading-7 text-white/65">
                          إدارة Leads، رسائل التواصل، وعرض بيانات العملاء في لوحة واجهة إدارة تركّز على العمليات.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-ink-900/50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-white">
                          <Lock className="h-4 w-4 text-brand-300" />
                          الصلاحيات
                        </div>
                        <p className="text-[13px] leading-7 text-white/65">
                          في النسخة الإنتاجية يمكن ربط نظام صلاحيات متعدد المستخدمين مثل WordPress.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-[12px] uppercase tracking-[0.2em] text-white/45">
                    Panel v1.0
                  </div>

                  <button
                    type="button"
                    onClick={saveSettings}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[14px] font-bold text-white transition hover:bg-brand-400"
                  >
                    <Save className="h-4 w-4" />
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </Reveal>
          </main>
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-3 rounded-2xl bg-emerald-500 px-5 py-3 text-[14px] font-bold text-white shadow-lg shadow-emerald-500/30">
          <Check className="h-4 w-4" />
          تم حفظ الإعدادات بنجاح
        </div>
      )}
    </section>
  );
}
