<?php
// Validates the order sent by the checkout page and computes prices on the server.
// Labels and prices mirror src/app/cookie-product.ts and src/app/cart.service.ts.

const SHAPES = ['rettangolo' => 'Rettangolo', 'cerchio' => 'Cerchio', 'quadrato' => 'Quadrato', 'esagono' => 'Esagono', 'cuore' => 'Cuore'];
const RECIPES = ['classic' => 'Classica', 'lactose-free' => 'Senza lattosio'];
const COVERINGS = ['royal-icing' => 'Ghiaccia reale', 'sugar-paste' => 'Pasta di zucchero'];
const SHIPPING_CENTS = 600;
const MIN_QUANTITY = 10;
const MAX_QUANTITY = 5000;
const MAX_ITEMS = 20;
const MAX_IMAGE_LENGTH = 12000000;

class OrderError extends Exception {}

/** 15 EUR for the first 10 cookies, 5 EUR for each additional cookie. */
function item_price_cents(int $quantity): int
{
    return 1500 + ($quantity - MIN_QUANTITY) * 500;
}

function order_totals(array $order): array
{
    $items = array_sum(array_map(fn ($item) => item_price_cents($item['quantity']), $order['items']));
    $shipping = $order['deliveryMethod'] === 'pickup' ? 0 : SHIPPING_CENTS;
    return ['items' => $items, 'shipping' => $shipping, 'total' => $items + $shipping];
}

function clean_text($value, int $max): string
{
    return is_string($value) ? mb_substr(trim($value), 0, $max) : '';
}

function clean_color($value): string
{
    return is_string($value) && preg_match('/^#[0-9a-f]{3,8}$/i', $value) ? $value : '';
}

function clean_image($value): string
{
    return is_string($value) && strlen($value) <= MAX_IMAGE_LENGTH
        && preg_match('#^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$#', $value) ? $value : '';
}

function clean_number($value): int
{
    return is_int($value) || is_float($value) ? (int) round($value) : 0;
}

function normalize_item($raw, int $index): array
{
    $n = $index + 1;
    if (!is_array($raw)) throw new OrderError("Biscotto $n non valido.");
    if (!is_string($raw['shape'] ?? null) || !isset(SHAPES[$raw['shape']])) throw new OrderError("Forma del biscotto $n non valida.");
    $quantity = $raw['quantity'] ?? null;
    if (!is_int($quantity) || $quantity < MIN_QUANTITY || $quantity > MAX_QUANTITY) throw new OrderError("Quantità del biscotto $n non valida.");

    $lines = is_array($raw['lines'] ?? null) ? array_map(fn ($line) => clean_text($line, 120), array_slice($raw['lines'], 0, 3)) : [];
    if (!$lines && !empty($raw['message'])) $lines[] = clean_text($raw['message'], 360);
    $backgroundColor = clean_color($raw['backgroundColor'] ?? '');
    $recipe = $raw['recipe'] ?? '';
    $covering = $raw['covering'] ?? '';

    return [
        'shape' => $raw['shape'],
        'quantity' => $quantity,
        'recipe' => is_string($recipe) && isset(RECIPES[$recipe]) ? $recipe : 'classic',
        'covering' => $backgroundColor ? (is_string($covering) && isset(COVERINGS[$covering]) ? $covering : 'royal-icing') : null,
        'backgroundColor' => $backgroundColor,
        'lines' => array_values(array_filter($lines, 'strlen')),
        'font' => clean_text($raw['font'] ?? '', 40),
        'fontSize' => clean_number($raw['fontSize'] ?? 0),
        'textColor' => clean_color($raw['textColor'] ?? ''),
        'textPosition' => ['x' => clean_number($raw['textPosition']['x'] ?? 0), 'y' => clean_number($raw['textPosition']['y'] ?? 0)],
        'preview' => clean_image($raw['preview'] ?? ''),
        'image' => clean_image($raw['image'] ?? ''),
        'originalImage' => clean_image($raw['originalImage'] ?? ''),
        'originalImageName' => clean_text($raw['originalImageName'] ?? '', 120),
    ];
}

function normalize_order($raw): array
{
    if (!is_array($raw)) throw new OrderError('Ordine non valido.');
    $items = $raw['items'] ?? null;
    if (!is_array($items) || !$items || count($items) > MAX_ITEMS || !array_is_list($items)) {
        throw new OrderError('Il carrello è vuoto o troppo grande.');
    }
    $date = $raw['requestedDate'] ?? '';
    return [
        'items' => array_map('normalize_item', $items, array_keys($items)),
        'deliveryMethod' => ($raw['deliveryMethod'] ?? '') === 'pickup' ? 'pickup' : 'shipping',
        'customerName' => clean_text($raw['customerName'] ?? '', 120),
        'address' => clean_text($raw['address'] ?? '', 300),
        'notes' => clean_text($raw['notes'] ?? '', 1000),
        'requestedDate' => is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) ? $date : '',
    ];
}

/** Name, email and phone entered once in the site checkout; shipping comes from the Stripe Address Element. */
function normalize_customer($raw, string $deliveryMethod): array
{
    $customer = is_array($raw['customer'] ?? null) ? $raw['customer'] : [];
    $name = clean_text($customer['name'] ?? '', 120);
    $email = clean_text($customer['email'] ?? '', 200);
    $phone = clean_text($customer['phone'] ?? '', 40);
    if ($name === '') throw new OrderError('Inserisci nome e cognome.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new OrderError('Inserisci un indirizzo email valido.');
    if (!preg_match('/^\+?[0-9 ().-]{6,40}$/', $phone)) throw new OrderError('Inserisci un numero di telefono valido.');

    $shipping = null;
    if ($deliveryMethod === 'shipping') {
        $address = is_array($raw['shipping']['address'] ?? null) ? $raw['shipping']['address'] : [];
        $shipping = [
            'name' => clean_text($raw['shipping']['name'] ?? '', 120) ?: $name,
            'address' => [
                'line1' => clean_text($address['line1'] ?? '', 200),
                'line2' => clean_text($address['line2'] ?? '', 200),
                'postal_code' => clean_text($address['postal_code'] ?? '', 20),
                'city' => clean_text($address['city'] ?? '', 100),
                'state' => clean_text($address['state'] ?? '', 100),
                'country' => strtoupper(clean_text($address['country'] ?? '', 2)),
            ],
        ];
        $a = $shipping['address'];
        if ($a['country'] !== 'IT') throw new OrderError('Spediamo solo in Italia.');
        if ($a['line1'] === '' || $a['city'] === '' || !preg_match('/^\d{5}$/', $a['postal_code'])) {
            throw new OrderError('Completa l\'indirizzo di spedizione.');
        }
    }
    return ['customer' => ['name' => $name, 'email' => $email, 'phone' => $phone], 'shipping' => $shipping];
}
