import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, FileCheck2, Loader2, RefreshCw, XCircle } from "lucide-react";

import { lmsApi } from "../lib/lmsApi";
import { supabase } from "../lib/supabase";
import type { AdminRole } from "./types";


type Paged<T> = { count: number; results: T[] };
type Booking = {
  id: string; status: string; amount: string; currency: string; payment_method: string; payment_phone: string;
  phone: string; proof_path: string; payment_submitted_at: string | null; student_name: string; student_email: string;
  course: { title: string; slug: string };
};
type Version = {
  id: string; course: string; version_number: number; status: string; title: string; short_description: string;
  description: string; difficulty: string; estimated_minutes: number; submitted_at: string | null;
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
}

export default function LmsApprovals({ role }: { role: AdminRole }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canReviewPayments = ["owner", "admin", "editor", "support"].includes(role);
  const canReviewCourses = ["owner", "admin", "editor"].includes(role);
  const paymentsQuery = useQuery({
    queryKey: ["lms-approvals", "payments"],
    queryFn: () => lmsApi<Paged<Booking>>("admin/payment-bookings/?status=payment_submitted&page_size=100&ordering=payment_submitted_at"),
    enabled: canReviewPayments,
  });
  const coursesQuery = useQuery({
    queryKey: ["lms-approvals", "courses"],
    queryFn: () => lmsApi<Paged<Version>>("admin/course-versions/?status=in_review&page_size=100"),
    enabled: canReviewCourses,
  });
  const payments = paymentsQuery.data?.results ?? [];
  const versions = coursesQuery.data?.results ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["lms-approvals"] });
  const act = async (id: string, path: string, payload: object = {}) => {
    setBusyId(id); setError(null);
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

  const openProof = async (booking: Booking) => {
    setError(null);
    if (!supabase || !booking.proof_path) return;
    const { data, error: signedError } = await supabase.storage.from("payment-proofs").createSignedUrl(booking.proof_path, 300);
    if (signedError) setError(message(signedError));
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const loading = paymentsQuery.isLoading || coursesQuery.isLoading;
  const queryError = paymentsQuery.error ?? coursesQuery.error;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.07] pb-5"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-300">LMS approvals</p><h1 className="mt-1 text-[20px] font-black">مراجعة المدفوعات والكورسات</h1><p className="mt-2 text-[10.5px] text-white/40">القبول هو الإجراء الوحيد الذي يفعّل وصول الطالب أو ينشر كورس المدرب.</p></div><button type="button" onClick={() => void refresh()} className="admin-button-secondary"><RefreshCw className="h-3.5 w-3.5" /> تحديث</button></div>
      {(error || queryError) && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-[10.5px] text-red-200">{error ?? message(queryError)}</p>}
      {loading && <div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-300" /></div>}

      {canReviewPayments && <section className="mt-6"><div className="flex items-center justify-between"><h2 className="text-[13px] font-black">إثباتات الدفع</h2><span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[9px] font-bold text-brand-300">{payments.length} قيد المراجعة</span></div><div className="mt-3 space-y-2">{payments.map((booking) => <article key={booking.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center"><div><p className="text-[11px] font-black">{booking.course.title}</p><p dir="ltr" className="mt-1 text-right text-[9px] text-white/35">{booking.student_name || "متدرب"} · {booking.student_email} · {booking.phone}</p></div><div><p className="text-[10px] font-bold text-brand-200">{Number(booking.amount).toLocaleString("ar-EG")} {booking.currency} · {booking.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}</p><p className="mt-1 text-[8.5px] text-white/30">أُرسل {booking.payment_submitted_at ? new Date(booking.payment_submitted_at).toLocaleString("ar-EG") : "الآن"}</p></div><div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => void openProof(booking)} className="admin-button-secondary"><Eye className="h-3.5 w-3.5" /> الإثبات</button><button type="button" disabled={busyId === booking.id} onClick={() => void act(booking.id, `admin/payment-bookings/${booking.id}/approve/`)} className="admin-button-primary"><CheckCircle2 className="h-3.5 w-3.5" /> تأكيد</button><button type="button" disabled={busyId === booking.id} onClick={() => reject(booking.id, `admin/payment-bookings/${booking.id}/reject/`)} className="admin-button-secondary text-red-300"><XCircle className="h-3.5 w-3.5" /> رفض</button></div></article>)}{!payments.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] text-white/30">لا توجد إثباتات دفع تنتظر المراجعة.</div>}</div></section>}

      {canReviewCourses && <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-[13px] font-black">كورسات المدربين</h2><span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-[9px] font-bold text-brand-300">{versions.length} قيد المراجعة</span></div><div className="mt-3 space-y-2">{versions.map((version) => <article key={version.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-center"><div><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-brand-300" /><p className="text-[11px] font-black">{version.title}</p></div><p className="mt-1 line-clamp-2 text-[9px] leading-5 text-white/35">{version.short_description || version.description}</p></div><div><p className="text-[9px] text-white/45">الإصدار {version.version_number} · {version.difficulty} · {version.estimated_minutes} دقيقة</p><p className="mt-1 text-[8.5px] text-white/25">أُرسل {version.submitted_at ? new Date(version.submitted_at).toLocaleString("ar-EG") : "الآن"}</p></div><div className="flex gap-1.5"><button type="button" disabled={busyId === version.id} onClick={() => void act(version.id, `admin/course-versions/${version.id}/publish/`)} className="admin-button-primary"><CheckCircle2 className="h-3.5 w-3.5" /> موافقة ونشر</button><button type="button" disabled={busyId === version.id} onClick={() => reject(version.id, `admin/course-versions/${version.id}/reject/`)} className="admin-button-secondary text-red-300"><XCircle className="h-3.5 w-3.5" /> رفض</button></div></article>)}{!versions.length && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-[10px] text-white/30">لا توجد كورسات تنتظر المراجعة.</div>}</div></section>}
    </div>
  );
}
