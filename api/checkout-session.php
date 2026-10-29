<?php
// POST /api/checkout-session.php: stores the order and returns the Stripe Checkout URL.
require __DIR__ . '/lib/app.php';

$cors = [];
try {
    $config = load_config();
    $origin = rtrim(strtolower($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($origin && in_array($origin, $config['allowed_origins'], true)) {
        $cors = ['Access-Control-Allow-Origin' => $_SERVER['HTTP_ORIGIN'], 'Vary' => 'Origin'];
    }
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        foreach ($cors + ['Access-Control-Allow-Methods' => 'POST', 'Access-Control-Allow-Headers' => 'Content-Type', 'Access-Control-Max-Age' => '86400'] as $name => $value) {
            header("$name: $value");
        }
        http_response_code(204);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new HttpError(405, 'Metodo non consentito.');
    if ($origin && !$cors) throw new HttpError(403, 'Origine non autorizzata.');

    $body = file_get_contents('php://input');
    if ($body === '' && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new HttpError(413, 'Ordine troppo grande: riduci le dimensioni delle foto.');
    }
    $store = new OrderStore($config['orders_dir']);
    $url = create_checkout_session($body, $config, $store, new StripeClient($config['stripe_secret_key']));
    if (random_int(1, 50) === 1) $store->prune(($config['order_retention_days'] ?? 30) * 86400);
    send_json(200, ['url' => $url], $cors);
} catch (HttpError $error) {
    send_json($error->status, ['error' => $error->getMessage()], $cors);
} catch (Throwable $error) {
    error_log('checkout-session: ' . $error->getMessage());
    send_json(500, ['error' => 'Errore del server.'], $cors);
}
