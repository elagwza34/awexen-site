import { lmsApi } from "./lmsApi";

export type LmsCourse = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  instructor: string;
  duration: number;
  featured_image: string | null;
  version_id: string;
  version_number: number;
  delivery_mode: "recorded" | "online" | "onsite" | "hybrid";
  starts_at: string | null;
  ends_at: string | null;
};

export type CurrentLmsUser = {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  platform_role: "student" | "support" | "super_admin";
  memberships: Array<{
    organization_id: string;
    organization_slug: string;
    organization_name: string;
    role: string;
  }>;
};

export type CheckoutCourse = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  delivery_mode: LmsCourse["delivery_mode"];
  price: string | number;
  currency: string;
  capacity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  version_id: string;
};

export type CourseBooking = {
  id: string;
  status: "awaiting_payment" | "payment_submitted" | "approved" | "rejected" | "cancelled";
  amount: string | number;
  currency: string;
  payment_method: "instapay" | "vodafone_cash" | "";
  payment_phone: string;
  phone: string;
  experience_level: string;
  goal: string;
  proof_path: string;
  proof_content_type: string;
  proof_size: number | null;
  payment_submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string;
  enrollment_id: string | null;
  created_at: string;
  course: {
    id: string;
    slug: string;
    title: string;
    delivery_mode: LmsCourse["delivery_mode"];
    starts_at: string | null;
    ends_at: string | null;
    version_id: string;
  };
};

export type StudentEnrollment = {
  id: string;
  status: "pending" | "active" | "paused" | "completed" | "withdrawn" | "rejected" | "cancelled" | "expired";
  enrolled_at: string;
  completed_at: string | null;
  course: LmsCourse;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  accessValid: boolean;
};

export type CourseLesson = {
  id: string;
  section_id: string;
  title: string;
  summary: string;
  content: string;
  content_type: "text" | "video" | "audio" | "document" | "presentation" | "external_url" | "live";
  video_url: string | null;
  resource_url: string | null;
  duration_minutes: number;
  duration_seconds: number;
  sort_order: number;
  completion_rule: "manual" | "view" | "video_threshold";
  completion_threshold: number;
};

export type CourseSection = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  lessons: CourseLesson[];
};

export type LessonProgress = {
  lesson_id: string;
  completed: boolean;
  last_position_seconds: number;
};

export type LearningCourse = {
  enrollment: {
    id: string;
    status: StudentEnrollment["status"];
    enrolled_at: string;
    completed_at: string | null;
  };
  course: LmsCourse;
  sections: CourseSection[];
  progress: LessonProgress[];
  progressPercent: number;
};

type ApiEnrollment = {
  id: string;
  status: StudentEnrollment["status"];
  enrolled_at: string;
  completed_at: string | null;
  course: LmsCourse;
  progress_percent: string | number;
  completed_lessons: number;
  total_lessons: number;
  access_valid: boolean;
};

type ApiLearningLesson = {
  id: string;
  title: string;
  summary: string;
  content: string;
  content_type: CourseLesson["content_type"];
  video_url: string;
  resource_url: string;
  duration_seconds: number;
  sort_order: number;
  completion_rule: CourseLesson["completion_rule"];
  completion_threshold: number;
  completed: boolean;
  last_position_seconds: number;
};

type ApiLearningCourse = {
  enrollment: {
    id: string;
    status: StudentEnrollment["status"];
    enrolled_at: string;
    completed_at: string | null;
  };
  course: LmsCourse;
  modules: Array<{
    id: string;
    title: string;
    description: string;
    sort_order: number;
    lessons: ApiLearningLesson[];
  }>;
  progress: { percent: string | number; completed_at: string | null };
};

export async function loadStudentEnrollments(): Promise<StudentEnrollment[]> {
  const rows = await lmsApi<ApiEnrollment[]>("learning/enrollments/");
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    enrolled_at: row.enrolled_at,
    completed_at: row.completed_at,
    course: row.course,
    completedLessons: row.completed_lessons,
    totalLessons: row.total_lessons,
    progressPercent: Number(row.progress_percent),
    accessValid: row.access_valid,
  }));
}

export function loadCurrentLmsUser() {
  return lmsApi<CurrentLmsUser>("me/");
}

export function loadCheckoutCourse(slug: string) {
  return lmsApi<CheckoutCourse>(`checkout/courses/${slug}/`);
}

export function loadMyBookings() {
  return lmsApi<CourseBooking[]>("bookings/?page_size=100");
}

export function createBooking(payload: {
  course_slug: string;
  phone: string;
  experience_level: string;
  goal: string;
  payment_method: "instapay" | "vodafone_cash";
}) {
  return lmsApi<CourseBooking>("bookings/", { method: "POST", body: JSON.stringify(payload) });
}

export function submitBookingProof(bookingId: string, payload: { proof_path: string; content_type: string; size: number }) {
  return lmsApi<CourseBooking>(`bookings/${bookingId}/submit-proof/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loadLearningCourse(enrollmentId: string): Promise<LearningCourse> {
  const row = await lmsApi<ApiLearningCourse>(`learning/enrollments/${enrollmentId}/`);
  const progress: LessonProgress[] = [];
  const sections = row.modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    sort_order: module.sort_order,
    lessons: module.lessons.map((lesson) => {
      progress.push({
        lesson_id: lesson.id,
        completed: lesson.completed,
        last_position_seconds: lesson.last_position_seconds,
      });
      return {
        id: lesson.id,
        section_id: module.id,
        title: lesson.title,
        summary: lesson.summary,
        content: lesson.content,
        content_type: lesson.content_type,
        video_url: lesson.video_url || null,
        resource_url: lesson.resource_url || null,
        duration_minutes: Math.ceil(lesson.duration_seconds / 60),
        duration_seconds: lesson.duration_seconds,
        sort_order: lesson.sort_order,
        completion_rule: lesson.completion_rule,
        completion_threshold: lesson.completion_threshold,
      };
    }),
  }));
  return {
    enrollment: row.enrollment,
    course: row.course,
    sections,
    progress,
    progressPercent: Number(row.progress.percent),
  };
}

type ProgressEventResponse = {
  lesson: { id: string; status: string; completed: boolean; last_position_seconds: number };
  course_progress_percent: string | number;
};

async function sendProgressEvent(
  enrollmentId: string,
  lessonId: string,
  eventType: "lesson_started" | "lesson_viewed" | "lesson_completed" | "video_progress",
  positionSeconds = 0,
) {
  return lmsApi<ProgressEventResponse>("progress/events/", {
    method: "POST",
    body: JSON.stringify({
      event_id: crypto.randomUUID(),
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      event_type: eventType,
      position_seconds: positionSeconds,
      occurred_at: new Date().toISOString(),
    }),
  });
}

export function recordLessonStarted(enrollmentId: string, lessonId: string, completeOnView = false) {
  return sendProgressEvent(enrollmentId, lessonId, completeOnView ? "lesson_viewed" : "lesson_started");
}

export function setLessonCompleted(enrollmentId: string, lessonId: string) {
  return sendProgressEvent(enrollmentId, lessonId, "lesson_completed");
}

export function recordVideoProgress(enrollmentId: string, lessonId: string, positionSeconds: number) {
  return sendProgressEvent(enrollmentId, lessonId, "video_progress", Math.max(0, Math.floor(positionSeconds)));
}
