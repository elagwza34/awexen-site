import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Code2,
  Loader2,
  MapPin,
  Send,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { loadJobs, submitJobApplication, type Job } from "../lib/cms";
import { useSeoOverride } from "../components/SeoManager";
import { useLanguage } from "../context/LanguageContext";

const employmentLabels: Record<Job["employment_type"], { ar: string; en: string }> = {
  "full-time": { ar: "دوام كامل", en: "Full-time" },
  "part-time": { ar: "دوام جزئي", en: "Part-time" },
  contract: { ar: "تعاقد", en: "Contract" },
  internship: { ar: "تدريب", en: "Internship" },
  freelance: { ar: "عمل حر", en: "Freelance" },
};

type ApplicationFormProps = { job?: Job | null };

function ApplicationForm({ job }: ApplicationFormProps) {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    years_experience: "0",
    skills: "",
    portfolio_url: "",
    linkedin_url: "",
    cv_url: "",
    cover_note: "",
  });

  const set = (key: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitJobApplication({
        ...form,
        job_id: job?.id && !job.id.startsWith("local-") ? job.id : null,
        years_experience: Number(form.years_experience || 0),
        portfolio_url: form.portfolio_url || null,
        linkedin_url: form.linkedin_url || null,
        cv_url: form.cv_url || null,
      });
      setSent(true);
    } catch (submitError) {
      console.warn("Job application submission failed", submitError);
      setError(isArabic ? "تعذر إرسال الطلب الآن. راجع اتصالك وحاول مرة أخرى." : "We couldn't send your application. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-[22px] font-extrabold text-ink-900">{isArabic ? "وصل طلبك" : "Application received"}</h2>
        <p className="mt-2 text-[14px] leading-7 text-ink-600">
          {isArabic ? "سنراجع الخبرة ونماذج الأعمال، ونتواصل معك إذا كان هناك تطابق مع الدور المطلوب." : "We'll review your experience and work samples, then contact you if your profile matches the role."}
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14px] outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
      <div className="sm:col-span-2">
        <p className="text-[12px] font-bold text-brand-600">{isArabic ? "نموذج التقديم" : "Application form"}</p>
        <h2 className="mt-1 text-[22px] font-extrabold text-ink-900">
          {job ? (isArabic ? `التقديم على: ${job.title}` : `Apply for: ${job.title}`) : (isArabic ? "أرسل ملفك لفريق التوظيف" : "Send your profile to our hiring team")}
        </h2>
      </div>

      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "الاسم بالكامل" : "Full name"}
        <input required name="full_name" autoComplete="name" value={form.full_name} onChange={set("full_name")} className={`${inputClass} mt-2`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "رقم الهاتف" : "Phone number"}
        <input required name="phone" autoComplete="tel" type="tel" dir="ltr" value={form.phone} onChange={set("phone")} className={`${inputClass} mt-2 text-left`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "البريد الإلكتروني" : "Email address"}
        <input required name="email" autoComplete="email" type="email" dir="ltr" value={form.email} onChange={set("email")} className={`${inputClass} mt-2 text-left`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "المدينة / الدولة" : "City / Country"}
        <input required name="location" autoComplete="address-level2" value={form.location} onChange={set("location")} className={`${inputClass} mt-2`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "سنوات الخبرة" : "Years of experience"}
        <input required name="years_experience" min="0" step="0.5" type="number" value={form.years_experience} onChange={set("years_experience")} className={`${inputClass} mt-2`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "رابط Portfolio أو GitHub" : "Portfolio or GitHub URL"}
        <input name="portfolio_url" autoComplete="url" type="url" dir="ltr" value={form.portfolio_url} onChange={set("portfolio_url")} className={`${inputClass} mt-2 text-left`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "رابط LinkedIn" : "LinkedIn URL"}
        <input name="linkedin_url" autoComplete="url" type="url" dir="ltr" value={form.linkedin_url} onChange={set("linkedin_url")} className={`${inputClass} mt-2 text-left`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700">
        {isArabic ? "رابط السيرة الذاتية" : "CV URL"}
        <input name="cv_url" autoComplete="url" type="url" dir="ltr" value={form.cv_url} onChange={set("cv_url")} placeholder="Google Drive / Dropbox" className={`${inputClass} mt-2 text-left`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700 sm:col-span-2">
        {isArabic ? "المهارات والتقنيات" : "Skills and technologies"}
        <input required name="skills" value={form.skills} onChange={set("skills")} placeholder="React, TypeScript, Python..." className={`${inputClass} mt-2`} />
      </label>
      <label className="text-[13px] font-bold text-ink-700 sm:col-span-2">
        {isArabic ? "عرّفنا بنفسك وبأفضل مشروع نفذته" : "Tell us about yourself and your best project"}
        <textarea required name="cover_note" rows={5} value={form.cover_note} onChange={set("cover_note")} className={`${inputClass} mt-2 resize-none leading-7`} />
      </label>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-[13px] text-red-700 sm:col-span-2">{error}</p>}

      <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[14px] font-bold text-white disabled:opacity-60 sm:col-span-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? (isArabic ? "جارٍ الإرسال..." : "Sending...") : (isArabic ? "إرسال طلب التوظيف" : "Send application")}
      </button>
    </form>
  );
}

export default function Jobs() {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    void loadJobs().then(setJobs);
  }, []);

  return (
    <>
      <PageHero
        badge={isArabic ? "انضم إلى الفريق" : "Join the team"}
        title={isArabic ? "وظائف تبني" : "Careers that build"}
        highlight={isArabic ? "خبرة حقيقية" : "real experience"}
        desc={isArabic ? "نبحث عن أشخاص يهتمون بجودة التنفيذ والتواصل الواضح، ويحبون حل المشكلات أكثر من استعراض الأدوات." : "We look for people who care about quality, communicate clearly, and enjoy solving real problems."}
        crumbs={[{ label: isArabic ? "الرئيسية" : "Home", to: "/" }, { label: isArabic ? "الوظائف" : "Careers" }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600"><BriefcaseBusiness className="h-5 w-5" /></span>
              <div><p className="text-[12px] font-bold text-brand-600">{isArabic ? "الفرص الحالية" : "Open roles"}</p><h2 className="text-[24px] font-extrabold">{isArabic ? "اختر الدور المناسب" : "Find your next role"}</h2></div>
            </div>

            {jobs.length ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link key={job.id} to={`/jobs/${job.slug}`} className="group block rounded-2xl border border-ink-100 p-5 transition hover:border-brand-500 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[12px] font-bold text-brand-600">{job.department}</span>
                        <h3 className="mt-1 text-[18px] font-extrabold text-ink-900">{job.title}</h3>
                      </div>
                      <ArrowLeft className="mt-2 h-4 w-4 text-ink-300 transition group-hover:-translate-x-1 group-hover:text-brand-600" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-[12px] text-ink-500">
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{employmentLabels[job.employment_type][lang]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 p-7">
                <Code2 className="h-8 w-8 text-brand-500" />
                <h3 className="mt-4 text-[18px] font-extrabold">{isArabic ? "لا توجد وظيفة منشورة الآن" : "No open roles right now"}</h3>
                <p className="mt-2 text-[14px] leading-7 text-ink-500">{isArabic ? "يمكنك إرسال ملفك، وسنرجع إليه عند فتح دور مناسب لخبرتك." : "You can still send your profile and we'll revisit it when a suitable role opens."}</p>
              </div>
            )}
          </div>

          <Reveal delay={100}><ApplicationForm /></Reveal>
        </div>
      </section>
    </>
  );
}

export function JobDetail() {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";
  const { slug } = useParams();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    void loadJobs().then((items) => setJob(items.find((item) => item.slug === slug) ?? null));
  }, [slug]);

  useSeoOverride(job ? `${job.title} | ${isArabic ? "وظائف" : "Careers"} Awexen` : undefined, job?.summary);

  if (!job) {
    return <Jobs />;
  }

  return (
    <>
      <PageHero
        badge={job.department}
        title={job.title}
        desc={job.summary}
        crumbs={[{ label: isArabic ? "الرئيسية" : "Home", to: "/" }, { label: isArabic ? "الوظائف" : "Careers", to: "/jobs" }, { label: job.title }]}
      >
        <div className="mt-6 flex flex-wrap gap-3 text-[13px] text-ink-300">
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{job.location}</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{employmentLabels[job.employment_type][lang]}</span>
        </div>
      </PageHero>
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-ink-100 p-6">
              <h2 className="text-[20px] font-extrabold">{isArabic ? "المهام" : "Responsibilities"}</h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-8 text-ink-600">{job.responsibilities}</p>
            </div>
            <div className="rounded-3xl border border-ink-100 p-6">
              <h2 className="text-[20px] font-extrabold">{isArabic ? "المتطلبات" : "Requirements"}</h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-8 text-ink-600">{job.requirements}</p>
            </div>
          </div>
          <ApplicationForm job={job} />
        </div>
      </section>
    </>
  );
}
