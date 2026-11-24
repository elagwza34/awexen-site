const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const marketing=process.env.PMS_MARKETING_ORIGIN||'http://127.0.0.1:4182';
const portal=process.env.PMS_PORTAL_ORIGIN||'http://127.0.0.1:4180';
const out=process.env.PMS_CHECKOUT_OUTPUT||'artifacts/pms-checkout';fs.mkdirSync(out,{recursive:true});
const system={id:1,key:'PMS',name:'PMS',nameAr:'نظام إدارة المنتجات'};
const plans=[
 {id:6,key:'PMS_STARTER',name:'Starter',nameAr:'الأساسية',price:150000,setupFee:300000,maxUsers:1,maxBranches:1,maxWarehouses:1,maxDevices:1,includedServices:[]},
 {id:7,key:'PMS_PRO',name:'Growth',nameAr:'النمو',price:350000,setupFee:500000,maxUsers:5,maxBranches:2,maxWarehouses:2,maxDevices:4,includedServices:['WOOCOMMERCE_SETUP']},
 {id:8,key:'PMS_BUSINESS',name:'Advanced',nameAr:'المتقدمة',price:650000,setupFee:800000,maxUsers:20,maxBranches:5,maxWarehouses:5,maxDevices:10,includedServices:['WOOCOMMERCE_SETUP','SHIPPING_SETUP']},
].map(p=>({...p,currency:'EGP',systemId:1,system,billingInterval:'MONTHLY',description:null,trialDays:0,enforceEntitlements:true,
 billingOptions:[{billingInterval:'MONTHLY',price:p.price},{billingInterval:'YEARLY',price:Math.round(p.price*12*.85)}],
 features:['PRODUCTS','INVENTORY','SALES','POS','CUSTOMERS','REPORTS',...(p.id>6?['MULTI_BRANCH','MULTI_WAREHOUSE']:[])].map(key=>({feature:{key,name:key,nameAr:key}}))}));
const customer={id:9,name:'Synthetic buyer',email:'buyer@example.invalid',downloadEnabled:false,requestedPlanId:6};
const posts=[],errors=[];
async function contextFor(browser){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.pathname.includes('/api/v1/')){
   let data={},status=200;
   if(r.method()!=='GET')posts.push({path:u.pathname,body:r.postDataJSON()});
   if(u.pathname.endsWith('/auth/refresh'))status=401;
   else if(u.pathname.endsWith('/portal/public-catalogue')||u.pathname.endsWith('/portal/catalogue'))data={plans};
   else if(u.pathname.endsWith('/portal/register')||u.pathname.endsWith('/portal/login'))data={customer,accessToken:'synthetic-token'};
   else if(u.pathname.endsWith('/portal/me'))data=customer;
   else if(u.pathname.endsWith('/portal/billing-subscriptions'))data={subscriptions:[],unlinkedLicenseCount:0};
   else if(u.pathname.endsWith('/portal/overview'))data={customer,licenses:[],canDownload:false,latestRelease:null};
   else if(u.pathname.endsWith('/portal/billing-quote')){
    const body=r.postDataJSON(),plan=plans.find(p=>p.id===body.planId),option=plan.billingOptions.find(p=>p.billingInterval===body.billingInterval);
    data={id:'fixture-quote',planId:plan.id,kind:'PURCHASE',billingInterval:option.billingInterval,currency:'EGP',serviceCharge:option.price,setupFee:plan.setupFee,credit:0,amount:option.price+plan.setupFee,periodStart:'2026-11-17T00:00:00Z',periodEnd:'2027-11-17T00:00:00Z',expiresAt:new Date(Date.now()+900000).toISOString(),sourceSubscriptionId:null};
   }
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  }
  if(u.origin===marketing||u.origin===portal)return route.continue();
  if(u.hostname.endsWith('supabase.co'))return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  return route.abort();
 });
 return context;
}
async function signup(context,key,interval){
 const page=await context.newPage();
 await page.goto(`${portal}/portal/register?plan=${key}&billingInterval=${interval}`);
 await page.getByRole('heading',{name:'إنشاء حساب',exact:true}).waitFor();
 await page.locator('#name').fill('Synthetic buyer');await page.locator('#email').fill(customer.email);
 await page.locator('#phone').fill('01000000000');await page.locator('#password').fill('Synthetic-Password-42!');
 await page.locator('#confirmPassword').fill('Synthetic-Password-42!');
 await page.getByRole('button',{name:'إنشاء الحساب',exact:true}).click();
 await page.waitForURL(url=>url.pathname==='/portal/subscription/PMS');
 assert.equal(new URL(page.url()).searchParams.get('plan'),key);assert.equal(new URL(page.url()).searchParams.get('billingInterval'),interval);
 const plan=plans.find(p=>p.key===key);
 await page.getByRole('button',{name:new RegExp(plan.nameAr)}).first().waitFor();
 assert.equal(await page.getByRole('button',{name:new RegExp(plan.nameAr)}).first().getAttribute('aria-pressed'),'true');
 await page.getByText('عرض السعر — '+plan.nameAr,{exact:true}).waitFor();
 assert.ok(posts.some(p=>p.path.endsWith('/portal/billing-quote')&&p.body.planId===plan.id&&p.body.billingInterval===interval));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 return page;
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await contextFor(browser),page=await context.newPage();
  await page.goto(marketing+'/pms');await page.locator('#plans article').first().waitFor();
  const rejectCookies=page.getByRole('button',{name:'رفض',exact:true});
  if(await rejectCookies.isVisible())await rejectCookies.click();
  assert.equal(await page.locator('main a[href="/quote"]').count(),0);
  assert.equal(await page.locator('header a[href="/quote"]:visible').count(),0);
  assert.equal(await page.locator('#plans article').count(),3);
  assert.match(await page.locator('#plans article').nth(1).innerText(),/خدمة تجهيز ربط متجر WooCommerce/);
  assert.doesNotMatch(await page.locator('#plans article').nth(1).innerText(),/خدمة تجهيز الربط بشركات الشحن/);
  assert.match(await page.locator('#plans article').nth(2).innerText(),/خدمة تجهيز الربط بشركات الشحن/);
  await page.getByRole('tab',{name:'سنوي — وفر 15%',exact:true}).click();
  assert.match(await page.locator('#plans article').first().innerText(),/1,275/);
  assert.match(await page.locator('#plans article').first().innerText(),/15,300/);
  for(const plan of plans){
   const href=await page.locator(`#plans a[href*="plan=${plan.key}&"]`).getAttribute('href');
   const url=new URL(href);assert.equal(url.searchParams.get('billingInterval'),'YEARLY');assert.equal(url.searchParams.get('plan'),plan.key);
  }
  await page.getByLabel('عدد الفروع',{exact:true}).selectOption('2');
  await page.getByLabel('عدد المخازن',{exact:true}).selectOption('2');
  await page.getByLabel('عدد الأجهزة',{exact:true}).selectOption('4');
  const builder=page.locator('#builder aside');
  assert.equal(await builder.getByRole('link',{name:'تسجيل جديد',exact:true}).getAttribute('href'),await builder.getByRole('link',{name:'اختر الخطة وسجّل حسابك',exact:true}).getAttribute('href'));
  const builderLogin=new URL(await builder.locator('a[href*="/portal/subscription/PMS"]').getAttribute('href'));
  assert.equal(builderLogin.pathname,'/portal/subscription/PMS');
  assert.equal(builderLogin.searchParams.get('plan'),'PMS_PRO');
  assert.equal(builderLogin.searchParams.get('billingInterval'),'YEARLY');
  await page.getByRole('tab',{name:'شهري',exact:true}).click();
  assert.match(await builder.innerText(),/42,000/);
  await page.getByRole('tab',{name:'سنوي — وفر 15%',exact:true}).click();
  assert.match(await builder.innerText(),/35,700/);
  assert.match(await page.locator('#builder aside').innerText(),/النمو/);
  assert.match(await page.locator('#builder aside').innerText(),/النمو \(شهري\)/);
  await page.getByLabel('عدد الأجهزة',{exact:true}).selectOption('10');
  assert.match(await page.locator('#builder aside').innerText(),/المتقدمة/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.locator('#plans').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/marketing-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(900);await page.screenshot({path:out+'/marketing-desktop.png'});
  await context.close();
  const cases=[];
  for(const plan of plans)for(const interval of ['MONTHLY','YEARLY']){
   const context=await contextFor(browser);await signup(context,plan.key,interval);await context.close();cases.push(plan.key+':'+interval);
  }
  const existing=await contextFor(browser),loginPage=await existing.newPage();
  let releaseCatalogue;
  const catalogueGate=new Promise(resolve=>{releaseCatalogue=resolve;});
  await existing.route('**/api/v1/portal/public-catalogue',async route=>{
    await catalogueGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({plans})});
  });
  await loginPage.goto(portal+'/portal/register?plan=PMS_BUSINESS&billingInterval=YEARLY');
  await loginPage.getByRole('heading',{name:'إنشاء حساب',exact:true}).waitFor();
  assert.equal(await loginPage.getByRole('link',{name:'تسجيل الدخول',exact:true}).count(),0);
  releaseCatalogue();
  await loginPage.getByText(/المتقدمة ·/).waitFor();
  await loginPage.getByRole('link',{name:'تسجيل الدخول',exact:true}).click();
  await loginPage.getByLabel('البريد الإلكتروني',{exact:true}).fill(customer.email);
  await loginPage.getByLabel('كلمة المرور',{exact:true}).fill('Synthetic-Password-42!');
  await loginPage.getByRole('button',{name:'دخول',exact:true}).click();
  await loginPage.waitForURL(url=>url.pathname==='/portal/subscription/PMS');
  assert.equal(new URL(loginPage.url()).searchParams.get('plan'),'PMS_BUSINESS');
  assert.equal(new URL(loginPage.url()).searchParams.get('billingInterval'),'YEARLY');
  await loginPage.getByText('عرض السعر — المتقدمة',{exact:true}).waitFor();
  await existing.close();cases.push('existing-account:slow-catalogue-yearly-selection');
  const direct=await contextFor(browser),directPage=await direct.newPage();
  await directPage.goto(portal+'/portal/subscription/PMS?plan=PMS_PRO&billingInterval=YEARLY');
  await directPage.getByLabel('البريد الإلكتروني',{exact:true}).fill(customer.email);
  await directPage.getByLabel('كلمة المرور',{exact:true}).fill('Synthetic-Password-42!');
  await directPage.getByRole('button',{name:'دخول',exact:true}).click();
  await directPage.waitForURL(url=>url.pathname==='/portal/subscription/PMS');
  assert.equal(new URL(directPage.url()).searchParams.get('plan'),'PMS_PRO');
  assert.equal(new URL(directPage.url()).searchParams.get('billingInterval'),'YEARLY');
  await directPage.getByText('عرض السعر — النمو',{exact:true}).waitFor();
  await direct.close();cases.push('builder-login:query-preserved-through-guard');
  const invalid=await contextFor(browser),invalidPage=await invalid.newPage();
  await invalidPage.goto(portal+'/portal/register?plan=PMS_PRO&billingInterval=INVALID');
  await invalidPage.getByText('الخطة أو المدة غير متاحة. اختر من الباقات الحالية.',{exact:true}).waitFor();
  assert.equal(await invalidPage.getByRole('button',{name:'إنشاء الحساب',exact:true}).isDisabled(),true);
  await invalid.close();cases.push('invalid-interval:registration-blocked');
  const removed=await contextFor(browser),removedPage=await removed.newPage();
  await removed.route('**/api/v1/portal/public-catalogue',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({plans:plans.map(plan=>({...plan,includedServices:[]}))})}));
  await removedPage.goto(marketing+'/pms');await removedPage.locator('#plans article').first().waitFor();
  assert.equal(await removedPage.getByRole('heading',{name:'خدمات تجهيز الربط',exact:true}).count(),0);
  assert.equal(await removedPage.getByRole('heading',{name:'خدمات تجهيز الربط حسب الباقة',exact:true}).count(),0);
  assert.equal(await removedPage.locator('#plans article').getByText('خدمات تجهيز مشمولة',{exact:true}).count(),0);
  await removed.close();cases.push('removed-services:no-stale-promises');
  assert.deepEqual(errors,[]);
  assert.equal(posts.some(p=>!['/portal/register','/portal/login','/portal/billing-quote','/auth/refresh'].some(s=>p.path.endsWith(s))),false);
  const result={Cases:cases,MarketingMobileAndDesktop:true,NoBusinessMutations:true,AllApiResponsesSynthetic:true};
  fs.writeFileSync(out+'/RESULT.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
