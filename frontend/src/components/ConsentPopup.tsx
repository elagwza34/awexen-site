import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { CONSENT_EVENT, CONSENT_KEY, readConsent, saveConsent } from "../lib/consent";

export default function ConsentPopup() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [open, setOpen] = useState(() => !readConsent());
  const [error, setError] = useState(false);
  useEffect(() => {
    const sync = () => { if (!readConsent()) setOpen(true); };
    const storage = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) setOpen(!readConsent()); };
    const timer = window.setInterval(sync, 30_000);
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", storage);
    return () => { window.clearInterval(timer); window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener("storage", storage); };
  }, []);
  const choose = (accepted: boolean) => {
    if (saveConsent(accepted)) { setOpen(false); setError(false); }
    else setError(true);
  };
  return <aside dir={ar ? "rtl" : "ltr"} aria-label={ar ? "اختيار ملفات الارتباط" : "Cookie choice"} className="fixed bottom-20 left-3 z-[100] max-w-sm sm:left-5">
    {open ? <div className="rounded-2xl border border-white/20 bg-black p-5 text-white shadow-2xl" role="region" aria-labelledby="cookie-question">
      <p id="cookie-question" className="text-sm leading-7">{ar ? "بنستخدم ملفات تعريف الارتباط لتحسين تجربتك وفهم استخدام الموقع. هل توافق؟" : "We use cookies to improve your experience and understand website usage. Do you agree?"}</p>
      <p className="mt-2 text-xs leading-6 text-white/70">{ar ? "يشمل ذلك تحليلات Google وقياس التسويق عبر Meta. يمكنك الرفض أو تغيير اختيارك لاحقًا." : "This includes Google analytics and Meta marketing measurement. You can reject or change your choice later."}</p>
      <div className="my-3 flex gap-3">{[true, false].map((accepted) => <button key={String(accepted)} type="button" onClick={() => choose(accepted)} className="min-h-11 flex-1 rounded-lg border border-[#F45907] px-4 py-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" style={{ background: accepted ? "#F45907" : "transparent" }}>{accepted ? (ar ? "موافق" : "Accept") : (ar ? "رفض" : "Reject")}</button>)}</div>
      <Link to="/privacy" className="text-xs underline">{ar ? "سياسة الخصوصية" : "Privacy policy"}</Link>
      {error && <p role="alert" className="mt-2 text-xs">{ar ? "تعذر حفظ الاختيار. التتبع الاختياري يظل متوقفًا." : "Could not save your choice. Optional tracking remains off."}</p>}
    </div> : <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-white/30 bg-black px-3 py-2 text-xs text-white shadow-lg">{ar ? "اختيار الخصوصية" : "Privacy choice"}</button>}
  </aside>;
}
