import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircleQuestion, Send, ShieldCheck, X } from "lucide-react";
import { askAwexen } from "../lib/askAwexen";
import { loadKnowledge, matchKnowledge, rankKnowledge, saveAiInquiry, type KnowledgeEntry } from "../lib/cms";
import { OPEN_KNOWLEDGE_CHAT_EVENT } from "../lib/uiEvents";
import { cn } from "../utils/cn";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  source?: string | null;
};

const welcomeMessage: ChatMessage = {
  id: 1,
  role: "assistant",
  text: "أهلًا بك. اسأل عن خدمات أوكسين، وسأجيب فقط من المعلومات التي اعتمدها فريق الإدارة.",
};

export default function KnowledgeChat() {
  const [open, setOpen] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadKnowledge()
      .then(setKnowledge)
      .finally(() => setLoadingKnowledge(false));
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_KNOWLEDGE_CHAT_EVENT, show);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener(OPEN_KNOWLEDGE_CHAT_EVENT, show);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    const userMessage: ChatMessage = { id: Date.now(), role: "user", text: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setBusy(true);

    const matched = matchKnowledge(cleanQuestion, knowledge);
    let answer = matched
      ? matched.answer
      : knowledge.length === 0
        ? "قاعدة المعرفة لم تُجهّز بعد. سجّلت سؤالك ليظهر للإدارة، ويمكنك التواصل عبر واتساب للحصول على رد مباشر."
        : "لم أجد إجابة معتمدة لهذا السؤال. سجّلته للمراجعة بدل تقديم معلومة غير مؤكدة.";
    let grounded = Boolean(matched);

    try {
      const aiResponse = await askAwexen(cleanQuestion, rankKnowledge(cleanQuestion, knowledge));
      if (aiResponse) {
        answer = aiResponse.answer;
        grounded = aiResponse.grounded;
      }
    } catch (error) {
      console.warn("[ask-awexen] AI fallback:", error);
      grounded = false;
      answer = "واجهت مشكلة مؤقتة أثناء تجهيز الإجابة. جرّب إرسال السؤال مرة أخرى بصياغة أقصر، أو تواصل معنا مباشرة إذا كان الأمر عاجلًا.";
    }

    await saveAiInquiry({
      name: name || null,
      email: email || null,
      question: cleanQuestion,
      matched_knowledge_id: matched?.id ?? null,
      answer: grounded ? answer : null,
      status: grounded ? "answered" : "needs_review",
    });

    setMessages((current) => [
      ...current,
      { id: Date.now() + 1, role: "assistant", text: answer, source: grounded ? matched?.source_url : null },
    ]);
    setBusy(false);
  };

  return (
    <div id="ask-awexen" className="fixed bottom-20 right-3 z-[70] sm:bottom-6 sm:right-6">
      {open && (
        <>
          <button type="button" aria-label="إغلاق المحادثة" onClick={() => setOpen(false)} className="fixed inset-0 -z-10 bg-black/35 backdrop-blur-[2px] sm:hidden" />
          <div
            role="dialog"
            aria-label="محادثة Ask Awexen"
            className="mb-3 flex h-[min(620px,72vh)] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-950 text-white shadow-2xl shadow-black/40 sm:h-[540px] sm:w-[380px]"
          >
            <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white">
                  <Bot className="h-4.5 w-4.5" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
                </span>
                <div>
                  <h2 dir="ltr" className="text-left text-[14px] font-extrabold text-white">Ask Awexen</h2>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-white/70">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    مساعدك الخاص
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/55 transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-start" : "justify-end")}>
                  <div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[11.5px] leading-6", message.role === "user" ? "rounded-tr-md bg-brand-500 text-white" : "rounded-tl-md border border-white/8 bg-white/[0.055] text-white/75")}>
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.source && <a href={message.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[9.5px] font-bold text-brand-300 hover:underline">عرض المصدر</a>}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-end"><div dir="ltr" className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/8 bg-white/[0.055] px-3.5 py-2.5 text-[10.5px] text-white/45"><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking ...</div></div>
              )}
              <div ref={endRef} />
            </div>

            <details className="border-t border-white/8 px-4 py-2">
              <summary className="cursor-pointer text-[9.5px] font-bold text-white/35 hover:text-white/60">بيانات التواصل — اختيارية</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input aria-label="الاسم — اختياري" value={name} onChange={(event) => setName(event.target.value)} placeholder="الاسم" className="rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-2 text-[12px] text-white outline-none focus:border-brand-500" />
                <input aria-label="البريد الإلكتروني — اختياري" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@example.com" className="rounded-lg border border-white/8 bg-white/[0.04] px-2.5 py-2 text-left text-[12px] text-white outline-none focus:border-brand-500" />
              </div>
            </details>

            <form onSubmit={submit} className="border-t border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-brand-500/60">
                <textarea
                  ref={inputRef}
                  required
                  rows={1}
                  maxLength={1500}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={loadingKnowledge ? "جارٍ تجهيز المعرفة..." : "اكتب سؤالك هنا..."}
                  aria-label="اكتب سؤالك"
                  className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-1.5 py-2 text-[12.5px] leading-6 text-white outline-none placeholder:text-white/35"
                />
                <button disabled={busy || loadingKnowledge || !question.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40" aria-label="إرسال السؤال"><Send className="h-4 w-4" /></button>
              </div>
              <p className="mt-1.5 text-center text-[8.5px] text-white/25">قد يحفظ السؤال لتحسين قاعدة المعرفة. لا ترسل بيانات حساسة.</p>
            </form>
          </div>
        </>
      )}

      <button
        id="ask-awexen-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="ask-awexen"
        aria-label={open ? "إغلاق مساعد Awexen" : "فتح مساعد Awexen"}
        className="group mr-auto flex items-center gap-2.5 rounded-full bg-ink-950 p-2.5 text-white shadow-xl shadow-black/25 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-brand-500 sm:px-3.5"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white transition group-hover:bg-white group-hover:text-brand-600"><MessageCircleQuestion className="h-4.5 w-4.5" /></span>
        <span dir="ltr" className="hidden pl-1 text-[11.5px] font-bold sm:block">Ask Awexen</span>
      </button>
    </div>
  );
}
