import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Eye, FileCheck2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { lmsApi } from "../lib/lmsApi";
import ProofViewer from "./ProofViewer";
import type { AdminRole } from "./types";

type Paged<T> = { count: number; results: T[] };
type ApprovalView = "courses" | "payments";
type Booking = {
  id: string;
  status: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_phone: string;
  phone: string;
  proof_path: string;
  review_notes?: string;
  created_at: string;
  payment_submitted_at: string | null;
  student_name: string;
  student_email: string;
  course: { title: string; slug: string };
};
type Version = {
  id: string;
  course: string;
  version_number: number;
  status: string;
  title: string;
  short_description: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  submitted_at: string | null;
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
}

export default function LmsApprovals({ role, view }: { role: AdminRole; view: ApprovalView }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proofBookingId, setProofBookingId] = useState<string | null>(null);
  const canReviewPayments = ["owner", "admin", "editor", "support"].includes(role);
  const canReviewCourses = ["owner", "admin", "editor"].includes(role);
  const showPayments = view === "payments" && canReviewPayments;
  const showCourses = view === "courses" && canReviewCourses;

  const paymentsQuery = useQuery({
    queryKey: ["lms-approvals", "payments"],
    queryFn: () => lmsApi<Paged<Booking>>(
      "admin/payment-bookings/?statuses=awaiting_payment,payment_submitted&page_size=100&ordering=-created_at",
    ),
    enabled: showPayments,
  });
  /* السجل المحفوظ: الطلبات المنتهية (موافَق عليها / مرفوضة / ملغاة) */
  const historyQuery = useQuery({
    queryKey: ["lms-approvals", "payments-history"],
    queryFn: () => lmsApi<Paged<Booking>>(
      "admin/payment-bookings/?statuses=approved,rejected,cancelled&page_size=100&ordering=-created_at",
    ),
    enabled: showPayments,
  });
  const coursesQuery = useQuery({
    queryKey: ["lms-approvals", "courses"],
    queryFn: () => lmsApi<Paged<Version>>("admin/course-versions/?status=in_review&page_size=100&ordering=-created_at"),
    enabled: showCourses,
  });
  const payments = paymentsQuery.data?.results ?? [];
  const history = historyQuery.data?.results ?? [];
  const versions = coursesQuery.data?.results ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lms-approvals"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
    ]);
  };

  const act = async (id: string, path: string, payload: object = {}) => {
    setBusyId(id);
    setError(null);
    try {
      await lmsApi(path, { method: "POST", body: JSON.stringify(payload) });
      await refresh();
    } catch (operationError) {
      setError(message(operationError));
    } finally {
      setBusyId("");
    }
  };

  const reject = (id: string, path: string) => {
    const reason = window.prompt("اكتب سبب الرفض الذي سيظهر لصاحب الطلب:");
    if (!reason?.trim()) return;
    void act(id, path, { reason });
  };

  const openProof = (booking: Booking) => {
    setError(null);
    if (!booking.proof_path) {
      setError("لم يتم رفع إثبات دفع لهذا الطلب بعد.");
      return;
    }
    setProofBookingId(booking.id);
  };

  const loading = showPayments ? paymentsQuery.isLoading : coursesQuery.isLoading;
  const queryError = showPayments ? paymentsQuery.error : coursesQuery.error;
  const heading = showPayments ? "طلبات الطلاب وإثباتات الدفع" : "مراجعة كورسات المدربين";
  const description = showPayments
    ? "تابع طلب الطالب من لحظة التقديم، ثم راجع إثبات الدفع لتفعيل وصوله إلى الكورس."
    : "راجع النسخة التي أرسلها المدرب؛ الموافقة تنشر الكورس مباشرة للطلاب.";

  return (
    <div>
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-300">LMS approvals</p>
          <h1 className="mt-1 text-[20px] font-black">{heading}</h1>
          <p className="mt-2 text-[10.5px] text-white/40">{description}</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="admin-button-secondary">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </div>

      {(error || queryError) && (
        <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[10.5px] text-red-200">
          {error ?? message(queryError)}
        </p>
      )}
      {loading && <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-300" /></div>}

      {showPayments && !loading && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-black">طلبات الكورسات</h2>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[9px] font-bold text-brand-300">
              {paymentsQuery.data?.count ?? payments.length} طلب يحتاج متابعة
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {payments.map((booking) => {
              const proofSubmitted = booking.status === "payment_submitted";
              const submittedAt = booking.payment_submitted_at || booking.created_at;
              return (
                <article key={booking.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] font-black">{booking.course.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${proofSubmitted ? "bg-blue-500/10 text-blue-300" : "bg-amber-500/10 text-amber-300"}`}>
                        {proofSubmitted ? "إثبات الدفع قيد المراجعة" : "في انتظار رفع الإثبات"}
                      </span>
                    </div>
                    <p dir="ltr" className="mt-1 text-right text-[9px] text-white/35">
                      {booking.student_name || "متدرب"} · {booking.student_email} · {booking.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-200">
                      {Number(booking.amount).toLocaleString("ar-EG")} {booking.currency} · {booking.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}
                    </p>
                    <p className="mt-1 text-[8.5px] text-white/30">
                      {proofSubmitted ? "أُرسل الإثبات" : "قُدّم الطلب"} {submittedAt ? new Date(submittedAt).toLocaleString("ar-EG") : "الآن"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {proofSubmitted ? (
                      <>
                        <button type="button" onClick={() => void openProof(booking)} className="admin-button-secondary">
                          <Eye className="h-3.5 w-3.5" /> الإثبات
                        </button>
                        <button type="button" disabled={busyId === booking.id} onClick={() => void act(booking.id, `admin/payment-bookings/${booking.id}/approve/`)} className="admin-button-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تأكيد
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/15 px-3 py-2 text-[9px] font-bold text-amber-300">
                        <Clock3 className="h-3.5 w-3.5" /> انتظار الدفع
                      </span>
                    )}
                    <button type="button" disabled={busyId === booking.id} onClick={() => reject(booking.id, `admin/payment-bookings/${booking.id}/reject/`)} className="admin-button-secondary text-red-300">
                      <XCircle className="h-3.5 w-3.5" /> رفض
                    </button>
                  </div>
                </article>
              );
            })}
            {!payments.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] text-white/30">
                لا توجد طلبات كورسات تحتاج متابعة.
              </div>
            )}
          </div>
        </section>
      )}

      {/* السجل المحفوظ للطلبات المنتهية */}
      {showPayments && !loading && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-black">سجل الطلبات المنتهية</h2>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-white/45">
              {historyQuery.data?.count ?? history.length} سجل محفوظ
            </span>
          </div>
          <p className="mt-1 text-[9px] text-white/30">
            كل الطلبات التي تمت الموافقة عليها أو رفضها أو إلغاؤها — تبقى محفوظة للرجوع إليها.
          </p>
          <div className="mt-3 space-y-2">
            {history.map((booking) => (
              <article
                key={booking.id}
                className="grid gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black">{booking.course.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] font-black ${
                        booking.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : booking.status === "rejected"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {booking.status === "approved"
                        ? "تمت الموافقة"
                        : booking.status === "rejected"
                          ? "مرفوض"
                          : "ملغي"}
                    </span>
                  </div>
                  <p dir="ltr" className="mt-1 text-right text-[9px] text-white/30">
                    {booking.student_name || "متدرب"} · {booking.student_email}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/55">
                    {Number(booking.amount).toLocaleString("ar-EG")} {booking.currency} ·{" "}
                    {booking.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}
                  </p>
                  <p className="mt-1 text-[8.5px] text-white/25">
                    {booking.review_notes
                      ? `ملاحظة: ${booking.review_notes}`
                      : booking.payment_submitted_at
                        ? `عولج في ${new Date(booking.payment_submitted_at).toLocaleString("ar-EG")}`
                        : `قُدّم في ${new Date(booking.created_at).toLocaleString("ar-EG")}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {booking.proof_path ? (
                    <button
                      type="button"
                      onClick={() => openProof(booking)}
                      className="admin-button-secondary"
                    >
                      <Eye className="h-3.5 w-3.5" /> الإثبات
                    </button>
                  ) : (
                    <span className="px-2 text-[9px] text-white/25">لا يوجد إثبات</span>
                  )}
                </div>
              </article>
            ))}
            {!history.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] text-white/30">
                لا يوجد سجل محفوظ بعد — الطلبات المكتملة تظهر هنا تلقائيًا.
              </div>
            )}
          </div>
        </section>
      )}

      {showCourses && !loading && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-black">كورسات المدربين</h2>
            <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[9px] font-bold text-brand-300">
              {coursesQuery.data?.count ?? versions.length} قيد المراجعة
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {versions.map((version) => (
              <article key={version.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand-300" /><p className="text-[11px] font-black">{version.title}</p></div>
                  <p className="mt-1 line-clamp-2 text-[9px] leading-5 text-white/35">{version.short_description || version.description}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/45">الإصدار {version.version_number} · {version.difficulty} · {version.estimated_minutes} دقيقة</p>
                  <p className="mt-1 text-[8.5px] text-white/25">أُرسل {version.submitted_at ? new Date(version.submitted_at).toLocaleString("ar-EG") : "الآن"}</p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" disabled={busyId === version.id} onClick={() => void act(version.id, `admin/course-versions/${version.id}/publish/`)} className="admin-button-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> موافقة ونشر
                  </button>
                  <button type="button" disabled={busyId === version.id} onClick={() => reject(version.id, `admin/course-versions/${version.id}/reject/`)} className="admin-button-secondary text-red-300">
                    <XCircle className="h-3.5 w-3.5" /> رفض
                  </button>
                </div>
              </article>
            ))}
            {!versions.length && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] text-white/30">
                لا توجد كورسات تنتظر المراجعة.
              </div>
            )}
          </div>
        </section>
      )}

      {proofBookingId && (
        <ProofViewer bookingId={proofBookingId} onClose={() => setProofBookingId(null)} />
      )}
    </div>
  );
}
