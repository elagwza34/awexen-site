import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  BookOpenText,
  BriefcaseBusiness,
  CircleDollarSign,
  FilePlus2,
  GraduationCap,
  House,
  Inbox,
  Images,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Mail,
  MessageCircleQuestion,
  Send,
  Search,
  Settings,
  Sparkles,
  UserCog,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import QuoteInbox from "../admin/QuoteInbox";
import ResourceManager from "../admin/ResourceManager";
import KnowledgeManager from "../admin/KnowledgeManager";
import InboxManager from "../admin/InboxManager";
import OverviewPanel from "../admin/OverviewPanel";
import LmsManager from "../admin/LmsManager";
import LmsApprovals from "../admin/LmsApprovals";
import { PricingSettingsPanel, SiteSettingsPanel, UsersPanel } from "../admin/SettingsPanels";
import { resources } from "../admin/resourceDefinitions";
import type { AdminRole, SectionKey } from "../admin/types";
import { lmsApi } from "../lib/lmsApi";
import { supabase } from "../lib/supabase";
import { loadDashboardAccess } from "../lib/roleRouting";
import { clearAdminSessionDrafts, lockAdminSession } from "../lib/adminSession";
import { DashboardThemeToggle, useDashboardTheme } from "../context/DashboardThemeContext";

const allRoles: AdminRole[] = ["owner", "admin", "editor", "hr", "support"];
type AdminNotificationSummary = { course_reviews: number; course_requests: number };

const navItems: Array<{
  key: SectionKey;
  label: string;
  icon: typeof House;
  roles: AdminRole[];
  group: "عام" | "المحتوى" | "المبيعات" | "التوظيف والتدريب" | "المعرفة" | "النظام";
}> = [
  { key: "overview", label: "الرئيسية", icon: House, roles: allRoles, group: "عام" },
  { key: "messages", label: "رسائل التواصل", icon: Mail, roles: ["owner", "admin", "support"], group: "المبيعات" },
  { key: "quotes", label: "طلبات عرض السعر", icon: FileText, roles: ["owner", "admin", "support"], group: "المبيعات" },
  { key: "newsletter", label: "القائمة البريدية", icon: Send, roles: ["owner", "admin", "editor", "support"], group: "المبيعات" },
  { key: "clients", label: "إدارة العملاء", icon: UsersRound, roles: ["owner", "admin", "support"], group: "المبيعات" },
  { key: "pages", label: "الصفحات", icon: FilePlus2, roles: ["owner", "admin", "editor"], group: "المحتوى" },
  { key: "portfolio", label: "معرض الأعمال", icon: Images, roles: ["owner", "admin", "editor"], group: "المحتوى" },
  { key: "blog", label: "المدونة", icon: BookOpenText, roles: ["owner", "admin", "editor"], group: "المحتوى" },
  { key: "jobs", label: "الوظائف", icon: BriefcaseBusiness, roles: ["owner", "admin", "hr"], group: "التوظيف والتدريب" },
  { key: "applications", label: "طلبات التوظيف", icon: UserRoundCheck, roles: ["owner", "admin", "hr"], group: "التوظيف والتدريب" },
  { key: "courses", label: "الكورسات", icon: GraduationCap, roles: ["owner", "admin", "editor"], group: "التوظيف والتدريب" },
  { key: "lms", label: "محتوى منصة التعلّم", icon: LibraryBig, roles: ["owner", "admin", "editor"], group: "التوظيف والتدريب" },
  { key: "approvals", label: "موافقات LMS", icon: FileCheck2, roles: ["owner", "admin", "editor"], group: "التوظيف والتدريب" },
  { key: "enrollments", label: "طلبات الكورسات", icon: Inbox, roles: ["owner", "admin", "editor", "support"], group: "التوظيف والتدريب" },
  { key: "knowledge", label: "معرفة AI", icon: Sparkles, roles: ["owner", "admin", "editor"], group: "المعرفة" },
  { key: "inquiries", label: "أسئلة الزوار", icon: MessageCircleQuestion, roles: ["owner", "admin", "editor", "support"], group: "المعرفة" },
  { key: "pricing", label: "التسعير والتقسيط", icon: CircleDollarSign, roles: ["owner", "admin"], group: "النظام" },
  { key: "users", label: "المستخدمون", icon: UserCog, roles: ["owner", "admin"], group: "النظام" },
  { key: "settings", label: "إعدادات الموقع", icon: Settings, roles: ["owner", "admin"], group: "النظام" },
];

const groups = ["عام", "المبيعات", "المحتوى", "التوظيف والتدريب", "المعرفة", "النظام"] as const;

const applicationStatuses = [
  { label: "جديد", value: "new" }, { label: "قيد المراجعة", value: "reviewing" },
  { label: "قائمة مختصرة", value: "shortlisted" }, { label: "مقابلة", value: "interview" },
  { label: "مقبول", value: "accepted" }, { label: "مرفوض", value: "rejected" },
];

const inquiryStatuses = [
  { label: "جديد", value: "new" }, { label: "تمت الإجابة", value: "answered" },
  { label: "يحتاج مراجعة", value: "needs_review" }, { label: "مغلق", value: "closed" },
];

export default function AdminDashboard({ userId }: { userId: string }) {
  const { theme } = useDashboardTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [role, setRole] = useState<AdminRole>("admin");
  const [email, setEmail] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [navSearch, setNavSearch] = useState("");

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const access = await loadDashboardAccess(data.session);
        if (access.adminRole) setRole(access.adminRole);
      }
      setEmail(data.session?.user.email ?? "");
    }).catch(() => {}).finally(() => setSessionReady(true));
  }, []);

  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => lmsApi<AdminNotificationSummary>("admin/notification-summary/"),
    enabled: sessionReady && ["owner", "admin", "editor", "support"].includes(role),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const notificationCounts: Partial<Record<SectionKey, number>> = {
    approvals: notificationsQuery.data?.course_reviews ?? 0,
    enrollments: notificationsQuery.data?.course_requests ?? 0,
  };

  const visibleItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const filteredItems = useMemo(() => {
    const query = navSearch.trim().toLocaleLowerCase("ar");
    return query ? visibleItems.filter((item) => `${item.label} ${item.group}`.toLocaleLowerCase("ar").includes(query)) : visibleItems;
  }, [navSearch, visibleItems]);
  const visibleKeys = useMemo(() => new Set(visibleItems.map((item) => item.key)), [visibleItems]);
  const requestedSection = searchParams.get("section") as SectionKey | null;
  const active: SectionKey = requestedSection && visibleKeys.has(requestedSection) ? requestedSection : "overview";
  const safeGoTo = (section: SectionKey) => {
    const nextSection = visibleKeys.has(section) ? section : "overview";
    const nextParams = new URLSearchParams(searchParams);
    if (nextSection === "overview") nextParams.delete("section");
    else nextParams.set("section", nextSection);
    setSearchParams(nextParams);
  };
  const activeLabel = navItems.find((item) => item.key === active)?.label ?? "لوحة التحكم";

  const logout = async () => {
    lockAdminSession();
    clearAdminSessionDrafts();
    try {
      await supabase?.auth.signOut({ scope: "local" });
    } finally {
      window.location.replace("/awexen");
    }
  };

  return (
    <section dir="rtl" className={`admin-shell dashboard-${theme} min-h-screen bg-[#080b12] text-white`}>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080b12]/95 backdrop-blur-xl">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300"><LayoutDashboard className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[11.5px] font-extrabold">Awexen Admin</p><p className="truncate text-[9px] text-white/35">{activeLabel}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <DashboardThemeToggle />
            <a href="/" target="_blank" rel="noreferrer" className="admin-button-secondary hidden sm:inline-flex">عرض الموقع</a>
            <span className="hidden max-w-44 truncate text-[9.5px] text-white/35 lg:block" dir="ltr">{email}</span>
            <span className="rounded-full border border-brand-500/20 bg-brand-500/[0.06] px-2.5 py-1 text-[9px] font-bold text-brand-200">{role}</span>
            <button type="button" onClick={() => void logout()} className="admin-icon-button text-red-300" aria-label="تسجيل الخروج"><LogOut className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </header>

      <div className="grid w-full gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-5">
        <aside className="h-fit rounded-xl border border-white/[0.07] bg-white/[0.018] p-2 lg:sticky lg:top-[72px]">
          <label className="relative mb-3 hidden lg:block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input value={navSearch} onChange={(event) => setNavSearch(event.target.value)} placeholder="ابحث في الأقسام" aria-label="البحث في أقسام لوحة التحكم" className="admin-input pr-9" />
          </label>
          <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-4" aria-label="أقسام لوحة التحكم">
            {groups.map((group) => {
              const items = filteredItems.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="shrink-0 lg:shrink lg:space-y-1">
                  <p className="hidden px-2 pb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/25 lg:block">{group}</p>
                  <div className="flex gap-1 lg:block lg:space-y-0.5">
                    {items.map(({ key, label, icon: Icon }) => {
                      const notificationCount = notificationCounts[key] ?? 0;
                      const isActive = active === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => safeGoTo(key)}
                          aria-current={isActive ? "page" : undefined}
                          title={label}
                          className={`group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[10.5px] font-bold transition-all duration-200 lg:w-full ${
                            isActive
                              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                              : "text-white/55 hover:bg-white/[0.07] hover:text-white hover:shadow-sm"
                          }`}
                          aria-label={notificationCount > 0 ? `${label}: ${notificationCount} إشعار جديد` : label}
                        >
                          {/* علامة الصفحة الحالية: شريط جانبي + توهّج */}
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-y-1.5 -right-px w-[3px] rounded-full bg-brand-400 transition-all duration-200 ${
                              isActive ? "opacity-100 shadow-[0_0_10px_2px] shadow-brand-400/60" : "opacity-0 group-hover:opacity-40"
                            }`}
                          />
                          <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
                          <span className="truncate">{label}</span>
                          {notificationCount > 0 && (
                            <span className={`mr-auto grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[8px] font-black leading-none ${isActive ? "bg-white text-brand-600" : "bg-brand-500 text-white shadow-md shadow-brand-500/20"}`}>
                              {notificationCount > 99 ? "99+" : notificationCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0d111b] p-4 sm:p-5">
          {active === "overview" && <OverviewPanel role={role} goTo={safeGoTo} />}
          {active === "portfolio" && <ResourceManager definition={resources.portfolio} draftOwnerId={userId} />}
          {active === "pages" && <ResourceManager definition={resources.pages} draftOwnerId={userId} />}
          {active === "blog" && <ResourceManager definition={resources.blog} draftOwnerId={userId} />}
          {active === "jobs" && <ResourceManager definition={resources.jobs} draftOwnerId={userId} />}
          {active === "courses" && <ResourceManager definition={resources.courses} draftOwnerId={userId} />}
          {active === "lms" && <LmsManager role={role} />}
          {active === "approvals" && <LmsApprovals role={role} view="courses" />}
          {active === "clients" && <ResourceManager definition={resources.clients} draftOwnerId={userId} />}
          {active === "knowledge" && <KnowledgeManager userId={userId} />}

          {active === "messages" && (
            <InboxManager table="contact_messages" title="رسائل التواصل" description="طلبات الخدمات وعروض الأسعار الواردة من صفحة التواصل." titleKey="name" previewKeys={["service", "budget"]} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "phone", label: "الهاتف", kind: "phone" },
              { key: "service", label: "الخدمة" }, { key: "budget", label: "الميزانية" }, { key: "message", label: "الرسالة", wide: true },
            ]} />
          )}
          {active === "quotes" && <QuoteInbox />}
          {active === "newsletter" && (
            <InboxManager table="newsletter_subscribers" title="القائمة البريدية" description="عناوين البريد المسجلة من نموذج النشرة الأسبوعية في الموقع." titleKey="email" previewKeys={["source"]} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "source", label: "مصدر الاشتراك" },
            ]} />
          )}
          {active === "applications" && (
            <InboxManager table="job_applications" title="طلبات التوظيف" description="راجع الخبرات والمهارات والروابط، ثم حدّث حالة كل متقدم." statusOptions={applicationStatuses} titleKey="name" previewKeys={["location", "years_experience"]} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "phone", label: "الهاتف", kind: "phone" },
              { key: "location", label: "المكان" }, { key: "years_experience", label: "سنوات الخبرة" }, { key: "skills", label: "المهارات", wide: true },
              { key: "portfolio_url", label: "Portfolio", kind: "url" }, { key: "linkedin_url", label: "LinkedIn", kind: "url" }, { key: "cv_url", label: "السيرة الذاتية", kind: "url" },
              { key: "cover_note", label: "نبذة المتقدم", wide: true }, { key: "admin_notes", label: "ملاحظات الإدارة", wide: true },
            ]} />
          )}
          {active === "enrollments" && <LmsApprovals role={role} view="payments" />}
          {active === "inquiries" && (
            <InboxManager table="ai_inquiries" title="أسئلة قاعدة المعرفة" description="راقب الأسئلة التي وجدت إجابة، ووسّع المعرفة للأسئلة التي تحتاج مراجعة." statusOptions={inquiryStatuses} titleKey="question" previewKeys={["email"]} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "question", label: "السؤال", wide: true }, { key: "answer", label: "الإجابة المستخدمة", wide: true },
            ]} />
          )}

          {active === "pricing" && <PricingSettingsPanel />}
          {active === "users" && <UsersPanel />}
          {active === "settings" && <SiteSettingsPanel />}
        </main>
      </div>
    </section>
  );
}
