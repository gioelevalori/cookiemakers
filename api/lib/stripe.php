<?php
// Minimal Stripe client over cURL: no Composer is needed on shared hosting.

class StripeClient
{
    public function __construct(private string $secretKey) {}

    public function createCheckoutSession(array $params): array
    {
        return $this->request('POST', '/v1/checkout/sessions', $params);
    }

    private function request(string $method, string $path, array $params): array
    {
        $curl = curl_init('https://api.stripe.com' . $path);
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_POSTFIELDS => http_build_query($params),
            CURLOPT_USERPWD => $this->secretKey . ':',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $body = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        if ($body === false) throw new RuntimeException("Stripe non raggiungibile: $error");
        $data = json_decode($body, true);
        if ($status >= 400 || !is_array($data)) {
            throw new RuntimeException('Errore Stripe: ' . ($data['error']['message'] ?? "HTTP $status"));
        }
        return $data;
    }
}

class SignatureError extends Exception {}

/** Verifies the Stripe-Signature header as described in the Stripe webhook documentation. */
function verify_stripe_event(string $payload, string $header, string $secret, int $tolerance = 300, ?int $now = null): array
{
    $timestamp = null;
    $signatures = [];
    foreach (explode(',', $header) as $part) {
        [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($key === 't') $timestamp = (int) $value;
        if ($key === 'v1') $signatures[] = $value;
    }
    if (!$timestamp || !$signatures) throw new SignatureError('Firma Stripe mancante.');
    if (abs(($now ?? time()) - $timestamp) > $tolerance) throw new SignatureError('Firma Stripe scaduta.');
    $expected = hash_hmac('sha256', "$timestamp.$payload", $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            $event = json_decode($payload, true);
            if (!is_array($event)) throw new SignatureError('Evento Stripe non valido.');
            return $event;
        }
    }
    throw new SignatureError('Firma Stripe non valida.');
}
