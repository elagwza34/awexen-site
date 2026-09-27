import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PlayCircle,
  ReceiptText,
  RefreshCw,
  Settings2,
  Trophy,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadCurrentLmsUser,
  loadMyBookings,
  loadStudentEnrollments,
  type CourseBooking,
  type StudentEnrollment,
} from "../lib/lms";
import { LMS_STALE_TIME_MS } from "../lib/lmsApi";
import ProofViewer from "../admin/ProofViewer";
import { supabase } from "../lib/supabase";
import { DashboardThemeToggle, useDashboardTheme } from "../context/DashboardThemeContext";

type DashboardTab = "overview" | "courses" | "completed" | "schedule" | "payments" | "profile";

const dashboardTabs: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "الرئيسية", icon: LayoutDashboard },
  { id: "courses", label: "كورساتي", icon: BookOpenCheck },
  { id: "completed", label: "الدورات المنجزة", icon: Trophy },
  { id: "schedule", label: "المواعيد", icon: CalendarDays },
  { id: "payments", label: "الحجوزات والمدفوعات", icon: ReceiptText },
  { id: "profile", label: "البروفايل", icon: UserRound },
];

const bookingStatus: Record<CourseBooking["status"], { label: string; className: string }> = {
  awaiting_payment: { label: "في انتظار الدفع", className: "bg-amber-50 text-amber-700" },
  payment_submitted: { label: "قيد مراجعة الدفع", className: "bg-blue-50 text-blue-700" },
  approved: { label: "تم تأكيد الدفع", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "الإثبات مرفوض", className: "bg-red-50 text-red-700" },
  cancelled: { label: "ملغي", className: "bg-ink-100 text-ink-500" },
};

const deliveryLabels = {
  recorded: "كورس مسجل",
  online: "مباشر أونلاين",
  onsite: "حضوري",
  hybrid: "هجين",
} as const;

function formatMoney(value: string | number, currency: string) {
  return `${new Intl.NumberFormat("ar-EG").format(Number(value))} ${currency}`;
}

function formatDate(value: string | null, withTime = true) {
  if (!value) return "لم يُحدد بعد";
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length) return parts.map((part) => part[0]).join("").toUpperCase();
  return email.slice(0, 2).toUpperCase() || "A";
}

function EmptyState({ icon: Icon, title, text, action }: {
  icon: typeof GraduationCap;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-[18px] font-black text-ink-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-ink-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone = "orange" }: {
  label: string;
  value: string | number;
  hint: string;
  icon: typeof GraduationCap;
  tone?: "orange" | "blue" | "green" | "violet";
}) {
  const tones = {
    orange: "bg-brand-50 text-brand-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-ink-400">{label}</p>
          <p className="mt-2 text-[27px] font-black text-ink-950">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-[10px] text-ink-400">{hint}</p>
    </article>
  );
}

function CourseCard({ enrollment, compact = false }: { enrollment: StudentEnrollment; compact?: boolean }) {
  const completed = enrollment.status === "completed" || enrollment.progressPercent >= 100;
  return (
    <article className={`group overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${compact ? "sm:grid sm:grid-cols-[180px_1fr]" : ""}`}>
      <div className={`relative overflow-hidden bg-brand-50 ${compact ? "min-h-44" : "h-40"}`}>
        {enrollment.course.featured_image ? (
          <img src={enrollment.course.featured_image} alt="" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center grid-lines"><GraduationCap className="h-10 w-10 text-brand-400" /></div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur">
          {completed ? "مكتمل" : deliveryLabels[enrollment.course.delivery_mode]}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[10px] font-bold text-brand-600">مع {enrollment.course.instructor}</p>
        <h3 className="mt-1.5 text-[17px] font-black leading-7 text-ink-950">{enrollment.course.title}</h3>
        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-ink-400">
          <span>{enrollment.completedLessons} من {enrollment.totalLessons} درس</span><span>{Math.round(enrollment.progressPercent)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
          <div className={`h-full rounded-full ${completed ? "bg-emerald-500" : "bg-brand-500"}`} style={{ width: `${Math.min(100, enrollment.progressPercent)}%` }} />
        </div>
        <Link to={`/learn/enrollments/${enrollment.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-3 text-[12px] font-black text-white transition hover:bg-brand-500">
          {completed ? "مراجعة الكورس" : enrollment.completedLessons ? "استكمال التعلّم" : "ابدأ الكورس"}<PlayCircle className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function StudentDashboard() {
  const { theme } = useDashboardTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [proofBookingId, setProofBookingId] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const enrollmentsQuery = useQuery({ queryKey: ["learning", "enrollments"], queryFn: loadStudentEnrollments, staleTime: LMS_STALE_TIME_MS });
  const bookingsQuery = useQuery({ queryKey: ["learning", "bookings"], queryFn: loadMyBookings, staleTime: LMS_STALE_TIME_MS });
  const userQuery = useQuery({ queryKey: ["auth", "lms-user"], queryFn: loadCurrentLmsUser, staleTime: LMS_STALE_TIME_MS });
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const user = userQuery.data;
  const completedCourses = useMemo(
    () => enrollments.filter((item) => item.status === "completed" || item.progressPercent >= 100),
    [enrollments],
  );
  const activeCourses = useMemo(
    () => enrollments.filter((item) => item.accessValid && !completedCourses.includes(item)),
    [enrollments, completedCourses],
  );
  const pendingBookings = useMemo(
    () => bookings.filter((item) => ["awaiting_payment", "payment_submitted", "rejected", "approved", "cancelled"].includes(item.status)),
    [bookings],
  );
  const scheduledCourses = useMemo(
    () => enrollments
      .filter((item) => item.course.delivery_mode !== "recorded" && item.course.starts_at)
      .sort((a, b) => new Date(a.course.starts_at ?? 0).getTime() - new Date(b.course.starts_at ?? 0).getTime()),
    [enrollments],
  );
  const totalCompletedLessons = enrollments.reduce((total, item) => total + item.completedLessons, 0);
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((total, item) => total + item.progressPercent, 0) / enrollments.length)
    : 0;
  const continueCourse = [...activeCourses].sort((a, b) => b.progressPercent - a.progressPercent)[0] ?? null;
  const isInstructor = user?.memberships.some((membership) => membership.role === "instructor");
  const loading = enrollmentsQuery.isLoading || bookingsQuery.isLoading || userQuery.isLoading;
  const pageError = enrollmentsQuery.error ?? bookingsQuery.error ?? userQuery.error;
  const displayName = user?.full_name?.trim() || "متدرب Awexen";

  const profileMutation = useMutation({
    mutationFn: async () => {
      const cleanName = profileName.trim();
      if (cleanName.length < 2) throw new Error("اكتب اسمًا صحيحًا مكوّنًا من حرفين على الأقل.");
      if (!supabase) throw new Error("خدمة تسجيل الدخول غير متصلة.");
      const { error } = await supabase.auth.updateUser({ data: { full_name: cleanName } });
      if (error) throw error;
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      return loadCurrentLmsUser();
    },
    onSuccess: async () => {
      setProfileNotice("تم حفظ بيانات البروفايل بنجاح.");
      await queryClient.invalidateQueries({ queryKey: ["auth", "lms-user"] });
    },
    onError: (error) => setProfileNotice(error instanceof Error ? error.message : "تعذر حفظ بيانات البروفايل."),
  });

  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    setMobileSidebar(false);
    setProfileNotice(null);
    if (tab === "profile") setProfileName(user?.full_name ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * زر الرجوع: يرجع للصفحة اللي كان فيها قبل الـ dashboard.
   * لو فتحنا اللوحة مباشرة (من رابط خارجي) نرجع للرئيسية.
   */
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/", { replace: true });
  };

  const logout = async () => {
    await supabase?.auth.signOut();
    navigate("/login", { replace: true });
  };

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["learning", "enrollments"] }),
      queryClient.invalidateQueries({ queryKey: ["learning", "bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["auth", "lms-user"] }),
    ]);
  };

  const sidebar = (
    <aside className="flex h-full flex-col border-l border-ink-100 bg-white text-ink-950">
      <div className="flex h-20 items-center justify-between border-b border-ink-100 px-5">
        <Link to="/" className="inline-flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-[17px] font-black shadow-lg shadow-brand-500/20">A</span>
          <span><strong className="block text-[16px] font-black text-ink-950">Awexen</strong><small className="block text-[8px] font-black uppercase tracking-[0.2em] text-brand-600">Student Portal</small></span>
        </Link>
        <button type="button" onClick={() => setMobileSidebar(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-500 lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="أقسام لوحة الطالب">
        <p className="px-3 pb-3 text-[9px] font-black text-ink-300">مساحة التعلّم</p>
        <div className="space-y-1">
          {dashboardTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => selectTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right text-[12px] font-bold transition ${activeTab === id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/15" : "text-ink-500 hover:bg-ink-50 hover:text-ink-950"}`}>
              <Icon className="h-4 w-4" /><span className="flex-1">{label}</span>
              {id === "payments" && pendingBookings.length > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[8px] ${activeTab === id ? "bg-white text-brand-600" : "bg-brand-500/15 text-brand-300"}`}>{pendingBookings.length}</span>}
            </button>
          ))}
        </div>
        <div className="my-5 h-px bg-ink-100" />
        {isInstructor && <Link to="/instructor" className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-[12px] font-bold text-ink-500 transition hover:bg-ink-50 hover:text-ink-950"><GraduationCap className="h-4 w-4" /> لوحة المدرب</Link>}
      </nav>
      <div className="border-t border-ink-100 p-3">
        <button type="button" onClick={() => selectTab("profile")} className="flex w-full items-center gap-3 rounded-xl p-3 text-right transition hover:bg-ink-50">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-[12px] font-black text-brand-600">{initials(displayName, user?.email ?? "")}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-ink-700">{displayName}</strong><small dir="ltr" className="mt-1 block truncate text-right text-[8px] text-ink-300">{user?.email}</small></span>
          <Settings2 className="h-4 w-4 text-ink-300" />
        </button>
        <button type="button" onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[11px] font-bold text-red-300/70 transition hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
      </div>
    </aside>
  );

  return (
    <section dir="rtl" className={`portal-light dashboard-${theme} min-h-screen bg-[#f5f7fb] text-ink-950`}>
      <div className="fixed inset-y-0 right-0 z-50 hidden w-72 lg:block">{sidebar}</div>
      {mobileSidebar && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" aria-label="إغلاق القائمة" onClick={() => setMobileSidebar(false)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="absolute inset-y-0 right-0 w-[min(86vw,300px)] shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 lg:pr-72">
        <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={goBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 transition hover:border-brand-500 hover:text-brand-600" aria-label="رجوع للصفحة السابقة">
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setMobileSidebar(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 lg:hidden" aria-label="فتح القائمة"><Menu className="h-4 w-4" /></button>
              <div className="min-w-0"><p className="text-[9px] font-bold text-ink-400">لوحة الطالب</p><h1 className="truncate text-[14px] font-black">{dashboardTabs.find((tab) => tab.id === activeTab)?.label}</h1></div>
            </div>
            <div className="flex items-center gap-2">
              <DashboardThemeToggle />
              <button type="button" onClick={() => void refresh()} className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:text-brand-600" aria-label="تحديث البيانات"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
              <button type="button" onClick={() => selectTab("payments")} className="relative grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500" aria-label="التنبيهات"><Bell className="h-4 w-4" />{pendingBookings.length > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-brand-500 px-1 text-[8px] font-black text-white">{pendingBookings.length}</span>}</button>
              <button type="button" onClick={() => selectTab("profile")} className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-3 pr-1.5 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-[9px] font-black text-white">{initials(displayName, user?.email ?? "")}</span><span className="max-w-28 truncate text-[10px] font-black">{displayName.split(" ")[0]}</span></button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          {loading && <div className="grid min-h-[65vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" /><p className="mt-3 text-[11px] text-ink-400">جارٍ تجهيز لوحة التعلّم...</p></div></div>}
          {pageError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-[12px] leading-7 text-red-700">تعذر تحميل بيانات لوحة الطالب مؤقتًا. حدّث الصفحة، وإذا استمرت المشكلة سجّل الخروج ثم حاول مرة أخرى.</div>}

          {!loading && !pageError && activeTab === "overview" && (
            <div className="space-y-7">
              <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-8 sm:px-9 sm:py-10">
                <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" />
                <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-[11px] font-black text-brand-600">أهلًا بعودتك</p>
                    <h2 className="mt-2 text-[28px] font-black sm:text-[36px]">{displayName.split(" ")[0]}، مستعد تكمل؟</h2>
                    <p className="mt-3 max-w-xl text-[13px] leading-7 text-ink-500">تابع تقدمك، كمّل الدروس المتبقية، وخليك دايمًا على اطلاع بمواعيد كورساتك وحالة دفعاتك.</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {continueCourse ? <Link to={`/learn/enrollments/${continueCourse.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black">كمّل آخر كورس <PlayCircle className="h-4 w-4" /></Link> : <button type="button" onClick={() => selectTab("courses")} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black">كورساتي <BookOpenCheck className="h-4 w-4" /></button>}
                      {continueCourse && <button type="button" onClick={() => selectTab("courses")} className="rounded-xl border border-ink-200 bg-white px-5 py-3 text-[12px] font-bold text-ink-600">كل كورساتي</button>}
                    </div>
                  </div>
                  <div className="relative mx-auto h-36 w-36 shrink-0 lg:mx-0">
                    <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(#ff5a1f ${averageProgress * 3.6}deg, #f1f3f7 0deg)` }} />
                    <div className="absolute inset-3 grid place-items-center rounded-full bg-white text-center"><div><strong className="text-[28px] font-black text-ink-950">{averageProgress}%</strong><span className="block text-[9px] text-ink-400">متوسط التقدم</span></div></div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="الكورسات النشطة" value={activeCourses.length} hint="كورسات متاحة للتعلّم" icon={BookOpenCheck} />
                <StatCard label="الدروس المنجزة" value={totalCompletedLessons} hint="إجمالي الدروس المكتملة" icon={CheckCircle2} tone="blue" />
                <StatCard label="دورات مكتملة" value={completedCourses.length} hint="إنجازاتك حتى الآن" icon={Trophy} tone="green" />
                <StatCard label="طلبات تحتاج متابعة" value={pendingBookings.length} hint="دفع أو مراجعة إثبات" icon={WalletCards} tone="violet" />
              </section>

              <div className="grid gap-7 xl:grid-cols-[1.35fr_0.65fr]">
                <section>
                  <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black text-brand-600">استمر في التعلّم</p><h2 className="mt-1 text-[19px] font-black">كورساتك الحالية</h2></div><button type="button" onClick={() => selectTab("courses")} className="text-[11px] font-black text-brand-600">عرض الكل</button></div>
                  {activeCourses.length ? <div className="grid gap-4 md:grid-cols-2">{activeCourses.slice(0, 2).map((item) => <CourseCard key={item.id} enrollment={item} />)}</div> : <EmptyState icon={BookOpenCheck} title="لا توجد كورسات نشطة" text="بعد تأكيد الدفع سيظهر الكورس هنا وتقدر تبدأ التعلّم فورًا." action={<Link to="/courses" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[11px] font-black text-white">تصفح الكورسات <ArrowLeft className="h-4 w-4" /></Link>} />}
                </section>
                <aside className="space-y-5">
                  <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between"><h2 className="text-[15px] font-black">أقرب المواعيد</h2><CalendarDays className="h-4 w-4 text-brand-500" /></div>
                    <div className="mt-4 space-y-3">
                      {scheduledCourses.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => selectTab("schedule")} className="flex w-full gap-3 rounded-xl bg-ink-50 p-3 text-right"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-brand-600"><Clock3 className="h-4 w-4" /></span><span className="min-w-0"><strong className="block truncate text-[11px]">{item.course.title}</strong><small className="mt-1 block text-[9px] text-ink-400">{formatDate(item.course.starts_at)}</small></span></button>)}
                      {!scheduledCourses.length && <p className="py-5 text-center text-[11px] leading-6 text-ink-400">لا توجد مواعيد مباشرة مسجلة حاليًا.</p>}
                    </div>
                  </div>
                  {pendingBookings.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start gap-3"><ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h3 className="text-[13px] font-black text-amber-900">عندك {pendingBookings.length} طلب يحتاج متابعة</h3><p className="mt-1 text-[10px] leading-5 text-amber-700">راجع حالة الدفع أو ارفع إثباتًا جديدًا لو الطلب مرفوض.</p><button type="button" onClick={() => selectTab("payments")} className="mt-3 text-[10px] font-black text-amber-800">عرض الحجوزات ←</button></div></div></div>}
                </aside>
              </div>
            </div>
          )}

          {!loading && !pageError && activeTab === "courses" && (
            <section>
              <div><p className="text-[10px] font-black text-brand-600">مكتبتك التعليمية</p><h2 className="mt-1 text-[25px] font-black">كورساتي</h2><p className="mt-2 text-[12px] text-ink-400">كل الكورسات المفعلة على حسابك ونسبة تقدمك فيها.</p></div>
              {enrollments.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{enrollments.map((item) => <CourseCard key={item.id} enrollment={item} />)}</div> : <div className="mt-7"><EmptyState icon={BookOpenCheck} title="مكتبتك فارغة حاليًا" text="لم يتم تفعيل أي كورس على حسابك بعد. تواصل معنا لمعرفة الكورسات المتاحة لك." /></div>}
            </section>
          )}

          {!loading && !pageError && activeTab === "completed" && (
            <section>
              <div><p className="text-[10px] font-black text-emerald-600">إنجازاتك</p><h2 className="mt-1 text-[25px] font-black">الدورات المنجزة</h2><p className="mt-2 text-[12px] text-ink-400">الكورسات التي أنهيت جميع دروسها بنجاح.</p></div>
              {completedCourses.length ? <div className="mt-6 grid gap-5 xl:grid-cols-2">{completedCourses.map((item) => <CourseCard key={item.id} enrollment={item} compact />)}</div> : <div className="mt-7"><EmptyState icon={Trophy} title="أول إنجاز مستنيك" text="لما تكمّل كل دروس أي كورس، هيظهر هنا ضمن دوراتك المنجزة." action={<button type="button" onClick={() => selectTab("courses")} className="rounded-xl bg-ink-950 px-5 py-3 text-[12px] font-black text-white">ارجع لكورساتي</button>} /></div>}
            </section>
          )}

          {!loading && !pageError && activeTab === "schedule" && (
            <section>
              <div><p className="text-[10px] font-black text-brand-600">جدولك</p><h2 className="mt-1 text-[25px] font-black">مواعيد الكورسات</h2><p className="mt-2 text-[12px] text-ink-400">مواعيد الكورسات الأونلاين والحضورية والهجينة.</p></div>
              {scheduledCourses.length ? <div className="mt-6 space-y-4">{scheduledCourses.map((item) => <article key={item.id} className="grid gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm sm:grid-cols-[110px_1fr_auto] sm:items-center"><div className="rounded-xl bg-brand-50 p-3 text-center"><strong className="block text-[18px] font-black text-brand-600">{new Date(item.course.starts_at ?? "").toLocaleDateString("ar-EG", { day: "numeric" })}</strong><span className="text-[10px] text-brand-700">{new Date(item.course.starts_at ?? "").toLocaleDateString("ar-EG", { month: "long" })}</span></div><div><span className="rounded-full bg-ink-50 px-2.5 py-1 text-[9px] font-bold text-ink-500">{deliveryLabels[item.course.delivery_mode]}</span><h3 className="mt-2 text-[16px] font-black">{item.course.title}</h3><p className="mt-1 text-[10px] text-ink-400">{formatDate(item.course.starts_at)}{item.course.ends_at ? ` — حتى ${formatDate(item.course.ends_at)}` : ""}</p></div><Link to={`/learn/enrollments/${item.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-2.5 text-[11px] font-black">تفاصيل الكورس <ArrowLeft className="h-3.5 w-3.5" /></Link></article>)}</div> : <div className="mt-7"><EmptyState icon={CalendarDays} title="لا توجد مواعيد قادمة" text="الكورسات المسجلة متاحة في أي وقت، وأي موعد مباشر سيظهر هنا بوضوح." /></div>}
            </section>
          )}

          {!loading && !pageError && activeTab === "payments" && (
            <section>
              <div><p className="text-[10px] font-black text-brand-600">الحجوزات</p><h2 className="mt-1 text-[25px] font-black">الحجوزات والمدفوعات</h2><p className="mt-2 text-[12px] text-ink-400">تابع حالة كل طلب وإثبات الدفع وموافقة الإدارة.</p></div>
              {bookings.length ? <div className="mt-6 space-y-4">{bookings.map((booking) => {
                const status = bookingStatus[booking.status];
                return (
                  <article key={booking.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div><span className={`inline-flex rounded-full px-3 py-1 text-[9px] font-black ${status.className}`}>{status.label}</span><h3 className="mt-2 text-[16px] font-black">{booking.course.title}</h3><p className="mt-1 text-[10px] text-ink-400">تاريخ الطلب: {formatDate(booking.created_at)}</p></div>
                      <div className="sm:text-left"><strong className="block text-[18px] font-black">{formatMoney(booking.amount, booking.currency)}</strong><span className="mt-1 block text-[10px] text-ink-400">{booking.payment_method === "instapay" ? "InstaPay" : booking.payment_method === "vodafone_cash" ? "Vodafone Cash" : "لم تُحدد وسيلة الدفع"}</span></div>
                    </div>
                    {booking.review_notes && <p className="mt-4 rounded-xl bg-red-50 p-3 text-[11px] leading-6 text-red-700">ملاحظة الإدارة: {booking.review_notes}</p>}
                    {booking.status === "approved" && (
                      <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] font-bold leading-6 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        تمت الموافقة على الدفع وتفعيل الكورس. الكورس متاح لك في «كورساتي».
                      </p>
                    )}
                    {booking.proof_path && (
                      <button
                        type="button"
                        onClick={() => setProofBookingId(booking.id)}
                        className="mt-4 mr-2 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[11px] font-black text-ink-700 transition hover:border-brand-500 hover:text-brand-600"
                      >
                        <Eye className="h-3.5 w-3.5" /> عرض إثبات الدفع المرسل
                      </button>
                    )}
                    {["awaiting_payment", "rejected"].includes(booking.status) && <Link to={`/checkout/${booking.course.slug}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[11px] font-black text-white">متابعة الدفع ورفع الإثبات <ArrowLeft className="h-3.5 w-3.5" /></Link>}
                    {booking.status === "payment_submitted" && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-[11px] leading-6 text-blue-700">تم استلام الإثبات، وسيظهر الكورس في «كورساتي» فور موافقة الإدارة.</p>}
                  </article>
                );
              })}</div> : <div className="mt-7"><EmptyState icon={ReceiptText} title="لا توجد حجوزات بعد" text="كل طلبات حجز الكورسات وحالة الدفع ستظهر في هذا القسم." action={<Link to="/courses" className="inline-flex rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white">تصفح الكورسات</Link>} /></div>}
            </section>
          )}

          {!loading && !pageError && activeTab === "profile" && user && (
            <section>
              <div><p className="text-[10px] font-black text-brand-600">حسابك</p><h2 className="mt-1 text-[25px] font-black">البروفايل</h2><p className="mt-2 text-[12px] text-ink-400">راجع بيانات حسابك وحدّث اسمك الظاهر داخل المنصة.</p></div>
              <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
                <aside className="rounded-3xl border border-brand-100 bg-brand-50 p-7 text-ink-950">
                  <span className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-500 text-[24px] font-black text-white shadow-lg shadow-brand-500/20">{initials(displayName, user.email)}</span>
                  <h3 className="mt-5 text-[20px] font-black">{displayName}</h3><p dir="ltr" className="mt-1 text-right text-[11px] text-ink-400">{user.email}</p>
                  <div className="mt-6 space-y-3 border-t border-brand-100 pt-5 text-[11px]"><div className="flex items-center justify-between"><span className="text-ink-400">نوع الحساب</span><strong>متدرب</strong></div><div className="flex items-center justify-between"><span className="text-ink-400">حالة البريد</span><strong className={user.email_verified ? "text-emerald-600" : "text-amber-600"}>{user.email_verified ? "مؤكد" : "غير مؤكد"}</strong></div><div className="flex items-center justify-between"><span className="text-ink-400">الكورسات</span><strong>{enrollments.length}</strong></div></div>
                </aside>
                <form onSubmit={(event) => { event.preventDefault(); setProfileNotice(null); profileMutation.mutate(); }} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><UserRound className="h-5 w-5" /></span><div><h3 className="text-[16px] font-black">البيانات الشخصية</h3><p className="mt-1 text-[10px] text-ink-400">الاسم يظهر في لوحة التعلّم وشهاداتك مستقبلًا.</p></div></div>
                  <label className="mt-7 block text-[11px] font-bold text-ink-600">الاسم بالكامل<input required minLength={2} value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={user.full_name || "اكتب اسمك بالكامل"} className="mt-2 w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3.5 text-[13px] outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10" /></label>
                  <label className="mt-5 block text-[11px] font-bold text-ink-600">البريد الإلكتروني<input readOnly dir="ltr" value={user.email} className="mt-2 w-full rounded-xl border border-ink-100 bg-ink-100 px-4 py-3.5 text-left text-[13px] text-ink-400 outline-none" /></label>
                  <p className="mt-3 text-[10px] leading-5 text-ink-400">يمكنك تغيير البريد أو كلمة المرور بأمان من إعدادات حسابك.</p>
                  {profileNotice && <p className={`mt-5 rounded-xl p-3 text-[11px] ${profileMutation.isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{profileNotice}</p>}
                  <button disabled={profileMutation.isPending} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-[12px] font-black text-white disabled:opacity-50">{profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} حفظ التغييرات</button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>

      {proofBookingId && (
        <ProofViewer bookingId={proofBookingId} onClose={() => setProofBookingId(null)} />
      )}
    </section>
  );
}
