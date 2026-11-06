import { useMemo, useRef, useState } from "react";
import { trackConversion } from "../lib/analytics";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  Send,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";

type FormData = {
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  business_name: string;
  business_sector: string;
  custom_business_sector: string;
  business_description: string;
  business_age: string;
  social_media_url: string;
  target_audience: string;
  biggest_challenge: string;
  custom_challenge: string;
  has_website: "yes" | "no" | "";
  website_url: string;
  website_necessity: string;
  website_objective: string;
  custom_website_objective: string;
  six_month_goal: string;
  content_readiness: string;
  cooperation_readiness: string;
  terms_accepted: boolean;
};

const EMPTY: FormData = {
  name: "",
  whatsapp: "",
  email: "",
  city: "",
  business_name: "",
  business_sector: "",
  custom_business_sector: "",
  business_description: "",
  business_age: "",
  social_media_url: "",
  target_audience: "",
  biggest_challenge: "",
  custom_challenge: "",
  has_website: "",
  website_url: "",
  website_necessity: "",
  website_objective: "",
  custom_website_objective: "",
  six_month_goal: "",
  content_readiness: "",
  cooperation_readiness: "",
  terms_accepted: false,
};

type Step = 1 | 2 | 3 | 4 | 5;

const INPUT_CLASS =
  "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

const TEXTAREA_CLASS =
  "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 min-h-[110px]";

const RADIO_CLASS =
  "flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 cursor-pointer";

function FieldError({ message }: { message: string }) {
  return <p className="mt-1 text-[11.5px] text-red-500 font-medium">{message}</p>;
}

function CharCounter({ value, max }: { value: string; max: number }) {
  return <p className="text-right text-[11px] text-ink-400 font-medium">{value.length}/{max}</p>;
}

function FieldRow({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-bold text-ink-700">
        {label}
        {required && <span className="ml-1 text-[12px] text-brand-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioOption({ option, value, onChange, disabled, name }: { option: { label: string; value: string }; value: string; onChange: (v: string) => void; disabled?: boolean; name: string }) {
  const isSelected = value === option.value;
  return (
    <label
      className={RADIO_CLASS + (isSelected ? " !border-brand-500 !bg-orange-50 !text-ink-900 ring-2 ring-brand-500/20" : "")}
    >
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={isSelected}
        onChange={() => onChange(option.value)}
        disabled={disabled}
        className="h-4 w-4 text-brand-500 border-brand-500 focus:ring-0"
      />
      <span>{option.label}</span>
    </label>
  );
}

function SelectField({ id, label, options, value, onChange, required, error }: { id: string; label: string; options: { label: string; value: string }[]; value: string; onChange: (v: string) => void; required?: boolean; error?: string }) {
  return (
    <FieldRow id={id} label={label} required={required}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS + (error ? " border-red-500" : "")}
      >
        <option value="">اختر خياراً</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <FieldError message={error} />}
    </FieldRow>
  );
}

function TextAreaField({ id, label, value, onChange, required, error, min, max }: { id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; min?: number; max?: number }) {
  return (
    <FieldRow id={id} label={label} required={required}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={min}
        maxLength={max}
        className={TEXTAREA_CLASS + (error ? " border-red-500" : "")}
      />
      {max && <CharCounter value={value} max={max} />}
      {error && <FieldError message={error} />}
    </FieldRow>
  );
}

function TextInputField({ id, label, type, value, onChange, required, error, placeholder, min, max }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string; placeholder?: string; min?: number; max?: number }) {
  return (
    <FieldRow id={id} label={label} required={required}>
      <input
        id={id}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={min}
        maxLength={max}
        placeholder={placeholder}
        className={INPUT_CLASS + (error ? " border-red-500" : "")}
      />
      {error && <FieldError message={error} />}
    </FieldRow>
  );
}

const COPY_AR = {
  badge: "مبادرة Awexen",
  title: "🚀 مبادرة Awexen — موقع إلكتروني احترافي لمشروع يستحق النمو",
  subtitle: "عندك مشروع حقيقي وطموح تكبّره؟ احكي لنا عن مشروعك، وقدّم للحصول على فرصة تصميم موقع إلكتروني احترافي مجانًا.",
  highlight1: "موقع إلكتروني احترافي مجانًا",
  highlight2: "فرصة متاحة لأصحاب المشاريع الحقيقية",
  highlight3: "اختيار المشروع بناءً على معايير واضحة",
  cta: "قدّم مشروعك دلوقتي",
  formTitle: "نموذج تقديم الطلب",
  formIntro: "املأ الخطوات الخمس التالية بعناية. سيتم مراجعة طلبك واختيار المشروع الأنسب بناءً على الحاجة والإمكانية والاستعداد للنمو.",
  stepIndicator: (step: number) => `الخطوة ${step} من 5`,
  s1_title: "بيانات صاحب المشروع",
  s1_name: "الاسم بالكامل",
  s1_name_ph: "محمد أحمد",
  s1_phone: "رقم واتساب للتواصل",
  s1_phone_ph: "010xxxxxxxx",
  s1_email: "البريد الإلكتروني",
  s1_email_ph: "you@example.com",
  s1_city: "المحافظة / المدينة",
  s1_city_ph: "مثلاً: القاهرة، الجيزة، الإسكندرية…",
  s2_title: "احكي لنا عن مشروعك",
  s2_business_name: "اسم المشروع أو العلامة التجارية",
  s2_business_name_ph: "مثلاً: متجر الأنوار للملابس",
  s2_sector: "مجال نشاط المشروع",
  s2_sector_ph: "اختر المجال",
  s2_custom_sector: "حدد المجال يدوياً",
  s2_custom_sector_ph: "اكتب مجال نشاط المشروع",
  s2_desc: "احكي لنا عن مشروعك وبتقدم إيه؟",
  s2_desc_ph: "صف منتجاتك أو خدماتك، جمهورك المستهدف، وقيمة مشروعك…",
  s2_age: "بقالك قد إيه شغال في المشروع؟",
  s2_social: "رابط صفحة المشروع على السوشيال ميديا",
  s2_social_ph: "https://instagram.com/yourbusiness",
  s3_title: "عملاؤك والتحديات اللي بتواجهك",
  s3_audience: "مين العملاء اللي بتستهدفهم؟",
  s3_audience_ph: "مثلاً: سيدات في سن 25-40، أصحاب المشاريع الصغيرة…",
  s3_challenge: "إيه أكبر تحدي بيواجه مشروعك حاليًا؟",
  s3_challenge_ph: "اختر التحدي",
  s3_custom_challenge: "وصف التحدي",
  s3_custom_challenge_ph: "اكتب التحدي الذي تواجهه",
  s3_has_website: "هل عندك موقع إلكتروني حاليًا؟",
  s3_website_url: "رابط الموقع الحالي",
  s3_website_url_ph: "https://example.com",
  s4_title: "إزاي الموقع ممكن يساعد مشروعك؟",
  s4_necessity: "ليه شايف إن مشروعك محتاج موقع إلكتروني؟",
  s4_objective: "إيه الهدف الأساسي من الموقع؟",
  s4_objective_ph: "اختر الهدف",
  s4_custom_objective: "وصف الهدف",
  s4_custom_objective_ph: "اكتب الهدف من الموقع",
  s4_goal: "لو تم اختيار مشروعك، إيه النتيجة اللي تتمنى تحققها خلال 6 شهور؟",
  s4_goal_ph: "مثلاً: زيادة المبيعات بنسبة 30%، الوصول لعملاء جدد…",
  s5_title: "آخر خطوة قبل إرسال طلبك",
  s5_content: "هل عندك لوجو وصور ومحتوى جاهز للموقع؟",
  s5_cooperation: "هل تقدر تتعاون مع فريق Awexen وتوفر المعلومات المطلوبة خلال التنفيذ؟",
  s5_terms: "أوافق على شروط مبادرة Awexen وسياسة الخصوصية، وعلى استخدام بياناتي لمراجعة الطلب والتواصل معايا بخصوص المبادرة.",
  s5_review_title: "مراجعة الطلب قبل الإرسال",
  s5_review_sub: "راجع بياناتك وتأكد من صحتها قبل الضغط على إرسال",
  submit: "🚀 إرسال طلب المشاركة",
  sending: "جارٍ الإرسال…",
  successTitle: "تم استلام طلبك بنجاح! 🧡",
  successText: "شكرًا لمشاركتك في مبادرة Awexen. سيتم مراجعة طلبك وفقًا لمعايير الاختيار، وفي حالة اختيار مشروعك سنتواصل معاك من خلال بيانات التواصل المسجلة.",
  reference: "رقم مرجع طلبك:",
  error: "حدث خطأ أثناء إرسال الطلب. راجع بياناتك وحاول مرة أخرى.",
  validation: {
    required: "هذا الحقل مطلوب",
    email_invalid: "برجاء إدخال بريد إلكتروني صحيح",
    phone_invalid: "برجاء إدخال رقم هاتف صحيح",
    min_length: (n: number) => `برجاء إدخال ما لا يقل عن ${n} أحرف`,
    max_length: (n: number) => `برجاء عدم تجاوز ${n} حرف`,
    url_invalid: "برجاء إدخال رابط صحيح يبدأ بـ http أو https",
    url_only: "هذا الحقل مخصص للروابط فقط (يبدأ بـ http أو https)",
    select_required: "برجاء اختيار خيار من القائمة",
    radio_required: "برجاء اختيار أحد الخيارات",
    terms_required: "برجاء الموافقة على الشروط والأحكام للمتابعة",
  },
  nav: { prev: "السابق", next: "التالي", submit: "إرسال الطلب" },
};

const COPY_EN = {
  badge: "Awexen Initiative",
  title: "🚀 Awexen Initiative — A Professional Website for a Business Worth Growing",
  subtitle: "Have a real business and the ambition to grow it? Tell us about your project, and apply for a chance to get a professional website designed for free.",
  highlight1: "Free professional website",
  highlight2: "Opportunity for real business owners",
  highlight3: "Selection based on clear criteria",
  cta: "Apply Now",
  formTitle: "Application Form",
  formIntro: "Please fill out the following five steps carefully. We will review your application and select the most suitable project based on need, potential, and readiness.",
  stepIndicator: (step: number) => `Step ${step} of 5`,
  s1_title: "Applicant Information",
  s1_name: "Full Name",
  s1_name_ph: "Mohamed Ahmed",
  s1_phone: "WhatsApp Number",
  s1_phone_ph: "010xxxxxxxx",
  s1_email: "Email Address",
  s1_email_ph: "you@example.com",
  s1_city: "City / Governorate",
  s1_city_ph: "e.g. Cairo, Giza, Alexandria…",
  s2_title: "Tell Us About Your Project",
  s2_business_name: "Business Name or Brand",
  s2_business_name_ph: "e.g. Al-Anwar Clothing Store",
  s2_sector: "Business Sector",
  s2_sector_ph: "Select sector",
  s2_custom_sector: "Specify sector manually",
  s2_custom_sector_ph: "Write your business sector",
  s2_desc: "Tell us about your project and what you offer?",
  s2_desc_ph: "Describe your products or services, target audience, and project value…",
  s2_age: "How long have you been running the project?",
  s2_social: "Project Social Media Page URL",
  s2_social_ph: "https://instagram.com/yourbusiness",
  s3_title: "Your Customers and Challenges",
  s3_audience: "Who are your target customers?",
  s3_audience_ph: "e.g. Women aged 25-40, small business owners…",
  s3_challenge: "What is the biggest challenge your project currently faces?",
  s3_challenge_ph: "Select challenge",
  s3_custom_challenge: "Describe the challenge",
  s3_custom_challenge_ph: "Write the challenge you face",
  s3_has_website: "Do you currently have a website?",
  s3_website_url: "Current Website URL",
  s3_website_url_ph: "https://example.com",
  s4_title: "How Can a Website Help Your Project?",
  s4_necessity: "Why do you think your project needs a website?",
  s4_objective: "What is the primary objective of the website?",
  s4_objective_ph: "Select objective",
  s4_custom_objective: "Describe the objective",
  s4_custom_objective_ph: "Write the website objective",
  s4_goal: "If your project is selected, what result do you hope to achieve within 6 months?",
  s4_goal_ph: "e.g. Increase sales by 30%, reach new customers…",
  s5_title: "Final Step Before Submitting",
  s5_content: "Do you have a logo, images, and content ready for the website?",
  s5_cooperation: "Can you cooperate with the Awexen team and provide required information during implementation?",
  s5_terms: "I agree to Awexen Initiative Terms and Privacy Policy, and to the use of my data for application review and contact regarding the initiative.",
  s5_review_title: "Review Application Before Submission",
  s5_review_sub: "Review your data and ensure its accuracy before clicking Submit",
  submit: "🚀 Submit Application",
  sending: "Sending…",
  successTitle: "Application Received Successfully! 🧡",
  successText: "Thank you for participating in the Awexen Initiative. We will review your application according to selection criteria, and if your project is selected, we will contact you through the registered communication details.",
  reference: "Your Application Reference Number:",
  error: "An error occurred while submitting the application. Please review your data and try again.",
  validation: {
    required: "This field is required",
    email_invalid: "Please enter a valid email address",
    phone_invalid: "Please enter a valid phone number",
    min_length: (n: number) => `Please enter at least ${n} characters`,
    max_length: (n: number) => `Please do not exceed ${n} characters`,
    url_invalid: "Please enter a valid URL starting with http or https",
    url_only: "This field is for links only (must start with http or https)",
    select_required: "Please select an option from the list",
    radio_required: "Please select one of the options",
    terms_required: "You must agree to the terms and conditions to proceed",
  },
  nav: { prev: "Previous", next: "Next", submit: "Submit Application" },
};

const SECTOR_OPTIONS = [
  { label: "مطاعم وكافيهات", value: "restaurants_cafes" },
  { label: "ملابس وأزياء", value: "clothing_fashion" },
  { label: "تجميل وعناية شخصية", value: "beauty_personal_care" },
  { label: "تعليم وتدريب", value: "education_training" },
  { label: "خدمات مهنية واستشارات", value: "professional_services_consulting" },
  { label: "تجارة ومنتجات", value: "trade_products" },
  { label: "صناعة ومصانع", value: "industry_factories" },
  { label: "عقارات ومقاولات", value: "real_estate_contracting" },
  { label: "سياحة وسفر", value: "tourism_travel" },
  { label: "صحة وخدمات طبية", value: "health_medical_services" },
  { label: "أخرى", value: "other" },
];

const BUSINESS_AGE_OPTIONS = [
  { label: "أقل من 6 شهور", value: "less_than_6_months" },
  { label: "من 6 شهور لسنة", value: "6_months_to_1_year" },
  { label: "من سنة إلى 3 سنوات", value: "1_to_3_years" },
  { label: "أكثر من 3 سنوات", value: "more_than_3_years" },
];

const CHALLENGE_OPTIONS = [
  { label: "صعوبة الوصول لعملاء جدد", value: "difficulty_reaching_new_customers" },
  { label: "ضعف المبيعات", value: "low_sales" },
  { label: "عدم وجود حضور احترافي على الإنترنت", value: "no_professional_online_presence" },
  { label: "صعوبة عرض المنتجات والخدمات", value: "difficulty_showcasing_products_services" },
  { label: "صعوبة استقبال الطلبات أو الحجوزات", value: "difficulty_receiving_orders_bookings" },
  { label: "تحديات أخرى", value: "other" },
];

const WEBSITE_OBJECTIVE_OPTIONS = [
  { label: "عرض الشركة وخدماتها بشكل احترافي", value: "showcase_company_services" },
  { label: "عرض المنتجات واستقبال طلبات الشراء", value: "showcase_products_receive_orders" },
  { label: "استقبال الحجوزات أو طلبات الخدمات", value: "receive_bookings_service_requests" },
  { label: "عرض سابقة الأعمال والمشاريع", value: "showcase_portfolio_projects" },
  { label: "جذب عملاء محتملين واستفسارات جديدة", value: "attract_leads_inquiries" },
  { label: "هدف آخر", value: "other" },
];

const CONTENT_READINESS_OPTIONS = [
  { label: "نعم، كل حاجة جاهزة", value: "ready" },
  { label: "جاهز بشكل جزئي", value: "partial" },
  { label: "لا، محتاج أجهز المحتوى", value: "not_ready" },
];

const COOPERATION_READINESS_OPTIONS = [
  { label: "نعم", value: "yes" },
  { label: "لا", value: "no" },
];

const YES_NO_OPTIONS = [
  { label: "نعم", value: "yes" },
  { label: "لا", value: "no" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+201|01)[0-9]{9}$/;
const URL_REGEX = /^https?:\/\/.+/;

const OPTIONAL_LIMITS = {
  city: [2, 100], business_name: [2, 200], business_sector: [2, 100],
  business_description: [20, 2000], business_age: [2, 50],
  target_audience: [10, 2000], biggest_challenge: [3, 2000],
  website_necessity: [10, 2000], website_objective: [2, 100],
  six_month_goal: [10, 2000],
} as const;

function validateOptionalFields(data: FormData, copy: typeof COPY_AR, errors: Record<string, string>, fields: (keyof typeof OPTIONAL_LIMITS)[]) {
  for (const field of fields) {
    const length = data[field].trim().length;
    const [min, max] = OPTIONAL_LIMITS[field];
    if (length && length < min) errors[field] = copy.validation.min_length(min);
    else if (length > max) errors[field] = copy.validation.max_length(max);
  }
}

function validateStep1(data: FormData, copy: typeof COPY_AR) {
  const errors: Record<string, string> = {};
  validateOptionalFields(data, copy, errors, ["city"]);
  if (!data.name.trim()) errors.name = copy.validation.required;
  else if (data.name.trim().length < 2) errors.name = copy.validation.min_length(2);
  else if (data.name.trim().length > 100) errors.name = copy.validation.max_length(100);
  if (!data.whatsapp.trim()) errors.whatsapp = copy.validation.required;
  else if (!PHONE_REGEX.test(data.whatsapp.trim())) errors.whatsapp = copy.validation.phone_invalid;
  if (!data.email.trim()) errors.email = copy.validation.required;
  else if (!EMAIL_REGEX.test(data.email.trim())) errors.email = copy.validation.email_invalid;
  // city اختياري
  return errors;
}

function validateStep2(data: FormData, copy: typeof COPY_AR) {
  const errors: Record<string, string> = {};
  validateOptionalFields(data, copy, errors, ["business_name","business_sector","business_description","business_age"]);
  // business_name اختياري
  // business_sector اختياري
  if (data.business_sector === "other" && !data.custom_business_sector.trim())
    errors.custom_business_sector = copy.validation.required;
  // business_description اختياري ( χωρίς min_length)
  // business_age اختياري
  if (data.social_media_url && !URL_REGEX.test(data.social_media_url))
    errors.social_media_url = copy.validation.url_only;
  return errors;
}

function validateStep3(data: FormData, copy: typeof COPY_AR) {
  const errors: Record<string, string> = {};
  validateOptionalFields(data, copy, errors, ["target_audience","biggest_challenge"]);
  // target_audience اختياري
  // biggest_challenge اختياري
  if (data.biggest_challenge === "other" && !data.custom_challenge.trim())
    errors.custom_challenge = copy.validation.required;
  // has_website اختياري
  if (data.has_website === "yes" && data.website_url && !URL_REGEX.test(data.website_url))
    errors.website_url = copy.validation.url_only;
  return errors;
}

function validateStep4(data: FormData, copy: typeof COPY_AR) {
  const errors: Record<string, string> = {};
  validateOptionalFields(data, copy, errors, ["website_necessity","website_objective","six_month_goal"]);
  // website_necessity اختياري
  // website_objective اختياري
  if (data.website_objective === "other" && !data.custom_website_objective.trim())
    errors.custom_website_objective = copy.validation.required;
  // six_month_goal اختياري
  return errors;
}

function validateStep5(data: FormData, copy: typeof COPY_AR) {
  const errors: Record<string, string> = {};
  // content_readiness اختياري
  // cooperation_readiness اختياري
  if (!data.terms_accepted) errors.terms_accepted = copy.validation.terms_required;
  return errors;
}

const STEP_VALIDATORS: Record<Step, (data: FormData, copy: typeof COPY_AR) => Record<string, string>> = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
  5: validateStep5,
};

function Step1({ data, onChange, errors }: { data: FormData; onChange: (patch: Partial<FormData>) => void; errors: Record<string, string> }) {
  const { lang } = useLanguage();
  const copy = lang === "ar" ? COPY_AR : COPY_EN;
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-[24px] font-extrabold text-ink-900">{copy.s1_title}</h2>
        <p className="mt-2 text-[14px] text-ink-500">أدخل بياناتك الأساسية للتواصل معك في حالة اختيار مشروعك.</p>
      </div>

      <TextInputField
        id="name"
        label={copy.s1_name}
        value={data.name}
        onChange={(v) => onChange({ name: v })}
        required
        error={errors.name}
        placeholder={copy.s1_name_ph}
        max={100}
      />

      <TextInputField
        id="whatsapp"
        type="tel"
        label={copy.s1_phone}
        value={data.whatsapp}
        onChange={(v) => onChange({ whatsapp: v })}
        required
        error={errors.whatsapp}
        placeholder={copy.s1_phone_ph}
      />

      <TextInputField
        id="email"
        type="email"
        label={copy.s1_email}
        value={data.email}
        onChange={(v) => onChange({ email: v })}
        required
        error={errors.email}
        placeholder={copy.s1_email_ph}
      />

      <TextInputField
        id="city"
        label={copy.s1_city}
        value={data.city}
        onChange={(v) => onChange({ city: v })}
        error={errors.city}
        placeholder={copy.s1_city_ph}
      />
    </div>
  );
}

function Step2({ data, onChange, errors }: { data: FormData; onChange: (patch: Partial<FormData>) => void; errors: Record<string, string> }) {
  const { lang } = useLanguage();
  const copy = lang === "ar" ? COPY_AR : COPY_EN;
  const showCustomSector = data.business_sector === "other";
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-[24px] font-extrabold text-ink-900">{copy.s2_title}</h2>
        <p className="mt-2 text-[14px] text-ink-500">احكي لنا عن مشروعك، ما تقدمه، ومن هو جمهورك المستهدف.</p>
      </div>

      <TextInputField
        id="business_name"
        label={copy.s2_business_name}
        value={data.business_name}
        onChange={(v) => onChange({ business_name: v })}
        error={errors.business_name}
        placeholder={copy.s2_business_name_ph}
      />

      <SelectField
        id="business_sector"
        label={copy.s2_sector}
        options={SECTOR_OPTIONS}
        value={data.business_sector}
        onChange={(v) => onChange({ business_sector: v, custom_business_sector: v === "other" ? "" : data.custom_business_sector })}
        error={errors.business_sector}
      />

      {showCustomSector && (
        <TextInputField
          id="custom_business_sector"
          label={copy.s2_custom_sector}
          value={data.custom_business_sector}
          onChange={(v) => onChange({ custom_business_sector: v })}
          error={errors.custom_business_sector}
          placeholder={copy.s2_custom_sector_ph}
        />
      )}

      <TextAreaField
        id="business_description"
        label={copy.s2_desc}
        value={data.business_description}
        onChange={(v) => onChange({ business_description: v })}
        error={errors.business_description}
        max={1500}
      />

      <div className="space-y-2">
        <label className="mb-2 block text-[13.5px] font-bold text-ink-700">{copy.s2_age}</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {BUSINESS_AGE_OPTIONS.map((opt) => (
            <RadioOption key={opt.value} name="business_age" option={opt} value={data.business_age} onChange={(v) => onChange({ business_age: v })} />
          ))}
        </div>
        {errors.business_age && <FieldError message={errors.business_age} />}
      </div>

      <TextInputField
        id="social_media_url"
        type="url"
        label={copy.s2_social}
        value={data.social_media_url}
        onChange={(v) => onChange({ social_media_url: v })}
        error={errors.social_media_url}
        placeholder={copy.s2_social_ph}
      />
    </div>
  );
}

function Step3({ data, onChange, errors }: { data: FormData; onChange: (patch: Partial<FormData>) => void; errors: Record<string, string> }) {
  const { lang } = useLanguage();
  const copy = lang === "ar" ? COPY_AR : COPY_EN;
  const showCustomChallenge = data.biggest_challenge === "other";
  const showWebsiteUrl = data.has_website === "yes";
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-[24px] font-extrabold text-ink-900">{copy.s3_title}</h2>
        <p className="mt-2 text-[14px] text-ink-500">حدّد جمهورك المستهدف وأكبر تحدٍ تواجهه في مشروعك.</p>
      </div>

      <TextAreaField
        id="target_audience"
        label={copy.s3_audience}
        value={data.target_audience}
        onChange={(v) => onChange({ target_audience: v })}
        error={errors.target_audience}
      />

      <SelectField
        id="biggest_challenge"
        label={copy.s3_challenge}
        options={CHALLENGE_OPTIONS}
        value={data.biggest_challenge}
        onChange={(v) => onChange({ biggest_challenge: v, custom_challenge: v === "other" ? "" : data.custom_challenge })}
        error={errors.biggest_challenge}
      />

      {showCustomChallenge && (
        <TextInputField
          id="custom_challenge"
          label={copy.s3_custom_challenge}
          value={data.custom_challenge}
          onChange={(v) => onChange({ custom_challenge: v })}
          error={errors.custom_challenge}
          placeholder={copy.s3_custom_challenge_ph}
        />
      )}

      <div className="space-y-2">
        <label className="mb-2 block text-[13.5px] font-bold text-ink-700">{copy.s3_has_website}</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {YES_NO_OPTIONS.map((opt) => (
            <RadioOption key={opt.value} name="has_website" option={opt} value={data.has_website} onChange={(v) => onChange({ has_website: v as "yes" | "no" })} />
          ))}
        </div>
        {errors.has_website && <FieldError message={errors.has_website} />}
      </div>

      {showWebsiteUrl && (
        <TextInputField
          id="website_url"
          type="url"
          label={copy.s3_website_url}
          value={data.website_url}
          onChange={(v) => onChange({ website_url: v })}
          error={errors.website_url}
          placeholder={copy.s3_website_url_ph}
        />
      )}
    </div>
  );
}

function Step4({ data, onChange, errors }: { data: FormData; onChange: (patch: Partial<FormData>) => void; errors: Record<string, string> }) {
  const { lang } = useLanguage();
  const copy = lang === "ar" ? COPY_AR : COPY_EN;
  const showCustomObjective = data.website_objective === "other";
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-[24px] font-extrabold text-ink-900">{copy.s4_title}</h2>
        <p className="mt-2 text-[14px] text-ink-500">احكي لنا كيف يمكن للموقع الإلكتروني أن يساعد مشروعك في النمو.</p>
      </div>

      <TextAreaField
        id="website_necessity"
        label={copy.s4_necessity}
        value={data.website_necessity}
        onChange={(v) => onChange({ website_necessity: v })}
        error={errors.website_necessity}
      />

      <SelectField
        id="website_objective"
        label={copy.s4_objective}
        options={WEBSITE_OBJECTIVE_OPTIONS}
        value={data.website_objective}
        onChange={(v) => onChange({ website_objective: v, custom_website_objective: v === "other" ? "" : data.custom_website_objective })}
        error={errors.website_objective}
      />

      {showCustomObjective && (
        <TextInputField
          id="custom_website_objective"
          label={copy.s4_custom_objective}
          value={data.custom_website_objective}
          onChange={(v) => onChange({ custom_website_objective: v })}
          error={errors.custom_website_objective}
          placeholder={copy.s4_custom_objective_ph}
        />
      )}

      <TextAreaField
        id="six_month_goal"
        label={copy.s4_goal}
        value={data.six_month_goal}
        onChange={(v) => onChange({ six_month_goal: v })}
        error={errors.six_month_goal}
      />
    </div>
  );
}

function Step5({ data, onChange, errors }: { data: FormData; onChange: (patch: Partial<FormData>) => void; errors: Record<string, string> }) {
  const { lang } = useLanguage();
  const copy = lang === "ar" ? COPY_AR : COPY_EN;
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-[24px] font-extrabold text-ink-900">{copy.s5_title}</h2>
        <p className="mt-2 text-[14px] text-ink-500">أخيرًا، أخبرنا عن جاهزيتك للمشاركة في المبادرة.</p>
      </div>

      <div className="space-y-2">
        <label className="mb-2 block text-[13.5px] font-bold text-ink-700">{copy.s5_content}</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {CONTENT_READINESS_OPTIONS.map((opt) => (
            <RadioOption key={opt.value} name="content_readiness" option={opt} value={data.content_readiness} onChange={(v) => onChange({ content_readiness: v })} />
          ))}
        </div>
        {errors.content_readiness && <FieldError message={errors.content_readiness} />}
      </div>

      <div className="space-y-2">
        <label className="mb-2 block text-[13.5px] font-bold text-ink-700">{copy.s5_cooperation}</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {COOPERATION_READINESS_OPTIONS.map((opt) => (
            <RadioOption key={opt.value} name="cooperation_readiness" option={opt} value={data.cooperation_readiness} onChange={(v) => onChange({ cooperation_readiness: v })} />
          ))}
        </div>
        {errors.cooperation_readiness && <FieldError message={errors.cooperation_readiness} />}
      </div>

      <div className="mb-5">
        <label className="flex items-start gap-2 cursor-pointer text-[14px] text-ink-700">
          <input
            type="checkbox"
            checked={data.terms_accepted}
            onChange={(e) => onChange({ terms_accepted: e.target.checked })}
            className="h-4 w-4 text-brand-500 border-brand-500 focus:ring-brand-500"
          />
          <span>{copy.s5_terms}</span>
        </label>
        {errors.terms_accepted && <FieldError message={errors.terms_accepted} />}
      </div>
    </div>
  );
}

export default function Initiative() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const copy = ar ? COPY_AR : COPY_EN;
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submissionId = useRef(`initiative:${crypto.randomUUID()}`);
  const submitting = useRef(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const currentStepData = useMemo(() => {
    switch (step) {
      case 1: return validateStep1(form, copy);
      case 2: return validateStep2(form, copy);
      case 3: return validateStep3(form, copy);
      case 4: return validateStep4(form, copy);
      case 5: return validateStep5(form, copy);
    }
  }, [step, form, copy]);

  const stepComponents: Record<Step, React.ComponentType<any>> = {
    1: Step1,
    2: Step2,
    3: Step3,
    4: Step4,
    5: Step5,
  };

  const goToStep = (next: Step) => {
    const stepErrors = STEP_VALIDATORS[step](form, copy);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setStep(next);
    }
  };

  const submitForm = async () => {
    if (submitting.current || busy || sent) return;
    for (const stepNumber of [1, 2, 3, 4, 5] as Step[]) {
      const stepErrors = STEP_VALIDATORS[stepNumber](form, copy);
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors);
        setStep(stepNumber);
        return;
      }
    }
    setErrors({});
    submitting.current = true;
    setBusy(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.from("initiative_applications").insert({
        applicant_name: form.name.trim(),
        whatsapp_number: form.whatsapp.trim(),
        email: form.email.trim(),
        city: form.city,
        business_name: form.business_name,
        business_sector: form.business_sector,
        custom_business_sector: form.custom_business_sector,
        business_description: form.business_description,
        business_age: form.business_age,
        social_media_url: form.social_media_url,
        target_audience: form.target_audience,
        biggest_challenge: form.biggest_challenge,
        custom_challenge: form.custom_challenge,
        has_website: form.has_website,
        website_url: form.website_url,
        website_necessity: form.website_necessity,
        website_objective: form.website_objective,
        custom_website_objective: form.custom_website_objective,
        six_month_goal: form.six_month_goal,
        content_readiness: form.content_readiness,
        cooperation_readiness: form.cooperation_readiness,
        terms_accepted: form.terms_accepted,
        terms_version: "1.0",
        status: "new",
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      const ref = `AWX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      setReferenceNumber(ref);
      trackConversion("initiative_form_submit", submissionId.current);
      setSent(true);
    } catch {
      setErrors({ _form: copy.error });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const StepComp = stepComponents[step];
  return (
    <>
      <PageHero
        badge={copy.badge}
        title={copy.title}
        desc={copy.subtitle}
        crumbs={[{ label: ar ? "الرئيسية" : "Home", to: "/" }, { label: copy.formTitle }]}
      >
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[12.5px] font-bold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {copy.highlight1}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[12.5px] font-bold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {copy.highlight2}
          </div>
          <div className="flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[12.5px] font-bold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {copy.highlight3}
          </div>
        </div>
      </PageHero>

      {!sent ? (
        <section className="bg-white py-20 sm:py-24">
          <div className="container-x">
            <div className="mx-auto max-w-3xl">
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] font-bold text-ink-500">{copy.stepIndicator(step)}</span>
                  <span className="text-[13px] font-bold text-brand-500">
                    {step === 5 ? copy.s5_review_title : ""}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${(step / 5) * 100}%` }}
                  />
                </div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); if (step === 5) void submitForm(); else goToStep((step + 1) as Step); }} className="space-y-8 ms-auto" style={{ width: '100%' }}>
                <Reveal>
                  <StepComp
                    data={form}
                    onChange={(patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }))}
                    errors={errors}
                  />
                </Reveal>

                {errors._form && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-red-700 text-sm">
                    {errors._form}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep((prev) => { const next = prev - 1; return next as Step; })}
                      className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-7 py-3.5 text-[15px] font-bold text-ink-900 transition-all hover:bg-ink-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {copy.nav.prev}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 5) {
                        submitForm();
                      } else {
                        goToStep((step + 1) as Step);
                      }
                    }}
                    disabled={busy || Object.keys(currentStepData).length > 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <>
                        {step === 5 ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {step === 5 ? copy.submit : copy.nav.next}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-ink-50 py-20 sm:py-24">
          <div className="container-x">
            <Reveal dir="scale">
              <div className="relative mx-auto max-w-xl flex flex-col items-center text-center rounded-[28px] bg-white p-10 sm:p-14 shadow-xl shadow-brand-500/10">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-[24px] font-extrabold leading-[1.35] sm:text-[32px] text-ink-900">
                  {copy.successTitle}
                </h2>
                <p className="mt-4 text-[15px] leading-8 text-ink-500 max-w-lg">
                  {copy.successText}
                </p>
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[13px] font-bold text-ink-500">{copy.reference}</span>
                    <span className="text-[18px] font-black text-brand-500 font-mono">{referenceNumber}</span>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to="/"
                      className="rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400"
                    >
                      {ar ? "الرئيسية" : "Home"}
                      <ArrowLeft className="h-[18px] w-[18px]" />
                    </Link>
                    <a
                      href="https://wa.me/201092400443"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-brand-500 hover:bg-brand-500"
                    >
                      <Phone className="h-[18px] w-[18px]" />
                      201092400443
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
