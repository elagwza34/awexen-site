import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { fetchRows, saveRecord } from './api';
import { dateLabel, type Client } from './model';

type Lead=Record<string,unknown> & {id:string|number};
const sources=[['contact_messages','رسائل التواصل'],['quote_requests','طلبات عروض الأسعار'],['initiative_applications','طلبات المبادرة']] as const;
const text=(value:unknown)=>String(value ?? '').trim();
const phoneKey=(value:string)=>value.replace(/\D/g,'').replace(/^0020/,'20').replace(/^01/,'201');
export default function CrmIntake({clients,onConverted}: {clients:Client[];onConverted:(id:string)=>Promise<void>}) {
  const [source,setSource]=useState<string>('contact_messages');
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const query=useQuery({queryKey:['crm-intake',source],queryFn:()=>fetchRows<Lead>(source,source==='initiative_applications'?'submitted_at':'created_at')});
  const leadData=(lead:Lead)=>({name:text(lead.applicant_name || lead.name),email:text(lead.email),phone:text(lead.whatsapp_number || lead.phone),company:text(lead.business_name),service:text(lead.project_type || lead.service || lead.business_sector)});
  const existing=(lead:Lead)=>{
    const item=leadData(lead);
    return clients.find(c=>(c.origin_table===source && c.origin_id===String(lead.id)) || (item.email && c.email.toLowerCase()===item.email.toLowerCase()) || (item.phone && phoneKey(c.phone)===phoneKey(item.phone)));
  };
  const convert=async(lead:Lead)=>{
    if(busy)return;setBusy(String(lead.id));setError('');
    try{
      const match=existing(lead);
      if(match){await onConverted(match.id);return;}
      const values=leadData(lead);
      if(!values.name)throw new Error('الطلب لا يحتوي على اسم. أضف العميل يدويًا بعد مراجعة بياناته.');
      const details=Object.entries(lead).filter(([key,value])=>!['id','admin_notes'].includes(key) && value!==null && value!=='').map(([key,value])=>`${key}: ${typeof value==='object'?JSON.stringify(value):String(value)}`).join('\n');
      const id=await saveRecord('clients',{...values,source:sources.find(([key])=>key===source)?.[1] ?? source,stage:'lead',notes:`طلب وارد من الموقع\n${details}`,origin_table:source,origin_id:String(lead.id)});
      await onConverted(id);
    }catch(e){setError((e as {message?:string}).message || 'تعذر تحويل الطلب.');}finally{setBusy(null);}
  };
  const leads=(query.data ?? []).filter(lead=>Object.values(leadData(lead)).join(' ').toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4"><div className="crm-section-heading"><div><h3 className="font-bold">تحويل الطلبات إلى عملاء</h3><p className="mt-1 text-sm text-white/55">اختر الطلب لإنشاء ملف عميل ببياناته، أو افتح العميل الموجود عند تطابق البريد أو الهاتف.</p></div></div><div className="crm-filters"><select className="admin-input" aria-label="مصدر الطلبات الواردة" value={source} onChange={e=>{setSource(e.target.value);setError('');}}>{sources.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><input className="admin-input" aria-label="بحث الطلبات الواردة" placeholder="ابحث في الطلبات..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {(error || query.error) && <p role="alert" className="crm-error">{error || (query.error as Error).message}</p>}
    {query.isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : <div className="crm-card-grid">{leads.map(lead=>{const values=leadData(lead);const match=existing(lead);return <article className="crm-card" key={String(lead.id)}><div className="crm-card-heading"><h3>{values.name || 'بدون اسم'}</h3>{match && <span className="crm-badge">مسجل بالفعل</span>}</div><p>{values.company || values.service}</p><p dir="ltr">{values.email || values.phone}</p><small>{dateLabel(text(lead.submitted_at || lead.created_at))}</small><button type="button" className="admin-button-secondary" disabled={busy!==null} onClick={()=>void convert(lead)}>{busy===String(lead.id)?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowLeft className="h-4 w-4"/>}{match?'فتح ملف العميل':'تحويل إلى عميل'}</button></article>;})}</div>}
    {!query.isLoading && !query.error && !leads.length && <div className="crm-empty">لا توجد طلبات في هذا المصدر.</div>}
  </div>;
}
