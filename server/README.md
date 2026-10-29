# Server ordini (Stripe + email)

Piccolo server Node.js, separato dal sito Angular, che:

1. riceve l'ordine dal checkout (`POST /checkout-session`), ricalcola i prezzi dal listino
   (15 EUR per 10 biscotti, 5 EUR per ogni biscotto in più, 6 EUR di spedizione),
   salva l'ordine con le immagini e restituisce l'indirizzo di Stripe Checkout;
2. riceve il webhook di Stripe (`POST /stripe-webhook`) e, solo a pagamento riuscito,
   invia a **mycookiedelight@gmail.com** un'email con cliente, consegna, data desiderata,
   note e, per ogni biscotto, forma, quantità, impasto, copertura, colori, righe di testo,
   carattere, dimensione e posizione, con anteprima, foto ritagliata e foto originale
   allegate. Rispondendo all'email si scrive al cliente.

Stripe raccoglie email e telefono del cliente e, per le spedizioni, l'indirizzo (solo Italia).
Ogni ordine genera una sola email anche se Stripe ripete il webhook. Se l'invio fallisce,
il server risponde 500 e Stripe riprova automaticamente. Se l'ordine salvato non esiste più,
l'email arriva comunque con i dati di pagamento, segnalando di controllare la dashboard Stripe.

`GET /health` risponde `{ "ok": true }` per il monitoraggio dell'hosting.

## Avvio locale

Node 24 o successivo. Questo pacchetto usa npm ed è indipendente dal workspace pnpm del sito.

```powershell
cd server
npm ci
npm test
Copy-Item .env.example .env   # poi inserire le chiavi di test
node --env-file=.env src/index.js
```

Per ricevere i webhook in locale con la [Stripe CLI](https://docs.stripe.com/stripe-cli):

```powershell
stripe listen --forward-to localhost:8787/stripe-webhook
```

Il comando stampa il `whsec_...` da usare come `STRIPE_WEBHOOK_SECRET`.
Nel sito, impostare `stripe.demo: false` e `stripe.checkoutEndpoint: 'http://localhost:8787/checkout-session'`
in `src/app/environment.ts`, poi pagare con la carta di prova `4242 4242 4242 4242`.

## Pubblicazione

L'hosting Linux condiviso di Aruba serve il sito statico ma non esegue un server Node:
il server va pubblicato su un servizio Node (ad esempio Render, Railway, Fly.io o un VPS).

- Directory del servizio: `server`; build `npm ci`; avvio `npm start`.
- Variabili d'ambiente: vedere `.env.example`.
- **Disco persistente**: gli ordini restano su disco tra la creazione del pagamento e il webhook.
  Su hosting con file system temporaneo (es. piani gratuiti che si riavviano) montare un disco
  e impostare `ORDERS_DIR` su quel percorso. Gli ordini più vecchi di `ORDER_RETENTION_DAYS`
  (30 giorni) vengono eliminati.
- Nella Dashboard Stripe aggiungere un endpoint webhook `https://<server>/stripe-webhook`
  con gli eventi `checkout.session.completed` e `checkout.session.async_payment_succeeded`.
- Nel sito, impostare `stripe.checkoutEndpoint: 'https://<server>/checkout-session'` in
  `src/app/environment.aruba.ts` e rigenerare lo ZIP con `scripts/package-aruba.ps1`.

Prima di passare alle chiavi `sk_live_` confermare con la cliente il listino, che il server
applica indipendentemente da quanto mostrato nel browser.
