import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutUrl, billingPrice, selectResourcePlan, planForTier } from '../src/data/pms-catalogue.ts';

const plans = [
  {id:6,key:'PMS_STARTER',price:150000,setupFee:300000,currency:'EGP',maxUsers:1,maxBranches:1,maxWarehouses:1,maxDevices:1,billingOptions:[{billingInterval:'MONTHLY',price:150000},{billingInterval:'YEARLY',price:1530000}],features:[]},
  {id:7,key:'PMS_PRO',price:350000,setupFee:500000,currency:'EGP',maxUsers:5,maxBranches:2,maxWarehouses:2,maxDevices:4,billingOptions:[{billingInterval:'MONTHLY',price:350000},{billingInterval:'YEARLY',price:3570000}],features:[]},
  {id:8,key:'PMS_BUSINESS',price:650000,setupFee:800000,currency:'EGP',maxUsers:20,maxBranches:5,maxWarehouses:5,maxDevices:10,billingOptions:[{billingInterval:'MONTHLY',price:650000},{billingInterval:'YEARLY',price:6630000}],features:[]},
];
test('annual prices use the exact catalogue total with 15% discount and separate setup',()=>{
 const annual=billingPrice(plans[0],'yearly');
 assert.deepEqual(annual,{periodMinor:1530000,monthlyEquivalent:1275,setup:3000});
 assert.equal(billingPrice(plans[0],'monthly').monthlyEquivalent,1500);
 assert.equal(billingPrice({...plans[0],billingOptions:[{billingInterval:'MONTHLY',price:150000}]},'yearly'),null);
});
test('checkout preserves the real plan key and billing interval without yearly suffixes',()=>{
 const url=new URL(checkoutUrl('growth','yearly'));
 assert.equal(url.origin,'https://licenses.awexen.com');
 assert.equal(url.searchParams.get('plan'),'PMS_PRO');
 assert.equal(url.searchParams.get('billingInterval'),'YEARLY');
 assert.equal(new URL(checkoutUrl('starter','monthly')).searchParams.get('billingInterval'),'MONTHLY');
});
test('comparison uses the same plan in both billing intervals',()=>{
 assert.equal(planForTier(plans,'growth')?.id,7);
 assert.equal(planForTier(plans,'scale')?.maxWarehouses,5);
});
test('builder selects the cheapest eligible tier and rejects invalid/unsupported counts',()=>{
 assert.equal(selectResourcePlan(plans,{branches:2,warehouses:2,devices:4},'monthly')?.key,'PMS_PRO');
 assert.equal(selectResourcePlan(plans,{branches:3,warehouses:2,devices:4},'yearly')?.key,'PMS_BUSINESS');
 assert.equal(selectResourcePlan(plans,{branches:1,warehouses:1,devices:1},'monthly')?.key,'PMS_STARTER');
 for(const devices of [0,-1,1.5,NaN,Infinity,11])assert.equal(selectResourcePlan(plans,{branches:1,warehouses:1,devices},'monthly'),null);
});
