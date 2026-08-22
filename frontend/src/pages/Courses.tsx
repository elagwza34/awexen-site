import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  Send,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import {
  fallbackCourses,
  loadCourses,
  loadPricingSettings,
  submitCourseEnrollment,
  type Course,
  type PricingSettings,
} from "../lib/cms";
import { useSeoOverride } from "../components/SeoManager";

const modeLabels: Record<Course["delivery_mode"], string> = {
  online: "مباشر أونلاين",
  onsite: "حضوري",
  hybrid: "حضوري وأونلاين",
  recorded: "مسجل",
};

const levelLabels: Record<Course["level"], string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
  "all-levels": "كل المستويات",
};

function money(value: number, currency: string) {
  if (value === 0) return "يُحدد عند فتح التسجيل";
  return `${new Intl.NumberFormat("ar-EG").format(value)} ${currency}`;
}

function EnrollmentForm({ course, pricing }: { course: Course; pricing: PricingSettings }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    experience_level: "",
    goal: "",
    payment_preference: "full",
  });

  const installmentTotal = useMemo(
    () => course.price * (1 + pricing.installment_markup_percent / 100),
    [course.price, pricing.installment_markup_percent],
  );

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitCourseEnrollment({
        ...form,
        course_id: course.id.startsWith("local-") ? null : course.id,
      });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر إرسال طلب التسجيل.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-[22px] font-extrabold">تم تسجيل اهتمامك</h2>
        <p className="mt-2 text-[14px] leading-7 text-ink-600">سنتواصل معك لتأكيد الموعد وطريقة الدفع قبل حجز المقعد.</p>
      </div>
    );
  }

  const inputClass = "mt-2 w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14px] outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
      <div className="sm:col-span-2">
        <p className="text-[12px] font-bold text-brand-600">طلب تسجيل</p>
        <h2 className="mt-1 text-[22px] font-extrabold">احجز مكانك في الكورس</h2>
      </div>
      <label className="text-[13px] font-bold text-ink-700">الاسم بالكامل<input required value={form.full_name} onChange={set("full_name")} className={inputClass} /></label>
      <label className="text-[13px] font-bold text-ink-700">رقم الهاتف<input required type="tel" dir="ltr" value={form.phone} onChange={set("phone")} className={`${inputClass} text-right`} /></label>
      <label className="text-[13px] font-bold text-ink-700">البريد الإلكتروني<input required type="email" dir="ltr" value={form.email} onChange={set("email")} className={`${inputClass} text-right`} /></label>
      <label className="text-[13px] font-bold text-ink-700">مستواك الحالي<input required value={form.experience_level} onChange={set("experience_level")} placeholder="مثال: مبتدئ" className={inputClass} /></label>
      {course.price > 0 && (
        <label className="text-[13px] font-bold text-ink-700 sm:col-span-2">
          طريقة الدفع
          <select value={form.payment_preference} onChange={set("payment_preference")} className={inputClass}>
            <option value="full">دفعة واحدة — {money(course.price, course.currency)}</option>
            {pricing.installments_enabled && (
              <option value="installments">
                {pricing.installment_count} أقساط — الإجمالي {money(installmentTotal, course.currency)} شامل زيادة {pricing.installment_markup_percent}%
              </option>
            )}
          </select>
        </label>
      )}
      <label className="text-[13px] font-bold text-ink-700 sm:col-span-2">ما الذي تريد الوصول إليه؟<textarea required rows={4} value={form.goal} onChange={set("goal")} className={`${inputClass} resize-none leading-7`} /></label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700 sm:col-span-2">{error}</p>}
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[14px] font-bold text-white disabled:opacity-60 sm:col-span-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? "جارٍ الإرسال..." : "إرسال طلب التسجيل"}
      </button>
    </form>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);

  useEffect(() => {
    void loadCourses().then(setCourses);
  }, []);

  return (
    <>
      <PageHero
        badge="تعلم بالتطبيق"
        title="كورسات تساعدك"
        highlight="تشتغل فعلًا"
        desc="مسارات صغيرة ومركزة، يقدمها أشخاص ينفذون مشروعات حقيقية ويعرفون أين يتعطل المتعلم عادة."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "الكورسات" }]}
      />
      <section className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <Reveal key={course.id} delay={(index % 3) * 80}>
                <article className="group flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600"><GraduationCap className="h-5 w-5" /></span>
                  <p className="mt-5 text-[12px] font-bold text-brand-600">{levelLabels[course.level]} · {modeLabels[course.delivery_mode]}</p>
                  <h2 className="mt-2 text-[20px] font-extrabold leading-8">{course.title}</h2>
                  <p className="mt-3 flex-1 text-[14px] leading-7 text-ink-500">{course.short_description}</p>
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-ink-100 pt-5 text-[12px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{course.duration || "يحدد لاحقًا"}</span>
                    {course.capacity && <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{course.capacity} متدربًا</span>}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-[14px] font-extrabold text-ink-900">{money(course.price, course.currency)}</span>
                    <Link to={`/courses/${course.slug}`} className="inline-flex items-center gap-2 text-[14px] font-bold text-brand-600">التفاصيل <ArrowLeft className="h-4 w-4" /></Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function CourseDetail() {
  const { slug } = useParams();
  const [course, setCourse] = useState<Course | null>(fallbackCourses.find((item) => item.slug === slug) ?? null);
  const [pricing, setPricing] = useState<PricingSettings>({ installments_enabled: true, installment_markup_percent: 30, installment_count: 3 });

  useEffect(() => {
    void loadCourses().then((items) => setCourse(items.find((item) => item.slug === slug) ?? null));
    void loadPricingSettings().then(setPricing);
  }, [slug]);

  useSeoOverride(course ? `${course.title} | كورسات Awexen` : undefined, course?.short_description);

  if (!course) return <Courses />;

  return (
    <>
      <PageHero
        badge={`${levelLabels[course.level]} · ${modeLabels[course.delivery_mode]}`}
        title={course.title}
        desc={course.short_description}
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "الكورسات", to: "/courses" }, { label: course.title }]}
      >
        <div className="mt-6 flex flex-wrap gap-4 text-[13px] text-ink-300">
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{course.duration || "يحدد لاحقًا"}</span>
          <span className="inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4" />{course.instructor}</span>
          {course.starts_at && <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{new Date(course.starts_at).toLocaleDateString("ar-EG")}</span>}
        </div>
      </PageHero>
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-ink-100 p-7">
            <h2 className="text-[22px] font-extrabold">ماذا ستتعلم؟</h2>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-ink-600">{course.description}</p>
            <div className="mt-6 rounded-2xl bg-ink-50 p-4">
              <p className="text-[12px] text-ink-500">قيمة الاشتراك</p>
              <p className="mt-1 text-[18px] font-extrabold">{money(course.price, course.currency)}</p>
              {course.price > 0 && pricing.installments_enabled && (
                <p className="mt-2 text-[12px] leading-6 text-ink-500">التقسيط متاح على {pricing.installment_count} دفعات بإجمالي يزيد {pricing.installment_markup_percent}% عن السعر الأساسي.</p>
              )}
            </div>
          </div>
          <EnrollmentForm course={course} pricing={pricing} />
        </div>
      </section>
    </>
  );
}
