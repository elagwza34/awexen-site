import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bot, Loader2, Send, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loadKnowledge, matchKnowledge, saveAiInquiry, type KnowledgeEntry } from "../lib/cms";
import { askAwexen } from "../lib/askAwexen";
import { readChatSession, saveChatSession, type ChatMessage } from "../lib/chatSession";
import { cn } from "../utils/cn";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";

function AssistantAvatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand-500/25 bg-brand-500/10 text-brand-300">
      <Bot className="h-4 w-4" />
    </span>
  );
}

function AssistantBubble({ text, source }: { text: string; source?: string | null }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-es-md border border-white/10 bg-white/[0.06] px-4 py-3 text-[13.5px] leading-7 text-white/85 sm:max-w-[75%]">
        <p dir="auto" className="whitespace-pre-line">{text}</p>
        {source && (
          <a href={source} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[11px] font-bold text-brand-300 hover:underline">
            {t("chat.source")}
          </a>
        )}
      </div>
    </div>
  );
}

function TypingBubble() {
  const { t } = useLanguage();
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="inline-flex items-center gap-2 rounded-2xl rounded-es-md border border-white/10 bg-white/[0.06] px-4 py-3">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/55" />
        </span>
        <span className="text-[11px] text-white/40">{t("chat.typing")}</span>
      </div>
    </div>
  );
}

export default function AiChat() {
  const { services, projects, settings } = useContent();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [knowledgeError, setKnowledgeError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState(() => readChatSession().name);
  const [email, setEmail] = useState(() => readChatSession().email);
  const [messages, setMessages] = useState<ChatMessage[]>(() => readChatSession().messages);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveChatSession({ messages }); }, [messages]);
  useEffect(() => { saveChatSession({ name }); }, [name]);
  useEffect(() => { saveChatSession({ email }); }, [email]);

  // تحويل محتوى الموقع (خدمات، مشاريع، إعدادات) إلى معرفة قابلة للبحث.
  const siteKnowledge = useMemo<KnowledgeEntry[]>(() => {
    const entries: KnowledgeEntry[] = [];
    let counter = 0;
    const push = (title: string, topic: string, question: string, answer: string, source_url: string | null = null) => {
      if (!answer.trim()) return;
      entries.push({
        id: `site-${counter++}`,
        title: title.slice(0, 300),
        topic: topic.slice(0, 300),
        question: question.slice(0, 1000),
        answer: answer.slice(0, 3800),
        source_url,
        source_type: "url",
        status: "published",
        priority: 0,
      });
    };

    for (const s of services ?? []) {
      push(s.title, "خدمات", s.title, [s.short, s.heroDesc, ...(s.overview ?? []), ...(s.features ?? []).map((f) => `${f.title}: ${f.desc}`), ...(s.faqs ?? []).map((f) => `${f.q} — ${f.a}`)].filter(Boolean).join("\n"));
      for (const f of s.faqs ?? []) {
        push(s.title, "أسئلة شائعة", f.q, f.a);
      }
    }
    for (const p of projects ?? []) {
      push(p.title, "معرض الأعمال", p.title, [p.desc, p.challenge, p.solution, p.results].filter(Boolean).join("\n"));
    }
    if (settings) {
      push("معلومات التواصل", "إعدادات", "معلومات التواصل", [settings.name, settings.email, settings.phones, settings.address, settings.hours].filter(Boolean).join(" | "));
    }
    return entries;
  }, [services, projects, settings]);

  const allKnowledge = useMemo(() => [...siteKnowledge, ...knowledge], [siteKnowledge, knowledge]);

  // بنجيب المعرفة أول ما صفحة المحادثة تفتح بس.
  // كانت بتطلب ai_knowledge كاملة مع كل صفحة، ودي كانت أكبر مصدر ضغط على الـ origin.
  const knowledgeRequested = useRef(false);
  const loadKnowledgeOnce = useCallback(() => {
    if (knowledgeRequested.current) return;
    knowledgeRequested.current = true;
    setLoadingKnowledge(true);
    setKnowledgeError(false);
    void loadKnowledge()
      .then(setKnowledge)
      .catch(() => setKnowledgeError(true))
      .finally(() => setLoadingKnowledge(false));
  }, []);

  const retryKnowledge = () => {
    knowledgeRequested.current = false;
    loadKnowledgeOnce();
  };

  useEffect(() => {
    loadKnowledgeOnce();
  }, [loadKnowledgeOnce]);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    setMessages((current) => [...current, { id: Date.now(), role: "user", text: cleanQuestion }]);
    setQuestion("");
    setBusy(true);
    setSendError(false);

    try {
      const matched = matchKnowledge(cleanQuestion, allKnowledge);
      const matchedId = matched?.id ?? null;
      const matchedAnswer = matched?.answer ?? null;
      let status = matched ? "answered" : "needs_review";
      const fallback = allKnowledge.length === 0 ? t("chat.emptyKnowledge") : t("chat.noApprovedAnswer");
      let answer: string;

      if (matched) {
        answer = matched.answer;
      } else {
        // محاولة استخدام المساعد الذكي (AI) لتقديم إجابة.
        try {
          const ai = await askAwexen(cleanQuestion, allKnowledge);
          if (ai?.answer) {
            answer = ai.answer;
            status = "answered";
          } else {
            answer = fallback;
          }
        } catch {
          answer = fallback;
        }
      }

      await saveAiInquiry({
        name: name || null,
        email: email || null,
        question: cleanQuestion,
        matched_knowledge_id: matchedId,
        answer: matchedAnswer,
        status,
      });

      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: answer, source: matched?.source_url },
      ]);
    } catch {
      setSendError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-dvh max-h-dvh flex-col bg-ink-950 text-white">
      <header className="shrink-0 border-b border-white/10 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            aria-label={t("chat.back")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
              <Bot className="h-5 w-5" />
              <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold">AI Awexen</h1>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-white/45">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                {t("chat.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain" role="log" aria-live="polite" aria-relevant="additions">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          <AssistantBubble text={t("chat.welcome")} />

          {messages.map((message) => (
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-ee-md bg-brand-500 px-4 py-3 text-[13.5px] leading-7 text-white sm:max-w-[75%]">
                  <p dir="auto" className="whitespace-pre-line">{message.text}</p>
                </div>
              </div>
            ) : (
              <AssistantBubble key={message.id} text={message.text} source={message.source} />
            )
          ))}

          {busy && <TypingBubble />}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
          {(knowledgeError || sendError) && (
            <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] leading-5 text-red-200">
              <span>{knowledgeError ? t("chat.loadError") : t("chat.sendError")}</span>
              {knowledgeError && (
                <button
                  type="button"
                  onClick={retryKnowledge}
                  className="shrink-0 rounded-md border border-red-300/30 px-2 py-1 font-bold transition hover:bg-red-500/15"
                >
                  {t("chat.retry")}
                </button>
              )}
            </div>
          )}

          {loadingKnowledge && (
            <p role="status" className="mb-2 flex items-center gap-2 text-[11px] text-white/35">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("chat.loading")}
            </p>
          )}

          <details className="mb-2">
            <summary className="cursor-pointer select-none text-[11px] font-bold text-white/35 transition hover:text-white/60">
              {t("chat.contactToggle")}
            </summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("chat.name")}
                aria-label={t("chat.name")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12.5px] text-white outline-none transition placeholder:text-white/25 focus:border-brand-500"
              />
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
                aria-label={t("chat.email")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[12.5px] text-white outline-none transition placeholder:text-white/25 focus:border-brand-500"
              />
            </div>
          </details>

          <form onSubmit={submit}>
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-brand-500/60">
              <textarea
                ref={inputRef}
                required
                rows={1}
                maxLength={1500}
                dir="auto"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                aria-label={t("chat.placeholder")}
                placeholder={loadingKnowledge ? t("chat.placeholderLoading") : t("chat.placeholder")}
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[13.5px] leading-6 text-white outline-none placeholder:text-white/25"
              />
              <button
                type="submit"
                disabled={busy || loadingKnowledge || !question.trim()}
                aria-label={t("chat.send")}
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-400",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] leading-5 text-white/25">{t("chat.privacy")}</p>
          </form>
        </div>
      </div>
    </div>
  );
}
