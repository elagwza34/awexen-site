import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, LogIn, ShieldAlert } from "lucide-react";
import { loginAdmin } from "../lib/auth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAdmin(username, password);
    if (!ok) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      return;
    }
    navigate("/admin");
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-300">
              Admin Panel
            </p>
            <h1 className="text-[28px] font-extrabold text-white">تسجيل الدخول</h1>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            اسم المستخدم
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500"
            />
          </label>

          <label className="block space-y-2 text-[13px] font-bold text-white/80">
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white outline-none focus:border-brand-500"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400"
          >
            <LogIn className="h-4 w-4" />
            دخول إلى لوحة الإدارة
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4 text-[13px] leading-7 text-brand-100">
          <p className="font-bold">بيانات الوصول الافتراضية:</p>
          <p>المستخدم: admin</p>
          <p>كلمة المرور: admin123</p>
        </div>
      </div>
    </section>
  );
}
