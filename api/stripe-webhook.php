<?php
// POST /api/stripe-webhook.php: Stripe calls it after payment; a 500 makes Stripe retry later.
require __DIR__ . '/lib/app.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new HttpError(405, 'Metodo non consentito.');
    $config = load_config();
    handle_webhook(
        file_get_contents('php://input'),
        $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '',
        $config,
        new OrderStore($config['orders_dir']),
        new Mailer($config['mail'])
    );
    send_json(200, ['received' => true]);
} catch (HttpError $error) {
    send_json($error->status, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('stripe-webhook: ' . $error->getMessage());
    send_json(500, ['error' => 'Errore del server.']);
}
