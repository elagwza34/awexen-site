import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ArchiveRestore,
  BookOpenCheck,
  CheckCircle2,
  CirclePlus,
  Clock3,
  FileCheck2,
  GraduationCap,
  ImagePlus,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Rocket,
  Save,
  Send,
  Settings2,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { loadCurrentLmsUser } from "../lib/lms";
import { lmsApi } from "../lib/lmsApi";
import { uploadPublicImage } from "../lib/storage";
import { supabase } from "../lib/supabase";
import { DashboardThemeToggle, useDashboardTheme } from "../context/DashboardThemeContext";
import { Logo } from "../components/ui";
import { useConfirmDialog } from "../components/ConfirmDialog";

type Paged<T> = { count: number; results: T[] };
type DashboardTab = "overview" | "courses" | "drafts" | "content" | "review" | "profile";
type Course = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  short_description: string;
  delivery_mode: "recorded" | "online" | "onsite" | "hybrid";
  price: string;
  currency: string;
  capacity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  status: "draft" | "published" | "archived";
  current_version_id: string | null;
};
type Version = {
  id: string;
  course: string;
  version_number: number;
  status: "draft" | "in_review" | "published" | "archived";
  title: string;
  short_description: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  thumbnail_url: string;
  learning_outcomes: string;
  requirements: string;
  target_audience: string;
  submitted_at: string | null;
  review_notes: string;
};
type ModuleRow = { id: string; course_version: string; title: string; description: string; sort_order: number; status: string };
type LessonRow = { id: string; module: string; title: string; content_type: string; video_url: string; duration_seconds: number; sort_order: number; status: string };

const dashboardTabs: Array<{ id: DashboardTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "الرئيسية", icon: LayoutDashboard },
  { id: "courses", label: "كورساتي", icon: BookOpenCheck },
  { id: "drafts", label: "Draft · المسودات", icon: ArchiveRestore },
  { id: "content", label: "استوديو المحتوى", icon: Library },
  { id: "review", label: "المراجعة والنشر", icon: FileCheck2 },
  { id: "profile", label: "البروفايل", icon: UserRound },
];

const deliveryLabels: Record<Course["delivery_mode"], string> = {
  recorded: "مسجل",
  online: "مباشر أونلاين",
  onsite: "حضوري",
  hybrid: "هجين",
};
const statusLabels: Record<Version["status"], string> = {
  draft: "مسودة",
  in_review: "قيد مراجعة الإدارة",
  published: "منشور",
  archived: "مؤرشف",
};
const statusClasses: Record<Version["status"], string> = {
  draft: "bg-amber-50 text-amber-700",
  in_review: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-ink-100 text-ink-500",
};
const inputClass = "mt-1.5 w-full rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-[12px] text-ink-950 outline-none transition placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";
const labelClass = "text-[10px] font-bold text-ink-500";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية. حاول مرة أخرى.";
}
function toApiDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}
function formatMoney(value: string | number, currency: string) {
  return `${new Intl.NumberFormat("ar-EG").format(Number(value))} ${currency}`;
}
function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length ? parts.map((part) => part[0]).join("").toUpperCase() : email.slice(0, 2).toUpperCase() || "A";
}

function StatCard({ label, value, hint, icon: Icon, tone = "orange" }: {
  label: string;
  value: number;
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
        <div><p className="text-[11px] font-bold text-ink-400">{label}</p><p className="mt-2 text-[27px] font-black text-ink-950">{value}</p></div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-[10px] text-ink-400">{hint}</p>
    </article>
  );
}

function EmptyState({ icon: Icon, title, text, action }: {
  icon: typeof GraduationCap;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-4 text-[18px] font-black text-ink-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-ink-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function CourseCard({ course, thumbnail, selected, onSelect, onArchive, onRestore }: { course: Course; thumbnail?: string; selected: boolean; onSelect: () => void; onArchive?: () => void; onRestore?: () => void }) {
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-brand-300 ring-4 ring-brand-500/5" : "border-ink-100"}`}>
      <div className="grid h-28 place-items-center overflow-hidden bg-brand-50 grid-lines">{thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : <GraduationCap className="h-9 w-9 text-brand-400" />}</div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${course.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{course.status === "published" ? "منشور" : "مسودة"}</span><span className="text-[9px] font-bold text-ink-400">{deliveryLabels[course.delivery_mode]}</span></div>
        <h3 className="mt-3 line-clamp-2 min-h-12 text-[16px] font-black leading-6">{course.title}</h3>
        <p className="mt-2 text-[11px] font-black text-brand-600">{formatMoney(course.price, course.currency)}</p>
        <div className="mt-4 flex gap-2"><button type="button" onClick={onSelect} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-950 px-4 py-3 text-[11px] font-black text-white transition hover:bg-brand-500"><Settings2 className="h-4 w-4" /> إدارة الكورس</button>{onArchive && <button type="button" onClick={onArchive} className="grid h-11 w-11 place-items-center rounded-xl border border-red-100 text-red-500 transition hover:bg-red-50" aria-label="نقل إلى المسودات"><Trash2 className="h-4 w-4" /></button>}{onRestore && <button type="button" onClick={onRestore} className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-100 text-emerald-600 transition hover:bg-emerald-50" aria-label="استرجاع الكورس"><ArchiveRestore className="h-4 w-4" /></button>}</div>
      </div>
    </article>
  );
}

export default function InstructorDashboard() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const { theme } = useDashboardTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [courseDraft, setCourseDraft] = useState({ title: "", slug: "", short_description: "", delivery_mode: "recorded" as Course["delivery_mode"], price: 1500, currency: "EGP", capacity: "", starts_at: "", ends_at: "" });
  const [versionDraft, setVersionDraft] = useState({ title: "", short_description: "", description: "", difficulty: "all_levels", estimated_minutes: 0, thumbnail_url: "", learning_outcomes: "", requirements: "", target_audience: "" });
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonDraft, setLessonDraft] = useState({ module: "", title: "", content: "", content_type: "text", video_url: "", duration_seconds: 0 });

  const meQuery = useQuery({ queryKey: ["auth", "lms-user"], queryFn: loadCurrentLmsUser });
  const membership = meQuery.data?.memberships.find((item) => item.role === "instructor");
  const coursesQuery = useQuery({ queryKey: ["instructor", "courses"], queryFn: () => lmsApi<Paged<Course>>("instructor/courses/?page_size=100"), enabled: Boolean(membership) });
  const courses = useMemo(() => coursesQuery.data?.results ?? [], [coursesQuery.data]);
  const course = courses.find((item) => item.id === courseId) ?? null;

  useEffect(() => {
    if (!courseId && courses[0]) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const versionsQuery = useQuery({ queryKey: ["instructor", "versions"], queryFn: () => lmsApi<Paged<Version>>("instructor/course-versions/?page_size=100"), enabled: Boolean(membership) });
  const versions = useMemo(() => versionsQuery.data?.results ?? [], [versionsQuery.data]);
  const versionByCourse = useMemo(() => new Map(courses.map((item) => [item.id, versions.find((versionItem) => versionItem.course === item.id)])), [courses, versions]);
  const activeCourses = useMemo(() => courses.filter((item) => item.status !== "archived"), [courses]);
  const draftCourses = useMemo(() => courses.filter((item) => item.status === "archived" || versionByCourse.get(item.id)?.status === "draft"), [courses, versionByCourse]);
  const version = versions.find((item) => item.course === courseId) ?? null;
  const modulesQuery = useQuery({ queryKey: ["instructor", "modules", version?.id], queryFn: () => lmsApi<Paged<ModuleRow>>(`instructor/modules/?course_version=${version!.id}&page_size=100&ordering=sort_order`), enabled: Boolean(version) });
  const lessonsQuery = useQuery({ queryKey: ["instructor", "lessons", version?.id], queryFn: () => lmsApi<Paged<LessonRow>>(`instructor/lessons/?course_version=${version!.id}&page_size=100&ordering=sort_order`), enabled: Boolean(version) });
  const modules = useMemo(() => modulesQuery.data?.results ?? [], [modulesQuery.data]);
  const lessons = useMemo(() => lessonsQuery.data?.results ?? [], [lessonsQuery.data]);
  const lessonsByModule = useMemo(() => new Map(modules.map((module) => [module.id, lessons.filter((lesson) => lesson.module === module.id)])), [modules, lessons]);
  const editable = version?.status === "draft";
  const displayName = meQuery.data?.full_name?.trim() || "مدرب Awexen";
  const loading = meQuery.isLoading || (Boolean(membership) && (coursesQuery.isLoading || versionsQuery.isLoading || modulesQuery.isLoading || lessonsQuery.isLoading));
  const queryError = meQuery.error ?? coursesQuery.error ?? versionsQuery.error ?? modulesQuery.error ?? lessonsQuery.error;

  useEffect(() => {
    if (!version) return;
    setVersionDraft({ title: version.title, short_description: version.short_description, description: version.description, difficulty: version.difficulty, estimated_minutes: version.estimated_minutes, thumbnail_url: version.thumbnail_url, learning_outcomes: version.learning_outcomes, requirements: version.requirements, target_audience: version.target_audience });
  }, [version]);
  useEffect(() => {
    if (!lessonDraft.module && modules[0]) setLessonDraft((current) => ({ ...current, module: modules[0].id }));
  }, [lessonDraft.module, modules]);

  const run = async (operation: () => Promise<void>, success?: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await operation(); if (success) setNotice(success); }
    catch (operationError) { setError(errorMessage(operationError)); }
    finally { setBusy(false); }
  };
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["auth", "lms-user"] }), queryClient.invalidateQueries({ queryKey: ["instructor"] })]);
  const selectTab = (tab: DashboardTab) => {
    setActiveTab(tab); setMobileSidebar(false); setError(null); setNotice(null);
    if (tab === "profile") setProfileName(meQuery.data?.full_name ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openNewCourse = () => { setActiveTab("courses"); setShowNewCourse(true); setMobileSidebar(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const createCourse = (event: React.FormEvent) => {
    event.preventDefault();
    if (!membership) return;
    if (courseDraft.price <= 0) { setError("كل الكورسات مدفوعة. أدخل سعرًا أكبر من صفر."); return; }
    void run(async () => {
      const created = await lmsApi<Course>("instructor/courses/", { method: "POST", body: JSON.stringify({ organization_id: membership.organization_id, ...courseDraft, capacity: courseDraft.capacity ? Number(courseDraft.capacity) : null, starts_at: toApiDate(courseDraft.starts_at), ends_at: toApiDate(courseDraft.ends_at) }) });
      setShowNewCourse(false);
      setCourseDraft({ title: "", slug: "", short_description: "", delivery_mode: "recorded", price: 1500, currency: "EGP", capacity: "", starts_at: "", ends_at: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] }),
        queryClient.invalidateQueries({ queryKey: ["instructor", "versions"] }),
      ]);
      setCourseId(created.id); setActiveTab("content");
    }, "تم إنشاء مسودة الكورس. أضف التفاصيل والمنهج الآن.");
  };
  const saveVersion = (event: React.FormEvent) => {
    event.preventDefault(); if (!version || !editable) return;
    void run(async () => { await lmsApi(`instructor/course-versions/${version.id}/`, { method: "PATCH", body: JSON.stringify(versionDraft) }); await queryClient.invalidateQueries({ queryKey: ["instructor", "versions"] }); }, "تم حفظ تفاصيل الكورس.");
  };
  const editPublishedVersion = () => {
    if (!version || version.status !== "published") return;
    void run(async () => {
      await lmsApi<Version>(`instructor/course-versions/${version.id}/edit-copy/`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["instructor"] });
      setActiveTab("content");
    }, "تم إنشاء نسخة Draft كاملة قابلة للتعديل، والنسخة المنشورة ما زالت آمنة للطلاب.");
  };
  const moveCourseToDrafts = async (target: Course) => {
    if (!await confirm({
      title: `نقل كورس «${target.title}» إلى المسودات؟`,
      description: "لن يُحذف أي محتوى. سيختفي الكورس من القائمة النشطة ويمكن استرجاعه أو متابعة تعديله من تبويب المسودات.",
      confirmLabel: "نقل إلى المسودات",
      tone: "danger",
    })) return;
    void run(async () => {
      await lmsApi(`instructor/courses/${target.id}/`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
      setActiveTab("drafts");
    }, "تم نقل الكورس إلى Draft بدون حذف محتواه.");
  };
  const restoreCourse = (target: Course) => {
    void run(async () => {
      await lmsApi(`instructor/courses/${target.id}/restore/`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] });
      setCourseId(target.id);
      setActiveTab("courses");
    }, "تم استرجاع الكورس بنجاح.");
  };
  const uploadThumbnail = async (file: File) => {
    if (!course) return;
    setUploadingImage(true);
    setError(null);
    try {
      const publicUrl = await uploadPublicImage(file, "course-images", course.id);
      setVersionDraft((current) => ({ ...current, thumbnail_url: publicUrl }));
      setNotice("تم رفع الصورة. اضغط حفظ التفاصيل لتثبيتها على المسودة.");
    } catch (operationError) {
      setError(errorMessage(operationError));
    } finally {
      setUploadingImage(false);
    }
  };
  const addModule = (event: React.FormEvent) => {
    event.preventDefault(); if (!version || !editable) return;
    void run(async () => { const created = await lmsApi<ModuleRow>("instructor/modules/", { method: "POST", body: JSON.stringify({ course_version: version.id, title: moduleTitle, description: "", sort_order: modules.length, status: "published" }) }); setModuleTitle(""); setLessonDraft((current) => ({ ...current, module: created.id })); await queryClient.invalidateQueries({ queryKey: ["instructor", "modules", version.id] }); }, "تمت إضافة الوحدة.");
  };
  const addLesson = (event: React.FormEvent) => {
    event.preventDefault(); if (!editable || !lessonDraft.module) return;
    void run(async () => { const order = lessonsByModule.get(lessonDraft.module)?.length ?? 0; await lmsApi("instructor/lessons/", { method: "POST", body: JSON.stringify({ ...lessonDraft, sort_order: order, status: "published", summary: "", resource_url: "", is_required: true, weight: 1, completion_rule: lessonDraft.content_type === "video" ? "video_threshold" : "manual", completion_threshold: 90 }) }); setLessonDraft((current) => ({ ...current, title: "", content: "", video_url: "", duration_seconds: 0 })); await queryClient.invalidateQueries({ queryKey: ["instructor", "lessons", version?.id] }); }, "تمت إضافة الدرس.");
  };
  const submitForReview = async () => {
    if (!version || !await confirm({
      title: "إرسال الكورس للمراجعة؟",
      description: "سيتوقف تعديل هذه النسخة مؤقتًا حتى تراجعها الإدارة. إذا كانت هناك ملاحظات ستعود إليك النسخة لتعديلها قبل النشر.",
      confirmLabel: "إرسال للمراجعة",
    })) return;
    void run(async () => { await lmsApi(`instructor/course-versions/${version.id}/submit/`, { method: "POST" }); await Promise.all([queryClient.invalidateQueries({ queryKey: ["instructor", "versions"] }), queryClient.invalidateQueries({ queryKey: ["instructor", "courses"] })]); }, "تم إرسال الكورس لمراجعة الإدارة بنجاح.");
  };
  const saveProfile = (event: React.FormEvent) => {
    event.preventDefault(); const cleanName = profileName.trim();
    if (cleanName.length < 2) { setError("اكتب اسمًا صحيحًا مكوّنًا من حرفين على الأقل."); return; }
    void run(async () => { if (!supabase) throw new Error("خدمة تسجيل الدخول غير متصلة."); const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: cleanName } }); if (updateError) throw updateError; const { error: refreshError } = await supabase.auth.refreshSession(); if (refreshError) throw refreshError; await queryClient.invalidateQueries({ queryKey: ["auth", "lms-user"] }); }, "تم حفظ بيانات البروفايل.");
  };
  const logout = async () => { await supabase?.auth.signOut(); navigate("/login", { replace: true }); };

  const publishedCount = courses.filter((item) => item.status === "published").length;
  const reviewCount = versions.filter((item) => item.status === "in_review").length;
  const draftCount = versions.filter((item) => item.status === "draft").length;
  const courseReady = Boolean(versionDraft.description.trim() && modules.length > 0 && lessons.length > 0 && Number(course?.price ?? 0) > 0);

  const sidebar = (
    <aside className="flex h-full flex-col border-l border-ink-100 bg-white text-ink-950">
      <div className="flex h-20 items-center justify-between border-b border-ink-100 px-5">
        <div className="flex items-center gap-3"><Logo /><span className="hidden text-[8px] font-black uppercase tracking-[0.2em] text-brand-600 2xl:block">Instructor Portal</span></div>
        <button type="button" onClick={() => setMobileSidebar(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-500 lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-6" aria-label="أقسام لوحة المدرب">
        <p className="px-3 pb-3 text-[9px] font-black text-ink-300">مساحة التدريب</p>
        <div className="space-y-1">{dashboardTabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => selectTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right text-[12px] font-bold transition ${activeTab === id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/15" : "text-ink-500 hover:bg-ink-50 hover:text-ink-950"}`}><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{id === "review" && reviewCount > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[8px] ${activeTab === id ? "bg-white text-brand-600" : "bg-blue-50 text-blue-600"}`}>{reviewCount}</span>}{id === "drafts" && draftCourses.length > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[8px] ${activeTab === id ? "bg-white text-brand-600" : "bg-amber-50 text-amber-700"}`}>{draftCourses.length}</span>}</button>)}</div>
        <div className="my-5 h-px bg-ink-100" />
        <Link to="/learn" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[12px] font-bold text-ink-500 transition hover:bg-ink-50 hover:text-ink-950"><GraduationCap className="h-4 w-4" /> لوحة المتدرب</Link>
        <Link to="/courses" className="mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-[12px] font-bold text-ink-500 transition hover:bg-ink-50 hover:text-ink-950"><BookOpenCheck className="h-4 w-4" /> عرض الكورسات</Link>
      </nav>
      <div className="border-t border-ink-100 p-3"><button type="button" onClick={() => selectTab("profile")} className="flex w-full items-center gap-3 rounded-xl p-3 text-right transition hover:bg-ink-50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-[12px] font-black text-brand-600">{initials(displayName, meQuery.data?.email ?? "")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] text-ink-700">{displayName}</strong><small dir="ltr" className="mt-1 block truncate text-right text-[8px] text-ink-300">{meQuery.data?.email}</small></span><Settings2 className="h-4 w-4 text-ink-300" /></button><button type="button" onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[11px] font-bold text-red-500 transition hover:bg-red-50"><LogOut className="h-4 w-4" /> تسجيل الخروج</button></div>
    </aside>
  );

  return (
    <section dir="rtl" className={`portal-light dashboard-${theme} min-h-screen bg-[#f5f7fb] text-ink-950`}>
      <div className="fixed inset-y-0 right-0 z-50 hidden w-72 lg:block">{sidebar}</div>
      {mobileSidebar && <div className="fixed inset-0 z-[70] lg:hidden"><button type="button" aria-label="إغلاق القائمة" onClick={() => setMobileSidebar(false)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" /><div className="absolute inset-y-0 right-0 w-[min(86vw,300px)] shadow-2xl">{sidebar}</div></div>}
      <div className="min-w-0 lg:pr-72">
        <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-xl"><div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-7 lg:px-10"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileSidebar(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-700 lg:hidden"><Menu className="h-4 w-4" /></button><div className="min-w-0"><p className="text-[9px] font-bold text-ink-400">لوحة المدرب</p><h1 className="truncate text-[14px] font-black">{dashboardTabs.find((tab) => tab.id === activeTab)?.label}</h1></div></div><div className="flex items-center gap-2"><DashboardThemeToggle /><button type="button" onClick={() => void refresh()} className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:text-brand-600" aria-label="تحديث البيانات"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>{membership && <button type="button" onClick={openNewCourse} className="hidden items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-[11px] font-black text-white shadow-lg shadow-brand-500/15 sm:inline-flex"><CirclePlus className="h-4 w-4" /> كورس جديد</button>}<button type="button" onClick={() => selectTab("profile")} className="hidden items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-3 pr-1.5 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-[9px] font-black text-white">{initials(displayName, meQuery.data?.email ?? "")}</span><span className="max-w-28 truncate text-[10px] font-black">{displayName.split(" ")[0]}</span></button></div></div></header>
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          {loading && <div className="grid min-h-[65vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" /><p className="mt-3 text-[11px] text-ink-400">جاري تجهيز لوحة المدرب...</p></div></div>}
          {(error || queryError) && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[12px] leading-6 text-red-700">{error ?? errorMessage(queryError)}</div>}
          {notice && <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[12px] font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
          {!meQuery.isLoading && !membership && <EmptyState icon={UserRound} title="الحساب ليس مسجلاً كمدرب" text="سجّل بحساب مدرب أو تواصل مع الإدارة لإضافة صلاحية المدرب لهذا الحساب." action={<Link to="/login?role=instructor" className="inline-flex rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white">تسجيل حساب مدرب</Link>} />}

          {!loading && membership && activeTab === "overview" && <div className="space-y-7">
            <section className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white px-6 py-8 sm:px-9 sm:py-10"><div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-brand-500/15 blur-3xl" /><div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center"><div><p className="text-[11px] font-black text-brand-600">أهلاً بك في مساحة التدريب</p><h2 className="mt-2 text-[28px] font-black sm:text-[36px]">حوّل خبرتك إلى كورس مؤثر</h2><p className="mt-3 max-w-2xl text-[13px] leading-7 text-ink-500">أنشئ الكورس، رتّب الوحدات والدروس، ثم أرسله للإدارة. لن يظهر أي محتوى للطلاب إلا بعد الموافقة والنشر.</p><div className="mt-6 flex flex-wrap gap-2"><button type="button" onClick={openNewCourse} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white"><CirclePlus className="h-4 w-4" /> إنشاء كورس</button><button type="button" onClick={() => selectTab("content")} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-[12px] font-black text-ink-700"><Library className="h-4 w-4" /> إدارة المحتوى</button></div></div><div className="grid min-w-48 place-items-center rounded-2xl bg-brand-50 px-7 py-6 text-center"><Rocket className="h-8 w-8 text-brand-500" /><strong className="mt-3 text-[26px] font-black">{courses.length}</strong><span className="text-[10px] text-ink-500">إجمالي كورساتك</span></div></div></section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="إجمالي الكورسات" value={courses.length} hint="كل المسودات والكورسات" icon={BookOpenCheck} /><StatCard label="الكورسات المنشورة" value={publishedCount} hint="ظاهرة حالياً للطلاب" icon={BadgeCheck} tone="green" /><StatCard label="قيد المراجعة" value={reviewCount} hint="في انتظار قرار الإدارة" icon={Clock3} tone="blue" /><StatCard label="المسودات" value={draftCount} hint="ما زالت قابلة للتحرير" icon={Library} tone="violet" /></div>
            <section><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black text-brand-600">نظرة سريعة</p><h2 className="mt-1 text-[20px] font-black">أحدث كورساتك</h2></div><button type="button" onClick={() => selectTab("courses")} className="text-[11px] font-black text-brand-600">عرض الكل</button></div>{activeCourses.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeCourses.slice(0, 3).map((item) => <CourseCard key={item.id} course={item} thumbnail={versionByCourse.get(item.id)?.thumbnail_url} selected={item.id === courseId} onSelect={() => { setCourseId(item.id); setActiveTab("content"); }} onArchive={() => moveCourseToDrafts(item)} />)}</div> : <EmptyState icon={GraduationCap} title="ابدأ بأول كورس" text="أضف بيانات الكورس والمنهج ثم أرسله لمراجعة الإدارة." action={<button type="button" onClick={openNewCourse} className="rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white">إنشاء أول كورس</button>} />}</section>
          </div>}

          {!loading && membership && activeTab === "courses" && <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black text-brand-600">إدارة الكورسات</p><h2 className="mt-1 text-[24px] font-black">كورساتي</h2><p className="mt-2 text-[12px] text-ink-500">أنشئ مسودة مدفوعة وابدأ تجهيز محتواها.</p></div><button type="button" onClick={() => setShowNewCourse((current) => !current)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white"><CirclePlus className="h-4 w-4" />{showNewCourse ? "إغلاق النموذج" : "كورس جديد"}</button></div>
            {showNewCourse && <form onSubmit={createCourse} className="grid gap-4 rounded-3xl border border-brand-100 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3 sm:p-7"><h3 className="text-[18px] font-black sm:col-span-2 lg:col-span-3">بيانات الكورس الجديد</h3><label className={labelClass}>العنوان<input required value={courseDraft.title} onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} className={inputClass} /></label><label className={labelClass}>الرابط المختصر بالإنجليزية<input dir="ltr" required pattern="[a-z0-9-]+" value={courseDraft.slug} onChange={(event) => setCourseDraft({ ...courseDraft, slug: event.target.value.toLowerCase() })} placeholder="wordpress-basics" className={`${inputClass} text-left`} /></label><label className={labelClass}>نوع التقديم<select value={courseDraft.delivery_mode} onChange={(event) => setCourseDraft({ ...courseDraft, delivery_mode: event.target.value as Course["delivery_mode"] })} className={inputClass}><option value="recorded">مسجل</option><option value="online">مباشر أونلاين</option><option value="onsite">حضوري</option><option value="hybrid">هجين</option></select></label><label className={`${labelClass} sm:col-span-2`}>وصف مختصر<textarea required rows={3} value={courseDraft.short_description} onChange={(event) => setCourseDraft({ ...courseDraft, short_description: event.target.value })} className={`${inputClass} resize-none`} /></label><label className={labelClass}>السعر بالجنيه<input required type="number" min={1} value={courseDraft.price} onChange={(event) => setCourseDraft({ ...courseDraft, price: Number(event.target.value) })} className={inputClass} /></label>{courseDraft.delivery_mode !== "recorded" && <><label className={labelClass}>موعد البداية<input required type="datetime-local" value={courseDraft.starts_at} onChange={(event) => setCourseDraft({ ...courseDraft, starts_at: event.target.value })} className={inputClass} /></label><label className={labelClass}>موعد النهاية<input type="datetime-local" value={courseDraft.ends_at} onChange={(event) => setCourseDraft({ ...courseDraft, ends_at: event.target.value })} className={inputClass} /></label><label className={labelClass}>السعة المتاحة<input type="number" min={1} value={courseDraft.capacity} onChange={(event) => setCourseDraft({ ...courseDraft, capacity: event.target.value })} className={inputClass} /></label></>}<div className="sm:col-span-2 lg:col-span-3"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> إنشاء المسودة</button></div></form>}
            {activeCourses.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeCourses.map((item) => <CourseCard key={item.id} course={item} thumbnail={versionByCourse.get(item.id)?.thumbnail_url} selected={item.id === courseId} onSelect={() => { setCourseId(item.id); setActiveTab("content"); }} onArchive={() => moveCourseToDrafts(item)} />)}</div> : !showNewCourse && <EmptyState icon={GraduationCap} title="لا توجد كورسات بعد" text="اضغط على كورس جديد لإضافة أول مسودة." />}
          </div>}

          {!loading && membership && activeTab === "drafts" && <div className="space-y-6"><div><p className="text-[10px] font-black text-brand-600">حفظ المحتوى</p><h2 className="mt-1 text-[24px] font-black">Draft · المسودات والمحذوفات</h2><p className="mt-2 text-[12px] text-ink-500">أي كورس تنقله هنا يظل محفوظًا بالكامل ويمكن استرجاعه أو متابعة تعديله.</p></div>{draftCourses.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{draftCourses.map((item) => <CourseCard key={item.id} course={item} thumbnail={versionByCourse.get(item.id)?.thumbnail_url} selected={item.id === courseId} onSelect={() => { setCourseId(item.id); setActiveTab("content"); }} onRestore={item.status === "archived" ? () => restoreCourse(item) : undefined} />)}</div> : <EmptyState icon={ArchiveRestore} title="لا توجد مسودات" text="المسودات والكورسات المنقولة من العرض ستظهر هنا بدون فقد أي محتوى." />}</div>}

          {!loading && membership && activeTab === "content" && <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-black text-brand-600">بناء المنهج</p><h2 className="mt-1 text-[24px] font-black">استوديو المحتوى</h2><p className="mt-2 text-[12px] text-ink-500">أضف تفاصيل الكورس، الوحدات والدروس بالترتيب.</p></div>{courses.length > 0 && <label className="w-full text-[10px] font-bold text-ink-500 sm:w-72">الكورس الحالي<select value={courseId} onChange={(event) => setCourseId(event.target.value)} className={inputClass}>{courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}</div>
            {!courses.length && <EmptyState icon={Library} title="لا يوجد محتوى لإدارته" text="أنشئ كورسًا أولاً ثم ابدأ إضافة الوحدات والدروس." action={<button type="button" onClick={openNewCourse} className="rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white">إنشاء كورس</button>} />}
            {course && version && <><section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"><div><p className="text-[10px] text-ink-400">{course.title} · الإصدار {version.version_number}</p><p className="mt-1 text-[14px] font-black">{editable ? "مسودة قابلة للتحرير" : statusLabels[version.status]}</p>{version.review_notes && <p className="mt-2 text-[10px] text-red-600">ملاحظات الإدارة: {version.review_notes}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[9px] font-black ${statusClasses[version.status]}`}>{statusLabels[version.status]}</span>{version.status === "published" && <button type="button" disabled={busy} onClick={editPublishedVersion} className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-[10px] font-black text-brand-700"><Settings2 className="h-4 w-4" /> تعديل كمسودة</button>}</div></section>
              {editable && <form onSubmit={saveVersion} className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7"><h3 className="text-[17px] font-black sm:col-span-2">تفاصيل المحتوى</h3><label className={labelClass}>عنوان الكورس<input required value={versionDraft.title} onChange={(event) => setVersionDraft({ ...versionDraft, title: event.target.value })} className={inputClass} /></label><label className={labelClass}>الوصف المختصر<input required value={versionDraft.short_description} onChange={(event) => setVersionDraft({ ...versionDraft, short_description: event.target.value })} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>الوصف الكامل<textarea required rows={5} value={versionDraft.description} onChange={(event) => setVersionDraft({ ...versionDraft, description: event.target.value })} className={`${inputClass} resize-y`} /></label><label className={labelClass}>المستوى<select value={versionDraft.difficulty} onChange={(event) => setVersionDraft({ ...versionDraft, difficulty: event.target.value })} className={inputClass}><option value="all_levels">كل المستويات</option><option value="beginner">مبتدئ</option><option value="intermediate">متوسط</option><option value="advanced">متقدم</option></select></label><label className={labelClass}>المدة بالدقائق<input type="number" min={0} value={versionDraft.estimated_minutes} onChange={(event) => setVersionDraft({ ...versionDraft, estimated_minutes: Number(event.target.value) })} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>رفع صورة الكورس من الجهاز<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.target.value = ""; }} className={`${inputClass} bg-white file:ml-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-brand-700`} /></label>{versionDraft.thumbnail_url && <div className="sm:col-span-2"><img src={versionDraft.thumbnail_url} alt="معاينة صورة الكورس" className="aspect-video w-full max-w-xl rounded-2xl border border-ink-100 object-cover" /></div>}<label className={labelClass}>نتائج التعلم<textarea rows={3} value={versionDraft.learning_outcomes} onChange={(event) => setVersionDraft({ ...versionDraft, learning_outcomes: event.target.value })} className={inputClass} /></label><label className={labelClass}>المتطلبات<textarea rows={3} value={versionDraft.requirements} onChange={(event) => setVersionDraft({ ...versionDraft, requirements: event.target.value })} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>الفئة المستهدفة<textarea rows={2} value={versionDraft.target_audience} onChange={(event) => setVersionDraft({ ...versionDraft, target_audience: event.target.value })} className={inputClass} /></label><button disabled={busy || uploadingImage} className="inline-flex w-fit items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[11px] font-black text-white disabled:opacity-50">{uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} حفظ التفاصيل والصورة</button></form>}
              <section className="rounded-3xl border border-ink-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black text-brand-600">هيكل الكورس</p><h3 className="mt-1 text-[17px] font-black">الوحدات والدروس</h3></div><span className="text-[9px] text-ink-400">{modules.length} وحدة · {lessons.length} درس</span></div><div className="mt-5 space-y-3">{modules.map((module, index) => <article key={module.id} className="rounded-2xl border border-ink-100 bg-ink-50 p-4"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-[10px] font-black text-brand-600">{index + 1}</span><h4 className="text-[12px] font-black">{module.title}</h4></div><div className="mt-3 space-y-1.5">{(lessonsByModule.get(module.id) ?? []).map((lesson) => <div key={lesson.id} className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2.5"><BookOpenCheck className="h-3.5 w-3.5 text-brand-500" /><span className="flex-1 text-[10px] font-bold text-ink-700">{lesson.title}</span><span className="text-[8px] text-ink-400">{lesson.content_type}</span></div>)}</div></article>)}</div>{editable && <form onSubmit={addModule} className="mt-4 flex flex-col gap-2 sm:flex-row"><input required value={moduleTitle} onChange={(event) => setModuleTitle(event.target.value)} placeholder="اسم الوحدة الجديدة" className={`${inputClass} mt-0 flex-1`} /><button disabled={busy} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[10px] font-black text-brand-700"><CirclePlus className="h-3.5 w-3.5" /> إضافة وحدة</button></form>}</section>
              {editable && modules.length > 0 && <form onSubmit={addLesson} className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-7"><h3 className="text-[17px] font-black sm:col-span-2">إضافة درس</h3><label className={labelClass}>الوحدة<select value={lessonDraft.module} onChange={(event) => setLessonDraft({ ...lessonDraft, module: event.target.value })} className={inputClass}>{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label><label className={labelClass}>نوع الدرس<select value={lessonDraft.content_type} onChange={(event) => setLessonDraft({ ...lessonDraft, content_type: event.target.value })} className={inputClass}><option value="text">نصي</option><option value="video">فيديو</option><option value="live">جلسة مباشرة</option><option value="external_url">رابط خارجي</option></select></label><label className={`${labelClass} sm:col-span-2`}>العنوان<input required value={lessonDraft.title} onChange={(event) => setLessonDraft({ ...lessonDraft, title: event.target.value })} className={inputClass} /></label><label className={`${labelClass} sm:col-span-2`}>محتوى الدرس<textarea required rows={5} value={lessonDraft.content} onChange={(event) => setLessonDraft({ ...lessonDraft, content: event.target.value })} className={inputClass} /></label>{lessonDraft.content_type === "video" && <label className={labelClass}>رابط الفيديو<input dir="ltr" required type="url" value={lessonDraft.video_url} onChange={(event) => setLessonDraft({ ...lessonDraft, video_url: event.target.value })} className={`${inputClass} text-left`} /></label>}<label className={labelClass}>المدة بالثواني<input type="number" min={0} value={lessonDraft.duration_seconds} onChange={(event) => setLessonDraft({ ...lessonDraft, duration_seconds: Number(event.target.value) })} className={inputClass} /></label><div className="sm:col-span-2"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[11px] font-black text-white disabled:opacity-50"><Video className="h-4 w-4" /> إضافة الدرس</button></div></form>}
            </>}
          </div>}

          {!loading && membership && activeTab === "review" && <div className="space-y-6"><div><p className="text-[10px] font-black text-brand-600">الخطوة الأخيرة</p><h2 className="mt-1 text-[24px] font-black">المراجعة والنشر</h2><p className="mt-2 text-[12px] text-ink-500">راجع جاهزية المحتوى قبل إرساله لإدارة Awexen.</p></div>{!course || !version ? <EmptyState icon={FileCheck2} title="اختر كورسًا أولاً" text="أنشئ كورسًا أو اختر واحدًا من قائمة كورساتك لمراجعة جاهزيته." action={<button type="button" onClick={() => selectTab("courses")} className="rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white">فتح الكورسات</button>} /> : <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><span className={`inline-flex rounded-full px-3 py-1.5 text-[9px] font-black ${statusClasses[version.status]}`}>{statusLabels[version.status]}</span><h3 className="mt-3 text-[22px] font-black">{course.title}</h3><p className="mt-2 text-[12px] text-ink-500">الإصدار {version.version_number} · {formatMoney(course.price, course.currency)}</p></div><FileCheck2 className="h-9 w-9 text-brand-500" /></div>{version.review_notes && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-[11px] leading-6 text-red-700"><strong>ملاحظات الإدارة:</strong> {version.review_notes}</div>}<div className="mt-6 grid gap-3 sm:grid-cols-2"><ReviewItem done={Boolean(versionDraft.description.trim())} label="الوصف الكامل" /><ReviewItem done={modules.length > 0} label={`وحدات المنهج (${modules.length})`} /><ReviewItem done={lessons.length > 0} label={`دروس الكورس (${lessons.length})`} /><ReviewItem done={Number(course.price) > 0} label="السعر المدفوع" /></div></section><aside className="h-fit rounded-3xl border border-brand-100 bg-brand-50 p-6"><Rocket className="h-8 w-8 text-brand-600" /><h3 className="mt-4 text-[18px] font-black">جاهز للمراجعة؟</h3><p className="mt-2 text-[12px] leading-7 text-ink-500">بعد الإرسال سيتوقف التعديل مؤقتًا حتى يراجع الأدمن الكورس ويوافق عليه أو يرسل ملاحظات.</p>{version.status === "draft" ? <button type="button" disabled={busy || !courseReady} onClick={submitForReview} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /> إرسال للمراجعة</button> : <div className="mt-5 rounded-xl bg-white p-4 text-[11px] font-bold text-ink-600">الحالة الحالية: {statusLabels[version.status]}</div>}{!courseReady && version.status === "draft" && <p className="mt-3 text-[10px] leading-5 text-amber-700">أكمل الوصف ووحدة واحدة ودرسًا واحدًا على الأقل.</p>}</aside></div>}</div>}

          {!loading && membership && activeTab === "profile" && <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><form onSubmit={saveProfile} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-[10px] font-black text-brand-600">الحساب الشخصي</p><h2 className="mt-1 text-[24px] font-black">بيانات المدرب</h2><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className={labelClass}>الاسم الكامل<input required value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={displayName} className={inputClass} /></label><label className={labelClass}>البريد الإلكتروني<input dir="ltr" disabled value={meQuery.data?.email ?? ""} className={`${inputClass} text-left disabled:cursor-not-allowed disabled:opacity-60`} /></label><label className={labelClass}>المؤسسة<input disabled value={membership.organization_name} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`} /></label><label className={labelClass}>نوع الحساب<input disabled value="مدرب" className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`} /></label></div><button disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[12px] font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> حفظ البيانات</button></form><aside className="rounded-3xl border border-brand-100 bg-brand-50 p-6"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-[18px] font-black text-brand-600 shadow-sm">{initials(displayName, meQuery.data?.email ?? "")}</span><h3 className="mt-4 text-[20px] font-black">{displayName}</h3><p className="mt-1 text-[11px] text-ink-500">مدرب لدى {membership.organization_name}</p><div className="my-5 h-px bg-brand-100" /><Link to="/learn" className="inline-flex items-center gap-2 text-[11px] font-black text-brand-700"><GraduationCap className="h-4 w-4" /> الانتقال للوحة المتدرب</Link></aside></div>}
        </div>
      </div>
      {confirmDialog}
    </section>
  );
}

function ReviewItem({ done, label }: { done: boolean; label: string }) {
  return <div className={`flex items-center gap-3 rounded-xl border p-3.5 ${done ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"}`}><span className={`grid h-7 w-7 place-items-center rounded-lg ${done ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><span className="text-[11px] font-bold text-ink-700">{label}</span></div>;
}
