import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../context/LanguageContext";
import { GA4_MEASUREMENT_ID, GTM_CONTAINER_ID, TRACKING_RELEASE_APPROVED } from "../lib/trackingPolicy";
import { loadAnalyticsReport, validAnalyticsRange, type TrendPoint } from "../lib/analyticsReports";
import { getAnalyticsConfig } from "../lib/admin";

function TrendChart({ points, conversion = false }: { points: TrendPoint[]; conversion?: boolean }) {
  const values = points.map((p) => conversion ? p.whatsapp + p.contacts + p.initiatives : p.users);
  const max = Math.max(1, ...values);
  return <svg viewBox="0 0 600 160" role="img" aria-label={conversion ? "Conversions" : "Users"} className="h-40 w-full">
    <path d="M10 10V145H590" fill="none" stroke="currentColor" opacity=".25" />
    {values.length > 0 && <polyline fill="none" stroke="#F45907" strokeWidth="3" points={values.map((v, i) => `${10 + i * 580 / Math.max(1, values.length - 1)},${140 - v / max * 125}`).join(" ")} />}
  </svg>;
}

export default function AnalyticsPanel() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const t = (arabic: string, english: string) => ar ? arabic : english;
  const [range, setRange] = useState(() => ({ start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }));
  const valid = validAnalyticsRange(range);
  const metaConfigured = /^[0-9]{5,30}$/.test(getAnalyticsConfig().metaPixelId);
  const query = useQuery({ queryKey: ["admin-analytics", range.start, range.end], queryFn: () => loadAnalyticsReport(range), enabled: valid, retry: false });
  const report = query.data?.status === "connected" ? query.data : null;
  const labels = [t("إجمالي المستخدمين", "Total users"), t("الجلسات", "Sessions"), t("مشاهدات الصفحات", "Page views"), t("معدل التفاعل", "Engagement rate"), t("متوسط وقت التفاعل", "Average engagement time"), t("نقرات واتساب", "WhatsApp clicks"), t("طلبات التواصل الناجحة", "Successful contact submissions"), t("طلبات المبادرة الناجحة", "Successful initiative applications")];
  const metrics = report ? [report.overview.totalUsers, report.overview.sessions, report.overview.pageViews, `${(report.overview.engagementRate * 100).toFixed(1)}%`, `${report.overview.averageEngagementSeconds.toFixed(1)}s`, report.overview.whatsappClicks, report.overview.contactSubmissions, report.overview.initiativeApplications] : [];
  const empty = t("غير متصل — لا توجد بيانات متاحة", "Not connected — no data available");
  const card = "rounded-xl border border-white/10 bg-white/[0.03] p-4";
  return <section dir={ar ? "rtl" : "ltr"} className="space-y-5 text-white">
    <header><h2 className="text-xl font-black">{t("التحليلات والتتبع", "Analytics & Tracking")}</h2><p className="mt-2 text-sm text-white/60">{t("تقارير GA4 الفعلية فقط. إعداد التقارير غير متصل حاليًا.", "Real GA4 reporting only. Reporting is currently not connected.")}</p><p className="mt-2 text-xs text-white/50">Meta Pixel: {metaConfigured ? t("معرف محفوظ في هذا المتصفح؛ لا يثبت إعداده لجميع الزوار", "ID saved in this browser; visitor-wide configuration is unverified") : t("لا يوجد معرف محفوظ في هذا المتصفح", "No ID saved in this browser")}</p></header>
    <div className="flex flex-wrap items-end gap-3">{(["start", "end"] as const).map((key) => <label key={key} className="text-xs">{key === "start" ? t("من", "From") : t("إلى", "To")}<input type="date" value={range[key]} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setRange({ ...range, [key]: e.target.value })} className="admin-input mt-1 block" /></label>)}<button type="button" disabled={!valid || query.isFetching} onClick={() => void query.refetch()} className="rounded-lg bg-[#F45907] px-4 py-3 text-xs disabled:opacity-50">{t("تحديث", "Refresh")}</button></div>
    {!valid && <p role="alert">{t("اختر فترة صحيحة لا تتجاوز 366 يومًا ولا تشمل المستقبل.", "Choose a valid range of up to 366 days without future dates.")}</p>}
    {query.isFetching && <p role="status">{t("جارٍ التحميل…", "Loading…")}</p>}
    {(query.isError || query.data?.status === "error") && <p role="alert">{t("تعذر تحميل التقارير. حاول مرة أخرى.", "Could not load reports. Try again.")}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{labels.map((label, i) => <article key={label} className={card}><h3 className="text-xs text-white/60">{label}</h3><p className="mt-3 text-2xl font-black">{metrics[i] ?? "—"}</p>{!report && <p className="mt-2 text-xs text-white/50">{empty}</p>}</article>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">{[false, true].map((conversion) => <article key={String(conversion)} className={card}><h3>{conversion ? t("اتجاه التحويلات", "Conversion trends") : t("اتجاه الزيارات", "Traffic trends")}</h3>{report?.trend.length ? <TrendChart points={report.trend} conversion={conversion} /> : <div className="grid h-40 place-items-center text-xs text-white/50">{report ? t("لا توجد بيانات بعد", "No data yet") : empty}</div>}</article>)}</div>
    <article className={card}><h3 className="mb-3 font-bold">{t("مصادر الزيارات والحملات", "Traffic sources & campaigns")}</h3><p className="mb-3 text-xs text-white/50">Google Organic · Facebook · Instagram · Direct · Referral · Paid · UTM</p><div className="overflow-x-auto"><table className="w-full text-start text-xs"><thead><tr>{[t("المصدر / الوسيط", "Source / medium"), t("الحملة", "Campaign"), t("الجلسات", "Sessions"), t("التحويلات", "Leads"), t("معدل التحويل", "Conversion rate")].map((h) => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead><tbody>{report?.sources.map((s, i) => <tr key={i}><td className="p-2">{s.source} / {s.medium}</td><td>{s.campaign}</td><td>{s.sessions}</td><td>{s.leads}</td><td>{(s.conversionRate * 100).toFixed(1)}%</td></tr>)}{!report?.sources.length && <tr><td colSpan={5} className="p-5 text-center text-white/50">{report ? t("لا توجد بيانات بعد", "No data yet") : empty}</td></tr>}</tbody></table></div></article>
    <article className={card}><h3 className="mb-3 font-bold">{t("الصفحات وصفحات الوصول", "Pages & landing pages")}</h3><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{[t("الصفحة", "Page"), t("المشاهدات", "Views"), t("جلسات الوصول", "Landing sessions"), t("التفاعل", "Engagement"), t("التحويلات", "Leads")].map((h) => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead><tbody>{report?.pages.map((p) => <tr key={p.path}><td className="p-2">{p.path}</td><td>{p.views}</td><td>{p.landingSessions}</td><td>{(p.engagementRate * 100).toFixed(1)}%</td><td>{p.leads}</td></tr>)}{!report?.pages.length && <tr><td colSpan={5} className="p-5 text-center text-white/50">{report ? t("لا توجد بيانات بعد", "No data yet") : empty}</td></tr>}</tbody></table></div></article>
    <article className={card}><h3 className="mb-3 font-bold">{t("سلامة التتبع", "Tracking health")}</h3><dl className="grid gap-3 text-xs sm:grid-cols-2"><div><dt>GTM</dt><dd>{GTM_CONTAINER_ID}</dd></div><div><dt>GA4</dt><dd>{GA4_MEASUREMENT_ID}</dd></div><div><dt>{t("بوابة الإصدار", "Release gate")}</dt><dd>{TRACKING_RELEASE_APPROVED ? t("مفعلة؛ يلزم قبول الزائر", "Enabled; visitor consent required") : t("مغلقة — التتبع متوقف", "Closed — tracking disabled")}</dd></div><div><dt>{t("آخر مزامنة ناجحة", "Last successful sync")}</dt><dd>{report?.synchronizedAt ?? t("لم تتم المزامنة", "Never synchronized")}</dd></div><div><dt>Meta Ads</dt><dd>{t("غير متصل؛ البكسل ليس تقرير حملات", "Not connected; Pixel is not campaign reporting")}</dd></div><div><dt>{t("إعداد الحاوية", "Container configuration")}</dt><dd>{t("لم يتم فحصها أو التحقق منها مباشرة", "Not inspected or live verified")}</dd></div></dl><p className="mt-4 text-xs text-amber-300">{t("يلزم رقم خاصية GA4 وصلاحية خادم آمنة قبل عرض التقارير. لا توجد بيانات تجريبية.", "A numeric GA4 Property ID and authorized server integration are required. No demo metrics are shown.")}</p></article>
  </section>;
}
