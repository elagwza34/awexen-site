import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Copy, CreditCard, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { supabase } from "../lib/supabase";
import {
  createBooking,
  loadCheckoutCourse,
  loadMyBookings,
  submitBookingProof,
  type CourseBooking,
} from "../lib/lms";
import { isFallbackCourse } from "../lib/cms";
import { LMS_STALE_TIME_MS } from "../lib/lmsApi";


const statusText: Record<CourseBooking["status"], string> = {
  awaiting_payment: "في انتظار إثبات الدفع",
  payment_submitted: "تم إرسال الإثبات وهو الآن قيد المراجعة",
  approved: "تم تأكيد الدفع وتفعيل الكورس",
  rejected: "تم رفض الإثبات — يمكنك إرسال إثبات جديد",
  cancelled: "تم إلغاء الحجز",
};

function formatMoney(value: string | number, currency: string) {
  return `${new Intl.NumberFormat("ar-EG").format(Number(value))} ${currency}`;
}

/** أنواع الملفات المسموح بها لإثبات الدفع — مطابقة لـ bucket "payment-proofs" */
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_PROOF_LABEL = "صورة JPG أو PNG أو WebP، أو ملف PDF";
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
}

export default function CourseCheckout() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"instapay" | "vodafone_cash">("instapay");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const courseQuery = useQuery({ queryKey: ["checkout", "course", slug], queryFn: () => loadCheckoutCourse(slug), enabled: Boolean(slug), staleTime: LMS_STALE_TIME_MS });
  const bookingsQuery = useQuery({ queryKey: ["learning", "bookings"], queryFn: loadMyBookings, staleTime: LMS_STALE_TIME_MS });
  const course = courseQuery.data;
  const existing = useMemo(
    () => bookingsQuery.data?.find((booking) => booking.course.slug === slug) ?? null,
    [bookingsQuery.data, slug],
  );
  const [booking, setBooking] = useState<CourseBooking | null>(null);

  useEffect(() => {
    if (existing) {
      setBooking(existing);
      setPhone(existing.phone);
      setExperienceLevel(existing.experience_level);
      setGoal(existing.goal);
      if (existing.payment_method) setPaymentMethod(existing.payment_method);
    }
  }, [existing]);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: async (created) => {
      setBooking(created);
      await queryClient.invalidateQueries({ queryKey: ["learning", "bookings"] });
      if (created.status === "approved") navigate("/learn", { replace: true });
    },
  });

  const startBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!course) return;
    if (Number(course.price) <= 0) {
      setError("هذا الكورس غير متاح للحجز حتى يتم تحديد سعر مدفوع له.");
      return;
    }
    setError(null);
    try {
      await bookingMutation.mutateAsync({
        course_slug: course.slug,
        phone,
        experience_level: experienceLevel,
        goal,
        payment_method: paymentMethod,
      });
    } catch (operationError) {
      setError(errorMessage(operationError));
    }
  };

  const uploadProof = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!booking) {
      setError("لا يوجد حجز نشط. ابدأ الحجز أولاً.");
      return;
    }
    if (!supabase) {
      setError("خدمة تسجيل الدخول غير متصلة. حدّث الصفحة وحاول مرة أخرى.");
      return;
    }
    if (!file) {
      setError("اختر ملف إثبات التحويل أولاً.");
      return;
    }
    if (!ALLOWED_PROOF_TYPES.some((type) => type === file.type)) {
      // HEIC من الآيفون غير مدعوم: المتصفح بيفرّغ الـ mime type في بعض الأنظمة،
      // فنتحقق من الامتداد كمان قبل الرفض.
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const heic = extension === "heic" || extension === "heif" || file.type === "image/heic";
      setError(
        heic
          ? "صيغة HEIC دي مش مدعومة. صوّر screenshot للإثبات واحفظه PNG، أو حوّله لـ PDF."
          : `نوع الملف غير مدعوم${file.type ? ` (${file.type})` : ""}. المسموح: ${ALLOWED_PROOF_LABEL}.`,
      );
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError(`حجم الملف ${(file.size / 1024 / 1024).toFixed(1)} ميجابايت — الحد الأقصى 5 ميجابايت. صغّر الصورة أو استخدم PDF.`);
      return;
    }
    setUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى.");
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${userData.user.id}/${booking.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        const message = uploadError.message || "";
        if (/mime|not allowed|file type/i.test(message))
          throw new Error("نوع الملف مرفوض من الخادم. المسموح: JPG أو PNG أو PDF.");
        if (/exceed|size|too large/i.test(message))
          throw new Error("حجم الملف أكبر من 5 ميجابايت. صغّر الصورة وجرّب مرة أخرى.");
        if (/row-level|not allowed|permission|denied/i.test(message))
          throw new Error("مفيش صلاحية لرفع الملف على هذا الحجز. سجّل الخروج والدخول مرة أخرى.");
        throw new Error(`تعذّر رفع الملف: ${message || "خطأ غير معروف من التخزين."}`);
      }
      const updated = await submitBookingProof(booking.id, {
        proof_path: path,
        content_type: file.type,
        size: file.size,
      });
      setBooking(updated);
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["learning", "bookings"] });
    } catch (operationError) {
      setError(errorMessage(operationError));
    } finally {
      setUploading(false);
    }
  };

  const loading = courseQuery.isLoading || bookingsQuery.isLoading;
  const queryError = courseQuery.error ?? bookingsQuery.error;
  const inputClass = "mt-2 w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-[14px] outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

  if (loading) return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  if (!course || queryError) return <div className="container-x py-24"><p className="rounded-2xl bg-red-50 p-5 text-red-700">{errorMessage(queryError)}</p></div>;
  // بيانات تجريبية (fallback) — لا نسمح بإنشاء حجز عليها
  if (isFallbackCourse(course))
    return (
      <div className="container-x max-w-2xl py-24 text-center">
        <p className="rounded-2xl border border-ink-200 bg-white p-8 text-[14px] leading-8 text-ink-500">
          الحجز غير متاح لهذا البرنامج حاليًا. تواصل معنا للحجز أو للاستفسار.
        </p>
        <Link to="/contact" className="mt-6 inline-flex rounded-xl bg-brand-500 px-6 py-3 text-[14px] font-bold text-white">
          تواصل معنا
        </Link>
      </div>
    );

  return (
    <section className="bg-ink-50 py-12 sm:py-16">
      <div className="container-x max-w-5xl">
        <Link to={`/courses/${course.slug}`} className="inline-flex items-center gap-2 text-[13px] font-bold text-ink-500"><ArrowRight className="h-4 w-4" /> العودة لتفاصيل الكورس</Link>
        {error && (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[13px] font-semibold leading-6">{error}</p>
          </div>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="h-fit rounded-3xl bg-ink-950 p-7 text-white lg:sticky lg:top-24">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300"><CreditCard className="h-5 w-5" /></span>
            <p className="mt-5 text-[11px] font-black text-brand-300">إتمام الحجز</p>
            <h1 className="mt-2 text-[24px] font-black leading-9 text-white">{course.title}</h1>
            <p className="mt-3 text-[13px] leading-7 text-white/60">{course.short_description}</p>
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[11px] text-white/50">قيمة الحجز</p>
              <p className="mt-1 text-[22px] font-black text-white">{formatMoney(course.price, course.currency)}</p>
              {course.starts_at && <p className="mt-4 flex items-center gap-2 text-[12px] text-white/70"><Clock3 className="h-4 w-4 text-brand-300" /> يبدأ {new Date(course.starts_at).toLocaleString("ar-EG")}</p>}
            </div>
          </aside>

          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8">
            {!booking && (
              <form onSubmit={startBooking} className="space-y-5">
                <div><p className="text-[12px] font-black text-brand-600">بيانات الحجز</p><h2 className="mt-1 text-[24px] font-black">أكّد بياناتك واختر طريقة التحويل</h2></div>
                <label className="block text-[13px] font-bold">رقم الهاتف<input dir="ltr" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${inputClass} text-left`} /></label>
                <label className="block text-[13px] font-bold">مستواك الحالي<input value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)} placeholder="مثال: مبتدئ" className={inputClass} /></label>
                <label className="block text-[13px] font-bold">هدفك من الكورس<textarea rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} className={`${inputClass} resize-none`} /></label>
                <div><p className="text-[13px] font-bold">طريقة التحويل</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{(["instapay", "vodafone_cash"] as const).map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`rounded-xl border p-4 text-right text-[13px] font-bold transition ${paymentMethod === method ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200"}`}>{method === "instapay" ? "InstaPay" : "Vodafone Cash"}</button>)}</div></div>
                {(error || bookingMutation.error) && <p className="rounded-xl bg-red-50 p-3 text-[12px] text-red-700">{error ?? errorMessage(bookingMutation.error)}</p>}
                <button disabled={bookingMutation.isPending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[14px] font-black text-white disabled:opacity-60">{bookingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد الحجز والمتابعة للدفع</button>
              </form>
            )}

            {booking && booking.status === "approved" && <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><h2 className="mt-5 text-[24px] font-black">تم تفعيل الكورس</h2><p className="mt-2 text-[13px] text-ink-500">يمكنك الآن بدء التعلّم من لوحة التحكم.</p><Link to="/learn" className="mt-6 inline-flex rounded-xl bg-brand-500 px-6 py-3 text-[13px] font-black text-white">الذهاب إلى كورساتي</Link></div>}

            {booking && booking.status === "payment_submitted" && <div className="py-10 text-center"><ShieldCheck className="mx-auto h-14 w-14 text-brand-500" /><h2 className="mt-5 text-[24px] font-black">الإثبات قيد المراجعة</h2><p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-ink-500">سيظهر الكورس تلقائيًا داخل لوحة التحكم فور تأكيد الدفع من إدارة Awexen.</p><Link to="/learn" className="mt-6 inline-flex rounded-xl border border-ink-200 px-6 py-3 text-[13px] font-black">متابعة حالة الطلب</Link></div>}

            {booking && ["awaiting_payment", "rejected"].includes(booking.status) && (
              <form onSubmit={uploadProof} className="space-y-5">
                <div><p className="text-[12px] font-black text-brand-600">التحويل وإثبات الدفع</p><h2 className="mt-1 text-[24px] font-black">حوّل المبلغ ثم ارفع الإثبات</h2></div>
                {booking.status === "rejected" && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] leading-6 text-red-700">سبب الرفض: {booking.review_notes || "الإثبات غير واضح أو بيانات التحويل غير مطابقة."}</p>}
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
                  <p className="text-[12px] text-ink-500">حوّل {formatMoney(booking.amount, booking.currency)} عبر {booking.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"} إلى:</p>
                  <div className="mt-3 flex items-center justify-between gap-3"><strong dir="ltr" className="text-[25px] tracking-wider">{booking.payment_phone}</strong><button type="button" onClick={() => { void navigator.clipboard.writeText(booking.payment_phone); setCopied(true); }} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-600"><Copy className="h-4 w-4" /></button></div>
                  {copied && <p className="mt-2 text-[11px] font-bold text-emerald-600">تم نسخ الرقم</p>}
                </div>
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-ink-200 p-7 text-center transition hover:border-brand-400">
                  {file && file.type.startsWith("image/") ? (
                    <img src={previewUrl} alt="معاينة إثبات التحويل" className="mx-auto mb-4 max-h-40 rounded-xl object-contain" />
                  ) : (
                    <FileUp className="mx-auto h-8 w-8 text-brand-500" />
                  )}
                  <span className="mt-3 block break-all text-[13px] font-bold">{file ? file.name : "اختر صورة أو PDF لإثبات التحويل"}</span>
                  {file ? (
                    <span className="mt-1 block text-[11px] text-ink-400">{(file.size / 1024).toFixed(0)} كيلوبايت — اضغط لاختيار ملف آخر</span>
                  ) : (
                    <span className="mt-1 block text-[11px] text-ink-400">صورة أو ملف PDF — بحد أقصى 5 ميجابايت</span>
                  )}
                  {/*
                    accept واسع عمداً: أي صور (بما فيها webp و heic من الآيفون)
                    حتى لا يمنع المتصفح اختيار الملف قبل ما نقدر نتحقق منه.
                    الفحص الحقيقي بيتم في uploadProof ويعرض رسالة واضحة.
                  */}
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,.pdf"
                    onChange={(event) => {
                      const picked = event.target.files?.[0] ?? null;
                      // تصفير القيمة يسمح باختيار نفس الملف تاني بعد رفضه
                      event.target.value = "";
                      if (picked) {
                        setError(null);
                        setFile(picked);
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
                <button disabled={!file || uploading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[14px] font-black text-white disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} {uploading ? "جارٍ الرفع..." : "إرسال إثبات الدفع للمراجعة"}</button>
              </form>
            )}

            {booking && booking.status === "cancelled" && <p className="rounded-xl bg-ink-50 p-5 text-center text-[13px]">{statusText[booking.status]}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
