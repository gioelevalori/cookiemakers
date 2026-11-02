<?php
require_once __DIR__ . '/order.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/stripe.php';
require_once __DIR__ . '/email.php';
require_once __DIR__ . '/mailer.php';

class HttpError extends Exception
{
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}

/** Loads config.php next to the endpoints; see config.example.php. */
function load_config(): array
{
    $file = dirname(__DIR__) . '/config.php';
    if (!is_file($file)) throw new RuntimeException('config.php mancante: copiare config.example.php e compilarlo.');
    $config = require $file;
    $config['allowed_origins'] = array_map(fn ($origin) => rtrim(strtolower($origin), '/'), $config['allowed_origins']);
    $config['orders_dir'] ??= dirname(__DIR__) . '/data/orders';
    return $config;
}

/** Short summary shown in the Stripe dashboard, e.g. "Ordine 1DED47C3 · Cerchio ×12 · Ritiro 20/12/2026". */
function payment_description(string $orderId, array $order): string
{
    $items = implode(', ', array_map(fn ($item) => SHAPES[$item['shape']] . " ×{$item['quantity']}", $order['items']));
    $delivery = $order['deliveryMethod'] === 'pickup' ? 'Ritiro' : 'Spedizione';
    if ($order['requestedDate']) $delivery .= ' ' . date('d/m/Y', strtotime($order['requestedDate']));
    return mb_substr('Ordine ' . strtoupper(substr($orderId, 0, 8)) . " · $items · $delivery", 0, 1000);
}

/**
 * Stores the order, creates the Stripe customer and the PaymentIntent with the
 * server-side total, and returns the client secret the Payment Element confirms.
 */
function create_payment(string $body, OrderStore $store, $stripe): array
{
    $raw = json_decode($body, true);
    if (!is_array($raw)) throw new HttpError(400, 'Ordine non valido.');
    try {
        $order = normalize_order($raw);
        $order += normalize_customer($raw, $order['deliveryMethod']);
    } catch (OrderError $error) {
        throw new HttpError(400, $error->getMessage());
    }

    $orderId = uuid4();
    $store->save($orderId, $order + ['createdAt' => gmdate('c')]);
    $customer = $order['customer'];
    $shipping = $order['shipping'] ? $order['shipping'] + ['phone' => $customer['phone']] : null;
    // Contact details also live in the metadata, so they survive even if the stored order is lost.
    $metadata = ['orderId' => $orderId, 'nome' => $customer['name'], 'email' => $customer['email'], 'telefono' => $customer['phone'],
        'consegna' => $order['deliveryMethod'] === 'pickup' ? 'Ritiro in sede' : 'Spedizione', 'data_desiderata' => $order['requestedDate'],
        'note' => mb_substr($order['notes'], 0, 500)];

    $stripeCustomer = $stripe->createCustomer(array_filter([
        'name' => $customer['name'], 'email' => $customer['email'], 'phone' => $customer['phone'],
        'shipping' => $shipping, 'preferred_locales' => ['it'], 'metadata' => ['orderId' => $orderId],
    ]));
    $intent = $stripe->createPaymentIntent(array_filter([
        'amount' => order_totals($order)['total'],
        'currency' => 'eur',
        'customer' => $stripeCustomer['id'],
        'automatic_payment_methods' => ['enabled' => 'true'],
        'description' => payment_description($orderId, $order),
        'shipping' => $shipping,
        'metadata' => array_filter($metadata, 'strlen'),
    ]));
    if (empty($intent['client_secret'])) throw new RuntimeException('Pagamento Stripe senza client secret.');
    return ['clientSecret' => $intent['client_secret'], 'orderId' => strtoupper(substr($orderId, 0, 8))];
}

/** Verifies the Stripe webhook and, for a succeeded payment, emails the shop and the customer. */
function handle_webhook(string $body, string $signature, array $config, OrderStore $store, $mailer): void
{
    try {
        $event = verify_stripe_event($body, $signature, $config['stripe_webhook_secret']);
    } catch (SignatureError $error) {
        throw new HttpError(400, $error->getMessage());
    }
    $payment = $event['data']['object'] ?? [];
    if (($event['type'] ?? '') !== 'payment_intent.succeeded' || ($payment['status'] ?? '') !== 'succeeded') return;

    $orderId = $payment['metadata']['orderId'] ?? '';
    $shop = $config['order_email_to'];
    if (!preg_match('/^[0-9a-f-]{36}$/', $orderId) || !($store->load($orderId))) {
        error_log("Ordine $orderId non trovato per il pagamento {$payment['id']}: invio i soli dati Stripe.");
        $mailer->send(['to' => $shop] + build_order_email(null, $payment, $orderId));
        return;
    }

    // Each email is recorded once sent, so a retry after a failure only sends what is missing.
    $store->withLock($orderId, function () use ($store, $orderId, $payment, $mailer, $shop) {
        $order = $store->load($orderId);
        if (empty($order['emailedAt'])) {
            $mailer->send(['to' => $shop] + build_order_email($order, $payment, $orderId));
            $order += ['emailedAt' => gmdate('c'), 'stripePaymentId' => $payment['id']];
            $store->save($orderId, $order);
        }
        $customer = $order['customer']['email'] ?? '';
        if ($customer && empty($order['customerEmailedAt'])) {
            $mailer->send(['to' => $customer, 'replyTo' => $shop] + build_customer_email($order, $payment, $orderId));
            $store->save($orderId, $order + ['customerEmailedAt' => gmdate('c')]);
        }
    });
}

function uuid4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
    $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function send_json(int $status, array $body, array $headers = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    foreach ($headers as $name => $value) header("$name: $value");
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
