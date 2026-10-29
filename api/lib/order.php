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

/** Accepts only return pages on the configured site origins, so Stripe never redirects elsewhere. */
function valid_return_url($value, array $allowedOrigins): ?string
{
    if (!is_string($value)) return null;
    $parts = parse_url($value);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) return null;
    $origin = strtolower($parts['scheme']) . '://' . strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
    return in_array($origin, $allowedOrigins, true) ? $value : null;
}

/** Appends a query string to the checkout page, also when the site uses hash routes (#/checkout). */
function with_query(string $url, string $query): string
{
    return $url . (str_contains($url, '?') ? '&' : '?') . $query;
}
