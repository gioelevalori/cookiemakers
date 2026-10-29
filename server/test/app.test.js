import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import Stripe from 'stripe';
import { createApp } from '../src/app.js';
import { createFileStore } from '../src/store.js';
import { itemPriceCents, normalizeOrder, OrderError } from '../src/order.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQ';
const SITE = 'https://www.mycookiedelight.it';
const WEBHOOK_SECRET = 'whsec_test';
const realStripe = new Stripe('sk_test_dummy');

let server, base, dir, created, sent, failMail;

const item = (overrides = {}) => ({
  shape: 'cerchio', quantity: 12, recipe: 'lactose-free', covering: 'sugar-paste', backgroundColor: '#FFD43B',
  lines: ['Auguri', 'Giulia', ''], font: 'CocoGothic', fontSize: 28, textColor: '#000000', textPosition: { x: 4, y: -10 },
  preview: PNG, image: JPEG, originalImage: JPEG, originalImageName: 'foto.jpg', ...overrides
});

const order = (overrides = {}) => ({
  returnUrl: `${SITE}/checkout`, items: [item()], deliveryMethod: 'shipping',
  customerName: 'Mario Rossi', address: 'Via Roma 1', notes: 'Senza fretta', requestedDate: '2026-12-20', ...overrides
});

const post = (path, body, headers = {}) => fetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body)
});

function webhook(session, type = 'checkout.session.completed') {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type, data: { object: session } });
  const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return post('/stripe-webhook', payload, { 'Stripe-Signature': signature, Origin: '' });
}

const paidSession = orderId => ({
  id: 'cs_test_1', object: 'checkout.session', payment_status: 'paid', amount_total: 2100, payment_intent: 'pi_1',
  metadata: { orderId }, client_reference_id: orderId,
  customer_details: { email: 'mario@example.com', phone: '+39 333 0000000', name: 'Mario Rossi' },
  collected_information: { shipping_details: { name: 'Mario Rossi', address: { line1: 'Via Roma 1', postal_code: '65012', city: 'Cepagatti', country: 'IT' } } }
});

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cookie-orders-'));
  const stripe = {
    webhooks: realStripe.webhooks,
    checkout: { sessions: { create: async params => { created.push(params); return { url: 'https://checkout.stripe.com/c/pay/cs_test_1' }; } } }
  };
  const mailer = { sendMail: async message => { if (failMail === true || failMail === message.to) throw new Error('SMTP down'); sent.push(message); } };
  const config = { allowedOrigins: [SITE], webhookSecret: WEBHOOK_SECRET, orderEmailTo: 'mycookiedelight@gmail.com', mailFrom: 'shop@example.com' };
  const log = { info() {}, warn() {}, error() {} };
  server = createServer(createApp({ stripe, store: createFileStore(dir), mailer, config, log }));
  await new Promise(resolve => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await rm(dir, { recursive: true, force: true });
});

beforeEach(() => { created = []; sent = []; failMail = false; });

test('prices follow the shop list: 15 EUR for 10 cookies, 5 EUR each extra', () => {
  assert.equal(itemPriceCents(10), 1500);
  assert.equal(itemPriceCents(12), 2500);
});

test('rejects invalid quantities and shapes', () => {
  assert.throws(() => normalizeOrder(order({ items: [item({ quantity: 9 })] })), OrderError);
  assert.throws(() => normalizeOrder(order({ items: [item({ shape: 'stella' })] })), OrderError);
  assert.throws(() => normalizeOrder(order({ items: [] })), OrderError);
});

test('drops images that are not inline PNG, JPEG or WebP data', () => {
  const value = normalizeOrder(order({ items: [item({ image: 'https://example.com/x.png', preview: 'data:text/html;base64,PGgxPg==' })] }));
  assert.equal(value.items[0].image, '');
  assert.equal(value.items[0].preview, '');
});

test('creates a Stripe session with server-side prices and shipping', async () => {
  const response = await post('/checkout-session', order({ items: [item({ quantity: 12 })] }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.equal(response.headers.get('access-control-allow-origin'), SITE);
  const [params] = created;
  assert.deepEqual(params.line_items.map(line => line.price_data.unit_amount), [2500, 600]);
  assert.match(params.success_url, /^https:\/\/www\.mycookiedelight\.it\/checkout\?pagamento=ok&session_id=\{CHECKOUT_SESSION_ID\}$/);
  assert.deepEqual(params.shipping_address_collection, { allowed_countries: ['IT'] });
  assert.ok(params.metadata.orderId);
});

test('pickup orders have no shipping line and no address collection', async () => {
  await post('/checkout-session', order({ deliveryMethod: 'pickup' }));
  assert.equal(created[0].line_items.length, 1);
  assert.equal(created[0].shipping_address_collection, undefined);
});

test('keeps hash routes in return URLs', async () => {
  await post('/checkout-session', order({ returnUrl: `${SITE}/cookiemakers/#/checkout?direct=1` }));
  assert.equal(created[0].cancel_url, `${SITE}/cookiemakers/#/checkout?direct=1&pagamento=annullato`);
});

test('refuses unknown origins and return URLs', async () => {
  assert.equal((await post('/checkout-session', order(), { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('/checkout-session', order({ returnUrl: 'https://evil.example/checkout' }))).status, 400);
  assert.equal(created.length, 0);
});

test('refuses webhooks without a valid Stripe signature', async () => {
  const response = await post('/stripe-webhook', JSON.stringify({ type: 'checkout.session.completed' }), { 'Stripe-Signature': 't=1,v1=bad' });
  assert.equal(response.status, 400);
  assert.equal(sent.length, 0);
});

test('emails the owner once with all cookie details after payment', async () => {
  await post('/checkout-session', order());
  const orderId = created[0].metadata.orderId;

  assert.equal((await webhook(paidSession(orderId))).status, 200);
  assert.equal(sent.length, 2);
  const [email] = sent;
  assert.equal(email.to, 'mycookiedelight@gmail.com');
  assert.equal(email.replyTo, 'mario@example.com');
  assert.match(email.subject, /Mario Rossi/);
  for (const detail of ['Cerchio', '12 biscotti', 'Senza lattosio', 'Pasta di zucchero', '#FFD43B', 'Auguri', 'Giulia',
    'CocoGothic · 28 px', 'X 4 px, Y -10 px', 'foto.jpg', '+39 333 0000000', 'Via Roma 1, 65012 Cepagatti, IT', '2026-12-20', 'Senza fretta']) {
    assert.ok(email.text.includes(detail), `missing ${detail}`);
  }
  assert.deepEqual(email.attachments.map(file => file.filename), ['biscotto-1-anteprima.png', 'biscotto-1-ritaglio.jpg', 'biscotto-1-originale.jpg']);

  await webhook(paidSession(orderId), 'checkout.session.async_payment_succeeded');
  assert.equal(sent.length, 2, 'repeated webhooks must not send the emails again');
});

test('does not email unpaid sessions', async () => {
  await post('/checkout-session', order());
  await webhook({ ...paidSession(created[0].metadata.orderId), payment_status: 'unpaid' });
  assert.equal(sent.length, 0);
});

test('answers 500 when the email fails so Stripe retries, then sends on retry', async () => {
  await post('/checkout-session', order());
  const session = paidSession(created[0].metadata.orderId);
  failMail = true;
  assert.equal((await webhook(session)).status, 500);
  failMail = false;
  assert.equal((await webhook(session)).status, 200);
  assert.equal(sent.length, 2);
});

test('sends the customer a confirmation with the order summary', async () => {
  await post('/checkout-session', order());
  await webhook(paidSession(created[0].metadata.orderId));
  const email = sent.find(message => message.to === 'mario@example.com');
  assert.ok(email, 'customer email missing');
  assert.equal(email.replyTo, 'mycookiedelight@gmail.com');
  assert.match(email.subject, /^Conferma ordine My Cookie Delight n\. [0-9A-F]{8}$/);
  for (const detail of ['Ciao Mario Rossi', '21,00', 'CERCHIO', '12 biscotti', 'Senza lattosio', 'Auguri / Giulia', 'Via Roma 1, 65012 Cepagatti, IT', '2026-12-20']) {
    assert.ok(email.text.includes(detail), `missing ${detail}`);
  }
  assert.ok(!email.text.includes('foto.jpg'), 'customer email must not expose internal details');
  assert.deepEqual(email.attachments.map(file => file.filename), ['biscotto-1.png']);
});

test('retries only the customer email when it fails', async () => {
  await post('/checkout-session', order());
  const session = paidSession(created[0].metadata.orderId);
  failMail = 'mario@example.com';
  assert.equal((await webhook(session)).status, 500);
  assert.deepEqual(sent.map(message => message.to), ['mycookiedelight@gmail.com']);
  failMail = false;
  assert.equal((await webhook(session)).status, 200);
  assert.deepEqual(sent.map(message => message.to), ['mycookiedelight@gmail.com', 'mario@example.com']);
});

test('skips the customer email when Stripe has no customer address', async () => {
  await post('/checkout-session', order());
  await webhook({ ...paidSession(created[0].metadata.orderId), customer_details: { email: null, phone: null, name: null } });
  assert.deepEqual(sent.map(message => message.to), ['mycookiedelight@gmail.com']);
});

test('still emails Stripe data when the stored order is missing', async () => {
  await webhook(paidSession('00000000-0000-4000-8000-000000000000'));
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /non è più disponibile/);
  assert.match(sent[0].text, /mario@example\.com/);
});
