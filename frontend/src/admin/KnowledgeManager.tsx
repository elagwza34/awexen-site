import { useRef, useState } from "react";
import { CheckCircle2, FileText, Link2, Loader2, UploadCloud } from "lucide-react";
import { extractKnowledgePdf } from "../lib/askAwexen";
import { supabase } from "../lib/supabase";
import { resources } from "./resourceDefinitions";
import ResourceManager from "./ResourceManager";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export default function KnowledgeManager() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("عام");
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState("published");
  const [priority, setPriority] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPdf = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !file || !title.trim() || uploading) return;
    if (file.size > MAX_PDF_SIZE) {
      setError("الحد الأقصى لحجم ملف PDF هو 10 ميجابايت.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    let uploadedPath: string | null = null;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error("انتهت جلسة الإدارة. سجّل الدخول مرة أخرى.");

      setProgress("جارٍ قراءة النص وتقسيم الملف...");
      const extracted = await extractKnowledgePdf(file);
      const documentId = crypto.randomUUID();
      uploadedPath = `${user.id}/${documentId}.pdf`;

      setProgress("جارٍ حفظ ملف PDF في Supabase Storage...");
      const { error: storageError } = await supabase.storage
        .from("knowledge-files")
        .upload(uploadedPath, file, { contentType: "application/pdf", upsert: false });
      if (storageError) throw new Error(`تعذر رفع الملف: ${storageError.message}`);

      setProgress(`جارٍ حفظ ${extracted.chunks.length} جزءًا في قاعدة المعرفة...`);
      const cleanTitle = title.trim();
      const cleanTopic = topic.trim() || "عام";
      const rows = extracted.chunks.map((chunk, index) => ({
        title: extracted.chunks.length > 1 ? `${cleanTitle} — جزء ${index + 1}` : cleanTitle,
        topic: cleanTopic,
        question: `معلومات من ملف ${cleanTitle}`,
        answer: chunk,
        source_url: sourceUrl.trim() || null,
        source_type: "pdf",
        document_id: documentId,
        file_path: uploadedPath,
        file_name: file.name,
        chunk_index: index,
        chunk_count: extracted.chunks.length,
        status,
        priority,
      }));
      const { error: insertError } = await supabase.from("ai_knowledge").insert(rows);
      if (insertError) throw new Error(`تعذر حفظ المعرفة: ${insertError.message}`);

      setSuccess(`تم رفع «${file.name}» واستخراج ${extracted.page_count} صفحة إلى ${extracted.chunks.length} جزء معرفة.`);
      setFile(null);
      setTitle("");
      setTopic("عام");
      setSourceUrl("");
      setPriority(0);
      setRefreshKey((current) => current + 1);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (uploadError) {
      if (uploadedPath && supabase) await supabase.storage.from("knowledge-files").remove([uploadedPath]);
      setError(uploadError instanceof Error ? uploadError.message : "حدث خطأ أثناء معالجة ملف PDF.");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand-500/20 bg-brand-500/[0.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300"><FileText className="h-4 w-4" /></span>
          <div>
            <h2 className="text-[14px] font-extrabold text-white">رفع ملف PDF للمعرفة</h2>
            <p className="mt-1 text-[10.5px] leading-5 text-white/45">يُحفظ الملف بشكل خاص، ثم يُستخرج النص ويُقسم تلقائيًا لأجزاء يستطيع Ask Awexen استخدامها. الحد الأقصى 10MB و150 صفحة.</p>
          </div>
        </div>

        <form onSubmit={uploadPdf} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="text-[10.5px] font-bold text-white/60 md:col-span-2">
            ملف PDF
            <input ref={fileInputRef} required type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full rounded-lg border border-dashed border-white/15 bg-ink-950/60 px-3 py-3 text-[11px] text-white/60 file:ml-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-white" />
          </label>
          <label className="text-[10.5px] font-bold text-white/60">عنوان الملف<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: دليل خدمات أوكسين" className="admin-input mt-1.5" /></label>
          <label className="text-[10.5px] font-bold text-white/60">الموضوع<input required value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="الخدمات / الأسعار / السياسات" className="admin-input mt-1.5" /></label>
          <label className="text-[10.5px] font-bold text-white/60 md:col-span-2">
            <span className="inline-flex items-center gap-1.5"><Link2 className="h-3 w-3" />رابط المصدر الخارجي — اختياري</span>
            <input type="url" dir="ltr" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/source" className="admin-input mt-1.5 text-left" />
          </label>
          <label className="text-[10.5px] font-bold text-white/60">الحالة<select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input mt-1.5"><option value="published">منشور — يستخدمه المساعد فورًا</option><option value="draft">مسودة</option></select></label>
          <label className="text-[10.5px] font-bold text-white/60">الأولوية<input type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="admin-input mt-1.5" /></label>

          {error && <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-[10.5px] leading-5 text-red-200 md:col-span-2">{error}</div>}
          {success && <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-3 text-[10.5px] leading-5 text-emerald-200 md:col-span-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{success}</div>}

          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4 md:col-span-2">
            <p className="text-[9.5px] text-white/35">{file ? `${file.name} — ${(file.size / 1024 / 1024).toFixed(2)} MB` : "اختر ملفًا نصيًا، وليس PDF عبارة عن صور فقط."}</p>
            <button disabled={uploading || !file || !title.trim()} className="admin-button-primary">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {uploading ? progress || "جارٍ المعالجة..." : "رفع وإضافة للمعرفة"}
            </button>
          </div>
        </form>
      </section>

      <ResourceManager key={refreshKey} definition={resources.knowledge} />
    </div>
  );
}
