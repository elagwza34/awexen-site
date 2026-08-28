import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  Clock3,
  Download,
  ExternalLink,
  GraduationCap,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  PlayCircle,
  UserPlus,
  X,
} from "lucide-react";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  loadLearningCourse,
  loadCurrentLmsUser,
  loadMyBookings,
  loadStudentEnrollments,
  recordLessonStarted,
  recordVideoProgress,
  setLessonCompleted,
  type CourseLesson,
} from "../lib/lms";

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code.toLowerCase()
    : "";
  const normalizedMessage = message.toLowerCase();
  if (code === "invalid_credentials" || normalizedMessage.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (["email_exists", "user_already_exists"].includes(code) || normalizedMessage.includes("user already registered")) return "يوجد حساب مسجل بهذا البريد بالفعل. سجّل الدخول أو استخدم «نسيت كلمة المرور».";
  if (code === "email_not_confirmed" || normalizedMessage.includes("email not confirmed")) return "فعّل بريدك الإلكتروني أولًا ثم حاول مرة أخرى.";
  if (
    ["email_address_not_authorized", "email_provider_disabled", "unexpected_failure"].includes(code)
    || normalizedMessage.includes("error sending confirmation email")
    || normalizedMessage.includes("email address not authorized")
    || normalizedMessage.includes("email_address_not_authorized")
  ) {
    return "تعذّر إرسال كود التأكيد لأن خدمة البريد الافتراضية في Supabase لا ترسل للمتدربين. فعّل Custom SMTP من إعدادات Authentication ثم أعد المحاولة.";
  }
  if (code === "otp_expired" || normalizedMessage.includes("token has expired") || normalizedMessage.includes("invalid token")) return "كود التأكيد غير صحيح أو انتهت صلاحيته. اطلب كودًا جديدًا.";
  if (["over_email_send_rate_limit", "over_request_rate_limit"].includes(code) || normalizedMessage.includes("rate limit")) return "تم طلب أكواد كثيرة خلال وقت قصير. انتظر قليلًا ثم أعد المحاولة.";
  if (normalizedMessage.includes("failed to fetch")) {
    return "تعذّر الاتصال بخادم منصة التعلّم. تأكد أن Django API يعمل وأن رابط VITE_LMS_API_URL صحيح.";
  }
  return message;
}

function BrandMark() {
  return (
    <Link to="/" className="inline-flex items-center gap-3 text-white">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500 text-[18px] font-black shadow-lg shadow-brand-500/25">A</span>
      <span className="leading-none">
        <span className="block text-[17px] font-black">Awexen</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Learning</span>
      </span>
    </Link>
  );
}

function LearningTopbar({ email }: { email?: string }) {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase?.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link to="/learn" className="rounded-xl px-3 py-2 text-[12px] font-bold text-white/60 transition hover:bg-white/5 hover:text-white">
            كورساتي
          </Link>
          {email && <span dir="ltr" className="hidden max-w-52 truncate text-[11px] text-white/35 sm:block">{email}</span>}
          <button type="button" onClick={() => void logout()} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300" aria-label="تسجيل الخروج">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function LearningGuard() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-ink-950"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>;
  }
  if (!authenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function LearningAuth() {
  const [mode, setMode] = useState<"login" | "signup" | "otp" | "recovery">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [accountType, setAccountType] = useState<"student" | "instructor">("student");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const requestedDestination = () => (
    (location.state as { from?: string } | null)?.from
    ?? window.localStorage.getItem("awexen.auth.next")
    ?? ""
  );

  const finishLogin = async () => {
    const me = await loadCurrentLmsUser();
    const requested = requestedDestination();
    window.localStorage.removeItem("awexen.auth.next");
    window.localStorage.removeItem("awexen.auth.account_type");
    const isInstructor = me.memberships.some((membership) => membership.role === "instructor");
    const roleDestination = isInstructor ? "/instructor" : "/learn";
    const requestedMatchesRole = isInstructor
      ? requested.startsWith("/instructor")
      : requested.startsWith("/learn") || requested.startsWith("/checkout/");
    navigate(requested && requestedMatchesRole ? requested : roleDestination, { replace: true });
  };

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    const recoveryLink = window.location.hash.includes("type=recovery");
    if (recoveryLink) setMode("recovery");
    else void supabase?.auth.getSession().then(async ({ data }) => {
      if (!data.session || !supabase) return;
      try {
        const pendingType = window.localStorage.getItem("awexen.auth.account_type");
        if (pendingType === "student" || pendingType === "instructor") {
          const { error: metadataError } = await supabase.auth.updateUser({ data: { account_type: pendingType } });
          if (metadataError) throw metadataError;
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
        }
        await finishLogin();
      } catch (sessionError) {
        setError(friendlyError(sessionError));
      }
    });
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
    }).data.subscription;
    return () => subscription?.unsubscribe();
  }, [navigate]);

  const signInWithGoogle = async () => {
    setError(null);
    if (!supabase) {
      setError("بيانات ربط Supabase غير موجودة في ملف البيئة.");
      return;
    }
    setBusy(true);
    window.localStorage.setItem("awexen.auth.account_type", accountType);
    const next = requestedDestination();
    if (next) window.localStorage.setItem("awexen.auth.next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (oauthError) {
      setBusy(false);
      setError(friendlyError(oauthError));
    }
  };

  const requestPasswordReset = async () => {
    setError(null);
    setNotice(null);
    if (!supabase) {
      setError("بيانات ربط Supabase غير موجودة في ملف البيئة.");
      return;
    }
    if (!email.trim()) {
      setError("اكتب بريدك الإلكتروني أولًا ثم اضغط «نسيت كلمة المرور».");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setBusy(false);
    if (resetError) setError(friendlyError(resetError));
    else setNotice("أرسلنا رابط تغيير كلمة المرور إلى بريدك.");
  };

  const resendSignupOtp = async () => {
    setError(null);
    setNotice(null);
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    setBusy(false);
    if (resendError) setError(friendlyError(resendError));
    else {
      setResendSeconds(60);
      setNotice("تم قبول طلب إعادة الإرسال. راجع صندوق الوارد ومجلد Spam، ولو البريد مسجل بالفعل استخدم تسجيل الدخول أو استعادة كلمة المرور.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!supabase) {
      setError("بيانات ربط Supabase غير موجودة في ملف البيئة.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "otp") {
        if (!/^\d{6,10}$/.test(otp.trim())) throw new Error("كود التأكيد يجب أن يتكوّن من 6 إلى 10 أرقام.");
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: otp.trim(),
          type: "email",
        });
        if (otpError) throw otpError;
        // The password and profile metadata were already saved by signUp().
        // Writing the same password again makes Supabase reject the successful
        // OTP flow with "New password should be different from the old password".
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        await finishLogin();
      } else if (mode === "recovery") {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        navigate("/learn", { replace: true });
      } else if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
        await finishLogin();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { full_name: fullName.trim(), account_type: accountType },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (signUpError) throw signUpError;
        window.localStorage.setItem("awexen.auth.account_type", accountType);
        const next = requestedDestination();
        if (next) window.localStorage.setItem("awexen.auth.next", next);
        if (data.session) await finishLogin();
        else {
          setOtp("");
          setMode("otp");
          setResendSeconds(60);
          setNotice("تم قبول طلب التسجيل. راجع صندوق الوارد ومجلد Spam. لو البريد مسجل قبل كده، ارجع لتسجيل الدخول أو استخدم «نسيت كلمة المرور».");
        }
      }
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3.5 text-[14px] text-white outline-none transition placeholder:text-white/25 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10";

  return (
    <section className="relative grid min-h-screen overflow-hidden bg-ink-950 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="absolute inset-0 grid-lines opacity-40" />
      <div className="relative hidden flex-col justify-between overflow-hidden border-l border-white/10 p-12 lg:flex">
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full bg-brand-500/15 blur-[100px]" />
        <BrandMark />
        <div className="relative max-w-xl">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-brand-400">Awexen Learning</p>
          <h1 className="mt-5 text-[clamp(36px,4vw,64px)] font-black leading-[1.2] text-white">اتعلّم. طبّق.<br /><span className="text-brand-400">وشوف تقدّمك.</span></h1>
          <p className="mt-6 max-w-lg text-[16px] leading-8 text-white/55">كل محتوى كورساتك في مكان واحد، بترتيب واضح وتقدّم محفوظ لحد ما تكمل المسار.</p>
          <div className="mt-9 grid max-w-lg gap-3 sm:grid-cols-3">
            {["دروس منظمة", "تقدم محفوظ", "وصول من أي جهاز"].map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-[12px] font-bold text-white/70">
                <span className="mb-3 grid h-7 w-7 place-items-center rounded-lg bg-brand-500/15 text-brand-300">{index + 1}</span>{item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-white/25">© {new Date().getFullYear()} Awexen. منصة التعلّم.</p>
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden"><BrandMark /></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
              {mode === "signup" ? <UserPlus className="h-5 w-5" /> : mode === "otp" ? <CheckCircle2 className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
            </span>
            <h2 className="mt-5 text-[27px] font-black text-white">{mode === "login" ? "أهلًا برجوعك" : mode === "signup" ? "أنشئ حسابك" : mode === "otp" ? "أدخل كود التأكيد" : "كلمة مرور جديدة"}</h2>
            <p className="mt-2 text-[13px] leading-6 text-white/45">{mode === "login" ? "سجّل الدخول وسيتم توجيهك للوحة المناسبة لحسابك." : mode === "signup" ? "اختر نوع الحساب ثم سجّل بجوجل أو البريد." : mode === "otp" ? `راجع ${email} ومجلد Spam بحثًا عن كود التأكيد.` : "اكتب كلمة مرور قوية لحسابك."}</p>

            {(mode === "login" || mode === "signup") && (
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.035] p-1.5" role="group" aria-label="نوع الحساب">
                {(["student", "instructor"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={accountType === type}
                    onClick={() => setAccountType(type)}
                    className={`rounded-lg px-3 py-2.5 text-[12px] font-black transition ${accountType === type ? "bg-brand-500 text-white" : "text-white/45 hover:text-white"}`}
                  >
                    {type === "student" ? "متدرب" : "مدرب"}
                  </button>
                ))}
              </div>
            )}

            {mode === "signup" && (
              <>
                <button type="button" disabled={busy} onClick={() => void signInWithGoogle()} className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white px-5 py-3.5 text-[13px] font-black text-ink-900 transition hover:bg-white/90 disabled:opacity-60">
                  <span className="text-[17px] font-black text-blue-600">G</span> التسجيل باستخدام Google
                </button>
                <div className="my-5 flex items-center gap-3 text-[10px] text-white/25"><span className="h-px flex-1 bg-white/10" /> أو بالبريد <span className="h-px flex-1 bg-white/10" /></div>
              </>
            )}

            <form onSubmit={submit} className={`${mode === "signup" ? "" : "mt-7"} space-y-4`}>
              {mode === "signup" && (
                <label className="block text-[12px] font-bold text-white/70">الاسم بالكامل
                  <input required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" className={inputClass} />
                </label>
              )}
              {mode !== "recovery" && mode !== "otp" && (
                <label className="block text-[12px] font-bold text-white/70">البريد الإلكتروني
                  <input dir="ltr" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className={`${inputClass} text-left`} />
                </label>
              )}
              {mode === "otp" ? (
                <label className="block text-[12px] font-bold text-white/70">كود التأكيد
                  <input dir="ltr" required inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={10} pattern="[0-9]{6,10}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="000000" className={`${inputClass} text-center text-[22px] font-black tracking-[0.35em]`} />
                </label>
              ) : (
                <label className="block text-[12px] font-bold text-white/70">كلمة المرور
                  <input dir="ltr" required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className={`${inputClass} text-left`} />
                </label>
              )}
              {mode === "login" && <button type="button" disabled={busy} onClick={() => void requestPasswordReset()} className="text-[11px] font-bold text-brand-300 transition hover:text-brand-200">نسيت كلمة المرور؟</button>}
              {mode === "otp" && <button type="button" disabled={busy || resendSeconds > 0} onClick={() => void resendSignupOtp()} className="text-[11px] font-bold text-brand-300 transition hover:text-brand-200 disabled:cursor-not-allowed disabled:text-white/25">{resendSeconds > 0 ? `يمكن إعادة الإرسال بعد ${resendSeconds} ثانية` : "لم يصلك الكود؟ أرسل كودًا جديدًا"}</button>}

              {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[12px] leading-6 text-red-200">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-[12px] leading-6 text-emerald-200">{notice}</p>}

              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 text-[14px] font-black text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : mode === "otp" ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {busy ? "لحظة..." : mode === "login" ? `دخول كـ${accountType === "instructor" ? "مدرب" : "متدرب"}` : mode === "signup" ? "إرسال كود التأكيد" : mode === "otp" ? "تأكيد الكود والدخول" : "حفظ كلمة المرور"}
              </button>
            </form>

            {mode !== "recovery" && (
              <button type="button" onClick={() => { setMode((current) => current === "login" ? "signup" : "login"); setOtp(""); setError(null); setNotice(null); }} className="mt-6 w-full text-center text-[12px] font-bold text-white/45 transition hover:text-brand-300">
                {mode === "login" ? "أول مرة هنا؟ أنشئ حساب متدرب أو مدرب" : mode === "otp" ? "تغيير البريد أو الرجوع لتسجيل الدخول" : "عندك حساب بالفعل؟ سجّل الدخول"}
              </button>
            )}
          </div>
          <Link to="/courses" className="mt-6 flex items-center justify-center gap-2 text-[12px] font-bold text-white/35 transition hover:text-white"><ArrowRight className="h-3.5 w-3.5" /> استعرض الكورسات المتاحة</Link>
        </div>
      </div>
    </section>
  );
}

export function LearningDashboard() {
  const enrollmentsQuery = useQuery({ queryKey: ["learning", "enrollments"], queryFn: loadStudentEnrollments });
  const bookingsQuery = useQuery({ queryKey: ["learning", "bookings"], queryFn: loadMyBookings });
  const userQuery = useQuery({ queryKey: ["auth", "lms-user"], queryFn: loadCurrentLmsUser });
  const enrollments = enrollmentsQuery.data ?? [];
  const pendingBookings = (bookingsQuery.data ?? []).filter((booking) => booking.status !== "approved" && booking.status !== "cancelled");
  const email = userQuery.data?.email ?? "";
  const name = userQuery.data?.full_name ?? "";
  const isInstructor = userQuery.data?.memberships.some((membership) => membership.role === "instructor");
  const loading = enrollmentsQuery.isLoading || bookingsQuery.isLoading || userQuery.isLoading;
  const error = enrollmentsQuery.error ?? bookingsQuery.error ?? userQuery.error;

  return (
    <section className="min-h-screen bg-ink-50">
      <LearningTopbar email={email} />
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[12px] font-black text-brand-600">لوحة التعلّم</p>
            <h1 className="mt-2 text-[30px] font-black sm:text-[38px]">{name ? `أهلًا، ${name.split(" ")[0]}` : "أهلًا بك"}</h1>
            <p className="mt-2 text-[14px] text-ink-500">كمّل كورساتك وتابع إنجازك من مكان واحد.</p>
          </div>
          <div className="flex flex-wrap gap-2">{isInstructor && <Link to="/instructor" className="inline-flex w-fit items-center gap-2 rounded-xl bg-ink-950 px-4 py-3 text-[12px] font-bold text-white">لوحة المدرب <GraduationCap className="h-4 w-4" /></Link>}<Link to="/courses" className="inline-flex w-fit items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-bold text-ink-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600">استعرض كورسات جديدة <ArrowLeft className="h-4 w-4" /></Link></div>
        </div>

        {loading && <div className="grid min-h-80 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>}
        {error && <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-[13px] leading-7 text-red-700">{friendlyError(error)}</div>}

        {!loading && !error && pendingBookings.length > 0 && (
          <section className="mt-9">
            <h2 className="text-[18px] font-black">طلبات الحجز</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pendingBookings.map((booking) => <article key={booking.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black text-amber-700">{booking.status === "payment_submitted" ? "الإثبات قيد المراجعة" : booking.status === "rejected" ? "يحتاج إثباتًا جديدًا" : "في انتظار الدفع"}</p><h3 className="mt-1 text-[16px] font-black">{booking.course.title}</h3></div><Clock3 className="h-5 w-5 text-amber-600" /></div>{booking.review_notes && <p className="mt-3 text-[12px] leading-6 text-red-700">{booking.review_notes}</p>}<Link to={`/checkout/${booking.course.slug}`} className="mt-4 inline-flex items-center gap-2 text-[12px] font-black text-brand-700">عرض الطلب وإثبات الدفع <ArrowLeft className="h-3.5 w-3.5" /></Link></article>)}
            </div>
          </section>
        )}

        {!loading && !error && enrollments.length === 0 && pendingBookings.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/10 text-brand-600"><GraduationCap className="h-7 w-7" /></span>
            <h2 className="mt-5 text-[21px] font-black">لا توجد كورسات مفعّلة على حسابك</h2>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-ink-500">لو كنت دفعت أو تم تأكيد تسجيلك، تواصل معنا بنفس البريد المستخدم في هذا الحساب لتفعيل الوصول.</p>
            <Link to="/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[13px] font-bold text-white">شاهد الكورسات <ArrowLeft className="h-4 w-4" /></Link>
          </div>
        )}

        {!loading && !error && enrollments.length > 0 && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {enrollments.map((enrollment) => (
              <article key={enrollment.id} className="group overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-44 overflow-hidden bg-ink-900">
                  {enrollment.course.featured_image ? <img src={enrollment.course.featured_image} alt="" className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center grid-lines"><GraduationCap className="h-12 w-12 text-brand-400" /></div>}
                  <span className="absolute right-4 top-4 rounded-full bg-ink-950/80 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur">{enrollment.status === "completed" ? "مكتمل" : "قيد التعلّم"}</span>
                </div>
                <div className="p-6">
                  <p className="text-[11px] font-bold text-brand-600">مع {enrollment.course.instructor}</p>
                  <h2 className="mt-2 text-[20px] font-black">{enrollment.course.title}</h2>
                  <p className="mt-2 line-clamp-2 min-h-12 text-[13px] leading-6 text-ink-500">{enrollment.course.short_description}</p>
                  {enrollment.course.delivery_mode !== "recorded" && enrollment.course.starts_at && <p className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-[11px] font-bold text-brand-700"><Clock3 className="h-3.5 w-3.5" /> موعد البداية: {new Date(enrollment.course.starts_at).toLocaleString("ar-EG")}</p>}
                  <div className="mt-5 flex items-center justify-between text-[11px] font-bold text-ink-500"><span>{enrollment.completedLessons} من {enrollment.totalLessons} درس</span><span>{enrollment.progressPercent}%</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${enrollment.progressPercent}%` }} /></div>
                  <Link to={`/learn/enrollments/${enrollment.id}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink-950 px-5 py-3 text-[13px] font-black text-white transition hover:bg-brand-500">
                    {enrollment.completedLessons ? "كمّل التعلّم" : "ابدأ الكورس"}<PlayCircle className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function videoEmbedUrl(rawUrl: string | null) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "youtu.be") return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : rawUrl;
    }
    if (url.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${url.pathname.split("/").filter(Boolean).pop()}`;
    return rawUrl;
  } catch {
    return null;
  }
}

function LessonBody({ lesson, onVideoProgress }: { lesson: CourseLesson; onVideoProgress: (positionSeconds: number) => void }) {
  const videoUrl = videoEmbedUrl(lesson.video_url);

  return (
    <div>
      {lesson.content_type === "video" && videoUrl && (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/20">
          {videoUrl.match(/\.(mp4|webm)(\?.*)?$/i)
            ? <video src={videoUrl} controls className="h-full w-full" onTimeUpdate={(event) => onVideoProgress(event.currentTarget.currentTime)} onEnded={(event) => onVideoProgress(event.currentTarget.duration)} />
            : <iframe src={videoUrl} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" />}
        </div>
      )}
      {lesson.content_type === "video" && !videoUrl && (
        <div className="grid aspect-video place-items-center rounded-2xl bg-ink-900 text-center text-white"><div><CirclePlay className="mx-auto h-12 w-12 text-brand-400" /><p className="mt-3 text-[13px] text-white/50">سيتم إضافة فيديو الدرس قريبًا.</p></div></div>
      )}
      {lesson.content_type === "live" && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <p className="text-[14px] font-black text-ink-900">جلسة مباشرة</p>
          <p className="mt-2 text-[13px] leading-7 text-ink-600">استخدم رابط الجلسة في موعدها المحدد.</p>
          {lesson.resource_url && <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-[12px] font-bold text-white">دخول الجلسة <ExternalLink className="h-4 w-4" /></a>}
        </div>
      )}
      {lesson.content && <div className="mt-7 whitespace-pre-line text-[15px] leading-8 text-ink-600">{lesson.content}</div>}
      {lesson.resource_url && lesson.content_type !== "live" && (
        <a href={lesson.resource_url} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-bold text-ink-700 transition hover:border-brand-300 hover:text-brand-600">
          {lesson.content_type === "document" || lesson.content_type === "presentation" ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />} تحميل أو فتح مرفق الدرس
        </a>
      )}
    </div>
  );
}

export function LessonPlayer() {
  const { enrollmentId = "", lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startedLessons = useRef(new Set<string>());
  const lastReportedVideoPositions = useRef(new Map<string, number>());
  const [actionError, setActionError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const courseQuery = useQuery({
    queryKey: ["learning", "enrollment", enrollmentId],
    queryFn: () => loadLearningCourse(enrollmentId),
    enabled: Boolean(enrollmentId),
  });
  const userQuery = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase!.auth.getUser();
      if (userError) throw userError;
      return userData.user;
    },
  });
  const completeMutation = useMutation({
    mutationFn: ({ lesson }: { lesson: CourseLesson }) => setLessonCompleted(enrollmentId, lesson.id),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["learning", "enrollment", enrollmentId] }),
        queryClient.invalidateQueries({ queryKey: ["learning", "enrollments"] }),
      ]);
    },
    onError: (mutationError) => setActionError(friendlyError(mutationError)),
  });
  const data = courseQuery.data ?? null;
  const email = userQuery.data?.email ?? "";
  const loading = courseQuery.isLoading || userQuery.isLoading;
  const pageError = courseQuery.error ?? userQuery.error;

  const lessons = useMemo(() => data?.sections.flatMap((section) => section.lessons) ?? [], [data]);
  const activeLesson = lessons.find((lesson) => lesson.id === lessonId) ?? lessons[0];
  const completedIds = useMemo(() => new Set(data?.progress.filter((item) => item.completed).map((item) => item.lesson_id) ?? []), [data]);
  const activeIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
  const progressPercent = Math.round(data?.progressPercent ?? 0);

  useEffect(() => {
    if (!lessonId && activeLesson) navigate(`/learn/enrollments/${enrollmentId}/lessons/${activeLesson.id}`, { replace: true });
  }, [activeLesson, enrollmentId, lessonId, navigate]);

  useEffect(() => {
    if (!activeLesson || startedLessons.current.has(activeLesson.id)) return;
    startedLessons.current.add(activeLesson.id);
    const completeOnView = activeLesson.completion_rule === "view";
    void recordLessonStarted(enrollmentId, activeLesson.id, completeOnView)
      .then(async () => {
        if (!completeOnView) return;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["learning", "enrollment", enrollmentId] }),
          queryClient.invalidateQueries({ queryKey: ["learning", "enrollments"] }),
        ]);
      })
      .catch(() => {
        startedLessons.current.delete(activeLesson.id);
      });
  }, [activeLesson, enrollmentId, queryClient]);

  const toggleComplete = async () => {
    if (!activeLesson || completedIds.has(activeLesson.id) || activeLesson.completion_rule === "video_threshold") return;
    completeMutation.mutate({ lesson: activeLesson });
  };

  const reportVideoProgress = (positionSeconds: number) => {
    if (!activeLesson || activeLesson.completion_rule !== "video_threshold") return;
    const position = Math.min(Math.floor(positionSeconds), activeLesson.duration_seconds);
    const previous = lastReportedVideoPositions.current.get(activeLesson.id) ?? 0;
    const thresholdPosition = Math.ceil(activeLesson.duration_seconds * (activeLesson.completion_threshold / 100));
    if (position < thresholdPosition && position - previous < 10) return;
    if (position <= previous) return;
    lastReportedVideoPositions.current.set(activeLesson.id, position);
    void recordVideoProgress(enrollmentId, activeLesson.id, position)
      .then(async (result) => {
        if (!result.lesson.completed) return;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["learning", "enrollment", enrollmentId] }),
          queryClient.invalidateQueries({ queryKey: ["learning", "enrollments"] }),
        ]);
      })
      .catch((progressError) => {
        lastReportedVideoPositions.current.set(activeLesson.id, previous);
        setActionError(friendlyError(progressError));
      });
  };

  const openLesson = (id: string) => {
    setSidebarOpen(false);
    navigate(`/learn/enrollments/${enrollmentId}/lessons/${id}`);
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>;
  if (pageError && !data) return <section className="min-h-screen bg-ink-50"><LearningTopbar email={email} /><div className="mx-auto max-w-2xl px-4 py-20"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[13px] leading-7 text-red-700">{friendlyError(pageError)}</div><Link to="/learn" className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-brand-600"><ArrowRight className="h-4 w-4" /> العودة لكورساتي</Link></div></section>;
  if (!data) return null;

  return (
    <section className="min-h-screen bg-ink-50">
      <LearningTopbar email={email} />
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[330px_minmax(0,1fr)]">
        <button type="button" onClick={() => setSidebarOpen(true)} className="fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-brand-500 text-white shadow-xl lg:hidden" aria-label="فتح محتوى الكورس"><Menu className="h-5 w-5" /></button>
        {sidebarOpen && <button type="button" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}

        <aside className={`fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-ink-100 bg-white shadow-2xl transition-transform lg:sticky lg:top-16 lg:z-10 lg:h-[calc(100vh-4rem)] lg:w-auto lg:max-w-none lg:translate-x-0 lg:shadow-none ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="border-b border-ink-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div><Link to="/learn" className="text-[10px] font-bold text-brand-600">كورساتي /</Link><h2 className="mt-2 text-[16px] font-black leading-7">{data.course.title}</h2></div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600 lg:hidden"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-ink-500"><span>التقدم</span><span>{progressPercent}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100"><div style={{ width: `${progressPercent}%` }} className="h-full rounded-full bg-brand-500" /></div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {data.sections.map((section, sectionIndex) => (
              <details key={section.id} open className="group mb-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-3 text-[11px] font-black text-ink-700">
                  <span><span className="ml-1 text-brand-600">{sectionIndex + 1}.</span>{section.title}</span><ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="mt-1 space-y-0.5">
                  {section.lessons.map((lesson) => {
                    const completed = completedIds.has(lesson.id);
                    const active = activeLesson?.id === lesson.id;
                    return (
                      <button key={lesson.id} type="button" onClick={() => openLesson(lesson.id)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-right transition ${active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50"}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${completed ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-brand-500" : "border-ink-200"}`}>{completed ? <Check className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}</span>
                        <span className="min-w-0"><span className="block text-[11px] font-bold leading-5">{lesson.title}</span>{lesson.duration_minutes > 0 && <span className="mt-1 flex items-center gap-1 text-[9px] text-ink-400"><Clock3 className="h-3 w-3" />{lesson.duration_minutes} دقيقة</span>}</span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
          {!activeLesson ? (
            <div className="rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center"><BookOpen className="mx-auto h-10 w-10 text-brand-500" /><h1 className="mt-4 text-[20px] font-black">محتوى الكورس قيد التجهيز</h1><p className="mt-2 text-[13px] text-ink-500">ستظهر الدروس هنا فور نشرها.</p></div>
          ) : (
            <div className="mx-auto max-w-4xl">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[10px] font-black text-brand-600">الدرس {activeIndex + 1} من {lessons.length}</p><h1 className="mt-2 text-[26px] font-black sm:text-[34px]">{activeLesson.title}</h1>{activeLesson.summary && <p className="mt-2 text-[13px] leading-6 text-ink-500">{activeLesson.summary}</p>}</div>
                {activeLesson.duration_minutes > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-bold text-ink-500 shadow-sm"><Clock3 className="h-3.5 w-3.5" />{activeLesson.duration_minutes} دقيقة</span>}
              </div>

              <div className="rounded-3xl border border-ink-100 bg-white p-4 shadow-sm sm:p-7"><LessonBody lesson={activeLesson} onVideoProgress={reportVideoProgress} /></div>
              {actionError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{actionError}</p>}

              <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
                <button type="button" disabled={activeIndex <= 0} onClick={() => openLesson(lessons[activeIndex - 1].id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-bold text-ink-600 disabled:invisible"><ArrowRight className="h-4 w-4" /> الدرس السابق</button>
                <button type="button" disabled={completeMutation.isPending || completedIds.has(activeLesson.id) || activeLesson.completion_rule === "video_threshold"} onClick={() => void toggleComplete()} className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-black transition disabled:opacity-60 ${completedIds.has(activeLesson.id) ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400"}`}>
                  {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{completedIds.has(activeLesson.id) ? "تم إكمال الدرس" : activeLesson.completion_rule === "video_threshold" ? "يكتمل بعد مشاهدة الفيديو" : "علّم الدرس كمكتمل"}
                </button>
                <button type="button" disabled={activeIndex < 0 || activeIndex >= lessons.length - 1} onClick={() => openLesson(lessons[activeIndex + 1].id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-[12px] font-bold text-ink-600 disabled:invisible">الدرس التالي <ArrowLeft className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
