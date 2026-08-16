<?php
/**
 * ============================================================
 *  استيراد محتوى الموقع إلى قاعدة البيانات
 * ============================================================
 *  الخطوات:
 *   1) افتح الموقع على الرابط:  https://موقعك/#/export
 *   2) اضغط "تحميل ملف seed.json"
 *   3) ارفع الملف الناتج بجوار هذا السكربت داخل مجلد /api
 *   4) افتح:  https://موقعك/api/seed.php?token=التوكن_من_config
 *
 *  ⚠️ يحذف البيانات الحالية في الجداول ويستبدلها بالملف.
 *  ⚠️ احذف هذا الملف من السيرفر بعد الانتهاء.
 * ============================================================
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';
require __DIR__ . '/db.php';

send_cors($config);
require_token($config);

$file = __DIR__ . '/seed.json';
if (!is_file($file)) {
    json_out([
        'success' => false,
        'message' => 'ملف seed.json غير موجود. حمّله من صفحة /#/export وارفعه هنا.',
    ], 404);
}

$data = json_decode((string) file_get_contents($file), true);
if (!is_array($data)) {
    json_out(['success' => false, 'message' => 'ملف seed.json تالف أو غير صالح'], 422);
}

$pdo = db($config);
$log = [];

$json = static fn($v) => json_encode($v ?? [], JSON_UNESCAPED_UNICODE);

try {
    $pdo->beginTransaction();

    /* ------------------------- الإعدادات ------------------------- */
    if (!empty($data['settings'])) {
        $s = $data['settings'];
        $pdo->prepare('DELETE FROM settings')->execute();
        $pdo->prepare(
            'INSERT INTO settings (id, name, brandAr, tagline, description, address, email, phones, hours)
             VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $s['name'] ?? '', $s['brandAr'] ?? '', $s['tagline'] ?? '',
            $s['description'] ?? '', $s['address'] ?? '', $s['email'] ?? '',
            $s['phones'] ?? '', $s['hours'] ?? '',
        ]);
        $log['settings'] = 1;
    }

    /* -------------------------- الخدمات -------------------------- */
    if (!empty($data['services'])) {
        $pdo->prepare('DELETE FROM services')->execute();
        $stmt = $pdo->prepare(
            'INSERT INTO services
             (slug, title, `short`, icon, color, tagline, hero_desc, overview_title,
              overview, stats, features, steps, deliverables, tools, packages, faqs,
              sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)'
        );
        $i = 0;
        foreach ($data['services'] as $s) {
            $stmt->execute([
                $s['slug'] ?? '', $s['title'] ?? '', $s['short'] ?? '',
                $s['icon'] ?? 'code', $s['color'] ?? '', $s['tagline'] ?? '',
                $s['heroDesc'] ?? '', $s['overviewTitle'] ?? '',
                $json($s['overview'] ?? []), $json($s['stats'] ?? []),
                $json($s['features'] ?? []), $json($s['steps'] ?? []),
                $json($s['deliverables'] ?? []), $json($s['tools'] ?? []),
                $json($s['packages'] ?? []), $json($s['faqs'] ?? []),
                ++$i,
            ]);
        }
        $log['services'] = $i;
    }

    /* ------------------------ معرض الأعمال ------------------------ */
    if (!empty($data['projects'])) {
        $pdo->prepare('DELETE FROM projects')->execute();
        $stmt = $pdo->prepare(
            'INSERT INTO projects (title, `desc`, tag, image, site, accent, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,1)'
        );
        $i = 0;
        foreach ($data['projects'] as $p) {
            $stmt->execute([
                $p['title'] ?? '', $p['desc'] ?? '', $p['tag'] ?? '',
                $p['image'] ?? '', $p['site'] ?? '', $p['accent'] ?? '', ++$i,
            ]);
        }
        $log['projects'] = $i;
    }

    /* -------------------------- الباقات --------------------------- */
    if (!empty($data['plans'])) {
        $pdo->prepare('DELETE FROM plans')->execute();
        $stmt = $pdo->prepare(
            'INSERT INTO plans (name, `desc`, currency, price, cta, features, featured, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?,?,1)'
        );
        $i = 0;
        foreach ($data['plans'] as $p) {
            $stmt->execute([
                $p['name'] ?? '', $p['desc'] ?? '', $p['currency'] ?? 'جنية',
                $p['price'] ?? '0', $p['cta'] ?? 'ابدأ الآن',
                $json($p['features'] ?? []), !empty($p['featured']) ? 1 : 0, ++$i,
            ]);
        }
        $log['plans'] = $i;
    }

    /* ------------------------ آراء العملاء ------------------------ */
    if (!empty($data['testimonials'])) {
        $pdo->prepare('DELETE FROM testimonials')->execute();
        $stmt = $pdo->prepare(
            'INSERT INTO testimonials (quote, name, role, sort_order, is_active) VALUES (?,?,?,?,1)'
        );
        $i = 0;
        foreach ($data['testimonials'] as $t) {
            $stmt->execute([$t['quote'] ?? '', $t['name'] ?? '', $t['role'] ?? '', ++$i]);
        }
        $log['testimonials'] = $i;
    }

    /* ------------------------ الإحصائيات -------------------------- */
    if (!empty($data['stats'])) {
        $pdo->prepare('DELETE FROM stats')->execute();
        $stmt = $pdo->prepare('INSERT INTO stats (value, label, sort_order) VALUES (?,?,?)');
        $i = 0;
        foreach ($data['stats'] as $s) {
            $stmt->execute([$s['value'] ?? '', $s['label'] ?? '', ++$i]);
        }
        $log['stats'] = $i;
    }

    /* ---------------------- العلامات التجارية --------------------- */
    if (!empty($data['brands'])) {
        $pdo->prepare('DELETE FROM brands')->execute();
        $stmt = $pdo->prepare('INSERT INTO brands (name, sort_order) VALUES (?,?)');
        $i = 0;
        foreach ($data['brands'] as $b) {
            $stmt->execute([is_array($b) ? ($b['name'] ?? '') : (string) $b, ++$i]);
        }
        $log['brands'] = $i;
    }

    $pdo->commit();

    json_out([
        'success'  => true,
        'message'  => 'تم استيراد المحتوى بنجاح ✅ — احذف seed.php و seed.json الآن.',
        'imported' => $log,
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    json_out([
        'success' => false,
        'message' => 'فشل الاستيراد',
        'error'   => !empty($config['debug']) ? $e->getMessage() : 'فعّل debug لعرض التفاصيل',
    ], 500);
}
