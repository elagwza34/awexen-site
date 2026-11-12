import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { lmsApi } from "../lib/lmsApi";
import type { AdminRole } from "./types";

type Paged<T> = { count: number; results: T[] };
type Me = {
  platform_role: "student" | "support" | "super_admin";
  memberships: Array<{ organization_id: string; organization_name: string; role: string }>;
};
type Course = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  price: string | number;
  currency: string;
  capacity: number | null;
  delivery_mode: string;
  current_version_id: string | null;
  duration_months?: number | null;
  modules_count?: number | null;
};
type Instructor = { id: string; email: string; full_name: string };
type Assignment = { instructor_id: string; full_name: string; email: string; is_lead: boolean };

const STATUS_LABEL: Record<Course["status"], string> = {
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
}

export default function CourseAssignments({ role }: { role: AdminRole }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentsCourse, setStudentsCourse] = useState<Course | null>(null);
  const [emails, setEmails] = useState("");

  const meQuery = useQuery({ queryKey: ["lms-admin", "me"], queryFn: () => lmsApi<Me>("me/") });
  const organization = meQuery.data?.memberships.find((membership) =>
    membership.role === "organization_admin" || membership.role === "lms_manager"
  ) ?? (meQuery.data?.platform_role === "super_admin" ? meQuery.data.memberships[0] : undefined);
  const canManage = Boolean(organization) && (
    meQuery.data?.platform_role === "super_admin" || role === "owner" || role === "admin" || role === "editor"
  );

  const coursesQuery = useQuery({
    queryKey: ["lms-assignments", "courses", organization?.organization_id],
    queryFn: () => lmsApi<Paged<Course>>(`admin/courses/?organization=${organization!.organization_id}&page_size=100`),
    enabled: Boolean(organization),
  });
  const instructorsQuery = useQuery({
    queryKey: ["lms-assignments", "instructors"],
    queryFn: () => lmsApi<Instructor[]>("admin/instructors/"),
    enabled: Boolean(organization),
  });

  const courses = coursesQuery.data?.results ?? [];
  const instructors = instructorsQuery.data ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => `${course.title} ${course.slug}`.toLowerCase().includes(query));
  }, [courses, search]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lms-assignments", "courses"] }),
      queryClient.invalidateQueries({ queryKey: ["lms-assignments", "instructors"] }),
      queryClient.invalidateQueries({ queryKey: ["lms-assignments", "enrollments"] }),
    ]);
  };

  const assignInstructor = async (course: Course, instructorId: string) => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      if (!instructorId) {
        const current = await lmsApi<Assignment[]>(`admin/courses/${course.id}/instructors/`);
        const lead = current.find((item) => item.is_lead) ?? current[0];
        if (lead) {
          await lmsApi(`admin/courses/${course.id}/instructors/${lead.instructor_id}/`, { method: "DELETE" });
        }
      } else {
        await lmsApi(`admin/courses/${course.id}/instructors/`, {
          method: "POST",
          body: JSON.stringify({ user_id: instructorId }),
        });
      }
      await refresh();
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const enrollStudents = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentsCourse || !organization) return;
    const versionId = studentsCourse.current_version_id;
    if (!versionId) {
      setError("انشر إصدارًا للكورس أولًا قبل تعيين الطلاب.");
      return;
    }
    const list = emails
      .split(/[\n,;\s]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /.+@.+\..+/.test(value));
    if (!list.length) {
      setError("أدخل بريدًا إلكترونيًا صحيحًا واحدًا على الأقل.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      for (const email of Array.from(new Set(list))) {
        await lmsApi("admin/enrollments/", {
          method: "POST",
          body: JSON.stringify({
            organization_id: studentsCourse.organization_id,
            student_email: email,
            course_version_id: versionId,
          }),
        });
      }
      setEmails("");
      setStudentsCourse(null);
      await refresh();
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusy(false);
    }
  };

  const loading = meQuery.isLoading || coursesQuery.isLoading || instructorsQuery.isLoading;
  const queryError = meQuery.error ?? coursesQuery.error ?? instructorsQuery.error;

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black text-brand-600">التدريب</p>
          <h2 className="mt-1 text-[24px] font-black">تعيين المحاضرين والطلاب</h2>
          <p className="mt-2 text-[12px] text-ink-500">إضافة وتعديل الكورسات يتم من «محتوى منصة التعلّم». من هنا تختار المحاضر والطلاب لكل كورس.</p>
        </div>
        <label className="w-full text-[10px] font-bold text-ink-500 sm:w-72">
          بحث
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الكورس" className="admin-input mt-0 w-full pe-9" />
          </span>
        </label>
      </div>

      {(error || queryError) && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[10.5px] leading-5 text-red-200">
          <span>{error ?? message(queryError)}</span>
          <button type="button" onClick={() => setError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {loading && <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-300" /></div>}

      {!loading && !queryError && !organization && (
        <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-[10.5px] leading-6 text-amber-100">حسابك لا يملك دور مدير مؤسسة أو مدير منصة تعلّم.</div>
      )}

      {!loading && !queryError && organization && (
        <div className="mt-5 space-y-2">
          {filtered.map((course) => {
            return (
              <CourseRow
                key={course.id}
                course={course}
                instructors={instructors}
                canManage={canManage}
                busy={busy}
                onAssign={(instructorId) => void assignInstructor(course, instructorId)}
                onOpenStudents={() => setStudentsCourse(course)}
              />
            );
          })}
          {!filtered.length && (
            <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-[10px] text-white/35">
              {courses.length ? "لا توجد كورسات مطابقة للبحث." : "لا توجد كورسات بعد. أضف كورسًا من «محتوى منصة التعلّم»."}
            </div>
          )}
        </div>
      )}

      {studentsCourse && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={enrollStudents} className="my-6 w-full max-w-lg rounded-2xl border border-white/10 bg-[#101622] p-5 sm:p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-[9px] font-bold text-brand-300">تعيين طلاب</p>
                <h2 className="mt-1 text-[16px] font-black text-white">{studentsCourse.title}</h2>
              </div>
              <button type="button" onClick={() => setStudentsCourse(null)} className="admin-icon-button"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-5 block text-[9px] font-bold text-white/40">
              البريد الإلكتروني للطلاب (واحد في كل سطر)
              <textarea
                required
                rows={6}
                dir="ltr"
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                placeholder={"student1@email.com\nstudent2@email.com"}
                className="admin-input mt-1 resize-y text-left leading-6"
              />
            </label>
            {!studentsCourse.current_version_id && (
              <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/10 p-2.5 text-[9.5px] leading-5 text-amber-100">انشر إصدارًا للكورس أولًا من «محتوى منصة التعلّم».</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setStudentsCourse(null)} className="admin-button-secondary">إلغاء</button>
              <button disabled={busy || !studentsCourse.current_version_id} className="admin-button-primary"><UserPlus className="h-3.5 w-3.5" /> تعيين الطلاب</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CourseRow({
  course,
  instructors,
  canManage,
  busy,
  onAssign,
  onOpenStudents,
}: {
  course: Course;
  instructors: Instructor[];
  canManage: boolean;
  busy: boolean;
  onAssign: (instructorId: string) => void;
  onOpenStudents: () => void;
}) {
  const assignmentsQuery = useQuery({
    queryKey: ["lms-assignments", "course-instructors", course.id],
    queryFn: () => lmsApi<Assignment[]>(`admin/courses/${course.id}/instructors/`),
    enabled: Boolean(course.current_version_id) || course.status === "draft",
  });
  const assignments = assignmentsQuery.data ?? [];
  const leadAssignment = assignments.find((item) => item.is_lead) ?? assignments[0];

  return (
    <article className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-500" />
            <h3 className="truncate text-[13px] font-black text-ink-900">{course.title}</h3>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[8.5px] font-bold text-ink-500">{STATUS_LABEL[course.status] ?? course.status}</span>
          </div>
          <p className="mt-1 text-[10px] text-ink-400">
            {course.duration_months ? `${course.duration_months} شهر · ` : ""}
            {course.modules_count ? `${course.modules_count} وحدة · ` : ""}
            {course.capacity ? `${course.capacity} مقعد` : "بدون حد مقاعد"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[9px] font-bold text-ink-500">
            المحاضر
            <select
              value={leadAssignment?.instructor_id ?? ""}
              disabled={!canManage || busy}
              onChange={(event) => onAssign(event.target.value)}
              className="admin-input mt-1 block min-w-52"
            >
              <option value="">بدون تعيين</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>{instructor.full_name || instructor.email}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onOpenStudents} className="admin-button-secondary">
            <Users className="h-3.5 w-3.5" /> تعيين طلاب
          </button>
        </div>
      </div>
      {assignments.length > 0 && (
        <p className="mt-2 text-[9px] text-ink-400">
          المحاضر الحالي: {assignments.map((item) => item.full_name || item.email).join("، ")}
        </p>
      )}
    </article>
  );
}