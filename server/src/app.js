import { randomUUID } from 'node:crypto';
import { buildCustomerEmail, buildOrderEmail } from './email.js';
import { COVERINGS, OrderError, RECIPES, SHAPES, SHIPPING_CENTS, itemPriceCents, normalizeOrder, validReturnUrl, withQuery } from './order.js';

const MAX_ORDER_BYTES = 40 * 1024 * 1024;
const MAX_WEBHOOK_BYTES = 1024 * 1024;
const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Ordine troppo grande: riduci le dimensioni delle foto.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

/**
 * HTTP handler with two endpoints:
 * - POST /checkout-session: stores the order and returns the Stripe Checkout URL.
 * - POST /stripe-webhook: on a paid session, emails the stored order to the shop owner.
 */
export function createApp({ stripe, store, mailer, config, log = console }) {
  // Several webhooks can arrive for one session (retries, async payments): send one email per order.
  const sending = new Map();

  async function createCheckoutSession(req, res, cors) {
    let raw;
    try { raw = JSON.parse((await readBody(req, MAX_ORDER_BYTES)).toString('utf8')); }
    catch (error) { throw error instanceof HttpError ? error : new HttpError(400, 'Ordine non valido.'); }
    const returnUrl = validReturnUrl(raw?.returnUrl, config.allowedOrigins);
    if (!returnUrl) throw new HttpError(400, 'Indirizzo di ritorno non valido.');
    const order = normalizeOrder(raw);

    const orderId = randomUUID();
    await store.save(orderId, { ...order, createdAt: new Date().toISOString() });

    const lineItems = order.items.map(item => ({
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: itemPriceCents(item.quantity),
        product_data: {
          name: `Biscotti personalizzati ${SHAPES[item.shape]} × ${item.quantity}`,
          description: [RECIPES[item.recipe], item.covering ? COVERINGS[item.covering] : 'Biscotto naturale'].join(' · ')
        }
      }
    }));
    if (order.deliveryMethod === 'shipping') {
      lineItems.push({ quantity: 1, price_data: { currency: 'eur', unit_amount: SHIPPING_CENTS, product_data: { name: 'Spedizione' } } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'it',
      line_items: lineItems,
      client_reference_id: orderId,
      metadata: { orderId },
      payment_intent_data: { description: `Ordine My Cookie Delight ${orderId.slice(0, 8)}`, metadata: { orderId } },
      phone_number_collection: { enabled: true },
      ...(order.deliveryMethod === 'shipping' ? { shipping_address_collection: { allowed_countries: ['IT'] } } : {}),
      success_url: withQuery(returnUrl, 'pagamento=ok&session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: withQuery(returnUrl, 'pagamento=annullato')
    });
    send(res, 200, { url: session.url }, cors);
  }

  async function handleWebhook(req, res) {
    const body = await readBody(req, MAX_WEBHOOK_BYTES);
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, req.headers['stripe-signature'], config.webhookSecret);
    } catch {
      throw new HttpError(400, 'Firma Stripe non valida.');
    }
    if (PAID_EVENTS.has(event.type) && event.data.object.payment_status === 'paid') {
      await emailPaidOrder(event.data.object);
    }
    send(res, 200, { received: true });
  }

  async function emailPaidOrder(session) {
    const orderId = session.metadata?.orderId || session.client_reference_id || '';
    const key = orderId || session.id;
    if (!sending.has(key)) {
      sending.set(key, (async () => {
        let order = orderId ? await store.load(orderId) : null;
        if (!order) {
          log.warn(`Ordine ${orderId || '(senza id)'} non trovato per la sessione ${session.id}: invio i soli dati Stripe.`);
          await mailer.sendMail({ from: config.mailFrom, to: config.orderEmailTo, ...buildOrderEmail(null, session, orderId) });
          return;
        }
        // Each email is recorded once sent, so a retry after a failure only sends what is missing.
        if (!order.emailedAt) {
          await mailer.sendMail({ from: config.mailFrom, to: config.orderEmailTo, ...buildOrderEmail(order, session, orderId) });
          order = { ...order, emailedAt: new Date().toISOString(), stripeSessionId: session.id };
          await store.save(orderId, order);
          log.info(`Email ordine ${orderId} inviata a ${config.orderEmailTo}.`);
        }
        const customer = session.customer_details?.email;
        if (customer && !order.customerEmailedAt) {
          await mailer.sendMail({ from: config.mailFrom, to: customer, replyTo: config.orderEmailTo, ...buildCustomerEmail(order, session, orderId) });
          await store.save(orderId, { ...order, customerEmailedAt: new Date().toISOString() });
          log.info(`Conferma ordine ${orderId} inviata al cliente.`);
        }
      })().finally(() => sending.delete(key)));
    }
    // A failure answers 500, so Stripe retries the webhook later.
    await sending.get(key);
  }

  return async function handler(req, res) {
    const origin = req.headers.origin;
    const cors = origin && config.allowedOrigins.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true });
      if (path === '/checkout-session') {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' });
          return res.end();
        }
        if (req.method === 'POST') {
          if (origin && !cors['Access-Control-Allow-Origin']) throw new HttpError(403, 'Origine non autorizzata.');
          return await createCheckoutSession(req, res, cors);
        }
      }
      if (req.method === 'POST' && path === '/stripe-webhook') return await handleWebhook(req, res);
      send(res, 404, { error: 'Non trovato.' });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : error instanceof OrderError ? 400 : 500;
      if (status === 500) log.error(error);
      send(res, status, { error: status === 500 ? 'Errore del server.' : error.message }, cors);
    }
  };
}
