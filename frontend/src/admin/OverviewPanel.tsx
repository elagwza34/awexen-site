import { useEffect, useState } from "react";
import { BookOpenText, BriefcaseBusiness, FileText, Mail, Send, Sparkles, UsersRound } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { AdminRole, SectionKey } from "./types";

type Counts = { messages: number; quotes: number; newsletter: number; clients: number; applications: number; posts: number; inquiries: number };

export default function OverviewPanel({ role, goTo }: { role: AdminRole; goTo: (section: SectionKey) => void }) {
  const [counts, setCounts] = useState<Counts>({ messages: 0, quotes: 0, newsletter: 0, clients: 0, applications: 0, posts: 0, inquiries: 0 });

  useEffect(() => {
    if (!supabase) return;
    const count = async (table: string) => {
      const { count: value } = await supabase!.from(table).select("*", { count: "exact", head: true });
      return value ?? 0;
    };
    void Promise.all([
      count("contact_messages"), count("quote_requests"), count("newsletter_subscribers"), count("clients"), count("job_applications"), count("blog_posts"), count("ai_inquiries"),
    ]).then(([messages, quotes, newsletter, clients, applications, posts, inquiries]) => setCounts({ messages, quotes, newsletter, clients, applications, posts, inquiries }));
  }, []);

  const cards = [
    { key: "messages" as const, label: "رسائل التواصل", value: counts.messages, icon: Mail },
    { key: "quotes" as const, label: "طلبات عرض السعر", value: counts.quotes, icon: FileText },
    { key: "newsletter" as const, label: "مشتركو النشرة", value: counts.newsletter, icon: Send },
    { key: "clients" as const, label: "العملاء", value: counts.clients, icon: UsersRound },
    { key: "applications" as const, label: "طلبات التوظيف", value: counts.applications, icon: BriefcaseBusiness },
    { key: "blog" as const, label: "المقالات", value: counts.posts, icon: BookOpenText },
    { key: "inquiries" as const, label: "أسئلة المعرفة", value: counts.inquiries, icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-300">AWEXEN OPERATIONS</p>
        <h2 className="mt-2 text-[21px] font-extrabold">نظرة سريعة</h2>
        <p className="mt-1 text-[11.5px] text-white/45">الدور الحالي: {role}. الأرقام تعرض فقط البيانات المسموح لك برؤيتها.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, value, icon: Icon }) => (
          <button key={key} type="button" onClick={() => goTo(key)} className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-right transition hover:border-brand-500/30 hover:bg-brand-500/[0.04]">
            <Icon className="h-4 w-4 text-brand-300" />
            <p className="mt-4 text-[21px] font-black text-white">{value}</p>
            <p className="mt-1 text-[10.5px] text-white/40">{label}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
          <h3 className="text-[13px] font-bold">ترتيب العمل المقترح</h3>
          <ol className="mt-4 space-y-3 text-[11.5px] leading-6 text-white/50">
            <li><span className="ml-2 text-brand-300">01</span>راجع الرسائل والطلبات الجديدة وحدد المسؤول عن المتابعة.</li>
            <li><span className="ml-2 text-brand-300">02</span>حدّث مرحلة العملاء وموعد المتابعة القادمة.</li>
            <li><span className="ml-2 text-brand-300">03</span>راجع المسودات قبل النشر، ثم اختبر الصفحة على الهاتف.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/[0.045] p-5">
          <h3 className="text-[13px] font-bold">حالة النظام</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-[11px]">
            <div><dt className="text-white/35">قاعدة البيانات</dt><dd className="mt-1 font-bold text-emerald-300">Supabase + RLS</dd></div>
            <div><dt className="text-white/35">المحتوى العام</dt><dd className="mt-1 font-bold text-white/75">منشور فقط</dd></div>
            <div><dt className="text-white/35">مساعد المعرفة</dt><dd className="mt-1 font-bold text-amber-200">استرجاع محلي</dd></div>
            <div><dt className="text-white/35">OpenAI API</dt><dd className="mt-1 font-bold text-white/45">جاهز للربط لاحقًا</dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}
