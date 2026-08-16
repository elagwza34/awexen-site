<?php
/**
 * ============================================================
 *  awexen API  —  نقطة الدخول الوحيدة
 * ============================================================
 *  المسارات المتاحة:
 *
 *   GET  /api/                 معلومات الـ API واختبار الاتصال
 *   GET  /api/health           فحص الاتصال بقاعدة البيانات
 *   GET  /api/settings         إعدادات الموقع (صف واحد)
 *   GET  /api/services         كل الخدمات
 *   GET  /api/services/{slug}  خدمة واحدة
 *   GET  /api/projects         معرض الأعمال
 *   GET  /api/plans            باقات الأسعار
 *   GET  /api/testimonials     آراء العملاء
 *   GET  /api/stats            الإحصائيات
 *   GET  /api/brands           العلامات التجارية
 *   POST /api/leads            استقبال طلب تواصل جديد
 *   GET  /api/leads?token=...  عرض الطلبات (يتطلب التوكن)
 *
 *  يعمل أيضاً بدون mod_rewrite:
 *   /api/index.php?r=services
 * ============================================================
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

if (!empty($config['debug'])) {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

send_cors($config);

$route  = get_route();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ------------------------- مسارات لا تحتاج DB ------------------------- */

if ($route === '' || $route === 'index.php') {
    json_out([
        'success'   => true,
        'name'      => 'awexen API',
        'version'   => '1.0.0',
        'endpoints' => [
            'GET  settings', 'GET  services', 'GET  services/{slug}',
            'GET  projects', 'GET  plans', 'GET  testimonials',
            'GET  stats', 'GET  brands', 'POST leads',
        ],
    ]);
}

/* ----------------------------- الاتصال ------------------------------- */

$pdo = db($config);

if ($route === 'health') {
    $tables = [];
    foreach (rows($pdo, 'SHOW TABLES') as $t) {
        $tables[] = array_values($t)[0];
    }
    json_out([
        'success'  => true,
        'message'  => 'الاتصال بقاعدة البيانات ناجح ✅',
        'database' => $config['db']['name'],
        'tables'   => $tables,
        'php'      => PHP_VERSION,
    ]);
}

/* ----------------------------- المسارات ------------------------------ */

switch (true) {

    /* ---------- إعدادات الموقع ---------- */
    case $route === 'settings':
        $r = row($pdo, 'SELECT * FROM settings ORDER BY id ASC LIMIT 1');
        json_out(['success' => true, 'data' => $r ?: new stdClass()]);

    /* ---------- كل الخدمات ---------- */
    case $route === 'services':
        $list = rows(
            $pdo,
            'SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        json_out([
            'success' => true,
            'count'   => count($list),
            'data'    => decode_rows($list, [
                'overview', 'stats', 'features', 'steps',
                'deliverables', 'tools', 'packages', 'faqs',
            ]),
        ]);

    /* ---------- خدمة واحدة ---------- */
    case (bool) preg_match('#^services/([A-Za-z0-9_\-]+)$#', $route, $m):
        $r = row($pdo, 'SELECT * FROM services WHERE slug = ? LIMIT 1', [$m[1]]);
        if (!$r) {
            json_out(['success' => false, 'message' => 'الخدمة غير موجودة'], 404);
        }
        json_out([
            'success' => true,
            'data'    => decode_fields($r, [
                'overview', 'stats', 'features', 'steps',
                'deliverables', 'tools', 'packages', 'faqs',
            ]),
        ]);

    /* ---------- معرض الأعمال ---------- */
    case $route === 'projects':
        $list = rows(
            $pdo,
            'SELECT * FROM projects WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        json_out(['success' => true, 'count' => count($list), 'data' => $list]);

    /* ---------- الباقات ---------- */
    case $route === 'plans':
        $list = rows(
            $pdo,
            'SELECT * FROM plans WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        json_out([
            'success' => true,
            'data'    => decode_rows($list, ['features']),
        ]);

    /* ---------- آراء العملاء ---------- */
    case $route === 'testimonials':
        $list = rows(
            $pdo,
            'SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        json_out(['success' => true, 'data' => $list]);

    /* ---------- الإحصائيات ---------- */
    case $route === 'stats':
        json_out([
            'success' => true,
            'data'    => rows($pdo, 'SELECT value, label FROM stats ORDER BY sort_order ASC, id ASC'),
        ]);

    /* ---------- العلامات التجارية ---------- */
    case $route === 'brands':
        json_out([
            'success' => true,
            'data'    => rows($pdo, 'SELECT name, logo FROM brands ORDER BY sort_order ASC, id ASC'),
        ]);

    /* ---------- طلبات التواصل ---------- */
    case $route === 'leads' && $method === 'POST':
        $b = json_body();

        $name    = clean($b['name'] ?? '', 120);
        $phone   = clean($b['phone'] ?? '', 40);
        $email   = clean($b['email'] ?? '', 160);
        $service = clean($b['service'] ?? '', 80);
        $budget  = clean($b['budget'] ?? '', 80);
        $message = clean($b['message'] ?? '', 5000);

        if ($name === '' || $phone === '' || $message === '') {
            json_out(['success' => false, 'message' => 'برجاء تعبئة الحقول المطلوبة'], 422);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_out(['success' => false, 'message' => 'البريد الإلكتروني غير صحيح'], 422);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO leads (name, phone, email, service, budget, message, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name, $phone, $email, $service, $budget, $message,
            $_SERVER['REMOTE_ADDR'] ?? '',
            mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);

        json_out([
            'success' => true,
            'id'      => (int) $pdo->lastInsertId(),
            'message' => 'تم استلام طلبك بنجاح، سنتواصل معك خلال 24 ساعة.',
        ], 201);

    /* ---------- عرض الطلبات (محمي) ---------- */
    case $route === 'leads' && $method === 'GET':
        require_token($config);
        json_out([
            'success' => true,
            'data'    => rows($pdo, 'SELECT * FROM leads ORDER BY id DESC LIMIT 200'),
        ]);

    default:
        json_out(['success' => false, 'message' => 'المسار غير موجود: ' . $route], 404);
}
