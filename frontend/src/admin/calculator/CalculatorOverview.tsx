import { Link } from "react-router-dom";
import { translateIssue } from "./issues";
import { choiceKinds, ordered, type Config } from "./model";

type Step = { number: string; title: string; description: string; state: string; ready: boolean; view: "projects" | "sections" | "questions" | "prices" | "versions"; action: string };

export function CalculatorOverview({ config, published, draftRevision, draftUpdatedAt, dirty, busy, issues, onGo, onSave, onPublish }: {
  config: Config;
  published?: { id: string; published_at?: string | null };
  draftRevision?: string;
  draftUpdatedAt?: string;
  dirty: boolean;
  busy: boolean;
  issues: string[];
  onGo: (view: "projects" | "sections" | "questions" | "prices" | "versions") => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  const projects = config.projects.filter((project) => project.active && !project.archived);
  const sections = config.sections.filter((section) => section.active);
  const questions = config.questions.filter((question) => question.active);
  const options = ordered(config.questions)
    .filter((question) => question.active && choiceKinds.includes(question.kind))
    .flatMap((question) => question.options ?? []);
  const unpriced = options.filter((option) => !option.pricing || option.pricing.method === "unconfigured").length;
  const priced = projects.some((project) => project.basePrice !== undefined)
    || options.some((option) => option.pricing && option.pricing.method !== "unconfigured")
    || config.rules.length > 0;
  const steps: Step[] = [
    { number: "1", title: "أنواع المشاريع", description: "اختر المشاريع التي تظهر للزائر أولًا، مثل «متجر إلكتروني» أو «تطبيق».", state: projects.length ? `${projects.length} نوع مفعّل` : "لم تُضف بعد", ready: projects.length > 0, view: "projects", action: "إدارة الأنواع" },
    { number: "2", title: "الخطوات والأسئلة", description: "قسّم الأسئلة إلى خطوات قصيرة ينتقل بينها الزائر بالترتيب.", state: questions.length ? `${sections.length} خطوة · ${questions.length} سؤال` : "لا توجد أسئلة بعد", ready: sections.length > 0 && questions.length > 0, view: sections.length ? "questions" : "sections", action: sections.length ? "إدارة الأسئلة" : "إنشاء خطوة" },
    { number: "3", title: "الأسعار", description: "حدّد سعر كل خيار ونوع مشروع. شاشة «أسعار سريعة» تطلب السعر بالجنيه مباشرة.", state: unpriced ? `${unpriced} خيار بدون سعر` : options.length ? "كل الخيارات مسعّرة" : priced ? "الأسعار مضبوطة بالقواعد" : "لا توجد أسعار بعد", ready: priced && unpriced === 0, view: "prices", action: "ضبط الأسعار" },
    { number: "4", title: "النشر", description: "الحفظ يبقي التعديلات في المسودة عندك فقط. النشر يجعلها تظهر للزوار.", state: published ? "يوجد إصدار منشور" : "لم تنشر بعد", ready: Boolean(published), view: "versions", action: "سجل النشر" },
  ];
  return <div className="grid gap-4">
    <section className="grid gap-2 rounded-xl border border-brand-500/25 bg-brand-500/[0.045] p-4">
      <h3 className="font-bold">كيف تستخدم الحاسبة؟</h3>
      <p className="text-sm leading-7 text-white/60">
        الحاسبة تحسب تقدير تكلفة المشروع تلقائيًا من إجابات الزائر. أنشئها بالترتيب من 1 إلى 4،
        ثم احفظ وانشر ليتمكن الزوار من استخدامها.
      </p>
    </section>
    <ol className="grid gap-2 sm:grid-cols-2">
      {steps.map((step) => <li key={step.number} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{step.number}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${step.ready ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>
            {step.ready ? "جاهز" : "يحتاج إعداد"}
          </span>
        </div>
        <p className="font-semibold">{step.title}</p>
        <p className="text-xs leading-5 text-white/50">{step.description}</p>
        <p className="text-[11px] text-white/35">{step.state}</p>
        <button type="button" className="admin-button-secondary mt-auto self-start" onClick={() => onGo(step.view)}>{step.action}</button>
      </li>)}
    </ol>
    <section className="grid gap-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.045] p-4">
      <div>
        <h3 className="font-bold">حفظ ونشر</h3>
        <p className="mt-1 text-sm leading-6 text-white/60">
          {dirty ? "لديك تغييرات غير محفوظة. اضغط «حفظ ونشر» لتظهر للزوار فورًا." : published ? "المسودة محفوظة. إن عدّلت شيئًا فاحفظه ثم انشره ليظهر." : "المسودة محفوظة ولم تُنشر بعد. انشرها ليتمكن الزوار من استخدام الحاسبة."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={!dirty || busy} onClick={onSave}>حفظ المسودة فقط</button>
        <button type="button" className="admin-button-primary" disabled={busy || issues.length > 0} onClick={onPublish}>
          {dirty ? "حفظ ونشر" : "نشر المسودة"}
        </button>
        {published && <Link to="/project-calculator" className="admin-button-secondary">فتح الحاسبة العامة</Link>}
      </div>
      {issues.length > 0 && <p className="text-xs text-amber-200">النشر متوقف حتى إصلاح الملاحظات أدناه.</p>}
    </section>
    <section className="grid gap-2 rounded-xl border border-white/10 p-4">
      <h3 className="font-bold">فحص ما قبل النشر</h3>
      {issues.length
        ? <>
          <p className="text-xs leading-5 text-white/45">هذه الملاحظات تمنع النشر، وغالبًا سببها حقل فارغ أو ترجمة ناقصة.</p>
          <ul className="list-disc space-y-1 ps-5 text-sm">{issues.map((issue, index) => <li key={index}>{translateIssue(issue)}</li>)}</ul>
        </>
        : <p className="text-sm text-emerald-300">لا توجد أخطاء تمنع النشر.</p>}
    </section>
    <details className="rounded-xl border border-white/10 p-4">
      <summary className="cursor-pointer font-semibold">شرح سريع للمصطلحات</summary>
      <dl className="mt-3 grid gap-3 text-sm leading-6 sm:grid-cols-2">
        <div><dt className="font-semibold">نوع المشروع</dt><dd className="text-white/50">أول اختيار يحدده الزائر، ولكل نوع أسئلة وأسعار مختلفة.</dd></div>
        <div><dt className="font-semibold">الخطوة</dt><dd className="text-white/50">شاشة واحدة من شاشات الحاسبة، وتحتوي مجموعة أسئلة.</dd></div>
        <div><dt className="font-semibold">السؤال</dt><dd className="text-white/50">ما تطلبه من الزائر، مثل عدد الصفحات أو نوع التصميم.</dd></div>
        <div><dt className="font-semibold">الخيار</dt><dd className="text-white/50">إجابة محتملة للسؤال، ولكل خيار سعر مستقل.</dd></div>
        <div><dt className="font-semibold">المسودة</dt><dd className="text-white/50">نسخة داخلية للتعديل. لا يراها الزوار.</dd></div>
        <div><dt className="font-semibold">النشر</dt><dd className="text-white/50">نسخة نهائية تظهر للزوار في صفحة الحاسبة.</dd></div>
      </dl>
    </details>
    <details className="text-xs text-white/40">
      <summary className="cursor-pointer">تفاصيل تقنية</summary>
      <div className="mt-2 grid gap-1">
        {draftRevision && <p>معرّف المسودة: <span dir="ltr">{draftRevision}</span></p>}
        {draftUpdatedAt && <p>آخر تحديث للمسودة: {new Date(draftUpdatedAt).toLocaleString("ar-EG")}</p>}
        {published && <p>الإصدار المنشور: <span dir="ltr">{published.id}</span>{published.published_at ? ` · ${new Date(published.published_at).toLocaleString("ar-EG")}` : ""}</p>}
      </div>
    </details>
  </div>;
}
