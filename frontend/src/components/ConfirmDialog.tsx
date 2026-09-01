import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "brand" | "danger";
};

type ConfirmState = ConfirmOptions & { open: boolean };

const initialState: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "تأكيد",
  cancelLabel: "إلغاء",
  tone: "brand",
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setState(initialState);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ ...initialState, ...options, open: true });
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [finish, state.open]);

  const confirmDialog = state.open ? (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 px-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget) finish(false);
    }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="confirm-dialog w-full max-w-md rounded-3xl border border-white/10 bg-ink-950 p-6 text-white shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${state.tone === "danger" ? "bg-red-500/15 text-red-300" : "bg-brand-500/15 text-brand-300"}`}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <button type="button" onClick={() => finish(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/55 transition hover:bg-white/5 hover:text-white" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 id="confirm-dialog-title" className="mt-5 text-[20px] font-black text-white">{state.title}</h2>
        <p id="confirm-dialog-description" className="mt-2 text-[13.5px] leading-7 text-white/60">{state.description}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => finish(false)} className="min-h-11 rounded-xl border border-white/10 px-5 text-[13px] font-bold text-white/65 transition hover:bg-white/5 hover:text-white">{state.cancelLabel}</button>
          <button autoFocus type="button" onClick={() => finish(true)} className={`min-h-11 rounded-xl px-5 text-[13px] font-black text-white transition ${state.tone === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-brand-500 hover:bg-brand-400"}`}>{state.confirmLabel}</button>
        </div>
      </section>
    </div>
  ) : null;

  return { confirm, confirmDialog };
}
