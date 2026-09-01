import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Clock3,
  GraduationCap,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import {
  fallbackCourses,
  loadCourses,
  loadPricingSettings,
  type Course,
  type PricingSettings,
} from "../lib/cms";
import { useSeoOverride } from "../components/SeoManager";
import { useLanguage } from "../context/LanguageContext";

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

const modeLabelsEn: Record<Course["delivery_mode"], string> = { online: "Live online", onsite: "On-site", hybrid: "Hybrid", recorded: "Recorded" };
const levelLabelsEn: Record<Course["level"], string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", "all-levels": "All levels" };

function money(value: number, currency: string, isArabic = true) {
  if (value <= 0) return isArabic ? "السعر غير متاح" : "Price unavailable";
  return `${new Intl.NumberFormat(isArabic ? "ar-EG" : "en-GB").format(value)} ${currency}`;
}

function BookingCard({ course, isArabic }: { course: Course; isArabic: boolean }) {
  return (
    <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-7 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white"><ShieldCheck className="h-5 w-5" /></span>
      <p className="mt-5 text-[12px] font-bold text-brand-600">{isArabic ? "حجز آمن بحسابك" : "Secure booking with your account"}</p>
      <h2 className="mt-1 text-[24px] font-extrabold">{isArabic ? "احجز مكانك وابدأ إجراءات الدفع" : "Reserve your place and start payment"}</h2>
      <ol className="mt-5 space-y-3 text-[13px] leading-7 text-ink-600">
        <li>{isArabic ? "1. سجل الدخول أو أنشئ حساب متدرب." : "1. Sign in or create a learner account."}</li>
        <li>{isArabic ? "2. حوّل عبر InstaPay أو Vodafone Cash إلى الرقم الموضح." : "2. Transfer through InstaPay or Vodafone Cash to the displayed number."}</li>
        <li>{isArabic ? "3. ارفع الإثبات، وبعد تأكيد الإدارة يظهر الكورس في لوحتك." : "3. Upload proof and the course will appear after approval."}</li>
      </ol>
      <Link to={`/checkout/${course.slug}`} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-4 text-[14px] font-black text-white shadow-lg shadow-brand-500/20">{isArabic ? "احجز الكورس الآن" : "Book this course"} <ArrowLeft className="h-4 w-4" /></Link>
    </div>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>(fallbackCourses);
  const { lang } = useLanguage();
  const isArabic = lang === "ar";

  useEffect(() => {
    void loadCourses().then(setCourses);
  }, []);

  return (
    <>
      <PageHero
        badge={isArabic ? "تعلم بالتطبيق" : "Learn by doing"}
        title={isArabic ? "كورسات تساعدك" : "Courses built for"}
        highlight={isArabic ? "تشتغل فعلًا" : "real work"}
        desc={isArabic ? "مسارات صغيرة ومركزة، يقدمها أشخاص ينفذون مشروعات حقيقية ويعرفون أين يتعطل المتعلم عادة." : "Focused learning paths taught by people who deliver real projects and understand where learners usually get stuck."}
        crumbs={[{ label: isArabic ? "الرئيسية" : "Home", to: "/" }, { label: isArabic ? "الكورسات" : "Courses" }]}
      />
      <section className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <Reveal key={course.id} delay={(index % 3) * 80}>
                <article className="group flex h-full flex-col rounded-3xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-600"><GraduationCap className="h-5 w-5" /></span>
                  <p className="mt-5 text-[12px] font-bold text-brand-600">{isArabic ? levelLabels[course.level] : levelLabelsEn[course.level]} · {isArabic ? modeLabels[course.delivery_mode] : modeLabelsEn[course.delivery_mode]}</p>
                  <h2 className="mt-2 text-[20px] font-extrabold leading-8">{course.title}</h2>
                  <p className="mt-3 flex-1 text-[14px] leading-7 text-ink-500">{course.short_description}</p>
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-ink-100 pt-5 text-[12px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{course.duration || (isArabic ? "يحدد لاحقًا" : "To be announced")}</span>
                    {course.capacity && <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{course.capacity} {isArabic ? "متدربًا" : "learners"}</span>}
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-[14px] font-extrabold text-ink-900">{money(course.price, course.currency, isArabic)}</span>
                    <Link to={`/courses/${course.slug}`} className="inline-flex items-center gap-2 text-[14px] font-bold text-brand-600">{isArabic ? "التفاصيل" : "Details"} <ArrowLeft className="h-4 w-4" /></Link>
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
  const { lang } = useLanguage();
  const isArabic = lang === "ar";

  useEffect(() => {
    void loadCourses().then((items) => setCourse(items.find((item) => item.slug === slug) ?? null));
    void loadPricingSettings().then(setPricing);
  }, [slug]);

  useSeoOverride(course ? `${course.title} | كورسات Awexen` : undefined, course?.short_description);

  if (!course) return <Courses />;

  return (
    <>
      <PageHero
        badge={`${isArabic ? levelLabels[course.level] : levelLabelsEn[course.level]} · ${isArabic ? modeLabels[course.delivery_mode] : modeLabelsEn[course.delivery_mode]}`}
        title={course.title}
        desc={course.short_description}
        crumbs={[{ label: isArabic ? "الرئيسية" : "Home", to: "/" }, { label: isArabic ? "الكورسات" : "Courses", to: "/courses" }, { label: course.title }]}
      >
        <div className="mt-6 flex flex-wrap gap-4 text-[13px] text-ink-300">
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{course.duration || (isArabic ? "يحدد لاحقًا" : "To be announced")}</span>
          <span className="inline-flex items-center gap-2"><BookOpenCheck className="h-4 w-4" />{course.instructor}</span>
          {course.starts_at && <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{new Date(course.starts_at).toLocaleDateString("ar-EG")}</span>}
        </div>
      </PageHero>
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-ink-100 p-7">
            <h2 className="text-[22px] font-extrabold">{isArabic ? "ماذا ستتعلم؟" : "What will you learn?"}</h2>
            {!isArabic && <p className="mt-3 rounded-xl bg-brand-50 p-3 text-[12px] leading-6 text-brand-800">Course content is currently published in Arabic.</p>}
            <p className="mt-4 whitespace-pre-line text-[15px] leading-8 text-ink-600">{course.description}</p>
            <div className="mt-6 rounded-2xl bg-ink-50 p-4">
              <p className="text-[12px] text-ink-500">{isArabic ? "قيمة الاشتراك" : "Course fee"}</p>
              <p className="mt-1 text-[18px] font-extrabold">{money(course.price, course.currency, isArabic)}</p>
              {course.price > 0 && pricing.installments_enabled && (
                <p className="mt-2 text-[12px] leading-6 text-ink-500">{isArabic ? `التقسيط متاح على ${pricing.installment_count} دفعات بإجمالي يزيد ${pricing.installment_markup_percent}% عن السعر الأساسي.` : `Installments are available over ${pricing.installment_count} payments with a ${pricing.installment_markup_percent}% total markup.`}</p>
              )}
            </div>
          </div>
          <BookingCard course={course} isArabic={isArabic} />
        </div>
      </section>
    </>
  );
}
