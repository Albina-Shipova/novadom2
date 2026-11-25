<?php
declare(strict_types=1);

const SITE_ORIGIN = 'https://tsarevadesign.ru';
const SENDER = 'noreply@tsarevadesign.ru';
const RECIPIENT = 'Russua.anna@ya.ru';
const MAX_REQUEST_BYTES = 16000;

function respond(int $status): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => $status === 200]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405);
}

if (($_SERVER['HTTP_ORIGIN'] ?? '') !== SITE_ORIGIN) {
    respond(403);
}

$config = dirname(__DIR__) . '/private/enquiry-settings.php';
if (!is_readable($config)) {
    respond(503);
}
$settings = require $config;
$version = $settings['consent_version'] ?? '';
$retentionDays = $settings['retention_days'] ?? 0;
$rateSecret = $settings['rate_key'] ?? '';
if (!is_string($version) || $version === '' || !is_int($retentionDays) || $retentionDays < 1
    || !is_string($rateSecret) || strlen($rateSecret) < 32) {
    respond(503);
}

$body = file_get_contents('php://input', false, null, 0, MAX_REQUEST_BYTES + 1);
if ($body === false || strlen($body) > MAX_REQUEST_BYTES) {
    respond(413);
}
$input = json_decode($body, true);
if (!is_array($input) || ($input['consent'] ?? false) !== true || ($input['version'] ?? '') !== $version) {
    respond(422);
}

$fields = [];
foreach (['name' => 80, 'phone' => 30, 'city' => 100, 'property' => 40, 'area' => 12, 'comment' => 2000] as $field => $limit) {
    $value = $input[$field] ?? '';
    if (!is_string($value) || mb_strlen($value, 'UTF-8') > $limit) {
        respond(422);
    }
    $fields[$field] = trim($value);
}

if ($fields['name'] === '' || !preg_match('/^[+0-9() .-]+$/D', $fields['phone'])
    || !preg_match('/^\d{10,15}$/D', preg_replace('/\D/', '', $fields['phone']))
    || !preg_match('/^(\d{1,6}([.,]\d{1,2})?)?$/D', $fields['area'])
    || !in_array($fields['property'], ['', 'Квартира', 'Дом', 'Коммерческое помещение', 'Другое'], true)) {
    respond(422);
}

$now = time();
$rateKey = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? '', $rateSecret);
try {
    umask(0077);
    $db = new PDO('sqlite:' . dirname($config) . '/enquiries.sqlite3');
    $db->exec('PRAGMA busy_timeout = 3000');
    $db->exec('CREATE TABLE IF NOT EXISTS enquiries (
        id INTEGER PRIMARY KEY, received_at INTEGER NOT NULL, consent_version TEXT NOT NULL,
        rate_key TEXT, fields TEXT NOT NULL, email_queued INTEGER NOT NULL DEFAULT 0
    )');
    $db->exec('BEGIN IMMEDIATE');
    $db->prepare('DELETE FROM enquiries WHERE received_at < ?')->execute([$now - $retentionDays * 86400]);
    $db->prepare('UPDATE enquiries SET rate_key = NULL WHERE received_at < ? AND rate_key IS NOT NULL')
        ->execute([$now - 3600]);
    $recent = $db->prepare('SELECT COUNT(*) FROM enquiries WHERE rate_key = ?');
    $recent->execute([$rateKey]);
    if ((int) $recent->fetchColumn() >= 5) {
        $db->exec('COMMIT');
        respond(429);
    }
    $db->prepare('INSERT INTO enquiries (received_at, consent_version, rate_key, fields) VALUES (?, ?, ?, ?)')
        ->execute([$now, $version, $rateKey, json_encode($fields, JSON_UNESCAPED_UNICODE)]);
    $id = (int) $db->lastInsertId();
    $db->exec('COMMIT');

    $message = "Заявка №{$id}\nИмя: {$fields['name']}\nТелефон: {$fields['phone']}\n"
        . "Город: {$fields['city']}\nТип объекта: {$fields['property']}\n"
        . "Площадь, м²: {$fields['area']}\n"
        . "Сообщение: {$fields['comment']}\nСогласие: {$version}, " . gmdate('c', $now);
    $subject = '=?UTF-8?B?' . base64_encode('Новая заявка с сайта «Нова Дом»') . '?=';
    $headers = "From: " . SENDER . "\r\nMIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
    if (!mail(RECIPIENT, $subject, chunk_split(base64_encode($message)), $headers, '-f' . SENDER)) {
        error_log("Nova Dom: email queue rejected enquiry {$id}");
        respond(502);
    }
    $db->prepare('UPDATE enquiries SET email_queued = 1 WHERE id = ?')->execute([$id]);
} catch (Throwable $error) {
    error_log('Nova Dom: enquiry processing failed (' . get_class($error) . ')');
    respond(503);
}

respond(200);
