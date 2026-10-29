# API ordini (Stripe + email) in PHP

Gira sull'hosting Aruba Linux insieme al sito, in `www.mycookiedelight.it/api/`.
Non richiede Composer né librerie: usa solo cURL, OpenSSL e mbstring di PHP 8.1+.

1. `POST /api/checkout-session.php`: riceve l'ordine dal checkout, ricalcola i prezzi dal listino
   (15 EUR per 10 biscotti, 5 EUR per ogni biscotto in più, 6 EUR di spedizione), salva l'ordine
   con le immagini in `api/data/orders/` e restituisce l'indirizzo di Stripe Checkout.
   Stripe raccoglie email e telefono e, per le spedizioni, l'indirizzo (solo Italia).
2. `POST /api/stripe-webhook.php`: Stripe lo chiama dopo il pagamento. Verificata la firma, invia:
   - a **mycookiedelight@gmail.com** cliente, consegna, data, note e per ogni biscotto forma,
     quantità, impasto, copertura, colori, righe di testo, carattere, dimensione e posizione,
     con anteprima, foto ritagliata e foto originale allegate (rispondendo si scrive al cliente);
   - al cliente una conferma con numero d'ordine, riepilogo, anteprime e totale
     (rispondendo scrive a mycookiedelight@gmail.com).

Ogni email parte una sola volta anche se Stripe ripete il webhook. Se un invio fallisce, l'API
risponde 500 e Stripe riprova più tardi, reinviando solo l'email mancante. Se l'ordine salvato
non esiste più, il negozio riceve comunque un'email con i dati di pagamento.

Le regole `.htaccess` impediscono l'accesso a `config.php`, `lib/`, `data/` e `tests/`.

## Configurazione

Copiare `config.example.php` in `config.php` (escluso dal repository) e compilare:

- `stripe_secret_key`: `sk_test_...` per le prove, `sk_live_...` in produzione.
- `stripe_webhook_secret`: il segreto `whsec_...` dell'endpoint webhook.
- `mail.pass`: la **password per le app** di Google dell'account mycookiedelight@gmail.com
  (myaccount.google.com/apppasswords, richiede la verifica in due passaggi), non la password normale.
- Se Aruba blocca le connessioni verso Gmail, impostare `mail.transport` a `'mail'` e `mail.from`
  su una casella del dominio (es. `ordini@mycookiedelight.it`): l'invio passa dal server di Aruba.

## Pubblicazione su Aruba

1. Con `api/config.php` compilato, eseguire `scripts/package-aruba.ps1`: lo ZIP contiene il sito e
   la cartella `api/` (con `config.php`, senza test né ordini). Caricarlo come descritto in
   `deployment/aruba/LEGGIMI.md`. Lo ZIP contiene le chiavi: non condividerlo.
2. Aprire `https://www.mycookiedelight.it/api/check.php`: ogni riga deve essere `[OK]`
   (PHP, estensioni, limiti, cartella ordini, connessioni a Stripe e Gmail). Poi **eliminare
   `check.php`** dal File Manager.
3. Nella Dashboard Stripe (Sviluppatori → Webhook) aggiungere l'endpoint
   `https://www.mycookiedelight.it/api/stripe-webhook.php` con gli eventi
   `checkout.session.completed` e `checkout.session.async_payment_succeeded`,
   e copiare il suo `whsec_...` in `config.php`.
4. Fare un pagamento di prova con le chiavi di test e la carta `4242 4242 4242 4242`.
5. Per incassare davvero, sostituire chiave e segreto webhook con quelli live
   (il webhook live va creato a parte in modalità live) e confermare il listino con la cliente.

Se `check.php` segnala `post_max_size` sotto i 20 MB, ordini con foto molto grandi possono
essere rifiutati: chiedere ad Aruba di alzare il limite o ridurre le foto prima del caricamento.

## Prove in locale

```powershell
php api/tests/run.php
php -S 127.0.0.1:8787 -t .
stripe listen --forward-to http://127.0.0.1:8787/api/stripe-webhook.php
```

Il primo comando esegue i test senza servizi esterni. Per un pagamento di prova completo, usare il
`whsec_...` stampato da `stripe listen` in `config.php` e impostare in `src/app/environment.ts`
`stripe.demo: false` e `stripe.checkoutEndpoint: 'http://127.0.0.1:8787/api/checkout-session.php'`
(senza includere questa modifica nei commit). Su Windows senza `php.ini` vanno abilitate le
estensioni `curl`, `openssl` e `mbstring` e indicato un certificato CA (`curl.cainfo`).
