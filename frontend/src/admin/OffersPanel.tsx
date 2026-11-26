import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import OfferDocument from "../components/OfferDocument";
import OfferPricingFields from "./OfferPricingFields";
import { isOfferSlug, offerPath, offerSlugFromName, offerTable, type OfferDraft, type SavedOffer } from "../lib/offers";
import { supabase } from "../lib/supabase";

const queryKey = ["admin-client-offers"];
const blankSection = { heading: "", body: "", table: "" };
const initialDraft = (): OfferDraft => ({
  client_name: "", title: "", slug: "", language: "ar", summary: "", published: false, pricing: null,
  sections: ["نطاق العمل", "مراحل التنفيذ", "التكلفة والدفعات", "التسليم والدعم"]
    .map((heading) => ({ ...blankSection, heading })),
});

async function loadOffers() {
  if (!supabase) throw new Error("Supabase unavailable");
  const { data, error } = await supabase.from("client_offers").select("*")
    .order("created_at", { ascending: false }).returns<SavedOffer[]>();
  if (error) throw error;
  return data;
}

export default function OffersPanel() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey, queryFn: loadOffers });
  const [form, setForm] = useState<OfferDraft | null>(null);
  const [editing, setEditing] = useState<SavedOffer | null>(null);
  const [customSlug, setCustomSlug] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function open(offer?: SavedOffer) {
    setEditing(offer ?? null);
    setCustomSlug(Boolean(offer));
    setPreview(false);
    setError("");
    setMessage("");
    if (!offer) {
      setForm(initialDraft());
      return;
    }
    const { client_name, title, slug, language, summary, published, sections, pricing } = offer;
    setForm({ client_name, title, slug, language, summary, published, sections, pricing: pricing ?? null });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !form || busy) return;
    setMessage("");
    setError("");
    const payload = { ...form, client_name: form.client_name.trim(), title: form.title.trim() };
    if (!isOfferSlug(payload.slug) || !payload.client_name || !payload.title) {
      setError("أدخل اسم العميل وعنوان العرض ومساراً صالحاً غير محجوز.");
      return;
    }
    if (payload.pricing?.options.some((option) => !option.label.trim())) {
      setError("أدخل اسماً لكل خيار سعر.");
      return;
    }
    if (payload.sections.some((section) => {
      const [header, ...rows] = offerTable(section.table);
      return header && (header.some((cell) => !cell) || rows.some((row) => row.length !== header.length));
    })) {
      setError("تأكد من وجود عنوان لكل عمود ومن تطابق عدد الخانات في صفوف الجدول.");
      return;
    }
    setBusy(true);
    try {
      const table = supabase.from("client_offers");
      const request = editing
        ? table.update({ ...payload, revision: crypto.randomUUID() }).eq("id", editing.id).eq("revision", editing.revision)
        : table.insert(payload);
      const { data, error: failure } = await request.select("id").maybeSingle();
      if (failure?.code === "23505") {
        setError("هذا الرابط مستخدم بالفعل. اختر مساراً آخر.");
        return;
      }
      if (failure) throw failure;
      if (!data) {
        setError("تغيّر العرض منذ فتحه. أعد فتحه من القائمة.");
        await queryClient.invalidateQueries({ queryKey });
        return;
      }
      setForm(null);
      setMessage(payload.published ? "تم نشر العرض." : "تم حفظ المسودة.");
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      setError("تعذّر حفظ العرض. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(offer: SavedOffer) {
    if (!supabase || busy || !window.confirm(`حذف عرض «${offer.title}» نهائياً؟ سيتوقف رابطه عن عرض المحتوى.`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: failure } = await supabase.from("client_offers").delete()
        .eq("id", offer.id).eq("revision", offer.revision).select("id").maybeSingle();
      if (failure) throw failure;
      if (!data) {
        setError("تغيّر العرض منذ تحميل القائمة. راجع النسخة الحالية.");
      } else {
        setMessage("تم حذف العرض.");
      }
      await queryClient.invalidateQueries({ queryKey });
    } catch {
      setError("تعذّر حذف العرض. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(offer: SavedOffer) {
    setError("");
    setMessage("");
    try {
      await navigator.clipboard.writeText(`https://awexen.com${offerPath(offer.slug)}`);
      setMessage("تم نسخ رابط العرض.");
    } catch {
      setError("تعذّر النسخ. افتح العرض وانسخ الرابط من شريط العنوان.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">عروض العملاء</h2>
        {!form && <button type="button" className="admin-button-primary" onClick={() => open()}>عرض جديد</button>}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-400/50 p-3">{error}</p>}
      {message && <p role="status">{message}</p>}
      {form ? (
        <form className="space-y-4" onSubmit={save}>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">اسم العميل أو الشركة
                <input className="admin-input" required maxLength={120} dir="auto" value={form.client_name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm({ ...form, client_name: name, slug: customSlug ? form.slug : offerSlugFromName(name) });
                  }} />
              </label>
              <label className="grid gap-1">عنوان العرض
                <input className="admin-input" required maxLength={160} dir="auto" value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="grid gap-1">مسار الرابط
                <input className="admin-input" required maxLength={80} dir="ltr" value={form.slug}
                  onChange={(event) => {
                    setCustomSlug(true);
                    setForm({ ...form, slug: event.target.value.toLowerCase() });
                  }} />
                <small className="break-all" dir="ltr">awexen.com/{form.slug || "client-name"}</small>
                {editing?.published && form.slug !== editing.slug && <small>تغيير المسار يوقف الرابط السابق.</small>}
              </label>
              <label className="grid gap-1 self-start">لغة العرض
                <select className="admin-input" value={form.language}
                  onChange={(event) => setForm({ ...form, language: event.target.value === "en" ? "en" : "ar" })}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1">نبذة العرض
              <textarea className="admin-input" rows={3} maxLength={4000} dir="auto" value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })} />
            </label>
            <OfferPricingFields pricing={form.pricing} onChange={(pricing) => setForm({ ...form, pricing })} />
            {form.sections.map((section, index) => (
              <fieldset key={index} className="min-w-0 space-y-3 rounded-xl border border-current/20 p-4">
                <legend className="px-2 font-semibold">القسم {index + 1}</legend>
                <label className="grid gap-1">عنوان القسم
                  <input className="admin-input" maxLength={140} dir="auto" value={section.heading}
                    onChange={(event) => setForm({ ...form, sections: form.sections.map((item, position) =>
                      position === index ? { ...item, heading: event.target.value } : item) })} />
                </label>
                <label className="grid gap-1">التفاصيل
                  <textarea className="admin-input" rows={4} maxLength={8000} dir="auto" value={section.body}
                    onChange={(event) => setForm({ ...form, sections: form.sections.map((item, position) =>
                      position === index ? { ...item, body: event.target.value } : item) })} />
                </label>
                <label className="grid gap-1">جدول اختياري
                  <small>ضع عناوين الأعمدة في أول سطر وافصل الخانات بعلامة |.</small>
                  <textarea className="admin-input" rows={3} maxLength={8000} dir="auto" value={section.table}
                    placeholder="البند | السعر"
                    onChange={(event) => setForm({ ...form, sections: form.sections.map((item, position) =>
                      position === index ? { ...item, table: event.target.value } : item) })} />
                </label>
                <button type="button" className="admin-button-secondary" onClick={() =>
                  setForm({ ...form, sections: form.sections.filter((_, position) => position !== index) })}>إزالة القسم</button>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="admin-button-secondary" disabled={form.sections.length >= 20}
                onClick={() => setForm({ ...form, sections: [...form.sections, { ...blankSection }] })}>إضافة قسم</button>
              <button type="button" className="admin-button-secondary" aria-pressed={preview}
                onClick={() => setPreview(!preview)}>{preview ? "إخفاء المعاينة" : "معاينة العرض"}</button>
            </div>
            {preview && <OfferDocument offer={form} translation={editing?.translation} />}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.published}
                onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              إتاحة العرض لأي شخص لديه الرابط
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="admin-button-primary">{form.published ? "حفظ ونشر" : "حفظ المسودة"}</button>
              <button type="button" className="admin-button-secondary" onClick={() => { setForm(null); setError(""); }}>إلغاء</button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          {offers.isPending && <p role="status">جارٍ تحميل العروض…</p>}
          {offers.isError && <p role="alert">تعذّر تحميل العروض. <button type="button" onClick={() => void offers.refetch()}>إعادة المحاولة</button></p>}
          {offers.data?.length === 0 && <p>لا توجد عروض بعد.</p>}
          {offers.data?.map((offer) => (
            <article key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-current/20 p-4">
              <div className="min-w-0">
                <h3 className="break-words font-bold" dir="auto">{offer.title}</h3>
                <p className="break-words" dir="auto">{offer.client_name} · {offer.published ? "منشور" : "مسودة"}</p>
                {offer.published && <a href={offerPath(offer.slug)} target="_blank" rel="noreferrer"
                  className="inline-block break-all underline" dir="ltr">awexen.com/{offer.slug}</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                {offer.published && <button type="button" className="admin-button-secondary" onClick={() => void copy(offer)}>نسخ الرابط</button>}
                <button type="button" className="admin-button-secondary" disabled={busy} onClick={() => open(offer)}>تعديل</button>
                <button type="button" className="admin-button-secondary" disabled={busy} onClick={() => void remove(offer)}>حذف</button>
              </div>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
