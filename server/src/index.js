import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';
import { createApp } from './app.js';
import { createFileStore } from './store.js';

const DAY = 24 * 60 * 60 * 1000;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
}

const config = {
  port: Number(process.env.PORT) || 8787,
  allowedOrigins: required('ALLOWED_ORIGINS').split(',').map(value => value.trim().replace(/\/$/, '')).filter(Boolean),
  webhookSecret: required('STRIPE_WEBHOOK_SECRET'),
  orderEmailTo: process.env.ORDER_EMAIL_TO || 'mycookiedelight@gmail.com',
  mailFrom: process.env.MAIL_FROM || `My Cookie Delight <${required('SMTP_USER')}>`,
  ordersDir: process.env.ORDERS_DIR || fileURLToPath(new URL('../data/orders', import.meta.url)),
  orderRetentionDays: Number(process.env.ORDER_RETENTION_DAYS) || 30
};

const stripe = new Stripe(required('STRIPE_SECRET_KEY'));
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: { user: required('SMTP_USER'), pass: required('SMTP_PASS') }
});
const store = createFileStore(config.ordersDir);

const prune = () => store.prune(config.orderRetentionDays * DAY).catch(error => console.error('Pulizia ordini non riuscita', error));
prune();
setInterval(prune, DAY).unref();

mailer.verify().then(() => console.info('SMTP pronto.'), error => console.error('SMTP non raggiungibile:', error.message));

createServer(createApp({ stripe, store, mailer, config }))
  .listen(config.port, () => console.info(`Server ordini in ascolto sulla porta ${config.port}`));
