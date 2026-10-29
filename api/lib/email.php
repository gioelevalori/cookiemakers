<?php
require_once __DIR__ . '/order.php';

// Mirrors COOKIE_BUSINESS in src/app/cookie-product.ts.
const SHOP_PICKUP = 'Nonna Delizia, Via Roma, 78, 65012 Cepagatti (PE)';
const SHOP_WHATSAPP = '+39 349 168 7845';
const SHOP_WHATSAPP_URL = 'https://wa.me/393491687845';

function euro(int $cents): string
{
    return number_format($cents / 100, 2, ',', '.') . ' €';
}

function esc($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function image_extension(string $dataUrl): string
{
    return str_replace('jpeg', 'jpg', substr($dataUrl, 11, strpos($dataUrl, ';') - 11));
}

function format_address(?array $address): string
{
    if (!$address) return '';
    $city = implode(' ', array_filter([$address['postal_code'] ?? '', $address['city'] ?? '', $address['state'] ?? '']));
    return implode(', ', array_filter([$address['line1'] ?? '', $address['line2'] ?? '', $city, $address['country'] ?? '']));
}

/** Customer and payment data that Stripe collected on the checkout page. */
function payment_details(array $session): array
{
    $shipping = $session['collected_information']['shipping_details'] ?? null;
    $intent = $session['payment_intent'] ?? '';
    return [
        'sessionId' => $session['id'] ?? '',
        'paymentIntent' => is_array($intent) ? ($intent['id'] ?? '') : (string) $intent,
        'amount' => (int) ($session['amount_total'] ?? 0),
        'email' => $session['customer_details']['email'] ?? '',
        'phone' => $session['customer_details']['phone'] ?? '',
        'name' => $session['customer_details']['name'] ?? '',
        'shippingName' => $shipping['name'] ?? '',
        'shippingAddress' => format_address($shipping['address'] ?? null),
    ];
}

function rows_filled(array $rows): array
{
    return array_values(array_filter($rows, fn ($row) => $row[1] !== '' && $row[1] !== null));
}

function html_table(array $rows): string
{
    $html = '<table style="font-family:sans-serif;border-collapse:collapse">';
    foreach ($rows as [$label, $value]) {
        $html .= '<tr><th style="text-align:left;padding:4px 12px 4px 0;vertical-align:top">' . esc($label)
            . '</th><td style="padding:4px 0">' . esc($value) . '</td></tr>';
    }
    return $html . '</table>';
}

function text_rows(array $rows): array
{
    return array_map(fn ($row) => "$row[0]: $row[1]", $rows);
}

function item_rows(array $item): array
{
    $hasText = (bool) $item['lines'];
    $rows = [
        ['Forma', SHAPES[$item['shape']]],
        ['Quantità', "{$item['quantity']} biscotti"],
        ['Impasto', RECIPES[$item['recipe']]],
        ['Copertura', $item['covering'] ? COVERINGS[$item['covering']] : 'Biscotto naturale'],
        ['Colore sfondo', $item['backgroundColor']],
    ];
    foreach ($item['lines'] as $index => $line) $rows[] = ['Testo riga ' . ($index + 1), $line];
    $photo = $item['originalImageName'] ? " (originale: {$item['originalImageName']})" : '';
    array_push($rows,
        ['Carattere', $hasText ? "{$item['font']} · {$item['fontSize']} px" : ''],
        ['Colore testo', $hasText ? $item['textColor'] : ''],
        ['Posizione testo', $hasText ? "X {$item['textPosition']['x']} px, Y {$item['textPosition']['y']} px" : ''],
        ['Foto', $item['image'] ? "Stampa su cialda di zucchero$photo" : 'Nessuna foto'],
        ['Subtotale', euro(item_price_cents($item['quantity']))]
    );
    return rows_filled($rows);
}

/**
 * Builds the email for the shop owner after a paid Stripe Checkout session.
 * $order is null when the stored order is no longer available: the email then
 * contains only what Stripe knows, so the payment is never silently lost.
 */
function build_order_email(?array $order, array $session, string $orderId): array
{
    $payment = payment_details($session);
    $attachments = [];
    $customer = ($order['customerName'] ?? '') ?: ($payment['name'] ?: ($payment['email'] ?: 'cliente'));
    $html = ['<h1 style="font-family:sans-serif">Nuovo ordine pagato: ' . esc(euro($payment['amount'])) . '</h1>'];
    $text = ['Nuovo ordine pagato: ' . euro($payment['amount']), ''];

    $customerRows = rows_filled([
        ['Nome indicato', $order['customerName'] ?? ''],
        ['Nome su Stripe', $payment['name']],
        ['Email', $payment['email']],
        ['Telefono', $payment['phone']],
        ['Consegna', $order ? ($order['deliveryMethod'] === 'pickup' ? 'Ritiro in sede' : 'Spedizione') : ''],
        ['Indirizzo di spedizione (Stripe)', implode(' – ', array_filter([$payment['shippingName'], $payment['shippingAddress']]))],
        ['Indirizzo indicato nel sito', $order['address'] ?? ''],
        ['Data desiderata', ($order['requestedDate'] ?? '') ? "{$order['requestedDate']} (da confermare)" : ''],
        ['Note', $order['notes'] ?? ''],
    ]);
    array_push($html, '<h2 style="font-family:sans-serif">Cliente</h2>', html_table($customerRows));
    $text = [...$text, 'CLIENTE', ...text_rows($customerRows), ''];

    if ($order) {
        foreach ($order['items'] as $index => $item) {
            $n = $index + 1;
            $title = "Biscotto $n: " . SHAPES[$item['shape']] . " – {$item['quantity']} pezzi";
            $images = array_filter([
                ['Anteprima finale', $item['preview'], "biscotto-$n-anteprima"],
                ['Foto ritagliata', $item['image'], "biscotto-$n-ritaglio"],
                ['Foto originale', $item['originalImage'], "biscotto-$n-originale"],
            ], fn ($image) => $image[1] !== '');
            $figures = '';
            foreach ($images as [$label, $dataUrl, $name]) {
                $attachments[] = ['filename' => "$name." . image_extension($dataUrl), 'dataUrl' => $dataUrl, 'cid' => "$name@mycookiedelight"];
                $figures .= '<figure style="display:inline-block;margin:8px;font-family:sans-serif"><img src="cid:' . $name
                    . '@mycookiedelight" alt="' . $label . '" style="max-width:280px;max-height:280px"><figcaption>' . $label . '</figcaption></figure>';
            }
            array_push($html, '<h2 style="font-family:sans-serif">' . esc($title) . '</h2>', html_table(item_rows($item)), $figures);
            $text = [...$text, mb_strtoupper($title), ...text_rows(item_rows($item)), ''];
        }
        $totals = order_totals($order);
        $totalRows = [['Biscotti', euro($totals['items'])], ['Spedizione', euro($totals['shipping'])], ['Totale pagato', euro($payment['amount'])]];
        array_push($html, '<h2 style="font-family:sans-serif">Totale</h2>', html_table($totalRows));
        $text = [...$text, 'TOTALE', ...text_rows($totalRows), ''];
    } else {
        $warning = "Il dettaglio dei biscotti non è più disponibile sul server: verifica l'ordine nella dashboard Stripe e contatta il cliente.";
        $html[] = '<p style="font-family:sans-serif;color:#b00020"><strong>' . esc($warning) . '</strong></p>';
        array_push($text, $warning, '');
    }

    $references = rows_filled([['Ordine', $orderId ?: '—'], ['Sessione Stripe', $payment['sessionId']], ['Pagamento Stripe', $payment['paymentIntent']]]);
    $html[] = '<p style="font-family:sans-serif;color:#666;font-size:12px">'
        . implode('<br>', array_map(fn ($row) => esc("$row[0]: $row[1]"), $references)) . '</p>';
    $text = [...$text, ...text_rows($references)];

    return [
        'subject' => "Nuovo ordine pagato – $customer – " . euro($payment['amount']),
        'html' => implode("\n", $html),
        'text' => implode("\n", $text),
        'attachments' => $attachments,
        'replyTo' => $payment['email'],
    ];
}

/** Confirmation for the customer, sent to the email they entered on Stripe Checkout. */
function build_customer_email(array $order, array $session, string $orderId): array
{
    $payment = payment_details($session);
    $attachments = [];
    $reference = strtoupper(substr($orderId, 0, 8));
    $name = $order['customerName'] ?: $payment['name'];
    $intro = [
        ($name ? "Ciao $name," : 'Ciao,') . ' grazie per il tuo ordine!',
        'Abbiamo ricevuto il pagamento di ' . euro($payment['amount']) . '. Ti contatteremo per confermare i dettagli e la data di consegna.',
    ];
    $delivery = $order['deliveryMethod'] === 'pickup'
        ? ['Ritiro in sede', SHOP_PICKUP]
        : ['Spedizione', implode(' – ', array_filter([$payment['shippingName'], $payment['shippingAddress']])) ?: $order['address']];
    $orderRows = rows_filled([
        ['Numero ordine', $reference],
        $delivery,
        ['Data desiderata', $order['requestedDate'] ? "{$order['requestedDate']} (da confermare)" : ''],
        ['Note', $order['notes']],
    ]);

    $html = ['<h1 style="font-family:sans-serif">Grazie per il tuo ordine!</h1>'];
    foreach ($intro as $line) $html[] = '<p style="font-family:sans-serif">' . esc($line) . '</p>';
    $html[] = html_table($orderRows);
    $text = [...$intro, '', ...text_rows($orderRows), ''];

    foreach ($order['items'] as $index => $item) {
        $n = $index + 1;
        $title = "Biscotto $n: " . SHAPES[$item['shape']];
        $rows = rows_filled([
            ['Quantità', "{$item['quantity']} biscotti"],
            ['Impasto', RECIPES[$item['recipe']]],
            ['Copertura', $item['covering'] ? COVERINGS[$item['covering']] : 'Biscotto naturale'],
            ['Testo', implode(' / ', $item['lines'])],
            ['Foto', $item['image'] ? 'Stampata su cialda di zucchero' : ''],
            ['Subtotale', euro(item_price_cents($item['quantity']))],
        ]);
        array_push($html, '<h2 style="font-family:sans-serif">' . esc($title) . '</h2>', html_table($rows));
        if ($item['preview']) {
            $cid = "biscotto-$n@mycookiedelight";
            $attachments[] = ['filename' => "biscotto-$n." . image_extension($item['preview']), 'dataUrl' => $item['preview'], 'cid' => $cid];
            $html[] = "<img src=\"cid:$cid\" alt=\"Anteprima del biscotto $n\" style=\"max-width:240px;max-height:240px;margin:8px 0\">";
        }
        $text = [...$text, mb_strtoupper($title), ...text_rows($rows), ''];
    }

    $totals = order_totals($order);
    $totalRows = [
        ['Biscotti', euro($totals['items'])],
        [$order['deliveryMethod'] === 'pickup' ? 'Ritiro in sede' : 'Spedizione', euro($totals['shipping'])],
        ['Totale pagato', euro($payment['amount'])],
    ];
    $contact = 'Per qualsiasi domanda rispondi a questa email o scrivici su WhatsApp al ' . SHOP_WHATSAPP . '.';
    array_push($html, '<h2 style="font-family:sans-serif">Totale</h2>', html_table($totalRows),
        '<p style="font-family:sans-serif">Per qualsiasi domanda rispondi a questa email o scrivici su WhatsApp al <a href="'
            . SHOP_WHATSAPP_URL . '">' . SHOP_WHATSAPP . '</a>.</p>',
        '<p style="font-family:sans-serif">A presto,<br>My Cookie Delight</p>');
    $text = [...$text, 'TOTALE', ...text_rows($totalRows), '', $contact, '', 'A presto,', 'My Cookie Delight'];

    return [
        'subject' => "Conferma ordine My Cookie Delight n. $reference",
        'html' => implode("\n", $html),
        'text' => implode("\n", $text),
        'attachments' => $attachments,
    ];
}
