<?php
// Runs the API tests without external tools: php api/tests/run.php
require dirname(__DIR__) . '/lib/app.php';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
const SITE = 'https://www.mycookiedelight.it';
const SECRET = 'whsec_test';

$failures = 0;
function test(string $name, callable $body): void
{
    global $failures;
    try { $body(); echo "ok  $name\n"; }
    catch (Throwable $error) { $failures++; echo "NO  $name\n    " . $error->getMessage() . "\n"; }
}
function check(bool $condition, string $message = 'assertion failed'): void
{
    if (!$condition) throw new Exception($message);
}
function throws(callable $body, string $class): void
{
    try { $body(); } catch (Throwable $error) { check($error instanceof $class, get_class($error) . ': ' . $error->getMessage()); return; }
    throw new Exception("$class expected");
}

function item(array $overrides = []): array
{
    return $overrides + [
        'shape' => 'cerchio', 'quantity' => 12, 'recipe' => 'lactose-free', 'covering' => 'sugar-paste', 'backgroundColor' => '#FFD43B',
        'lines' => ['Auguri', 'Giulia', ''], 'font' => 'CocoGothic', 'fontSize' => 28, 'textColor' => '#000000', 'textPosition' => ['x' => 4, 'y' => -10],
        'preview' => PNG, 'image' => JPEG, 'originalImage' => JPEG, 'originalImageName' => 'foto.jpg',
    ];
}
function order(array $overrides = []): array
{
    return $overrides + [
        'returnUrl' => SITE . '/checkout', 'items' => [item()], 'deliveryMethod' => 'shipping',
        'customerName' => 'Mario Rossi', 'address' => 'Via Roma 1', 'notes' => 'Senza fretta', 'requestedDate' => '2026-12-20',
    ];
}

class FakeStripe
{
    public array $created = [];
    public function createCheckoutSession(array $params): array { $this->created[] = $params; return ['url' => 'https://checkout.stripe.com/c/pay/cs_test_1']; }
}
class FakeMailer
{
    public array $sent = [];
    public $fail = false;
    public function send(array $message): void
    {
        if ($this->fail === true || $this->fail === $message['to']) throw new MailError('SMTP down');
        $this->sent[] = $message;
    }
}

function paid_session(string $orderId, array $overrides = []): array
{
    return $overrides + [
        'id' => 'cs_test_1', 'object' => 'checkout.session', 'payment_status' => 'paid', 'amount_total' => 3100, 'payment_intent' => 'pi_1',
        'metadata' => ['orderId' => $orderId], 'client_reference_id' => $orderId,
        'customer_details' => ['email' => 'mario@example.com', 'phone' => '+39 333 0000000', 'name' => 'Mario Rossi'],
        'collected_information' => ['shipping_details' => ['name' => 'Mario Rossi', 'address' => ['line1' => 'Via Roma 1', 'postal_code' => '65012', 'city' => 'Cepagatti', 'country' => 'IT']]],
    ];
}
function signed(array $session, string $type = 'checkout.session.completed'): array
{
    $payload = json_encode(['id' => 'evt_1', 'type' => $type, 'data' => ['object' => $session]]);
    $time = time();
    return [$payload, "t=$time,v1=" . hash_hmac('sha256', "$time.$payload", SECRET)];
}

$dir = sys_get_temp_dir() . '/cookie-orders-' . bin2hex(random_bytes(4));
$config = ['allowed_origins' => [SITE], 'stripe_webhook_secret' => SECRET, 'order_email_to' => 'mycookiedelight@gmail.com', 'mail' => ['from' => 'shop@example.com']];
$store = new OrderStore($dir);
$checkout = function (array $order) use ($config, $store): array {
    $stripe = new FakeStripe();
    create_checkout_session(json_encode($order), $config, $store, $stripe);
    return $stripe->created[0];
};

test('prices follow the shop list', function () {
    check(item_price_cents(10) === 1500);
    check(item_price_cents(12) === 2500);
});

test('rejects invalid quantities, shapes and empty carts', function () {
    throws(fn () => normalize_order(order(['items' => [item(['quantity' => 9])]])), OrderError::class);
    throws(fn () => normalize_order(order(['items' => [item(['shape' => 'stella'])]])), OrderError::class);
    throws(fn () => normalize_order(order(['items' => []])), OrderError::class);
});

test('drops images that are not inline PNG, JPEG or WebP data', function () {
    $value = normalize_order(order(['items' => [item(['image' => 'https://example.com/x.png', 'preview' => 'data:text/html;base64,PGgxPg=='])]]));
    check($value['items'][0]['image'] === '' && $value['items'][0]['preview'] === '');
});

test('creates a Stripe session with server-side prices and shipping', function () use ($checkout) {
    $params = $checkout(order());
    check(array_column(array_column($params['line_items'], 'price_data'), 'unit_amount') === [2500, 600]);
    check($params['success_url'] === SITE . '/checkout?pagamento=ok&session_id={CHECKOUT_SESSION_ID}', $params['success_url']);
    check($params['shipping_address_collection'] === ['allowed_countries' => ['IT']]);
    check(preg_match('/^[0-9a-f-]{36}$/', $params['metadata']['orderId']) === 1);
});

test('encodes nested Stripe parameters in the expected form format', function () use ($checkout) {
    $query = urldecode(http_build_query($checkout(order())));
    check(str_contains($query, 'line_items[0][price_data][unit_amount]=2500'), $query);
    check(str_contains($query, 'shipping_address_collection[allowed_countries][0]=IT'));
});

test('pickup orders have no shipping line and no address collection', function () use ($checkout) {
    $params = $checkout(order(['deliveryMethod' => 'pickup']));
    check(count($params['line_items']) === 1 && !isset($params['shipping_address_collection']));
});

test('keeps hash routes in return URLs', function () use ($checkout) {
    $params = $checkout(order(['returnUrl' => SITE . '/cookiemakers/#/checkout?direct=1']));
    check($params['cancel_url'] === SITE . '/cookiemakers/#/checkout?direct=1&pagamento=annullato', $params['cancel_url']);
});

test('refuses return URLs on other sites', function () use ($checkout) {
    throws(fn () => $checkout(order(['returnUrl' => 'https://evil.example/checkout'])), HttpError::class);
});

test('refuses webhooks without a valid Stripe signature', function () use ($config, $store) {
    [$payload] = signed(paid_session(uuid4()));
    throws(fn () => handle_webhook($payload, 't=' . time() . ',v1=bad', $config, $store, new FakeMailer()), HttpError::class);
    $old = time() - 3600;
    throws(fn () => handle_webhook($payload, "t=$old,v1=" . hash_hmac('sha256', "$old.$payload", SECRET), $config, $store, new FakeMailer()), HttpError::class);
});

test('emails the shop and the customer once with all cookie details', function () use ($checkout, $config, $store) {
    $orderId = $checkout(order())['metadata']['orderId'];
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_session($orderId)), $config, $store, $mailer]);
    check(array_column($mailer->sent, 'to') === ['mycookiedelight@gmail.com', 'mario@example.com']);
    [$shop, $customer] = $mailer->sent;
    check($shop['replyTo'] === 'mario@example.com' && str_contains($shop['subject'], 'Mario Rossi'));
    foreach (['Cerchio', '12 biscotti', 'Senza lattosio', 'Pasta di zucchero', '#FFD43B', 'Auguri', 'Giulia', 'CocoGothic · 28 px',
        'X 4 px, Y -10 px', 'foto.jpg', '+39 333 0000000', 'Via Roma 1, 65012 Cepagatti, IT', '2026-12-20', 'Senza fretta', '31,00 €'] as $detail) {
        check(str_contains($shop['text'], $detail), "shop email missing $detail");
    }
    check(array_column($shop['attachments'], 'filename') === ['biscotto-1-anteprima.png', 'biscotto-1-ritaglio.jpg', 'biscotto-1-originale.jpg']);
    check($customer['replyTo'] === 'mycookiedelight@gmail.com');
    check(preg_match('/^Conferma ordine My Cookie Delight n\. [0-9A-F]{8}$/', $customer['subject']) === 1, $customer['subject']);
    foreach (['Ciao Mario Rossi', 'CERCHIO', 'Auguri / Giulia', 'Via Roma 1, 65012 Cepagatti, IT'] as $detail) {
        check(str_contains($customer['text'], $detail), "customer email missing $detail");
    }
    check(!str_contains($customer['text'], 'foto.jpg'));
    check(array_column($customer['attachments'], 'filename') === ['biscotto-1.png']);

    handle_webhook(...[...signed(paid_session($orderId), 'checkout.session.async_payment_succeeded'), $config, $store, $mailer]);
    check(count($mailer->sent) === 2, 'repeated webhooks must not send the emails again');
});

test('does not email unpaid sessions', function () use ($checkout, $config, $store) {
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_session($checkout(order())['metadata']['orderId'], ['payment_status' => 'unpaid'])), $config, $store, $mailer]);
    check(!$mailer->sent);
});

test('retries only the email that failed', function () use ($checkout, $config, $store) {
    $event = signed(paid_session($checkout(order())['metadata']['orderId']));
    $mailer = new FakeMailer();
    $mailer->fail = 'mario@example.com';
    throws(fn () => handle_webhook(...[...$event, $config, $store, $mailer]), MailError::class);
    $mailer->fail = false;
    handle_webhook(...[...$event, $config, $store, $mailer]);
    check(array_column($mailer->sent, 'to') === ['mycookiedelight@gmail.com', 'mario@example.com']);
});

test('still emails Stripe data when the stored order is missing', function () use ($config, $store) {
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_session('00000000-0000-4000-8000-000000000000')), $config, $store, $mailer]);
    check(count($mailer->sent) === 1 && str_contains($mailer->sent[0]['text'], 'non è più disponibile'));
});

test('builds a MIME message with inline images', function () {
    [$headers, $body] = build_mime('My Cookie Delight <shop@example.com>', [
        'to' => 'a@example.com', 'subject' => 'Conferma ordine – prova', 'html' => '<p>Ciao</p>', 'text' => 'Ciao',
        'attachments' => [['filename' => 'b.png', 'dataUrl' => PNG, 'cid' => 'b@x']], 'replyTo' => 'shop@example.com',
    ]);
    $all = implode("\n", $headers);
    check(str_contains($all, 'Subject: =?UTF-8?B?') && str_contains($all, 'Reply-To: shop@example.com'));
    check(str_contains($body, 'Content-ID: <b@x>') && str_contains($body, 'multipart/alternative'));
});

foreach (glob("$dir/*") as $file) unlink($file);
@rmdir($dir);
echo $failures ? "\n$failures test falliti\n" : "\nTutti i test superati\n";
exit($failures ? 1 : 0);
