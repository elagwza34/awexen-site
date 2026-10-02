import { useEffect, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, RefreshCw, X } from "lucide-react";
import { LmsApiError, loadPaymentProof, type PaymentProofLink } from "../lib/lms";

/**
 * عارض إثبات الدفع.
 * يجلب رابطاً مؤقتاً من الخادم (الـ bucket خاص) ويعرض الصورة أو الملف.
 */
export default function ProofViewer({
  bookingId,
  proofPath,
  contentType,
  proofSize,
  onClose,
}: {
  bookingId: string;
  /** المسار معروف مسبقًا من اللوحة — ضروري للأداري لأنFallback بيشد الحجز من /bookings/ */
  proofPath?: string;
  contentType?: string;
  proofSize?: number | null;
  onClose: () => void;
}) {
  const [proof, setProof] = useState<PaymentProofLink | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setRequestId("");
    loadPaymentProof(bookingId, proofPath)
      .then((result) => {
        if (active) setProof(result);
      })
      .catch((operationError: unknown) => {
        if (!active) return;
        setError(operationError instanceof Error ? operationError.message : "تعذّر تحميل إثبات الدفع.");
        setRequestId(operationError instanceof LmsApiError ? operationError.requestId : "");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookingId, attempt]);

  const retry = () => {
    setProof(null);
    setAttempt((value) => value + 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // In the browser-signing fallback content_type may be empty, so fall back to
  // the prop the dashboard already has, then to the file extension.
  const resolvedType = proof?.content_type || contentType || "";
  const isImage = resolvedType.startsWith("image/") || (!resolvedType && /\.(jpg|jpeg|png|webp|gif)$/i.test(proof?.path ?? ""));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="إثبات الدفع"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-black text-white">إثبات الدفع</h2>
            {proof && (proof.size > 0 || (proofSize ?? 0) > 0) && (
              <p className="mt-0.5 text-[11px] text-white/45">
                {((proof.size || proofSize || 0) / 1024).toFixed(0)} كيلوبايت · الرابط صالح 10 دقائق
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {proof && (
              <a
                href={proof.url}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-brand-400"
              >
                <Download className="h-3.5 w-3.5" /> تحميل
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading && (
            <div className="grid min-h-56 place-items-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
            </div>
          )}

          {error && !loading && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-400/25 bg-red-500/10 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-red-200">{error}</p>
                <p className="mt-1 text-[11px] leading-6 text-red-200/70">
                  لو ده طلب مدفوع تم قبوله، ارجع للطالب يطلب رفع إثبات الدفع مرة أخرى.
                </p>
                {requestId && (
                  <p className="mt-1 break-all text-[10px] text-red-200/40">رقم التتبع: {requestId}</p>
                )}
                <button
                  type="button"
                  onClick={retry}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-1.5 text-[11px] font-bold text-red-100 transition hover:bg-red-400/10"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {proof && !loading && isImage && (
            <img
              src={proof.url}
              alt="إثبات الدفع"
              className="mx-auto max-h-[68vh] w-auto rounded-lg object-contain"
            />
          )}

          {proof && !loading && !isImage && (
            <div className="grid min-h-56 place-items-center text-center">
              <div>
                <FileText className="mx-auto h-10 w-10 text-white/25" />
                <p className="mt-3 text-[12px] text-white/50">
                  الملف ده من نوع {resolvedType || "غير معروف"} — افتحه أو نزّله.
                </p>
                <a
                  href={proof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-[12px] font-bold text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> فتح الملف
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
