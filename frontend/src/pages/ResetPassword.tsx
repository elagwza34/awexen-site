import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"set" | "success" | "error">("set");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const accessToken = searchParams.get("access_token");
  const type = searchParams.get("type");

  useEffect(() => {
    if (!supabase) {
      setStep("error");
      setMessage("خدمة تسجيل الدخول غير مهيأة.");
      return;
    }
    // رابط إعادة التعيين من Supabase يضبط الجلسة تلقائياً عند فتح الصفحة.
    // لو مفيش access_token أو نوع الرابط ليس recovery، الرابط غير صالح.
    if (!accessToken || type !== "recovery") {
      setStep("error");
      setMessage("رابط إعادة التعيين غير صالح أو منتهي الصلاحية.");
    }
  }, [accessToken, type]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    if (password !== confirmPassword) {
      setMessage("كلمة المرور وتأكيد كلمة المرور غير متطابقين.");
      return;
    }
    if (password.length < 6) {
      setMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.session) {
        throw new Error("جلسة إعادة التعيين منتهية. اطلب رابطاً جديداً.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setStep("success");
    } catch (err: any) {
      setMessage(err?.message || "تعذر إعادة تعيين كلمة المرور. حاول مرة أخرى.");
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <section dir="rtl" className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/35 backdrop-blur-xl p-8 sm:p-12 max-w-md w-full">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400 mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-[20px] font-extrabold text-white text-center">تم إعادة تعيين كلمة المرور</h2>
          <p className="mt-2 text-center text-[13px] text-white/55">
            يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <a
              href="/awexen"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-400"
            >
              <Lock className="h-4 w-4" /> دخول إلى لوحة الإدارة
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (step === "error") {
    return (
      <section dir="rtl" className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/35 backdrop-blur-xl p-8 sm:p-12 max-w-md w-full">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-red-500/15 text-red-400 mx-auto mb-4">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-[20px] font-extrabold text-white text-center">رابط غير صالح</h2>
          <p className="mt-2 text-center text-[13px] text-white/55">{message}</p>
          <div className="mt-8 flex items-center justify-center">
            <a
              href="/awexen"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-400"
            >
              <Mail className="h-4 w-4" /> طلب رابط جديد
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/35 backdrop-blur-xl p-8 sm:p-12 max-w-md w-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-300">
              إعادة تعيين كلمة المرور
            </p>
            <h2 className="text-[20px] font-extrabold text-white">تعيين كلمة مرور جديدة</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            كلمة المرور الجديدة
            <input
              dir="ltr"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="كلمة مرور جديدة"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[14px] text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </label>
          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            تأكيد كلمة المرور الجديدة
            <input
              dir="ltr"
              type="password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="تأكيد كلمة المرور"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[14px] text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !password || !confirmPassword}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "تعيين كلمة المرور"}
          </button>
        </form>
        {message && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
