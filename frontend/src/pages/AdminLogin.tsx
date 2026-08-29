import { useState } from "react";
import { Loader2, Lock, LogIn, ShieldAlert } from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadDashboardAccess } from "../lib/roleRouting";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("بيانات ربط Supabase غير موجودة. راجع ملف البيئة ثم أعد تشغيل الموقع.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else {
        const access = data.session ? await loadDashboardAccess(data.session) : null;
        if (access?.role !== "admin") {
          await supabase.auth.signOut();
          setError("هذا الحساب لا يملك صلاحية الدخول إلى لوحة الإدارة.");
        }
      }
    } catch {
      setError("تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section dir="rtl" className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-300">
              Admin Panel
            </p>
            <h1 className="text-[22px] font-extrabold text-white">تسجيل الدخول</h1>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            البريد الإلكتروني
            <input
              dir="ltr"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[14px] text-white outline-none focus:border-brand-500"
            />
          </label>

          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            كلمة المرور
            <input
              dir="ltr"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-[14px] text-white outline-none focus:border-brand-500"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {submitting ? "جارٍ تسجيل الدخول..." : "دخول إلى لوحة الإدارة"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4 text-[13px] leading-7 text-brand-100">
          استخدم حسابًا نشطًا بدور Owner أو Admin أو Editor أو HR أو Support.
        </div>
      </div>
    </section>
  );
}
