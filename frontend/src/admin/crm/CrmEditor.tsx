import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { activityKinds, clientStages, dealStages, money, paymentMethods, priorities, today, type CrmData, type InvoiceItem } from './model';

export type EditorKind = 'client' | 'deal' | 'task' | 'activity' | 'payment' | 'contact' | 'invoice';
export type EditorState = { kind: EditorKind; id?: string; clientId?: string; values?: Record<string,unknown> };
type Props = { editor: EditorState; data: CrmData; onClose: () => void; onSave: (values: Record<string,unknown>) => Promise<void> };
const names: Record<EditorKind,string> = {client:'عميل',deal:'صفقة',task:'مهمة',activity:'تواصل',payment:'دفعة',contact:'جهة اتصال',invoice:'فاتورة'};
const defaults: Record<EditorKind, Record<string,unknown>> = {
  client:{name:'',company:'',email:'',phone:'',source:'manual',stage:'lead',service:'',owner_id:'',notes:'',website:'',address:'',tags:'',priority:'normal',next_follow_up:''},
  deal:{title:'',client_id:'',service:'',stage:'lead',value:0,probability:10,expected_close:'',owner_id:'',notes:'',lost_reason:''},
  task:{title:'',client_id:'',deal_id:'',due_date:today(),priority:'normal',status:'open',assignee_id:'',notes:''},
  activity:{client_id:'',kind:'note',body:''},
  payment:{client_id:'',deal_id:'',invoice_id:'',amount:'',paid_on:today(),method:'bank',reference:'',notes:''},
  contact:{client_id:'',name:'',job_title:'',email:'',phone:''},
  invoice:{client_id:'',deal_id:'',issued_on:today(),due_on:today(),status:'draft',tax_rate:0,notes:''},
};

export default function CrmEditor({editor,data,onClose,onSave}: Props) {
  const dialogRef=useRef<HTMLDialogElement>(null);
  const [values,setValues]=useState<Record<string,unknown>>(()=>{
    const selected:Record<string,unknown>={...defaults[editor.kind],...editor.values,client_id:editor.clientId ?? editor.values?.client_id ?? ''};
    if(Array.isArray(selected.tags)) selected.tags=selected.tags.join('، ');
    return selected;
  });
  const [items,setItems]=useState<InvoiceItem[]>(()=>editor.values?.items as InvoiceItem[] ?? [{description:'',quantity:1,unit_price:0}]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const dialog=dialogRef.current;
    const focus=document.activeElement as HTMLElement | null;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    dialog?.showModal();
    return ()=>{dialog?.close(); document.body.style.overflow=overflow; focus?.focus();};
  },[]);
  const change=(key:string,value:unknown)=>setValues(current=>({...current,[key]:value}));
  const value=(key:string)=>String(values[key] ?? '');
  const field=(key:string,label:string,type='text',required=false,extra: Record<string,unknown>={})=>(
    <label className="crm-field" key={key}><span>{label}{required && ' *'}</span><input className="admin-input" name={key} type={type} value={value(key)} required={required} maxLength={type==='text'?200:undefined} onChange={e=>change(key,e.target.value)} {...extra}/></label>
  );
  const select=(key:string,label:string,options:readonly (readonly [string,string,...unknown[]])[],required=false)=>(
    <label className="crm-field" key={key}><span>{label}{required && ' *'}</span><select className="admin-input" name={key} value={value(key)} required={required} onChange={e=>{
      change(key,e.target.value);
      if(key==='client_id') setValues(v=>({...v,client_id:e.target.value,deal_id:'',invoice_id:''}));
      if(key==='deal_id') change('invoice_id','');
      if(key==='stage' && editor.kind==='deal') change('probability',dealStages.find(s=>s[0]===e.target.value)?.[2] ?? 10);
    }}>{!required && <option value="">غير محدد</option>}{required && !value(key) && <option value="">اختر...</option>}{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  );
  const notes=(key='notes',label='ملاحظات')=><label className="crm-field sm:col-span-2"><span>{label}</span><textarea className="admin-input min-h-28" name={key} value={value(key)} maxLength={10000} required={key==='body'} onChange={e=>change(key,e.target.value)}/></label>;
  const memberOptions=data.members.map(m=>[m.user_id,m.full_name || m.email] as const);
  const memberSelect=(key:string,label:string)=>{
    const options=[...memberOptions];
    if(value(key) && !options.some(([id])=>id===value(key))) options.push([value(key),'المسؤول الحالي']);
    return select(key,label,options);
  };
  const deals=data.deals.filter(d=>d.client_id===value('client_id'));
  const invoices=data.invoices.filter(i=>i.client_id===value('client_id') && i.deal_id===value('deal_id') && i.status==='issued');
  const submit=async(event:FormEvent)=>{
    event.preventDefault(); if(busy) return; setError('');
    const payload:Record<string,unknown>={};
    for(const key of Object.keys(defaults[editor.kind])) payload[key]=typeof values[key]==='string' ? String(values[key]).trim() : values[key];
    for(const key of ['owner_id','assignee_id','expected_close','next_follow_up','deal_id','invoice_id']) if(payload[key]==='') payload[key]=null;
    if(editor.kind==='client') {
      delete payload.client_id;
      payload.tags=value('tags').split(/[,،]/).map(t=>t.trim()).filter(Boolean).slice(0,20);
      const duplicate=data.clients.find(c=>c.id!==editor.id && !c.archived_at && ((payload.email && c.email.toLowerCase()===String(payload.email).toLowerCase()) || (payload.phone && c.phone.replace(/\D/g,'')===String(payload.phone).replace(/\D/g,''))));
      if(duplicate) return setError(`يوجد عميل بنفس البريد أو الهاتف: ${duplicate.name}. راجع ملفه لتجنب التكرار.`);
    }
    if(editor.kind==='deal') {
      payload.value=Number(payload.value); payload.probability=Number(payload.probability);
      if(payload.stage==='lost' && !payload.lost_reason) return setError('اكتب سبب خسارة الصفقة.');
      if(payload.stage==='won') payload.probability=100;
      if(payload.stage==='lost') payload.probability=0;
    }
    if(editor.kind==='payment') payload.amount=Number(payload.amount);
    if(editor.kind==='invoice') {
      if(value('due_on')<value('issued_on')) return setError('تاريخ الاستحقاق لا يسبق تاريخ الفاتورة.');
      if(!items.length || items.some(i=>!i.description.trim() || i.quantity<=0 || i.unit_price<0)) return setError('أكمل بنود الفاتورة بقيم صحيحة.');
      payload.items=items.map(i=>({...i,description:i.description.trim()})); payload.tax_rate=Number(payload.tax_rate);
    }
    setBusy(true);
    try {await onSave(payload); onClose();}
    catch(e) {setError(e instanceof Error ? e.message : (e as {message?:string})?.message || 'تعذر الحفظ. حاول مرة أخرى.');}
    finally {setBusy(false);}
  };
  return <dialog ref={dialogRef} className="crm-dialog" aria-labelledby="crm-editor-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} onClick={event=>{if(event.target===event.currentTarget && !busy)onClose();}}>
    <form onSubmit={event=>void submit(event)} className="crm-editor" dir="rtl">
      <div className="crm-editor-heading"><div><p className="crm-eyebrow">AWEXEN CRM</p><h2 id="crm-editor-title">{editor.id?'تعديل':'إضافة'} {names[editor.kind]}</h2></div><button type="button" disabled={busy} className="admin-icon-button" onClick={onClose} aria-label="إغلاق النافذة"><X className="h-5 w-5"/></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {editor.kind!=='client' && select('client_id','العميل',data.clients.filter(c=>!c.archived_at || c.id===value('client_id')).map(c=>[c.id,c.name]),true)}
        {editor.kind==='client' && <>
          {field('name','اسم العميل','text',true)}{field('company','الشركة')}{field('email','البريد الإلكتروني','email')}{field('phone','الهاتف / واتساب','tel')}
          {field('source','المصدر (إحالة / حملة / موقع)')}{field('service','الخدمة المطلوبة')}{select('stage','مرحلة العميل',clientStages,true)}{select('priority','الأولوية',priorities,true)}
          {memberSelect('owner_id','الموظف المسؤول')}{field('next_follow_up','موعد المتابعة القادم','date')}{field('website','رابط الموقع','url')}{field('address','العنوان')}{field('tags','الوسوم (افصل بينها بفاصلة)')}{notes()}
        </>}
        {editor.kind==='deal' && <>
          {field('title','عنوان الصفقة','text',true)}{field('service','الخدمة')}{select('stage','مرحلة الصفقة',dealStages,true)}
          {field('value','قيمة الصفقة (ج.م)','number',true,{min:0,step:'0.01',max:999999999999})}{field('probability','احتمالية الإغلاق %','number',true,{min:0,max:100})}
          {field('expected_close','تاريخ الإغلاق المتوقع','date')}{memberSelect('owner_id','مسؤول الصفقة')}
          {value('stage')==='lost' && field('lost_reason','سبب الخسارة','text',true)}{notes()}
        </>}
        {editor.kind==='task' && <>
          {field('title','عنوان المهمة','text',true)}{select('deal_id','الصفقة المرتبطة',deals.map(d=>[d.id,d.title]))}
          {field('due_date','موعد التنفيذ','date',true)}{select('priority','الأولوية',priorities,true)}{select('status','الحالة',[['open','مفتوحة'],['done','مكتملة'],['cancelled','ملغاة']],true)}
          {memberSelect('assignee_id','الموظف المسؤول')}{notes()}
        </>}
        {editor.kind==='contact' && <>{field('name','اسم جهة الاتصال','text',true)}{field('job_title','المسمى الوظيفي')}{field('email','البريد الإلكتروني','email')}{field('phone','الهاتف','tel')}</>}
        {editor.kind==='activity' && <>{select('kind','نوع التواصل',activityKinds.filter(([key])=>key!=='system'),true)}{notes('body','تفاصيل التواصل والنتيجة')}</>}
        {(editor.kind==='payment' || editor.kind==='invoice') && select('deal_id','الصفقة',deals.map(d=>[d.id,`${d.title} — ${money(d.value)}`]),true)}
        {editor.kind==='payment' && <>
          {select('invoice_id','الفاتورة (اختياري)',invoices.map(i=>[i.id,`AWX-${i.invoice_number} — ${money(i.total)}`]))}
          {field('amount','المبلغ (ج.م)','number',true,{min:0.01,step:'0.01',max:999999999999})}{field('paid_on','تاريخ التحصيل','date',true)}
          {select('method','طريقة الدفع',paymentMethods,true)}{field('reference','مرجع العملية')}{notes()}
        </>}
        {editor.kind==='invoice' && <>
          {field('issued_on','تاريخ الفاتورة','date',true)}{field('due_on','تاريخ الاستحقاق','date',true,{min:value('issued_on')})}{field('tax_rate','نسبة الضريبة %','number',true,{min:0,max:100,step:'0.01'})}
          <div className="space-y-3 sm:col-span-2"><h3 className="font-bold">بنود الفاتورة</h3>{items.map((item,index)=><div key={index} className="crm-invoice-item">
            <label className="crm-field"><span>الوصف</span><input className="admin-input" value={item.description} required maxLength={500} onChange={e=>setItems(items.map((i,n)=>n===index?{...i,description:e.target.value}:i))}/></label>
            <label className="crm-field"><span>الكمية</span><input type="number" className="admin-input" value={item.quantity} required min="0.01" step="0.01" onChange={e=>setItems(items.map((i,n)=>n===index?{...i,quantity:Number(e.target.value)}:i))}/></label>
            <label className="crm-field"><span>سعر الوحدة</span><input type="number" className="admin-input" value={item.unit_price} required min="0" step="0.01" onChange={e=>setItems(items.map((i,n)=>n===index?{...i,unit_price:Number(e.target.value)}:i))}/></label>
            <button type="button" className="admin-icon-button" disabled={items.length===1} onClick={()=>setItems(items.filter((_,n)=>n!==index))} aria-label={`حذف البند ${index+1}`}><Trash2 className="h-4 w-4"/></button>
          </div>)}<button type="button" disabled={items.length>=100} className="admin-button-secondary" onClick={()=>setItems([...items,{description:'',quantity:1,unit_price:0}])}><Plus className="h-4 w-4"/>إضافة بند</button>
          <p className="font-bold">الإجمالي شامل الضريبة: {money(items.reduce((sum,i)=>sum+i.quantity*i.unit_price,0)*(1+Number(values.tax_rate)/100))}</p></div>{notes()}
        </>}
      </div>
      {error && <p role="alert" className="crm-error">{error}</p>}
      <div className="crm-editor-footer"><button disabled={busy} className="admin-button-primary" type="submit">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{busy?'جارٍ الحفظ...':'حفظ'}</button><button disabled={busy} type="button" className="admin-button-secondary" onClick={onClose}>إلغاء</button></div>
    </form>
  </dialog>;
}
