import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleSlash2,
  Headset,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react";
import {
  fetchSupportThread,
  listSupportConversations,
  replySupportConversation,
  setSupportConversationStatus,
  type SupportConversation,
  type SupportThreadMessage,
} from "../lib/supportAdmin";
import { cn } from "../utils/cn";

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function describeError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message ?? "");
    if (/could not find the function|does not exist/i.test(message)) {
      return "دوال الدعم الفني لسه مش متعملة على قاعدة البيانات. نفّذ migration 202611240004_support_chat.sql أولًا.";
    }
    if (message) return message;
  }
  return "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

export default function SupportInbox() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<SupportThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    try {
      const list = await listSupportConversations();
      setConversations(list);
      setError(null);
    } catch (requestError) {
      setError(describeError(requestError));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadList().finally(() => setLoading(false));
    const timer = window.setInterval(() => void loadList(), 15000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const loadThread = useCallback(async (conversationId: string) => {
    try {
      const messages = await fetchSupportThread(conversationId);
      setThread(messages);
      // القراءة نفسها بتعلّم رسايل الزائر كمقروءة على السيرفر.
      setConversations((current) =>
        current.map((item) => (item.id === conversationId ? { ...item, unread_count: 0 } : item)),
      );
    } catch (requestError) {
      setError(describeError(requestError));
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setThread([]);
      return;
    }
    setThreadLoading(true);
    void loadThread(selectedId).finally(() => setThreadLoading(false));
    const timer = window.setInterval(() => void loadThread(selectedId), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (thread.length === 0) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;
  const totalUnread = conversations.reduce((sum, item) => sum + item.unread_count, 0);

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = reply.trim();
    if (!body || !selectedId || sending) return;

    setSending(true);
    setError(null);
    try {
      await replySupportConversation(selectedId, body);
      setReply("");
      await loadThread(selectedId);
      void loadList();
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selected || statusBusy) return;
    setStatusBusy(true);
    setError(null);
    try {
      await setSupportConversationStatus(selected.id, selected.status === "open" ? "closed" : "open");
      void loadList();
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Headset className="h-5 w-5 text-emerald-300" />
            محادثات الدعم الفني
          </h1>
          <p className="mt-1 text-[11.5px] text-white/45">
            {conversations.length} محادثة{totalUnread > 0 ? ` · ${totalUnread} رسالة غير مقروءة` : ""}
          </p>
        </div>
        <button type="button" onClick={() => void loadList()} className="admin-button-secondary">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          تحديث
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[11.5px] leading-5 text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.015] p-1.5">
          {loading && conversations.length === 0 && (
            <p className="flex items-center gap-2 p-4 text-[11.5px] text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              جارٍ تحميل المحادثات...
            </p>
          )}
          {!loading && conversations.length === 0 && (
            <p className="p-4 text-[11.5px] leading-6 text-white/40">
              مفيش محادثات دعم لسه. لما زائر يختار التحدث مع الدعم الفني من صفحة المحادثة هتظهر هنا.
            </p>
          )}
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const isSelected = conversation.id === selectedId;
              const name = conversation.visitor_name || "زائر بدون اسم";
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-start transition",
                      isSelected
                        ? "border-brand-500/40 bg-brand-500/10"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold text-white/85">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-white/40" />
                        <span className="truncate">{name}</span>
                      </span>
                      {conversation.unread_count > 0 ? (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8.5px] font-black leading-none text-white">
                          {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[9px] text-white/30">{formatTime(conversation.last_message_at ?? conversation.created_at)}</span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[10.5px] text-white/40">
                      {conversation.last_message || "بدون رسائل بعد"}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[9px] text-white/30">
                      {conversation.status === "open" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300/80">
                          <CheckCircle2 className="h-2.5 w-2.5" /> مفتوحة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-white/45">
                          <CircleSlash2 className="h-2.5 w-2.5" /> مغلقة
                        </span>
                      )}
                      {conversation.visitor_email && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="h-2.5 w-2.5 shrink-0" />
                          <span dir="ltr" className="truncate">{conversation.visitor_email}</span>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-h-[420px] flex-col rounded-xl border border-white/[0.08] bg-white/[0.015]">
          {!selected && (
            <div className="grid flex-1 place-items-center p-6 text-center text-[12px] leading-6 text-white/40">
              اختر محادثة من القائمة لعرض الرسائل والرد على الزائر.
            </div>
          )}

          {selected && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-white">
                    {selected.visitor_name || "زائر بدون اسم"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-white/40" dir="ltr">
                    {selected.visitor_email || `visitor ${selected.id.slice(0, 8)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleStatus()}
                  disabled={statusBusy}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10.5px] font-bold transition disabled:opacity-50",
                    selected.status === "open"
                      ? "border-white/15 text-white/60 hover:bg-white/5 hover:text-white"
                      : "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10",
                  )}
                >
                  {statusBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                  {selected.status === "open" ? "إغلاق المحادثة" : "إعادة فتح المحادثة"}
                </button>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
                {threadLoading && thread.length === 0 && (
                  <p className="flex items-center gap-2 text-[11px] text-white/40">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جارٍ تحميل الرسائل...
                  </p>
                )}
                {!threadLoading && thread.length === 0 && (
                  <p className="text-[11px] text-white/35">لا توجد رسائل في هذه المحادثة بعد.</p>
                )}
                {thread.map((message) => (
                  <div key={message.id} className={message.sender === "agent" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-6",
                        message.sender === "agent"
                          ? "rounded-ee-md bg-brand-500 text-white"
                          : "rounded-es-md border border-white/10 bg-white/[0.06] text-white/85",
                      )}
                    >
                      <p dir="auto" className="whitespace-pre-line">{message.body}</p>
                      <p className={cn("mt-1 text-[9px]", message.sender === "agent" ? "text-white/60" : "text-white/30")}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={submitReply} className="border-t border-white/[0.07] p-3">
                {selected.status !== "open" && (
                  <p className="mb-2 text-[10px] text-amber-300/80">المحادثة مغلقة. افتحها الأول عشان تقدر ترد.</p>
                )}
                <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2 focus-within:border-brand-500/60">
                  <textarea
                    rows={2}
                    dir="auto"
                    maxLength={4000}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="اكتب ردك للزائر..."
                    aria-label="نص الرد على الزائر"
                    className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] leading-6 text-white outline-none placeholder:text-white/25"
                  />
                  <button
                    type="submit"
                    disabled={sending || selected.status !== "open" || !reply.trim()}
                    aria-label="إرسال الرد"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
