<?php
// Copiare in config.php (escluso dal repository) e compilare. Non pubblicare mai questo file con chiavi reali.
return [
    // Chiave segreta Stripe: sk_test_... per le prove, sk_live_... in produzione.
    'stripe_secret_key' => 'sk_test_xxx',
    // Segreto dell'endpoint webhook (Dashboard Stripe > Sviluppatori > Webhook, oppure `stripe listen`).
    'stripe_webhook_secret' => 'whsec_xxx',

    // Origini del sito autorizzate (senza percorso finale).
    'allowed_origins' => ['https://www.mycookiedelight.it', 'https://mycookiedelight.it', 'http://127.0.0.1:4201'],

    // Destinatario delle email d'ordine.
    'order_email_to' => 'mycookiedelight@gmail.com',

    'mail' => [
        // 'smtp' per Gmail (password per le app, non la password dell'account),
        // 'mail' per la funzione mail() di PHP dell'hosting, se Aruba blocca le connessioni SMTP esterne.
        'transport' => 'smtp',
        'host' => 'smtp.gmail.com',
        'port' => 465,
        'secure' => 'ssl',
        'user' => 'mycookiedelight@gmail.com',
        'pass' => 'xxxx xxxx xxxx xxxx',
        'from' => 'My Cookie Delight <mycookiedelight@gmail.com>',
    ],

    // Gli ordini restano qui tra pagamento e webhook; quelli più vecchi di N giorni vengono eliminati.
    // 'orders_dir' => __DIR__ . '/data/orders',
    'order_retention_days' => 30,
];
