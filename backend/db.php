<?php
/**
 * دوال مساعدة: الاتصال بقاعدة البيانات، CORS، الاستعلامات، والردود.
 * لا تحتاج لتعديل هذا الملف.
 */

declare(strict_types=1);

/** اتصال PDO مفرد (Singleton) */
function db(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $c   = $config['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $c['host'],
        (int) ($c['port'] ?? 3306),
        $c['name'],
        $c['charset'] ?? 'utf8mb4'
    );

    try {
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch (PDOException $e) {
        json_out([
            'success' => false,
            'message' => 'فشل الاتصال بقاعدة البيانات. راجع بيانات config.php',
            'error'   => !empty($config['debug']) ? $e->getMessage() : null,
        ], 500);
    }

    return $pdo;
}

/** إرسال ترويسات CORS */
function send_cors(array $config): void
{
    $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = $config['allowed_origins'] ?? ['*'];

    if (in_array('*', $allowed, true)) {
        header('Access-Control-Allow-Origin: *');
    } elseif ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, X-Api-Key');
    header('Access-Control-Max-Age: 86400');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** إخراج JSON وإنهاء التنفيذ */
function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** استخراج المسار المطلوب سواء pretty url أو ?r= */
function get_route(): string
{
    if (!empty($_GET['r'])) {
        return trim((string) $_GET['r'], '/');
    }

    $uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $script = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));

    if ($script !== '/' && str_starts_with($uri, $script)) {
        $uri = substr($uri, strlen($script));
    }

    $uri = trim($uri, '/');
    // إزالة index.php من المسار إن وُجد
    if (str_starts_with($uri, 'index.php')) {
        $uri = trim(substr($uri, strlen('index.php')), '/');
    }

    return $uri;
}

/** تنفيذ استعلام SELECT وإرجاع الصفوف */
function rows(PDO $pdo, string $sql, array $params = []): array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

/** تنفيذ استعلام SELECT وإرجاع صف واحد */
function row(PDO $pdo, string $sql, array $params = []): ?array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $r = $stmt->fetch();
    return $r === false ? null : $r;
}

/** تحويل أعمدة JSON المخزنة كنص إلى مصفوفات حقيقية */
function decode_fields(array $row, array $fields): array
{
    foreach ($fields as $f) {
        if (!array_key_exists($f, $row)) {
            continue;
        }
        $decoded = json_decode((string) $row[$f], true);
        $row[$f] = is_array($decoded) ? $decoded : [];
    }
    return $row;
}

function decode_rows(array $list, array $fields): array
{
    return array_map(fn($r) => decode_fields($r, $fields), $list);
}

/** قراءة جسم الطلب JSON */
function json_body(): array
{
    $raw  = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (is_array($data)) {
        return $data;
    }
    return $_POST ?: [];
}

/** التحقق من التوكن الإداري */
function require_token(array $config): void
{
    $sent = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['token'] ?? '');
    if (!hash_equals((string) $config['admin_token'], (string) $sent)) {
        json_out(['success' => false, 'message' => 'غير مصرح — توكن غير صحيح'], 401);
    }
}

/** تنظيف نص */
function clean($v, int $max = 2000): string
{
    return mb_substr(trim(strip_tags((string) $v)), 0, $max);
}
