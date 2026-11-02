<?php
// Runs the API tests without external tools: php api/tests/run.php
require dirname(__DIR__) . '/lib/app.php';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
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
function throws(callable $body, string $class, string $text = ''): void
{
    try { $body(); } catch (Throwable $error) {
        check($error instanceof $class, get_class($error) . ': ' . $error->getMessage());
        check($text === '' || str_contains($error->getMessage(), $text), $error->getMessage());
        return;
    }
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
        'items' => [item()], 'deliveryMethod' => 'shipping', 'notes' => 'Senza fretta', 'requestedDate' => '2026-12-20',
        'customer' => ['name' => 'Mario Rossi', 'email' => 'mario@example.com', 'phone' => '+39 333 0000000'],
        'shipping' => ['name' => 'Mario Rossi', 'address' => ['line1' => 'Via Roma 1', 'line2' => '', 'postal_code' => '65012', 'city' => 'Cepagatti', 'state' => 'PE', 'country' => 'IT']],
    ];
}

class FakeStripe
{
    public array $customers = [];
    public array $intents = [];
    public function createCustomer(array $params): array { $this->customers[] = $params; return ['id' => 'cus_test_1']; }
    public function createPaymentIntent(array $params): array { $this->intents[] = $params; return ['id' => 'pi_test_1', 'client_secret' => 'pi_test_1_secret_x']; }
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

function paid_intent(string $orderId, array $overrides = []): array
{
    return $overrides + ['id' => 'pi_test_1', 'object' => 'payment_intent', 'status' => 'succeeded', 'amount' => 3100, 'amount_received' => 3100,
        'metadata' => ['orderId' => $orderId, 'nome' => 'Mario Rossi', 'email' => 'mario@example.com', 'telefono' => '+39 333 0000000']];
}
function signed(array $payment, string $type = 'payment_intent.succeeded'): array
{
    $payload = json_encode(['id' => 'evt_1', 'type' => $type, 'data' => ['object' => $payment]]);
    $time = time();
    return [$payload, "t=$time,v1=" . hash_hmac('sha256', "$time.$payload", SECRET)];
}

$dir = sys_get_temp_dir() . '/cookie-orders-' . bin2hex(random_bytes(4));
$config = ['stripe_webhook_secret' => SECRET, 'order_email_to' => 'mycookiedelight@gmail.com', 'mail' => ['from' => 'shop@example.com']];
$store = new OrderStore($dir);
$pay = function (array $order) use ($store): FakeStripe {
    $stripe = new FakeStripe();
    $result = create_payment(json_encode($order), $store, $stripe);
    check($result['clientSecret'] === 'pi_test_1_secret_x');
    return $stripe;
};
$orderIdOf = fn (FakeStripe $stripe) => $stripe->intents[0]['metadata']['orderId'];

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

test('requires name, a valid email and phone, and an Italian address for shipping', function () use ($pay) {
    throws(fn () => $pay(order(['customer' => ['name' => '', 'email' => 'a@b.it', 'phone' => '3330000000']])), HttpError::class, 'nome');
    throws(fn () => $pay(order(['customer' => ['name' => 'A', 'email' => 'non-valida', 'phone' => '3330000000']])), HttpError::class, 'email');
    throws(fn () => $pay(order(['customer' => ['name' => 'A', 'email' => 'a@b.it', 'phone' => 'x']])), HttpError::class, 'telefono');
    throws(fn () => $pay(order(['shipping' => ['address' => ['line1' => 'Rue 1', 'postal_code' => '75001', 'city' => 'Paris', 'country' => 'FR']]])), HttpError::class, 'Italia');
    throws(fn () => $pay(order(['shipping' => ['address' => ['line1' => '', 'postal_code' => '65012', 'city' => 'Cepagatti', 'country' => 'IT']]])), HttpError::class, 'indirizzo');
});

test('creates the Stripe customer and charges the server-side total', function () use ($pay) {
    $stripe = $pay(order());
    [$customer] = $stripe->customers;
    [$intent] = $stripe->intents;
    check($customer['email'] === 'mario@example.com' && $customer['name'] === 'Mario Rossi' && $customer['shipping']['address']['city'] === 'Cepagatti');
    check($intent['amount'] === 3100 && $intent['currency'] === 'eur' && $intent['customer'] === 'cus_test_1', json_encode($intent));
    check($intent['automatic_payment_methods'] === ['enabled' => 'true']);
    check(!isset($intent['shipping']), 'shipping must be left to the Address Element on confirmation');
    check($customer['shipping']['phone'] === '+39 333 0000000');
    check(preg_match('/^Ordine [0-9A-F]{8} · Cerchio ×12 · Spedizione 20\/12\/2026$/u', $intent['description']) === 1, $intent['description']);
    check($intent['metadata']['data_desiderata'] === '2026-12-20' && $intent['metadata']['note'] === 'Senza fretta');
});

test('ignores client prices and charges pickup orders without shipping', function () use ($pay) {
    $stripe = $pay(order(['deliveryMethod' => 'pickup', 'amount' => 1, 'shipping' => null]));
    check($stripe->intents[0]['amount'] === 2500 && !isset($stripe->customers[0]['shipping']));
    check(str_contains($stripe->intents[0]['description'], 'Ritiro'));
});

test('encodes nested Stripe parameters in the expected form format', function () use ($pay) {
    $query = urldecode(http_build_query($pay(order())->intents[0]));
    check(str_contains($query, 'automatic_payment_methods[enabled]=true'), $query);
    check(str_contains($query, 'metadata[consegna]=Spedizione'));
});

test('refuses webhooks without a valid Stripe signature', function () use ($config, $store) {
    [$payload] = signed(paid_intent(uuid4()));
    throws(fn () => handle_webhook($payload, 't=' . time() . ',v1=bad', $config, $store, new FakeMailer()), HttpError::class);
    $old = time() - 3600;
    throws(fn () => handle_webhook($payload, "t=$old,v1=" . hash_hmac('sha256', "$old.$payload", SECRET), $config, $store, new FakeMailer()), HttpError::class);
});

test('emails the shop and the customer once with all cookie details', function () use ($pay, $orderIdOf, $config, $store) {
    $orderId = $orderIdOf($pay(order()));
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_intent($orderId)), $config, $store, $mailer]);
    check(array_column($mailer->sent, 'to') === ['mycookiedelight@gmail.com', 'mario@example.com']);
    [$shop, $customer] = $mailer->sent;
    check($shop['replyTo'] === 'mario@example.com' && str_contains($shop['subject'], 'Mario Rossi'));
    foreach (['Cerchio', '12 biscotti', 'Senza lattosio', 'Pasta di zucchero', '#FFD43B', 'Auguri', 'Giulia', 'CocoGothic · 28 px',
        'X 4 px, Y -10 px', 'foto.jpg', '+39 333 0000000', 'Via Roma 1, 65012 Cepagatti PE, IT', '2026-12-20', 'Senza fretta', '31,00 €', 'pi_test_1'] as $detail) {
        check(str_contains($shop['text'], $detail), "shop email missing $detail");
    }
    check(array_column($shop['attachments'], 'filename') === ['biscotto-1-anteprima.png', 'biscotto-1-ritaglio.jpg', 'biscotto-1-originale.jpg']);
    check($customer['replyTo'] === 'mycookiedelight@gmail.com');
    check(preg_match('/^Conferma ordine My Cookie Delight n\. [0-9A-F]{8}$/', $customer['subject']) === 1, $customer['subject']);
    foreach (['Ciao Mario Rossi', 'I TUOI DATI', 'Email: mario@example.com', 'Telefono: +39 333 0000000', 'CERCHIO', 'Auguri / Giulia', 'Via Roma 1, 65012 Cepagatti PE, IT'] as $detail) {
        check(str_contains($customer['text'], $detail), "customer email missing $detail");
    }
    check(!str_contains($customer['text'], 'foto.jpg'));
    check(array_column($customer['attachments'], 'filename') === ['biscotto-1.png']);

    handle_webhook(...[...signed(paid_intent($orderId)), $config, $store, $mailer]);
    check(count($mailer->sent) === 2, 'repeated webhooks must not send the emails again');
});

test('ignores other events and payments that did not succeed', function () use ($pay, $orderIdOf, $config, $store) {
    $orderId = $orderIdOf($pay(order()));
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_intent($orderId, ['status' => 'processing'])), $config, $store, $mailer]);
    handle_webhook(...[...signed(paid_intent($orderId), 'payment_intent.created'), $config, $store, $mailer]);
    check(!$mailer->sent);
});

test('retries only the email that failed', function () use ($pay, $orderIdOf, $config, $store) {
    $event = signed(paid_intent($orderIdOf($pay(order()))));
    $mailer = new FakeMailer();
    $mailer->fail = 'mario@example.com';
    throws(fn () => handle_webhook(...[...$event, $config, $store, $mailer]), MailError::class);
    $mailer->fail = false;
    handle_webhook(...[...$event, $config, $store, $mailer]);
    check(array_column($mailer->sent, 'to') === ['mycookiedelight@gmail.com', 'mario@example.com']);
});

test('still emails the payment and contact data when the stored order is missing', function () use ($config, $store) {
    $mailer = new FakeMailer();
    handle_webhook(...[...signed(paid_intent('00000000-0000-4000-8000-000000000000')), $config, $store, $mailer]);
    check(count($mailer->sent) === 1 && str_contains($mailer->sent[0]['text'], 'non è più disponibile'));
    check(str_contains($mailer->sent[0]['text'], 'mario@example.com') && str_contains($mailer->sent[0]['text'], '+39 333 0000000'));
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
