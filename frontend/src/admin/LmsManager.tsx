import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CirclePlus,
  Edit3,
  GraduationCap,
  ImagePlus,
  Loader2,
  Rocket,
  Save,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { lmsApi } from "../lib/lmsApi";
import { uploadPublicImage } from "../lib/storage";
import type { AdminRole } from "./types";

type Paged<T> = { count: number; results: T[] };
type Me = {
  platform_role: "student" | "support" | "super_admin";
  memberships: Array<{
    organization_id: string;
    organization_name: string;
    role: string;
  }>;
};
type Course = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  short_description: string;
  delivery_mode: "recorded" | "online" | "onsite" | "hybrid";
  price: string | number;
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
  language: string;
  difficulty: string;
  estimated_minutes: number;
  thumbnail_url: string;
  learning_outcomes: string;
  requirements: string;
  target_audience: string;
};
type ModuleRow = {
  id: string;
  course_version: string;
  title: string;
  description: string;
  sort_order: number;
  status: "draft" | "published";
};
type LessonRow = {
  id: string;
  module: string;
  title: string;
  summary: string;
  content: string;
  content_type: "text" | "video" | "audio" | "document" | "presentation" | "external_url" | "live";
  video_url: string;
  resource_url: string;
  duration_seconds: number;
  sort_order: number;
  status: "draft" | "published";
  is_required: boolean;
  weight: string | number;
  completion_rule: "manual" | "view" | "video_threshold";
  completion_threshold: number;
};
type EnrollmentRow = {
  id: string;
  student_email: string;
  student_name: string;
  status: string;
  progress_percent: string | number;
  enrolled_at: string;
};

const emptyModule: Pick<ModuleRow, "id" | "title" | "description" | "sort_order" | "status"> = {
  id: "",
  title: "",
  description: "",
  sort_order: 0,
  status: "published",
};
const emptyLesson: Omit<LessonRow, "id" | "module"> = {
  title: "",
  summary: "",
  content: "",
  content_type: "text",
  video_url: "",
  resource_url: "",
  duration_seconds: 0,
  sort_order: 0,
  status: "published",
  is_required: true,
  weight: 1,
  completion_rule: "manual",
  completion_threshold: 90,
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
}

export default function LmsManager({ role }: { role: AdminRole }) {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseDraft, setCourseDraft] = useState({ title: "", slug: "", short_description: "", delivery_mode: "recorded" as Course["delivery_mode"], price: 1500 });
  const [courseSettings, setCourseSettings] = useState({ delivery_mode: "recorded" as Course["delivery_mode"], price: 1500, capacity: "", starts_at: "", ends_at: "" });
  const [versionDraft, setVersionDraft] = useState({ title: "", short_description: "", description: "", difficulty: "all_levels", estimated_minutes: 0, thumbnail_url: "", learning_outcomes: "", requirements: "", target_audience: "" });
  const [moduleDraft, setModuleDraft] = useState({ ...emptyModule });
  const [lessonDraft, setLessonDraft] = useState<(typeof emptyLesson & { id?: string; module: string }) | null>(null);
  const [studentEmail, setStudentEmail] = useState("");

  const meQuery = useQuery({ queryKey: ["lms-admin", "me"], queryFn: () => lmsApi<Me>("me/") });
  const organization = meQuery.data?.memberships.find((membership) =>
    membership.role === "organization_admin" || membership.role === "lms_manager"
  ) ?? (meQuery.data?.platform_role === "super_admin" ? meQuery.data.memberships[0] : undefined);
  const canEnroll = Boolean(organization) && (
    meQuery.data?.platform_role === "super_admin" || role === "owner" || role === "admin" || role === "editor"
  );
  const coursesQuery = useQuery({
    queryKey: ["lms-admin", "courses", organization?.organization_id],
    queryFn: () => lmsApi<Paged<Course>>(`admin/courses/?organization=${organization!.organization_id}&page_size=100`),
    enabled: Boolean(organization),
  });
  const courses = coursesQuery.data?.results ?? [];
  const course = courses.find((item) => item.id === courseId) ?? null;

  useEffect(() => {
    if (!course) return;
    const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
    setCourseSettings({
      delivery_mode: course.delivery_mode,
      price: Number(course.price),
      capacity: course.capacity?.toString() ?? "",
      starts_at: localDate(course.starts_at),
      ends_at: localDate(course.ends_at),
    });
  }, [course]);

  useEffect(() => {
    if (!courseId && courses[0]) setCourseId(courses[0].id);
  }, [courseId, courses]);

  const versionsQuery = useQuery({
    queryKey: ["lms-admin", "versions", courseId],
    queryFn: () => lmsApi<Paged<Version>>(`admin/course-versions/?course=${courseId}&page_size=100`),
    enabled: Boolean(courseId),
  });
  const versions = versionsQuery.data?.results ?? [];

  useEffect(() => {
    if (!versions.length) return;
    if (!versions.some((item) => item.id === versionId)) {
      setVersionId(versions.find((item) => item.status === "draft")?.id ?? versions[0].id);
    }
  }, [versionId, versions]);

  const version = versions.find((item) => item.id === versionId) ?? null;
  const editable = Boolean(version && version.status !== "published" && version.status !== "archived");

  useEffect(() => {
    if (!version) return;
    setVersionDraft({
      title: version.title,
      short_description: version.short_description,
      description: version.description,
      difficulty: version.difficulty,
      estimated_minutes: version.estimated_minutes,
      thumbnail_url: version.thumbnail_url,
      learning_outcomes: version.learning_outcomes ?? "",
      requirements: version.requirements ?? "",
      target_audience: version.target_audience ?? "",
    });
  }, [version]);
  const modulesQuery = useQuery({
    queryKey: ["lms-admin", "modules", versionId],
    queryFn: () => lmsApi<Paged<ModuleRow>>(`admin/modules/?course_version=${versionId}&page_size=100&ordering=sort_order`),
    enabled: Boolean(versionId),
  });
  const lessonsQuery = useQuery({
    queryKey: ["lms-admin", "lessons", versionId],
    queryFn: () => lmsApi<Paged<LessonRow>>(`admin/lessons/?course_version=${versionId}&page_size=100&ordering=sort_order`),
    enabled: Boolean(versionId),
  });
  const modules = modulesQuery.data?.results ?? [];
  const lessons = lessonsQuery.data?.results ?? [];
  const accessVersionId = course?.current_version_id ?? (version?.status === "published" ? version.id : "");
  const enrollmentsQuery = useQuery({
    queryKey: ["lms-admin", "enrollments", accessVersionId],
    queryFn: () => lmsApi<Paged<EnrollmentRow>>(`admin/enrollments/?course_version=${accessVersionId}&page_size=100`),
    enabled: canEnroll && Boolean(accessVersionId),
  });
  const enrollments = enrollmentsQuery.data?.results ?? [];
  const loading = meQuery.isLoading || coursesQuery.isLoading || versionsQuery.isLoading || modulesQuery.isLoading || lessonsQuery.isLoading;
  const queryError = meQuery.error ?? coursesQuery.error ?? versionsQuery.error ?? modulesQuery.error ?? lessonsQuery.error;

  const lessonsByModule = useMemo(() => {
    const grouped = new Map<string, LessonRow[]>();
    lessons.forEach((lesson) => grouped.set(lesson.module, [...(grouped.get(lesson.module) ?? []), lesson]));
    return grouped;
  }, [lessons]);

  const refresh = async (...keys: string[]) => {
    await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: ["lms-admin", key] })));
  };

  const createCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organization) return;
    if (courseDraft.price <= 0) {
      setError("كل الكورسات مدفوعة. أدخل سعرًا أكبر من صفر.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await lmsApi<Course>("admin/courses/", {
        method: "POST",
        body: JSON.stringify({ organization_id: organization.organization_id, ...courseDraft }),
      });
      setCourseDraft({ title: "", slug: "", short_description: "", delivery_mode: "recorded", price: 1500 });
      setShowCourseForm(false);
      await refresh("courses");
      setCourseId(created.id);
      setVersionId("");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const saveCourseSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!course) return;
    if (courseSettings.price <= 0) {
      setError("كل الكورسات مدفوعة. أدخل سعرًا أكبر من صفر.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await lmsApi(`admin/courses/${course.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          ...courseSettings,
          capacity: courseSettings.capacity ? Number(courseSettings.capacity) : null,
          starts_at: courseSettings.starts_at ? new Date(courseSettings.starts_at).toISOString() : null,
          ends_at: courseSettings.ends_at ? new Date(courseSettings.ends_at).toISOString() : null,
        }),
      });
      await refresh("courses");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const createVersion = async () => {
    if (!course || !version) return;
    setBusy(true);
    setError(null);
    try {
      const created = await lmsApi<Version>(`admin/course-versions/${version.id}/edit-copy/`, {
        method: "POST",
      });
      await refresh("versions");
      setVersionId(created.id);
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const saveVersionDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!version || !editable) return;
    setBusy(true);
    setError(null);
    try {
      await lmsApi(`admin/course-versions/${version.id}/`, {
        method: "PATCH",
        body: JSON.stringify(versionDraft),
      });
      await refresh("versions");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const uploadThumbnail = async (file: File) => {
    if (!course) return;
    setUploadingImage(true);
    setError(null);
    try {
      const publicUrl = await uploadPublicImage(file, "course-images", course.id);
      setVersionDraft((current) => ({ ...current, thumbnail_url: publicUrl }));
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setUploadingImage(false);
    }
  };

  const publishVersion = async () => {
    if (!version || !window.confirm(`نشر الإصدار ${version.version_number}؟ المحتوى المنشور يصبح غير قابل للتعديل.`)) return;
    setBusy(true);
    setError(null);
    try {
      await lmsApi(`admin/course-versions/${version.id}/publish/`, { method: "POST" });
      await refresh("versions", "courses", "enrollments");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const saveModule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!version || !editable) return;
    setBusy(true);
    setError(null);
    try {
      const path = moduleDraft.id ? `admin/modules/${moduleDraft.id}/` : "admin/modules/";
      await lmsApi(path, {
        method: moduleDraft.id ? "PATCH" : "POST",
        body: JSON.stringify({
          course_version: version.id,
          title: moduleDraft.title,
          description: moduleDraft.description,
          sort_order: moduleDraft.sort_order,
          status: moduleDraft.status,
        }),
      });
      setModuleDraft({ ...emptyModule, sort_order: modules.length });
      await refresh("modules");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const removeModule = async (module: ModuleRow) => {
    if (!editable || !window.confirm(`حذف وحدة «${module.title}» وكل دروسها؟`)) return;
    setBusy(true);
    try {
      await lmsApi(`admin/modules/${module.id}/`, { method: "DELETE" });
      await refresh("modules", "lessons");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const saveLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!lessonDraft || !editable) return;
    setBusy(true);
    setError(null);
    try {
      await lmsApi(lessonDraft.id ? `admin/lessons/${lessonDraft.id}/` : "admin/lessons/", {
        method: lessonDraft.id ? "PATCH" : "POST",
        body: JSON.stringify({ ...lessonDraft, id: undefined, weight: Number(lessonDraft.weight) }),
      });
      setLessonDraft(null);
      await refresh("lessons");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const removeLesson = async (lesson: LessonRow) => {
    if (!editable || !window.confirm(`حذف درس «${lesson.title}»؟`)) return;
    setBusy(true);
    try {
      await lmsApi(`admin/lessons/${lesson.id}/`, { method: "DELETE" });
      await refresh("lessons");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const enrollStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organization || !accessVersionId) return;
    setBusy(true);
    setError(null);
    try {
      await lmsApi("admin/enrollments/", {
        method: "POST",
        body: JSON.stringify({
          organization_id: organization.organization_id,
          student_email: studentEmail,
          course_version_id: accessVersionId,
        }),
      });
      setStudentEmail("");
      await refresh("enrollments");
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-300">Supabase LMS · authoritative</p>
          <h1 className="mt-1 text-[20px] font-black text-white">إدارة منصة التعلّم</h1>
          <p className="mt-2 max-w-2xl text-[10.5px] leading-6 text-white/40">الكورسات والإصدارات والصلاحيات والتقدم تُدار عبر Supabase Edge Functions.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[9px] font-bold text-white/40">الكورس
            <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setVersionId(""); }} className="mt-1 block min-w-56 rounded-lg border border-white/10 bg-[#131927] px-3 py-2 text-[10px] text-white">
              {courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <label className="text-[9px] font-bold text-white/40">الإصدار
            <select value={versionId} onChange={(event) => setVersionId(event.target.value)} className="mt-1 block min-w-36 rounded-lg border border-white/10 bg-[#131927] px-3 py-2 text-[10px] text-white">
              {versions.map((item) => <option key={item.id} value={item.id}>v{item.version_number} · {item.status}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setShowCourseForm((current) => !current)} className="admin-button-secondary"><CirclePlus className="h-3.5 w-3.5" /> كورس جديد</button>
        </div>
      </div>

      {(error || queryError) && <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[10.5px] leading-5 text-red-200"><span>{error ?? message(queryError)}</span><button type="button" onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button></div>}
      {loading && <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-300" /></div>}
      {!loading && !queryError && !organization && <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-[10.5px] leading-6 text-amber-100">حسابك لا يملك دور مدير مؤسسة أو مدير منصة تعلم. راجع عضوية المؤسسة في Supabase.</div>}

      {showCourseForm && organization && (
        <form onSubmit={createCourse} className="mt-5 grid gap-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.04] p-4 sm:grid-cols-2">
          <h2 className="text-[11px] font-black text-white sm:col-span-2">إنشاء كورس وإصداره الأول</h2>
          <label className="text-[9px] font-bold text-white/40">العنوان<input required value={courseDraft.title} onChange={(event) => setCourseDraft((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-1" /></label>
          <label className="text-[9px] font-bold text-white/40">Slug بالإنجليزية<input dir="ltr" required pattern="[a-z0-9-]+" value={courseDraft.slug} onChange={(event) => setCourseDraft((current) => ({ ...current, slug: event.target.value.toLowerCase() }))} className="admin-input mt-1 text-left" /></label>
          <label className="text-[9px] font-bold text-white/40 sm:col-span-2">وصف مختصر<textarea required rows={2} value={courseDraft.short_description} onChange={(event) => setCourseDraft((current) => ({ ...current, short_description: event.target.value }))} className="admin-input mt-1 resize-none" /></label>
          <label className="text-[9px] font-bold text-white/40">نوع التقديم<select value={courseDraft.delivery_mode} onChange={(event) => setCourseDraft((current) => ({ ...current, delivery_mode: event.target.value as Course["delivery_mode"] }))} className="admin-input mt-1"><option value="recorded">مسجل</option><option value="online">مباشر أونلاين</option><option value="onsite">حضوري</option><option value="hybrid">هجين</option></select></label>
          <label className="text-[9px] font-bold text-white/40">السعر بالجنيه<input type="number" min={1} required value={courseDraft.price} onChange={(event) => setCourseDraft((current) => ({ ...current, price: Number(event.target.value) }))} className="admin-input mt-1" /></label>
          <button disabled={busy} className="admin-button-primary w-fit"><Save className="h-3.5 w-3.5" /> إنشاء</button>
        </form>
      )}

      {course && version && !loading && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
            <div><p className="text-[9px] text-white/35">{course.title} · الإصدار {version.version_number}</p><p className="mt-1 text-[11px] font-bold text-white">{version.status === "published" ? "إصدار منشور ومحفوظ للطلاب الحاليين" : "إصدار قابل للتحرير"}</p></div>
            <div className="flex gap-2">
              {version.status === "published" && <button type="button" disabled={busy} onClick={() => void createVersion()} className="admin-button-secondary"><Edit3 className="h-3.5 w-3.5" /> تعديل كمسودة</button>}
              {editable && <button type="button" disabled={busy} onClick={() => void publishVersion()} className="admin-button-primary"><Rocket className="h-3.5 w-3.5" /> نشر الإصدار</button>}
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
            <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-[13px] font-black text-white">المنهج</h2><span className="text-[9px] text-white/30">{modules.length} وحدة · {lessons.length} درس</span></div>
              {modules.map((module, index) => (
                <div key={module.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.018]">
                  <div className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-[10px] font-black text-brand-300">{index + 1}</span><div><h3 className="text-[11.5px] font-black text-white">{module.title}</h3><p className="mt-0.5 text-[8.5px] text-white/30">{module.status} · {lessonsByModule.get(module.id)?.length ?? 0} درس</p></div></div>
                    {editable && <div className="flex gap-1"><button type="button" onClick={() => setModuleDraft(module)} className="admin-icon-button"><Edit3 className="h-3 w-3" /></button><button type="button" onClick={() => void removeModule(module)} className="admin-icon-button text-red-300"><Trash2 className="h-3 w-3" /></button></div>}
                  </div>
                  <div className="border-t border-white/[0.06] p-2.5">
                    {(lessonsByModule.get(module.id) ?? []).map((lesson) => (
                      <div key={lesson.id} className="mb-1 flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5"><div className="flex min-w-0 items-center gap-2.5"><BookOpen className="h-3.5 w-3.5 text-brand-300" /><div><p className="text-[10.5px] font-bold text-white/75">{lesson.title}</p><p className="text-[8px] text-white/25">{lesson.content_type} · {Math.ceil(lesson.duration_seconds / 60)} دقيقة · {lesson.status}</p></div></div>{editable && <div className="flex gap-1"><button type="button" onClick={() => setLessonDraft({ ...lesson })} className="admin-icon-button"><Edit3 className="h-3 w-3" /></button><button type="button" onClick={() => void removeLesson(lesson)} className="admin-icon-button text-red-300"><Trash2 className="h-3 w-3" /></button></div>}</div>
                    ))}
                    {editable && <button type="button" onClick={() => setLessonDraft({ ...emptyLesson, module: module.id, sort_order: lessonsByModule.get(module.id)?.length ?? 0 })} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-500/25 px-3 py-2.5 text-[9.5px] font-bold text-brand-300"><CirclePlus className="h-3.5 w-3.5" /> إضافة درس</button>}
                  </div>
                </div>
              ))}
              {!modules.length && <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-[10px] text-white/35">أضف أول وحدة إلى هذا الإصدار.</div>}
            </section>

            <aside className="space-y-5">
              {editable && <form onSubmit={saveVersionDetails} className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4"><h2 className="text-[11px] font-black text-white">تفاصيل الكورس وصورته</h2><label className="mt-3 block text-[9px] font-bold text-white/40">العنوان<input required value={versionDraft.title} onChange={(event) => setVersionDraft((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-1" /></label><label className="mt-3 block text-[9px] font-bold text-white/40">الوصف المختصر<textarea required rows={2} value={versionDraft.short_description} onChange={(event) => setVersionDraft((current) => ({ ...current, short_description: event.target.value }))} className="admin-input mt-1 resize-none" /></label><label className="mt-3 block text-[9px] font-bold text-white/40">الوصف الكامل<textarea rows={4} value={versionDraft.description} onChange={(event) => setVersionDraft((current) => ({ ...current, description: event.target.value }))} className="admin-input mt-1 resize-y" /></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[9px] font-bold text-white/40">المستوى<select value={versionDraft.difficulty} onChange={(event) => setVersionDraft((current) => ({ ...current, difficulty: event.target.value }))} className="admin-input mt-1"><option value="all_levels">كل المستويات</option><option value="beginner">مبتدئ</option><option value="intermediate">متوسط</option><option value="advanced">متقدم</option></select></label><label className="text-[9px] font-bold text-white/40">المدة بالدقائق<input type="number" min={0} value={versionDraft.estimated_minutes} onChange={(event) => setVersionDraft((current) => ({ ...current, estimated_minutes: Number(event.target.value) }))} className="admin-input mt-1" /></label></div><label className="mt-3 block text-[9px] font-bold text-white/40">صورة الكورس من الجهاز<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploadingImage} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadThumbnail(file); event.target.value = ""; }} className="admin-input mt-1 file:ml-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-[9px] file:font-black file:text-brand-700" /></label>{versionDraft.thumbnail_url && <img src={versionDraft.thumbnail_url} alt="معاينة صورة الكورس" className="mt-3 aspect-video w-full rounded-lg border border-white/10 object-cover" />}<button disabled={busy || uploadingImage} className="admin-button-primary mt-4 w-full justify-center">{uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} حفظ التفاصيل والصورة</button></form>}
              <form onSubmit={saveCourseSettings} className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4"><h2 className="text-[11px] font-black text-white">الحجز والموعد</h2><label className="mt-3 block text-[9px] font-bold text-white/40">نوع التقديم<select value={courseSettings.delivery_mode} onChange={(event) => setCourseSettings((current) => ({ ...current, delivery_mode: event.target.value as Course["delivery_mode"] }))} className="admin-input mt-1"><option value="recorded">مسجل</option><option value="online">مباشر أونلاين</option><option value="onsite">حضوري</option><option value="hybrid">هجين</option></select></label><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[9px] font-bold text-white/40">السعر<input type="number" min={0} value={courseSettings.price} onChange={(event) => setCourseSettings((current) => ({ ...current, price: Number(event.target.value) }))} className="admin-input mt-1" /></label><label className="text-[9px] font-bold text-white/40">السعة<input type="number" min={1} value={courseSettings.capacity} onChange={(event) => setCourseSettings((current) => ({ ...current, capacity: event.target.value }))} className="admin-input mt-1" /></label></div>{courseSettings.delivery_mode !== "recorded" && <div className="mt-3 grid gap-2"><label className="text-[9px] font-bold text-white/40">البداية<input type="datetime-local" value={courseSettings.starts_at} onChange={(event) => setCourseSettings((current) => ({ ...current, starts_at: event.target.value }))} className="admin-input mt-1" /></label><label className="text-[9px] font-bold text-white/40">النهاية<input type="datetime-local" value={courseSettings.ends_at} onChange={(event) => setCourseSettings((current) => ({ ...current, ends_at: event.target.value }))} className="admin-input mt-1" /></label></div>}<button disabled={busy} className="admin-button-secondary mt-4 w-full justify-center"><Save className="h-3.5 w-3.5" /> حفظ بيانات الحجز</button></form>
              {editable && <form onSubmit={saveModule} className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4"><div className="flex justify-between"><h2 className="text-[11px] font-black text-white">{moduleDraft.id ? "تعديل الوحدة" : "إضافة وحدة"}</h2>{moduleDraft.id && <button type="button" onClick={() => setModuleDraft({ ...emptyModule, sort_order: modules.length })} className="text-[9px] text-white/35">إلغاء</button>}</div><label className="mt-4 block text-[9px] font-bold text-white/40">اسم الوحدة<input required value={moduleDraft.title} onChange={(event) => setModuleDraft((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-1" /></label><label className="mt-3 block text-[9px] font-bold text-white/40">الوصف<textarea rows={2} value={moduleDraft.description} onChange={(event) => setModuleDraft((current) => ({ ...current, description: event.target.value }))} className="admin-input mt-1 resize-none" /></label><div className="mt-3 grid grid-cols-2 gap-2"><input type="number" min={0} value={moduleDraft.sort_order} onChange={(event) => setModuleDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} className="admin-input" /><select value={moduleDraft.status} onChange={(event) => setModuleDraft((current) => ({ ...current, status: event.target.value as ModuleRow["status"] }))} className="admin-input"><option value="published">منشورة</option><option value="draft">مسودة</option></select></div><button disabled={busy} className="admin-button-primary mt-4 w-full justify-center"><Save className="h-3.5 w-3.5" /> حفظ الوحدة</button></form>}

              {canEnroll && <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4"><h2 className="text-[11px] font-black text-white">وصول الطلاب</h2>{accessVersionId ? <><form onSubmit={enrollStudent} className="mt-3 flex gap-2"><input dir="ltr" required type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@email.com" className="admin-input min-w-0 flex-1 text-left" /><button disabled={busy} className="admin-button-primary shrink-0"><UserPlus className="h-3.5 w-3.5" /> تفعيل</button></form><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{enrollments.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/[0.025] p-2.5"><GraduationCap className="h-3.5 w-3.5 text-brand-300" /><div className="min-w-0 flex-1"><p className="truncate text-[9.5px] font-bold text-white/70">{item.student_name || "طالب"}</p><p dir="ltr" className="truncate text-right text-[8px] text-white/25">{item.student_email}</p></div><span className="text-[8px] font-bold text-brand-300">{Number(item.progress_percent)}%</span><span className="rounded-full bg-white/5 px-2 py-1 text-[8px] text-white/40">{item.status}</span></div>)}{!enrollments.length && <p className="py-4 text-center text-[9px] text-white/25">لا يوجد طلاب بعد.</p>}</div></> : <p className="mt-3 text-[9px] leading-5 text-amber-200/70">انشر الإصدار أولًا لتفعيل الطلاب عليه.</p>}</div>}
            </aside>
          </div>
        </>
      )}

      {lessonDraft && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"><form onSubmit={saveLesson} className="my-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#101622] p-5 sm:p-6"><div className="flex justify-between"><div><p className="text-[9px] font-bold text-brand-300">Course Version {version?.version_number}</p><h2 className="mt-1 text-[16px] font-black text-white">{lessonDraft.id ? "تعديل الدرس" : "درس جديد"}</h2></div><button type="button" onClick={() => setLessonDraft(null)} className="admin-icon-button"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-[9px] font-bold text-white/40 sm:col-span-2">العنوان<input required value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => current && ({ ...current, title: event.target.value }))} className="admin-input mt-1" /></label><label className="text-[9px] font-bold text-white/40">النوع<select value={lessonDraft.content_type} onChange={(event) => setLessonDraft((current) => current && ({ ...current, content_type: event.target.value as LessonRow["content_type"] }))} className="admin-input mt-1"><option value="text">نص</option><option value="video">فيديو</option><option value="audio">صوت</option><option value="document">مستند</option><option value="presentation">عرض</option><option value="external_url">رابط خارجي</option><option value="live">جلسة مباشرة</option></select></label><label className="text-[9px] font-bold text-white/40">قاعدة الإكمال<select value={lessonDraft.completion_rule} onChange={(event) => setLessonDraft((current) => current && ({ ...current, completion_rule: event.target.value as LessonRow["completion_rule"] }))} className="admin-input mt-1"><option value="manual">يدوي</option><option value="view">عند الفتح</option><option value="video_threshold">نسبة مشاهدة فيديو</option></select></label><label className="text-[9px] font-bold text-white/40 sm:col-span-2">الملخص<textarea rows={2} value={lessonDraft.summary} onChange={(event) => setLessonDraft((current) => current && ({ ...current, summary: event.target.value }))} className="admin-input mt-1 resize-none" /></label><label className="text-[9px] font-bold text-white/40 sm:col-span-2">محتوى الدرس<textarea rows={7} value={lessonDraft.content} onChange={(event) => setLessonDraft((current) => current && ({ ...current, content: event.target.value }))} className="admin-input mt-1 resize-y leading-6" /></label><label className="text-[9px] font-bold text-white/40">رابط الفيديو<input dir="ltr" type="url" value={lessonDraft.video_url} onChange={(event) => setLessonDraft((current) => current && ({ ...current, video_url: event.target.value }))} className="admin-input mt-1 text-left" /></label><label className="text-[9px] font-bold text-white/40">رابط المرفق<input dir="ltr" type="url" value={lessonDraft.resource_url} onChange={(event) => setLessonDraft((current) => current && ({ ...current, resource_url: event.target.value }))} className="admin-input mt-1 text-left" /></label><label className="text-[9px] font-bold text-white/40">المدة بالثواني<input type="number" min={0} value={lessonDraft.duration_seconds} onChange={(event) => setLessonDraft((current) => current && ({ ...current, duration_seconds: Number(event.target.value) }))} className="admin-input mt-1" /></label><label className="text-[9px] font-bold text-white/40">الترتيب<input type="number" min={0} value={lessonDraft.sort_order} onChange={(event) => setLessonDraft((current) => current && ({ ...current, sort_order: Number(event.target.value) }))} className="admin-input mt-1" /></label><label className="flex items-center gap-2 text-[9px] font-bold text-white/50"><input type="checkbox" checked={lessonDraft.is_required} onChange={(event) => setLessonDraft((current) => current && ({ ...current, is_required: event.target.checked }))} /> درس مطلوب</label><label className="text-[9px] font-bold text-white/40">الحالة<select value={lessonDraft.status} onChange={(event) => setLessonDraft((current) => current && ({ ...current, status: event.target.value as LessonRow["status"] }))} className="admin-input mt-1"><option value="published">منشور</option><option value="draft">مسودة</option></select></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setLessonDraft(null)} className="admin-button-secondary">إلغاء</button><button disabled={busy} className="admin-button-primary"><Save className="h-3.5 w-3.5" /> حفظ الدرس</button></div></form></div>}
    </div>
  );
}
