import { useEffect, useState } from "react";
import { pmsTiers as designs, type PMSTier } from "../data/pms";
export interface CataloguePlan { id:number; key:string; name:string; nameAr:string|null; price:number; setupFee:number; currency:string; billingInterval:string; maxUsers:number; maxBranches:number; maxWarehouses:number; maxDevices:number; features:{feature:{key:string;name:string;nameAr:string|null}}[] }
const keys:Record<string,string>={starter:"PMS_STARTER",growth:"PMS_PRO",scale:"PMS_BUSINESS"};
export function checkoutUrl(id:string,cycle:string) {return "https://licenses.awexen.com/portal/register?plan="+encodeURIComponent(keys[id]+(cycle==="yearly"?"_YEARLY":""));}
export function usePmsCatalogue(cycle = "monthly"){
 const [plans,setPlans]=useState<CataloguePlan[]>([]);const [error,setError]=useState(false);
 useEffect(()=>{const abort=new AbortController();fetch("https://licenses.awexen.com/api/v1/portal/public-catalogue",{signal:abort.signal}).then(async r=>{if(!r.ok)throw Error();const b=await r.json();const p=(b.data??b).plans;if(!Array.isArray(p))throw Error();setPlans(p);}).catch(e=>{if(e.name!=="AbortError")setError(true);});return()=>abort.abort();},[]);
 const tiers=designs.flatMap(t=>{const month=plans.find(p=>p.key===keys[t.id]),year=plans.find(p=>p.key===keys[t.id]+"_YEARLY");if(!month||!year)return [];return [{...t,name:{ar:month.nameAr??month.name,en:month.name},monthly:month.price/100,yearly:year.price/1200,setup:(cycle === "yearly" ? year.setupFee : month.setupFee)/100,includes:[],limits:[{label:{ar:"المستخدمون",en:"Users"},value:{ar:String((cycle === "yearly" ? year : month).maxUsers),en:String(month.maxUsers)}},{label:{ar:"الفروع",en:"Branches"},value:{ar:String((cycle === "yearly" ? year : month).maxBranches),en:String(month.maxBranches)}},{label:{ar:"المخازن",en:"Warehouses"},value:{ar:String((cycle === "yearly" ? year : month).maxWarehouses),en:String(month.maxWarehouses)}},{label:{ar:"الأجهزة",en:"Devices"},value:{ar:String((cycle === "yearly" ? year : month).maxDevices),en:String(month.maxDevices)}}]} as PMSTier];});
 return {plans,tiers,error,ready:tiers.length>0};
}
