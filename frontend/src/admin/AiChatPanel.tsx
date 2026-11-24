import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PlugZap,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useConfirmDialog } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabase";

type AiStatus = {
  enabled: boolean;
  model: string;
  has_key: boolean;
  key_hint: string | null;
  updated_at: string | null;
};

type TestResult = {
  reply: string;
  model: string;
  latencyMs: number;
};

const MODEL_SUGGESTIONS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
];

const inputClass = "admin-input mt-1.5";
const labelClass = "text-[11px] font-bold text-white/65";

function readStatus(data: unknown): AiStatus | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  return {
    enabled: record.enabled !== false,
    model: String(record.model ?? "openai/gpt-4o"),
    has_key: Boolean(record.has_key),
    key_hint: record.key_hint ? String(record.key_hint) : null,
    updated_at: record.updated_at ? String(record.updated_at) : null,
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AiChatPanel() {
  const { confirm, confirmDialog } = useConfirmDialog();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [model, setModel] = useState("openai/gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const applyStatus = useCallback((next: AiStatus | null) => {
    setStatus(next);
    if (!next) return;
    setEnabled(next.enabled);
    setModel(next.model);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("Supabase غير مربوط في هذه النسخة.");
      setLoading(false);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("awexen_ai_chat_settings_read");
    if (rpcError) {
      const missing = rpcError.code === "PGRST202" || /could not find the function|does not exist/i.test(rpcError.message);
      setError(
        missing
          ? "جدول إعدادات المساعد لسه مش متعمل على قاعدة البيانات. نفّذ migration 202611240003_ai_chat_settings.sql أولًا."
          : rpcError.message,
      );
    } else {
      applyStatus(readStatus(data));
    }
    setLoading(false);
  }, [applyStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    setTestResult(null);
    setTestError(null);

    const trimmedKey = apiKey.trim();
    const { data, error: rpcError } = await supabase.rpc("awexen_ai_chat_settings_save", {
      p_enabled: enabled,
      p_model: model.trim() || "openai/gpt-4o",
      p_api_key: trimmedKey || null,
      p_clear_key: false,
    });

    if (rpcError) {
      setError(rpcError.message);
    } else {
      applyStatus(readStatus(data));
      setApiKey("");
      setShowKey(false);
      setNotice("اتحفظت إعدادات المساعد.");
    }
    setSaving(false);
  };

  const clearKey = async () => {
    if (!supabase) return;
    const approved = await confirm({
      title: "مسح مفتاح API؟",
      description: "هيتوقف المساعد عن الرد لحد ما تضيف مفتاح جديد. باقي الإعدادات هتفضل زي ما هي.",
      confirmLabel: "نعم، امسح المفتاح",
      cancelLabel: "إلغاء",
      tone: "danger",
    });
    if (!approved) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    setTestResult(null);
    setTestError(null);
    const { data, error: rpcError } = await supabase.rpc("awexen_ai_chat_settings_save", {
      p_enabled: enabled,
      p_model: model.trim() || "openai/gpt-4o",
      p_api_key: null,
      p_clear_key: true,
    });
    if (rpcError) setError(rpcError.message);
    else {
      applyStatus(readStatus(data));
      setNotice("تم مسح المفتاح.");
    }
    setSaving(false);
  };

  const test = async () => {
    if (!supabase || testing) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    setNotice(null);

    const { data, error: invokeError } = await supabase.functions.invoke("ai-chat-test", { body: {} });
    if (invokeError) {
      let detail = "تعذّر تنفيذ الاختبار. تأكد إن دالة ai-chat-test منشورة على Supabase.";
      const context = (invokeError as { context?: Response }).context;
      if (context && typeof context.clone === "function") {
        try {
          const body = await context.clone().json() as { error?: string | { message?: string } };
          const message = typeof body.error === "string" ? body.error : body.error?.message;
          if (message) detail = message;
        } catch {
          // جسم الخطأ مش JSON؛ بنستخدم الرسالة الافتراضية.
        }
      }
      setTestError(detail);
    } else {
      const payload = data as { ok?: boolean; model?: string; latencyMs?: number; reply?: string; error?: string };
      if (payload?.ok && payload.reply) {
        setTestResult({
          reply: payload.reply,
          model: payload.model || model,
          latencyMs: Number(payload.latencyMs ?? 0),
        });
      } else {
        setTestError(payload?.error || "لم يصل رد من الاختبار.");
      }
    }
    setTesting(false);
  };

  const saveDisabled = saving || loading;
  const testDisabled = testing || saving || loading || !status?.has_key;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
            <Bot className="h-4 w-4 text-brand-300" />
            المساعد الذكي
          </h2>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-6 text-white/45">
            مفتاح OpenRouter والموديل اللي بيستخدمهم شات الموقع. المفتاح بيتخزن على السيرفر ومبيترجعش للمتصفح أبدًا،
            وبتشوف آخر 4 حروف بس للتأكيد.
          </p>
        </div>
        <a href="/chat" target="_blank" rel="noreferrer" className="admin-button-secondary">
          <PlugZap className="h-3.5 w-3.5" /> فتح صفحة المحادثة
        </a>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-[12px] text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" /> بنحمّل إعدادات المساعد…
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] leading-6 text-red-200">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[9.5px] font-bold text-white/35">الحالة</p>
              <p className={`mt-1 flex items-center gap-1.5 text-[12px] font-extrabold ${status?.enabled ? "text-emerald-300" : "text-amber-300"}`}>
                {status?.enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {status?.enabled ? "مفعّل للزوار" : "متوقف"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[9.5px] font-bold text-white/35">المفتاح</p>
              <p className={`mt-1 flex items-center gap-1.5 text-[12px] font-extrabold ${status?.has_key ? "text-emerald-300" : "text-red-300"}`} dir="ltr">
                <KeyRound className="h-3.5 w-3.5" />
                {status?.has_key ? status.key_hint ?? "محفوظ" : "غير مضاف"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[9.5px] font-bold text-white/35">آخر تحديث</p>
              <p className="mt-1 text-[12px] font-extrabold text-white/80">{formatDate(status?.updated_at ?? null)}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-4">
            <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-500"
              />
              <span>
                <span className="block text-[12px] font-extrabold text-white/85">تشغيل المساعد للزوار</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-white/40">
                  لو قفلت الاختيار، الشات هيرد إن المساعد متوقف مؤقتًا بدل ما يبعت للمزود.
                </span>
              </span>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className={labelClass}>
                الموديل على OpenRouter
                <input
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  list="ai-model-suggestions"
                  dir="ltr"
                  className={inputClass}
                  placeholder="openai/gpt-4o"
                />
                <datalist id="ai-model-suggestions">
                  {MODEL_SUGGESTIONS.map((item) => <option key={item} value={item} />)}
                </datalist>
                <span className="mt-1 block text-[10px] font-normal leading-5 text-white/30">
                  أي موديل متاح على OpenRouter. التغيير بيسري على الرسائل الجديدة فورًا.
                </span>
              </label>

              <label className={labelClass}>
                مفتاح OpenRouter API
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    dir="ltr"
                    autoComplete="off"
                    spellCheck={false}
                    className={`${inputClass} pl-10`}
                    placeholder={status?.has_key ? "اتركه فارغًا للإبقاء على المفتاح الحالي" : "sk-or-v1-..."}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((current) => !current)}
                    aria-label={showKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
                    className="absolute bottom-0 left-0 grid h-[42px] w-10 place-items-center text-white/35 transition hover:text-white/80"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="mt-1 block text-[10px] font-normal leading-5 text-white/30">
                  المفتاح مش بيتم عرضه للزائر ولا بيرجع للوحة التحكم تاني بعد الحفظ.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
              <p className="text-[11px] text-emerald-300">{notice}</p>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saveDisabled} className="admin-button-primary">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  حفظ الإعدادات
                </button>
                <button
                  type="button"
                  onClick={() => void test()}
                  disabled={testDisabled}
                  title={status?.has_key ? undefined : "احفظ مفتاحًا أولًا"}
                  className="admin-button-secondary"
                >
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
                  اختبار الاتصال
                </button>
                {status?.has_key && (
                  <button
                    type="button"
                    onClick={() => void clearKey()}
                    disabled={saving}
                    className="admin-button-secondary text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> مسح المفتاح
                  </button>
                )}
              </div>
            </div>
          </form>

          <p className="text-[10px] leading-5 text-white/30">
            الاختبار بيستخدم الإعدادات المحفوظة، فاحفظ التغييرات الأول. لو الاختبار رجع خطأ 401/403، المفتاح مرفوض أو منتهي.
          </p>

          {(testResult || testError) && (
            <div className={`rounded-xl border px-4 py-3 ${testResult ? "border-emerald-400/25 bg-emerald-500/10" : "border-red-400/25 bg-red-500/10"}`}>
              {testResult ? (
                <>
                  <p className="flex items-center gap-2 text-[12px] font-extrabold text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> الاتصال شغّال
                    <span className="text-[10px] font-bold text-emerald-300/70" dir="ltr">
                      {testResult.model} · {testResult.latencyMs}ms
                    </span>
                  </p>
                  <p dir="auto" className="mt-2 whitespace-pre-line text-[12.5px] leading-7 text-emerald-50/90">{testResult.reply}</p>
                </>
              ) : (
                <p role="alert" className="flex items-start gap-2 text-[12px] leading-6 text-red-200">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {testError}
                </p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3 text-[10.5px] leading-6 text-white/40">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />
            <p>
              المفتاح محفوظ في جدول <span dir="ltr" className="font-bold text-white/60">ai_chat_settings</span> بوصول مقفول،
              وقراءة/كتابة لوحة التحكم بتمر عبر دوال محمية بدور المالك أو المدير. دالة الـ edge بتقرأ المفتاح بـ service_role
              وبتبعت الرد للزائر من غير ما تكشف المفتاح.
            </p>
          </div>
        </>
      )}

      {confirmDialog}
    </div>
  );
}
