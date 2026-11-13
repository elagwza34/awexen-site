import { useEffect, useState } from "react";
import { pmsTiers as designs, type PMSTier } from "../data/pms";
export interface CataloguePlan { id:number; key:string; name:string; nameAr:string|null; price:number; setupFee:number; currency:string; billingInterval:string; maxUsers:number; maxBranches:number; maxWarehouses:number; maxDevices:number; features:{feature:{key:string;name:string;nameAr:string|null}}[] }
const keys:Record<string,string>={starter:"PMS_STARTER",growth:"PMS_PRO",scale:"PMS_BUSINESS"};
export function hasYearlyPlan(plans:CataloguePlan[],id:string){return plans.some(p=>p.key===keys[id]+"_YEARLY");}
export function checkoutUrl(id:string,cycle:string,hasYearly=true) {return "https://licenses.awexen.com/portal/register?plan="+encodeURIComponent(keys[id]+(cycle==="yearly"&&hasYearly?"_YEARLY":""));}

/** سعر شهري مكافئ عند الدفع السنوي: خصم 20% عن السعر الشهري */
function yearlyEquivalent(monthly:number):number {
  return Math.round(monthly * 0.8 * 100) / 100;
}

export function usePmsCatalogue(cycle = "monthly"){
 const [plans,setPlans]=useState<CataloguePlan[]>([]);const [error,setError]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch("https://licenses.awexen.com/api/v1/portal/public-catalogue",{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error();const b=await r.json();const p=(b.data??b).plans;if(!Array.isArray(p))throw Error();setPlans(p);}).catch(e=>{if(e.name!=="AbortError")setError(true);});return()=>abort.abort();},[]);
 const tiers=designs.flatMap(t=>{
   const month=plans.find(p=>p.key===keys[t.id]);
   // الخطة السنوية اختيارية: لو مش موجودة على السيرفر بنحسب السعر الشهري المكافئ (خصم 20%)
   if(!month)return [];
   const year=plans.find(p=>p.key===keys[t.id]+"_YEARLY");
   const monthly=month.price/100;
   const yearly=year?year.price/1200:yearlyEquivalent(monthly);
   const setup=((cycle === "yearly" ? (year?.setupFee ?? month.setupFee) : month.setupFee))/100;
   const source=cycle === "yearly" && year ? year : month;
   return [{...t,name:{ar:month.nameAr??month.name,en:month.name},monthly:monthly,yearly:yearly,setup:setup,includes:[],limits:[{label:{ar:"المستخدمون",en:"Users"},value:{ar:String(source.maxUsers),en:String(source.maxUsers)}},{label:{ar:"الفروع",en:"Branches"},value:{ar:String(source.maxBranches),en:String(source.maxBranches)}},{label:{ar:"المخازن",en:"Warehouses"},value:{ar:String(source.maxWarehouses),en:String(source.maxWarehouses)}},{label:{ar:"الأجهزة",en:"Devices"},value:{ar:String(source.maxDevices),en:String(source.maxDevices)}}]} as PMSTier];});
 return {plans,tiers,error,ready:tiers.length>0};
}