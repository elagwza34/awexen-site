import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, LogIn, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadDashboardAccess } from "../lib/roleRouting";
import { lockAdminSession } from "../lib/adminSession";

type AdminLoginProps = {
  activeSessionEmail?: string;
  onAuthenticated: (userId: string) => void;
};

export default function AdminLogin({ activeSessionEmail, onAuthenticated }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!supabase) {
      setError("خدمة تسجيل الدخول غير متاحة مؤقتًا. حاول مرة أخرى لاحقًا.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        return;
      }

      const access = await loadDashboardAccess(data.session);
      if (access.role !== "admin") {
        lockAdminSession();
        await supabase.auth.signOut({ scope: "local" });
        setPassword("");
        setError("هذا الحساب لا يملك صلاحية الدخول إلى لوحة الإدارة.");
        return;
      }

      onAuthenticated(data.session.user.id);
    } catch {
      setError("تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-brand-500/15 blur-[120px]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] shadow-2xl shadow-black/35 backdrop-blur-xl lg:grid-cols-[1fr_440px]">
        <aside className="relative hidden overflow-hidden border-l border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
          <div className="relative">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-300">Awexen Operations</p>
            <h2 className="mt-4 max-w-md text-[34px] font-black leading-[1.35] text-white">إدارة المحتوى والعملاء ومنصة التعلّم من مكان واحد.</h2>
            <div className="mt-8 space-y-4">
              {["صلاحيات مستقلة لكل عضو", "مسودات محفوظة قبل النشر", "متابعة واضحة للموافقات والطلبات"].map((item) => (
                <p key={item} className="flex items-center gap-3 text-[14px] text-white/65"><CheckCircle2 className="h-4 w-4 text-brand-400" />{item}</p>
              ))}
            </div>
          </div>
          <Link to="/" className="relative inline-flex w-fit items-center gap-2 text-[13px] font-bold text-white/55 transition hover:text-brand-300"><ArrowRight className="h-4 w-4" /> العودة إلى الموقع</Link>
        </aside>

      <div className="w-full bg-ink-950/35 p-6 sm:p-9">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-300">
              Admin Panel
            </p>
            <h1 className="text-[22px] font-extrabold text-white">تأكيد دخول الإدارة</h1>
          </div>
        </div>

        {activeSessionEmail && (
          <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-4 py-3 text-[11.5px] leading-6 text-amber-100">
            توجد جلسة حساب نشطة للبريد <span dir="ltr" className="font-bold">{activeSessionEmail}</span>، لكن فتح لوحة الإدارة يتطلب تأكيد تسجيل الدخول في هذه الجلسة.
          </div>
        )}

        <form onSubmit={submit} autoComplete="on" className="mt-6 space-y-4">
          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            البريد الإلكتروني (اسم المستخدم)
            <input
              dir="ltr"
              name="username"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[14px] text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </label>

          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            كلمة المرور
            <span className="relative block">
              <input
                dir="ltr"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-11 py-3 text-left text-[14px] text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 left-0 grid w-11 place-items-center text-white/40 transition hover:text-white"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {submitting ? "جارٍ التحقق..." : "دخول إلى لوحة الإدارة"}
          </button>
        </form>

        <p className="mt-5 text-center text-[10px] leading-5 text-white/35">
          قد يملأ مدير كلمات المرور الحقول تلقائيًا، لكن الموقع لن يرسلها أو يفتح اللوحة إلا عند الضغط على زر الدخول.
        </p>
      </div>
      </div>
    </section>
  );
}
