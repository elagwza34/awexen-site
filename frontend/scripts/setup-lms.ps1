<#
  ============================================================
   تشغيل نظام الـ LMS محلياً — فحص وتشخيص
   ============================================================
   الاستخدام:  .\frontend\scripts\setup-lms.ps1
#>

$ErrorActionPreference = 'Continue'
$frontend = Split-Path -Parent $PSScriptRoot
Set-Location $frontend

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg)     { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Err($msg)      { Write-Host "    XX  $msg" -ForegroundColor Red }
function Hint($msg)     { Write-Host "    ->  $msg" -ForegroundColor DarkGray }

Write-Host "============================================================" -ForegroundColor White
Write-Host "  Awexen LMS - Setup & Diagnostics" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor White

Step 1 "فحص الأدوات"
try { $v = node --version; Ok "Node.js $v" } catch { Err "Node.js غير مثبت" }

$supabaseBin = "$env:APPDATA\npm\supabase.ps1"
if (Test-Path $supabaseBin) {
    Ok "Supabase CLI $(& $supabaseBin --version 2>&1)"
} else {
    Err "Supabase CLI غير مثبت"
    Hint "ثبّته بالأمر:  npm install -g supabase"
}

Step 2 "فحص ملف .env"
$envPath = Join-Path $frontend '.env'
if (-not (Test-Path $envPath)) {
    Err ".env غير موجود"
    Hint "powershell:  Copy-Item .env.example .env"
    exit 1
}
Ok ".env موجود"

$vars = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') {
        $vars[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
    }
}

$url     = $vars['VITE_SUPABASE_URL']
$anon    = $vars['VITE_SUPABASE_PUBLISHABLE_KEY']
$secret  = $vars['SUPABASE_SERVICE_ROLE_KEY']
$isDemo  = $false

foreach ($p in @(@('URL',$url), @('PUBLISHABLE_KEY',$anon), @('SERVICE_ROLE_KEY',$secret))) {
    $name = $p[0]; $val = $p[1]
    if (-not $val) {
        Warn "$name غير موجود"; $isDemo = $true
    } elseif ($val -match 'YOUR_|demo-placeholder|sb_publishable_demo|sb_secret_demo') {
        Err "$name ما زال قيمة تجريبية"; $isDemo = $true
    } else {
        Ok "$name يبدو صحيحاً"
    }
}

Step 3 "الاتصال بالخدمات"
if ($url -and $anon -and -not $isDemo) {
    $base = $url -replace '/+$',''
    try {
        $r = Invoke-WebRequest -Uri "$base/rest/v1/courses?select=id&limit=1" `
              -Headers @{ apikey = $anon; Authorization = "Bearer $anon" } `
              -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        Ok "قاعدة البيانات متاحة (HTTP $($r.StatusCode))"
    } catch {
        Err "فشل الاتصال بالقاعدة: $($_.Exception.Message)"
    }

    try {
        $r2 = Invoke-WebRequest -Uri "$base/functions/v1/lms-public/health" `
               -Headers @{ apikey = $anon } -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        Ok "Edge Function lms-public تعمل (HTTP $($r2.StatusCode))"
    } catch {
        Warn "lms-public لا تستجيب"
        Hint "شغّل:  supabase functions deploy lms-public"
    }

    if ($secret) {
        foreach ($t in @('courses_course','organizations_organization','lms_catalog_sync_status')) {
            try {
                Invoke-WebRequest -Uri "$base/rest/v1/$($t)?select=*&limit=1" `
                  -Headers @{ apikey = $secret; Authorization = "Bearer $secret" } `
                  -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop | Out-Null
                Ok "$t موجودة"
            } catch { Warn "$t غير موجودة" }
        }
    }
} else {
    Warn "تخطّي فحص الاتصال — القيم تجريبية"
}

Step 4 "الفحوصات المدمجة"
Write-Host "`n--- check:setup ---" -ForegroundColor DarkGray
node scripts/check-setup.mjs 2>&1 | ForEach-Object { Write-Host "    $_" }

Write-Host "`n--- check:catalog ---" -ForegroundColor DarkGray
node scripts/check-catalog.mjs 2>&1 | ForEach-Object { Write-Host "    $_" }

Write-Host "`n============================================================" -ForegroundColor White
if ($isDemo) {
    Write-Host "  LMS جاهز للتشغيل بعد وضع المفاتيح الحقيقية" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor White
    Write-Host ""
    Write-Host "  1) supabase.com/dashboard > مشروعك > Project Settings > API Keys" -ForegroundColor DarkGray
    Write-Host "  2) انسخ: Project URL + publishable key + secret key" -ForegroundColor DarkGray
    Write-Host "  3) ضعها في frontend/.env ثم أعد هذا السكربت" -ForegroundColor DarkGray
} else {
    Write-Host "  كل شيء جاهز - شغّل:  npm run dev" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor White
}
Write-Host ""