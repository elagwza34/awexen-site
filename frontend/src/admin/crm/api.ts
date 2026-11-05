import { supabase } from '../../lib/supabase';
import type { CrmData } from './model';

export async function fetchRows<T>(table: string, order = 'created_at'): Promise<T[]> {
  if (!supabase) throw new Error('اتصال قاعدة البيانات غير مهيأ.');
  const rows: T[] = [];
  for (let offset=0;;offset+=500) {
    const {data,error} = await supabase.from(table).select('*').order(order,{ascending:false}).order(table === 'profiles' ? 'user_id' : 'id').range(offset,offset+499);
    if(error) throw error;
    rows.push(...(data ?? []) as T[]);
    if(!data || data.length < 500) return rows;
  }
}
export async function loadCrm(): Promise<CrmData> {
  const [clients,deals,tasks,activities,payments,contacts,members,invoices] = await Promise.all([
    fetchRows<CrmData['clients'][number]>('clients'), fetchRows<CrmData['deals'][number]>('crm_deals'),
    fetchRows<CrmData['tasks'][number]>('crm_tasks'), fetchRows<CrmData['activities'][number]>('crm_activities'),
    fetchRows<CrmData['payments'][number]>('crm_payments'), fetchRows<CrmData['contacts'][number]>('crm_contacts'),
    fetchRows<CrmData['members'][number]>('profiles'),
    fetchRows<CrmData['invoices'][number]>('crm_invoices'),
  ]);
  return {clients,deals,tasks,activities,payments,contacts,invoices,members:members.filter(m=>m.is_active && ['owner','admin','support'].includes(m.role))};
}
export async function saveRecord(table: string, values: Record<string,unknown>, id?: string) {
  if(!supabase) throw new Error('اتصال قاعدة البيانات غير مهيأ.');
  const query = id ? supabase.from(table).update(values).eq('id',id) : supabase.from(table).insert(values);
  const {data,error} = await query.select('id').single();
  if(error) throw error;
  if(!data) throw new Error('تعذر الحفظ. راجع صلاحيات حسابك.');
  return data.id as string;
}
export async function removePayment(id: string) {
  if(!supabase) throw new Error('اتصال قاعدة البيانات غير مهيأ.');
  const {error,data} = await supabase.from('crm_payments').delete().eq('id',id).select('id').single();
  if(error) throw error;
  if(!data) throw new Error('لم يتم إلغاء الدفعة. راجع صلاحيات حسابك.');
}
