import { useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  BriefcaseBusiness,
  CircleDollarSign,
  FilePlus2,
  GraduationCap,
  House,
  Inbox,
  FileCheck2,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Mail,
  MessageCircleQuestion,
  Send,
  Settings,
  Sparkles,
  UserCog,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import ResourceManager from "../admin/ResourceManager";
import KnowledgeManager from "../admin/KnowledgeManager";
import InboxManager from "../admin/InboxManager";
import OverviewPanel from "../admin/OverviewPanel";
import LmsManager from "../admin/LmsManager";
import LmsApprovals from "../admin/LmsApprovals";
import { PricingSettingsPanel, SiteSettingsPanel, UsersPanel } from "../admin/SettingsPanels";
import { resources } from "../admin/resourceDefinitions";
import type { AdminRole, SectionKey } from "../admin/types";
import { supabase } from "../lib/supabase";

const allRoles: AdminRole[] = ["owner", "admin", "editor", "hr", "support"];

const navItems: Array<{
  key: SectionKey;
  label: string;
  icon: typeof House;
  roles: AdminRole[];
  group: "عام" | "المحتوى" | "المبيعات" | "التوظيف والتدريب" | "المعرفة" | "النظام";
}> = [
  { key: "overview", label: "الرئيسية", icon: House, roles: allRoles, group: "عام" },
  { key: "messages", label: "رسائل التواصل", icon: Mail, roles: ["owner", "admin", "support"], group: "المبيعات" },
  { key: "newsletter", label: "القائمة البريدية", icon: Send, roles: ["owner", "admin", "editor", "support"], group: "المبيعات" },
  { key: "clients", label: "إدارة العملاء", icon: UsersRound, roles: ["owner", "admin", "support"], group: "المبيعات" },
  { key: "pages", label: "الصفحات", icon: FilePlus2, roles: ["owner", "admin", "editor"], group: "المحتوى" },
  { key: "blog", label: "المدونة", icon: BookOpenText, roles: ["owner", "admin", "editor"], group: "المحتوى" },
  { key: "jobs", label: "الوظائف", icon: BriefcaseBusiness, roles: ["owner", "admin", "hr"], group: "التوظيف والتدريب" },
  { key: "applications", label: "طلبات التوظيف", icon: UserRoundCheck, roles: ["owner", "admin", "hr"], group: "التوظيف والتدريب" },
  { key: "courses", label: "الكورسات", icon: GraduationCap, roles: ["owner", "admin", "editor"], group: "التوظيف والتدريب" },
  { key: "lms", label: "محتوى منصة التعلّم", icon: LibraryBig, roles: ["owner", "admin", "editor"], group: "التوظيف والتدريب" },
  { key: "approvals", label: "موافقات LMS", icon: FileCheck2, roles: ["owner", "admin", "editor", "support"], group: "التوظيف والتدريب" },
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

const enrollmentStatuses = [
  { label: "جديد", value: "new" }, { label: "تم التواصل", value: "contacted" },
  { label: "مؤكد", value: "confirmed" }, { label: "مدفوع", value: "paid" }, { label: "ملغي", value: "cancelled" },
];

const inquiryStatuses = [
  { label: "جديد", value: "new" }, { label: "تمت الإجابة", value: "answered" },
  { label: "يحتاج مراجعة", value: "needs_review" }, { label: "مغلق", value: "closed" },
];

export default function AdminDashboard() {
  const [active, setActive] = useState<SectionKey>("overview");
  const [role, setRole] = useState<AdminRole>("admin");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      const sessionRole = String(data.session?.user.app_metadata.role ?? "admin") as AdminRole;
      setRole(sessionRole);
      setEmail(data.session?.user.email ?? "");
    });
  }, []);

  const visibleItems = useMemo(() => navItems.filter((item) => item.roles.includes(role)), [role]);
  const visibleKeys = useMemo(() => new Set(visibleItems.map((item) => item.key)), [visibleItems]);
  const safeGoTo = (section: SectionKey) => setActive(visibleKeys.has(section) ? section : "overview");
  const activeLabel = navItems.find((item) => item.key === active)?.label ?? "لوحة التحكم";

  const logout = async () => {
    await supabase?.auth.signOut();
  };

  return (
    <section className="admin-shell min-h-screen bg-[#080b12] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080b12]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300"><LayoutDashboard className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[11.5px] font-extrabold">Awexen Admin</p><p className="truncate text-[9px] text-white/35">{activeLabel}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="admin-button-secondary hidden sm:inline-flex">عرض الموقع</a>
            <span className="hidden max-w-44 truncate text-[9.5px] text-white/35 lg:block" dir="ltr">{email}</span>
            <span className="rounded-full border border-brand-500/20 bg-brand-500/[0.06] px-2.5 py-1 text-[9px] font-bold text-brand-200">{role}</span>
            <button type="button" onClick={() => void logout()} className="admin-icon-button text-red-300" aria-label="تسجيل الخروج"><LogOut className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-5">
        <aside className="h-fit rounded-xl border border-white/[0.07] bg-white/[0.018] p-2 lg:sticky lg:top-[72px]">
          <nav className="flex gap-1 overflow-x-auto lg:block lg:space-y-4" aria-label="أقسام لوحة التحكم">
            {groups.map((group) => {
              const items = visibleItems.filter((item) => item.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="shrink-0 lg:shrink lg:space-y-1">
                  <p className="hidden px-2 pb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/25 lg:block">{group}</p>
                  <div className="flex gap-1 lg:block lg:space-y-0.5">
                    {items.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActive(key)}
                        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[10.5px] font-bold transition lg:w-full ${active === key ? "bg-brand-500 text-white shadow-lg shadow-brand-500/10" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 rounded-xl border border-white/[0.07] bg-[#0d111b] p-4 sm:p-5">
          {active === "overview" && <OverviewPanel role={role} goTo={safeGoTo} />}
          {active === "pages" && <ResourceManager definition={resources.pages} />}
          {active === "blog" && <ResourceManager definition={resources.blog} />}
          {active === "jobs" && <ResourceManager definition={resources.jobs} />}
          {active === "courses" && <ResourceManager definition={resources.courses} />}
          {active === "lms" && <LmsManager role={role} />}
          {active === "approvals" && <LmsApprovals role={role} />}
          {active === "clients" && <ResourceManager definition={resources.clients} />}
          {active === "knowledge" && <KnowledgeManager />}

          {active === "messages" && (
            <InboxManager table="contact_messages" title="رسائل التواصل" description="طلبات الخدمات وعروض الأسعار الواردة من صفحة التواصل." fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "phone", label: "الهاتف", kind: "phone" },
              { key: "service", label: "الخدمة" }, { key: "budget", label: "الميزانية" }, { key: "message", label: "الرسالة", wide: true },
            ]} />
          )}
          {active === "newsletter" && (
            <InboxManager table="newsletter_subscribers" title="القائمة البريدية" description="عناوين البريد المسجلة من نموذج النشرة الأسبوعية في الموقع." fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "source", label: "مصدر الاشتراك" },
            ]} />
          )}
          {active === "applications" && (
            <InboxManager table="job_applications" title="طلبات التوظيف" description="راجع الخبرات والمهارات والروابط، ثم حدّث حالة كل متقدم." statusOptions={applicationStatuses} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "phone", label: "الهاتف", kind: "phone" },
              { key: "location", label: "المكان" }, { key: "years_experience", label: "سنوات الخبرة" }, { key: "skills", label: "المهارات", wide: true },
              { key: "portfolio_url", label: "Portfolio", kind: "url" }, { key: "linkedin_url", label: "LinkedIn", kind: "url" }, { key: "cv_url", label: "السيرة الذاتية", kind: "url" },
              { key: "cover_note", label: "نبذة المتقدم", wide: true }, { key: "admin_notes", label: "ملاحظات الإدارة", wide: true },
            ]} />
          )}
          {active === "enrollments" && (
            <InboxManager table="course_enrollments" title="طلبات الكورسات" description="طلبات التسجيل وطريقة الدفع المختارة." statusOptions={enrollmentStatuses} fields={[
              { key: "email", label: "البريد", kind: "email" }, { key: "phone", label: "الهاتف", kind: "phone" },
              { key: "experience_level", label: "المستوى" }, { key: "payment_preference", label: "الدفع" }, { key: "goal", label: "هدف المتدرب", wide: true },
            ]} />
          )}
          {active === "inquiries" && (
            <InboxManager table="ai_inquiries" title="أسئلة قاعدة المعرفة" description="راقب الأسئلة التي وجدت إجابة، ووسّع المعرفة للأسئلة التي تحتاج مراجعة." statusOptions={inquiryStatuses} fields={[
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
