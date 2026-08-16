import { Link } from "react-router-dom";
import { ArrowLeft, Clock3, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal } from "./ui";

const assurances = [
  { Icon: Clock3, text: "رد خلال 24 ساعة" },
  { Icon: ShieldCheck, text: "استشارة مجانية بالكامل" },
  { Icon: MessageCircle, text: "بدون التزام أو رسوم" },
];

export default function CTA() {
  const { settings } = useContent();

  return (
    <section id="contact" className="relative bg-white pb-20 pt-4 sm:pb-28">
      <div className="container-x">
        <Reveal dir="scale">
          <div className="relative overflow-hidden rounded-[28px] bg-ink-950 px-6 py-14 sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-0 grid-lines opacity-60" />
              <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-500/30 blur-[110px] animate-float-slow" />
              <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-orange-600/20 blur-[110px]" />
              <div className="noise-layer absolute inset-0 opacity-[0.05]" />
            </div>

            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-semibold text-brand-300">
                <MessageCircle className="h-3.5 w-3.5" />
                جاهز للبدء؟
              </span>

              <h2 className="mt-6 text-balance text-[clamp(1.8rem,4.5vw,2.85rem)] font-black leading-[1.28] text-white">
                لنصنع معاً مشروعك الرقمي{" "}
                <span className="text-gradient-brand">القادم</span>
              </h2>

              <p className="mt-5 max-w-xl text-pretty text-[15px] leading-8 text-ink-300">
                احجز استشارة مجانية مع فريقنا وسنساعدك على تحويل فكرتك إلى منتج
                رقمي ناجح يحقق أهدافك.
              </p>

              <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                <Link
                  to="/contact"
                  className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-brand-500 px-8 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 sm:w-auto"
                >
                  احجز استشارة مجانية
                  <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5" />
                </Link>
                <a
                  href="tel:01092400443"
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 sm:w-auto"
                >
                  <Phone className="h-[18px] w-[18px]" />
                  اتصل بنا
                </a>
              </div>

              {/* طمأنة */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
                {assurances.map(({ Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-2 text-[13px] text-ink-400"
                  >
                    <Icon className="h-4 w-4 text-brand-500" />
                    {text}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/8 pt-8 text-[13.5px] text-ink-400">
                <a
                  href={`mailto:${settings.email}`}
                  className="link-underline inline-flex items-center gap-2 hover:text-brand-400"
                >
                  <Mail className="h-4 w-4 text-brand-500" />
                  {settings.email}
                </a>
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brand-500" />
                  {settings.phones}
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
