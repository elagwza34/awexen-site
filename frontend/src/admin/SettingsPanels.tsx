import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Save, ShieldAlert, UserRoundPlus } from "lucide-react";
import { defaultAdminSettings, readStoredSettings, writeStoredSettings, type AdminSettings } from "../lib/admin";
import { supabase } from "../lib/supabase";
import type { AdminRole } from "./types";

const inputClass = "mt-1.5 w-full rounded-lg border border-white/10 bg-ink-950/70 px-3 py-2.5 text-[12px] text-white outline-none focus:border-brand-500";

const dbToForm = (row: Record<string, unknown>): AdminSettings => ({
  name: String(row.name ?? defaultAdminSettings.name),
  brandAr: String(row.brand_ar ?? defaultAdminSettings.brandAr),
  tagline: String(row.tagline ?? defaultAdminSettings.tagline),
  description: String(row.description ?? defaultAdminSettings.description),
  address: String(row.address ?? defaultAdminSettings.address),
  email: String(row.email ?? defaultAdminSettings.email),
  phones: String(row.phones ?? defaultAdminSettings.phones),
  hours: String(row.hours ?? defaultAdminSettings.hours),
  whatsapp: String(row.whatsapp ?? defaultAdminSettings.whatsapp),
  instagram: String(row.instagram ?? defaultAdminSettings.instagram),
  facebook: String(row.facebook ?? defaultAdminSettings.facebook),
  primaryColor: String(row.primary_color ?? defaultAdminSettings.primaryColor),
  seoTitle: String(row.seo_title ?? defaultAdminSettings.seoTitle),
  seoDescription: String(row.seo_description ?? defaultAdminSettings.seoDescription),
  canonicalUrl: String(row.canonical_url ?? defaultAdminSettings.canonicalUrl),
  analyticsId: String(row.analytics_id ?? defaultAdminSettings.analyticsId),
  metaPixelId: String(row.meta_pixel_id ?? defaultAdminSettings.metaPixelId),
  googleTagId: String(row.google_tag_id ?? defaultAdminSettings.googleTagId),
  customHead: String(row.custom_head ?? defaultAdminSettings.customHead),
});

export function SiteSettingsPanel() {
  const [form, setForm] = useState<AdminSettings>({ ...defaultAdminSettings, ...readStoredSettings() });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (supabase) {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setForm(dbToForm(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const set = (key: keyof AdminSettings) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = {
      id: 1,
      name: form.name,
      brand_ar: form.brandAr,
      tagline: form.tagline,
      description: form.description,
      address: form.address,
      email: form.email,
      phones: form.phones,
      hours: form.hours,
      whatsapp: form.whatsapp,
      instagram: form.instagram,
      facebook: form.facebook,
      primary_color: form.primaryColor,
      seo_title: form.seoTitle,
      seo_description: form.seoDescription,
      canonical_url: form.canonicalUrl,
      analytics_id: form.analyticsId,
      meta_pixel_id: form.metaPixelId,
      google_tag_id: form.googleTagId,
      custom_head: form.customHead,
    };

    if (supabase) {
      const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }
    }
    writeStoredSettings(form);
    window.dispatchEvent(new Event("awexen-settings-updated"));
    setMessage("تم حفظ إعدادات الموقع.");
    setSaving(false);
  };

  const fields: Array<{ key: keyof AdminSettings; label: string; type?: string; wide?: boolean }> = [
    { key: "name", label: "اسم الموقع" }, { key: "brandAr", label: "الاسم العربي" },
    { key: "tagline", label: "السطر التعريفي", wide: true }, { key: "description", label: "وصف الشركة", type: "textarea", wide: true },
    { key: "email", label: "البريد" }, { key: "phones", label: "أرقام الهاتف" },
    { key: "address", label: "العنوان", wide: true }, { key: "hours", label: "ساعات العمل", wide: true },
    { key: "whatsapp", label: "WhatsApp" }, { key: "instagram", label: "Instagram" }, { key: "facebook", label: "Facebook" },
    { key: "seoTitle", label: "عنوان SEO الافتراضي", wide: true }, { key: "seoDescription", label: "وصف SEO الافتراضي", type: "textarea", wide: true },
    { key: "canonicalUrl", label: "Canonical URL", wide: true }, { key: "analyticsId", label: "Google Analytics" },
    { key: "googleTagId", label: "Google Tag Manager" }, { key: "metaPixelId", label: "Meta Pixel" },
  ];

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/8 pb-4">
        <div><h2 className="text-[17px] font-extrabold">إعدادات الموقع</h2><p className="mt-1 text-[11.5px] text-white/45">الهوية، التواصل، بيانات SEO وأكواد القياس.</p></div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-white/40" />}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={`text-[11px] font-bold text-white/65 ${field.wide ? "md:col-span-2" : ""}`}>
            {field.label}
            {field.type === "textarea" ? <textarea rows={4} value={form[field.key]} onChange={set(field.key)} className={`${inputClass} resize-y leading-6`} /> : <input value={form[field.key]} onChange={set(field.key)} className={inputClass} dir={field.key === "canonicalUrl" ? "ltr" : undefined} />}
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/8 pt-4">
        <p className={`text-[11px] ${message?.startsWith("تم") ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        <button disabled={saving} className="admin-button-primary">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ الإعدادات</button>
      </div>
    </form>
  );
}

export function PricingSettingsPanel() {
  const [form, setForm] = useState({ installments_enabled: true, installment_markup_percent: 30, installment_count: 3 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("pricing_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setForm({ installments_enabled: Boolean(data.installments_enabled), installment_markup_percent: Number(data.installment_markup_percent), installment_count: Number(data.installment_count) });
    });
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.from("pricing_settings").upsert({ id: 1, ...form }, { onConflict: "id" });
    setMessage(error ? error.message : "تم تحديث سياسة التقسيط.");
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="border-b border-white/8 pb-4"><h2 className="text-[17px] font-extrabold">التسعير والتقسيط</h2><p className="mt-1 text-[11.5px] text-white/45">الإعداد الحالي ينعكس مباشرة على قسم الأسعار وتسجيل الكورسات.</p></div>
      <label className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-4 text-[12px] font-bold text-white/70">إتاحة التقسيط<input type="checkbox" checked={form.installments_enabled} onChange={(event) => setForm((current) => ({ ...current, installments_enabled: event.target.checked }))} className="h-4 w-4 accent-orange-500" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-bold text-white/65">نسبة الزيادة على السعر الأساسي %<input min="0" max="100" type="number" value={form.installment_markup_percent} onChange={(event) => setForm((current) => ({ ...current, installment_markup_percent: Number(event.target.value) }))} className={inputClass} /></label>
        <label className="text-[11px] font-bold text-white/65">عدد الدفعات<input min="2" max="24" type="number" value={form.installment_count} onChange={(event) => setForm((current) => ({ ...current, installment_count: Number(event.target.value) }))} className={inputClass} /></label>
      </div>
      <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.05] p-4 text-[11.5px] leading-6 text-white/60">مثال: سعر أساسي 10,000 مع زيادة {form.installment_markup_percent}% يصبح إجمالي التقسيط {(10000 * (1 + form.installment_markup_percent / 100)).toLocaleString("en-US")} على {form.installment_count} دفعات.</div>
      <div className="flex items-center justify-between border-t border-white/8 pt-4"><p className={`text-[11px] ${message?.startsWith("تم") ? "text-emerald-300" : "text-red-300"}`}>{message}</p><button disabled={saving} className="admin-button-primary">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}حفظ</button></div>
    </form>
  );
}

type ProfileRow = { user_id: string; email: string; full_name: string; role: AdminRole; is_active: boolean; created_at: string };
const roles: Array<{ value: AdminRole; label: string }> = [
  { value: "owner", label: "مالك" }, { value: "admin", label: "مدير" }, { value: "editor", label: "محرر محتوى" },
  { value: "hr", label: "موارد بشرية" }, { value: "support", label: "دعم وعملاء" }, { value: "viewer", label: "بدون دخول للوحة" },
];

export function UsersPanel() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (!supabase) return setLoading(false);
    const { data, error } = await supabase.from("profiles").select("user_id,email,full_name,role,is_active,created_at").order("created_at", { ascending: false });
    setMessage(error?.message ?? null);
    setRows((data ?? []) as ProfileRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveAccess = async (row: ProfileRow) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("set_awexen_user_access", { target_user_id: row.user_id, new_role: row.role, active: row.is_active });
    setMessage(error ? error.message : "تم تحديث الصلاحية. تظهر للمستخدم بعد تسجيل الدخول مرة أخرى.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-white/8 pb-4"><div><h2 className="text-[17px] font-extrabold">المستخدمون والأدوار</h2><p className="mt-1 text-[11.5px] text-white/45">صلاحيات منفصلة للمحتوى والتوظيف والعملاء والإدارة.</p></div><button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث</button></div>
      <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-[11.5px] leading-6 text-amber-100/75"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong className="text-amber-100">إضافة المستخدم بأمان:</strong> أنشئه أولًا من Supabase Authentication → Users. سيظهر هنا تلقائيًا بدور Viewer، ثم عيّن صلاحياته. لا تضع مفتاح service_role داخل الواجهة مطلقًا.</p></div>
      {message && <p className={`rounded-lg p-3 text-[11px] ${message.startsWith("تم") ? "bg-emerald-500/8 text-emerald-300" : "bg-red-500/8 text-red-300"}`}>{message}</p>}
      {rows.length === 0 && !loading ? <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-white/10 text-[12px] text-white/40"><UserRoundPlus className="mb-2 h-5 w-5" />لا توجد ملفات مستخدمين. شغّل ملف SQL أولًا.</div> : (
        <div className="overflow-hidden rounded-xl border border-white/8">
          {rows.map((row, index) => (
            <div key={row.user_id} className="grid gap-3 border-b border-white/8 bg-white/[0.018] p-4 last:border-b-0 lg:grid-cols-[1fr_180px_100px_auto] lg:items-center">
              <div className="min-w-0"><p className="truncate text-[12px] font-bold">{row.full_name || "بدون اسم"}</p><p dir="ltr" className="mt-1 truncate text-left text-[10px] text-white/35">{row.email}</p></div>
              <select value={row.role} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, role: event.target.value as AdminRole } : item))} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-[11px] text-white/70 outline-none">{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
              <label className="flex items-center gap-2 text-[10.5px] text-white/55"><input type="checkbox" checked={row.is_active} onChange={(event) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, is_active: event.target.checked } : item))} className="h-4 w-4 accent-orange-500" />نشط</label>
              <button type="button" onClick={() => void saveAccess(row)} className="admin-button-secondary"><Check className="h-3.5 w-3.5" />تطبيق</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
