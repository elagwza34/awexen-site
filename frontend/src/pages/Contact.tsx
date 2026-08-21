import { useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useContent } from "../context/ContentContext";
import { supabase } from "../lib/supabase";

export default function Contact() {
  const { services, settings } = useContent();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    budget: "",
    message: "",
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const info = [
    { Icon: MapPin, title: "الموقع", value: settings.address },
    { Icon: Mail, title: "البريد الإلكتروني", value: settings.email },
    { Icon: Phone, title: "الدعم الفني", value: settings.phones },
    { Icon: Clock, title: "ساعات العمل", value: settings.hours },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError("لم يتم تهيئة اتصال Supabase بعد. أضف المفتاح الفعلي في ملف .env ثم أعد المحاولة.");
      return;
    }

    try {
      const { error: supabaseError } = await supabase.from("contact_messages").insert([
        {
          name: form.name,
          phone: form.phone,
          email: form.email,
          service: form.service,
          budget: form.budget,
          message: form.message,
        },
      ]);

      setBusy(false);

      if (supabaseError) {
        throw supabaseError;
      }

      setSent(true);
      setForm({ name: "", phone: "", email: "", service: "", budget: "", message: "" });
    } catch (submitError) {
      setBusy(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى.",
      );
    }
  };

  return (
    <>
      <PageHero
        badge="تواصل معنا"
        title="لنبدأ"
        highlight="مشروعك"
        desc="أخبرنا عن فكرتك وسيتواصل معك أحد خبرائنا خلال 24 ساعة بخطة تنفيذ وعرض سعر واضح."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "تواصل معنا" }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
          {/* Form */}
          <Reveal>
            <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-sm sm:p-9">
              <h2 className="text-[24px] font-extrabold sm:text-[28px]">
                أرسل طلبك
              </h2>
              <p className="mt-2 text-[14.5px] text-ink-500">
                جميع الحقول مطلوبة لنتمكن من تقديم عرض دقيق.
              </p>

              {sent ? (
                <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-brand-500/8 px-6 py-12 text-center">
                  <CheckCircle2 className="h-14 w-14 text-brand-500" />
                  <h3 className="text-[20px] font-extrabold">تم استلام طلبك!</h3>
                  <p className="max-w-sm text-[14.5px] leading-7 text-ink-500">
                    شكراً لتواصلك مع أوكسين. سيتواصل معك فريقنا خلال 24 ساعة على
                    البيانات التي أدخلتها.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-2 rounded-xl border-2 border-ink-900 px-6 py-2.5 text-[14px] font-bold text-ink-900 transition-colors hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                  >
                    إرسال طلب آخر
                  </button>
                </div>
              ) : (
                <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      الاسم بالكامل
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={set("name")}
                      placeholder="محمد أحمد"
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      رقم الهاتف
                    </label>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      البريد الإلكتروني
                    </label>
                    <input
                      required
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-right text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      الخدمة المطلوبة
                    </label>
                    <select
                      required
                      value={form.service}
                      onChange={set("service")}
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>
                        اختر الخدمة
                      </option>
                      {services.map((s) => (
                        <option key={s.slug} value={s.title}>
                          {s.title}
                        </option>
                      ))}
                      <option value="خدمة أخرى">خدمة أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      الميزانية التقريبية
                    </label>
                    <select
                      value={form.budget}
                      onChange={set("budget")}
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>
                        اختر النطاق
                      </option>
                      <option>أقل من 5,000 جنية</option>
                      <option>5,000 - 15,000 جنية</option>
                      <option>15,000 - 40,000 جنية</option>
                      <option>أكثر من 40,000 جنية</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      تفاصيل المشروع
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={set("message")}
                      placeholder="اكتب نبذة عن مشروعك وأهدافك..."
                      className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] leading-7 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-[13.5px] leading-7 text-red-700 sm:col-span-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
                  >
                    {busy ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <Send className="h-[18px] w-[18px]" />
                    )}
                    {busy ? "جارٍ الإرسال..." : "إرسال الطلب"}
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          {/* Info */}
          <Reveal delay={120}>
            <div className="space-y-4">
              {info.map(({ Icon: I, title, value }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-5 transition-all hover:border-brand-500/40 hover:bg-white"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                    <I className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-[14.5px] font-extrabold text-ink-900">
                      {title}
                    </h4>
                    <p className="mt-1 text-[13.5px] leading-6 text-ink-500">
                      {value}
                    </p>
                  </div>
                </div>
              ))}

              <a
                href="https://wa.me/201092400443"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#25D366]/25 transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-5 w-5" />
                تحدث معنا على واتساب
              </a>

              <div className="overflow-hidden rounded-2xl border border-ink-100">
                <iframe
                  title="موقعنا"
                  src="https://maps.google.com/maps?q=Tanta%20Egypt&t=&z=13&ie=UTF8&iwloc=&output=embed"
                  className="h-64 w-full grayscale transition-all duration-500 hover:grayscale-0"
                  loading="lazy"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
