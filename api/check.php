<?php
// Diagnostic page for the hosting: open /api/check.php once after upload, then delete it.
// It shows no keys or passwords, only whether each requirement is met.
header('Content-Type: text/plain; charset=utf-8');

$results = [];
$check = function (string $label, bool $ok, string $detail = '') use (&$results) {
    $results[] = sprintf('[%s] %s%s', $ok ? 'OK' : 'NO', $label, $detail === '' ? '' : " - $detail");
};
$bytes = function (string $value): int {
    $number = (int) $value;
    return match (strtolower(substr(trim($value), -1))) { 'g' => $number << 30, 'm' => $number << 20, 'k' => $number << 10, default => $number };
};
$port = function (string $host, int $port): string {
    $socket = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 8);
    if (!$socket) return $errstr ?: "errore $errno";
    fclose($socket);
    return '';
};

$check('PHP 8.1 o successivo', PHP_VERSION_ID >= 80100, PHP_VERSION);
foreach (['curl', 'openssl', 'json', 'mbstring'] as $extension) $check("Estensione $extension", extension_loaded($extension));
$check('post_max_size di almeno 20 MB', $bytes(ini_get('post_max_size')) >= 20 << 20, ini_get('post_max_size'));
$check('memory_limit di almeno 128 MB', ini_get('memory_limit') === '-1' || $bytes(ini_get('memory_limit')) >= 128 << 20, ini_get('memory_limit'));
$check('Funzione mail() disponibile', function_exists('mail') && !in_array('mail', array_map('trim', explode(',', ini_get('disable_functions')))));

$dir = __DIR__ . '/data/orders';
$writable = (is_dir($dir) || @mkdir($dir, 0750, true)) && @file_put_contents("$dir/.check", 'ok') !== false;
if ($writable) @unlink("$dir/.check");
$check('Cartella ordini scrivibile', $writable, 'api/data/orders');

$error = $port('api.stripe.com', 443);
$check('Connessione a Stripe (api.stripe.com:443)', $error === '', $error);
foreach ([465, 587] as $smtpPort) {
    $error = $port('smtp.gmail.com', $smtpPort);
    $check("Connessione a Gmail (smtp.gmail.com:$smtpPort)", $error === '', $error);
}
$check('config.php presente', is_file(__DIR__ . '/config.php'));

echo "Controllo hosting per gli ordini My Cookie Delight\n\n" . implode("\n", $results)
    . "\n\nRicorda di eliminare check.php dopo il controllo.\n";
