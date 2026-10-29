<?php
require_once __DIR__ . '/order.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/stripe.php';
require_once __DIR__ . '/email.php';
require_once __DIR__ . '/mailer.php';

const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

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

/** Stores the order and creates the Stripe Checkout session; returns the payment page URL. */
function create_checkout_session(string $body, array $config, OrderStore $store, $stripe): string
{
    $raw = json_decode($body, true);
    if (!is_array($raw)) throw new HttpError(400, 'Ordine non valido.');
    $returnUrl = valid_return_url($raw['returnUrl'] ?? null, $config['allowed_origins']);
    if (!$returnUrl) throw new HttpError(400, 'Indirizzo di ritorno non valido.');
    try {
        $order = normalize_order($raw);
    } catch (OrderError $error) {
        throw new HttpError(400, $error->getMessage());
    }

    $orderId = uuid4();
    $store->save($orderId, $order + ['createdAt' => gmdate('c')]);

    $lineItems = array_map(fn ($item) => [
        'quantity' => 1,
        'price_data' => [
            'currency' => 'eur',
            'unit_amount' => item_price_cents($item['quantity']),
            'product_data' => [
                'name' => 'Biscotti personalizzati ' . SHAPES[$item['shape']] . " × {$item['quantity']}",
                'description' => RECIPES[$item['recipe']] . ' · ' . ($item['covering'] ? COVERINGS[$item['covering']] : 'Biscotto naturale'),
            ],
        ],
    ], $order['items']);
    if ($order['deliveryMethod'] === 'shipping') {
        $lineItems[] = ['quantity' => 1, 'price_data' => ['currency' => 'eur', 'unit_amount' => SHIPPING_CENTS, 'product_data' => ['name' => 'Spedizione']]];
    }

    $params = [
        'mode' => 'payment',
        'locale' => 'it',
        'line_items' => $lineItems,
        'client_reference_id' => $orderId,
        'metadata' => ['orderId' => $orderId],
        'payment_intent_data' => ['description' => 'Ordine My Cookie Delight ' . substr($orderId, 0, 8), 'metadata' => ['orderId' => $orderId]],
        'phone_number_collection' => ['enabled' => 'true'],
        'success_url' => with_query($returnUrl, 'pagamento=ok&session_id={CHECKOUT_SESSION_ID}'),
        'cancel_url' => with_query($returnUrl, 'pagamento=annullato'),
    ];
    if ($order['deliveryMethod'] === 'shipping') $params['shipping_address_collection'] = ['allowed_countries' => ['IT']];

    $session = $stripe->createCheckoutSession($params);
    if (empty($session['url'])) throw new RuntimeException('Sessione Stripe senza indirizzo di pagamento.');
    return $session['url'];
}

/** Verifies the Stripe webhook and, for a paid session, emails the shop and the customer. */
function handle_webhook(string $body, string $signature, array $config, OrderStore $store, $mailer): void
{
    try {
        $event = verify_stripe_event($body, $signature, $config['stripe_webhook_secret']);
    } catch (SignatureError $error) {
        throw new HttpError(400, $error->getMessage());
    }
    $session = $event['data']['object'] ?? [];
    if (!in_array($event['type'] ?? '', PAID_EVENTS, true) || ($session['payment_status'] ?? '') !== 'paid') return;

    $orderId = $session['metadata']['orderId'] ?? ($session['client_reference_id'] ?? '');
    $from = $config['mail']['from'];
    $shop = $config['order_email_to'];
    if (!preg_match('/^[0-9a-f-]{36}$/', $orderId) || !($store->load($orderId))) {
        error_log("Ordine $orderId non trovato per la sessione {$session['id']}: invio i soli dati Stripe.");
        $mailer->send(['to' => $shop] + build_order_email(null, $session, $orderId));
        return;
    }

    // Each email is recorded once sent, so a retry after a failure only sends what is missing.
    $store->withLock($orderId, function () use ($store, $orderId, $session, $mailer, $shop) {
        $order = $store->load($orderId);
        if (empty($order['emailedAt'])) {
            $mailer->send(['to' => $shop] + build_order_email($order, $session, $orderId));
            $order += ['emailedAt' => gmdate('c'), 'stripeSessionId' => $session['id']];
            $store->save($orderId, $order);
        }
        $customer = $session['customer_details']['email'] ?? '';
        if ($customer && empty($order['customerEmailedAt'])) {
            $mailer->send(['to' => $customer, 'replyTo' => $shop] + build_customer_email($order, $session, $orderId));
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
