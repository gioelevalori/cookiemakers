import { COVERINGS, RECIPES, SHAPES, itemPriceCents, orderTotals } from './order.js';

const euro = cents => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const extension = dataUrl => dataUrl.slice(11, dataUrl.indexOf(';')).replace('jpeg', 'jpg');

function formatAddress(address) {
  if (!address) return '';
  return [address.line1, address.line2, [address.postal_code, address.city, address.state].filter(Boolean).join(' '), address.country]
    .filter(Boolean).join(', ');
}

/** Customer and payment data that Stripe collected on the checkout page. */
function paymentDetails(session) {
  const shipping = session.collected_information?.shipping_details;
  return {
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
    amount: session.amount_total ?? 0,
    email: session.customer_details?.email || '',
    phone: session.customer_details?.phone || '',
    name: session.customer_details?.name || '',
    shippingName: shipping?.name || '',
    shippingAddress: formatAddress(shipping?.address)
  };
}

function itemRows(item) {
  const rows = [
    ['Forma', SHAPES[item.shape]],
    ['Quantità', `${item.quantity} biscotti`],
    ['Impasto', RECIPES[item.recipe]],
    ['Copertura', item.covering ? COVERINGS[item.covering] : 'Biscotto naturale'],
    ['Colore sfondo', item.backgroundColor],
    ...item.lines.map((line, index) => [`Testo riga ${index + 1}`, line]),
    ['Carattere', item.lines.length ? `${item.font} · ${item.fontSize} px` : ''],
    ['Colore testo', item.lines.length ? item.textColor : ''],
    ['Posizione testo', item.lines.length ? `X ${item.textPosition.x} px, Y ${item.textPosition.y} px` : ''],
    ['Foto', item.image ? `Stampa su cialda di zucchero${item.originalImageName ? ` (originale: ${item.originalImageName})` : ''}` : 'Nessuna foto'],
    ['Subtotale', euro(itemPriceCents(item.quantity))]
  ];
  return rows.filter(([, value]) => value);
}

/**
 * Builds the email for the shop owner after a paid Stripe Checkout session.
 * `order` is null when the stored order is no longer available: the email then
 * contains only what Stripe knows, so the payment is never silently lost.
 */
export function buildOrderEmail(order, session, orderId) {
  const payment = paymentDetails(session);
  const attachments = [];
  const html = [];
  const text = [];
  const customer = order?.customerName || payment.name || payment.email || 'cliente';

  html.push(`<h1 style="font-family:sans-serif">Nuovo ordine pagato: ${escape(euro(payment.amount))}</h1>`);
  text.push(`Nuovo ordine pagato: ${euro(payment.amount)}`, '');

  const customerRows = [
    ['Nome indicato', order?.customerName],
    ['Nome su Stripe', payment.name],
    ['Email', payment.email],
    ['Telefono', payment.phone],
    ['Consegna', order ? (order.deliveryMethod === 'pickup' ? 'Ritiro in sede' : 'Spedizione') : ''],
    ['Indirizzo di spedizione (Stripe)', [payment.shippingName, payment.shippingAddress].filter(Boolean).join(' – ')],
    ['Indirizzo indicato nel sito', order?.address],
    ['Data desiderata', order?.requestedDate ? `${order.requestedDate} (da confermare)` : ''],
    ['Note', order?.notes]
  ].filter(([, value]) => value);
  html.push('<h2 style="font-family:sans-serif">Cliente</h2>', table(customerRows));
  text.push('CLIENTE', ...customerRows.map(([label, value]) => `${label}: ${value}`), '');

  if (order) {
    order.items.forEach((item, index) => {
      const title = `Biscotto ${index + 1}: ${SHAPES[item.shape]} – ${item.quantity} pezzi`;
      const images = [
        ['Anteprima finale', item.preview, `biscotto-${index + 1}-anteprima`],
        ['Foto ritagliata', item.image, `biscotto-${index + 1}-ritaglio`],
        ['Foto originale', item.originalImage, `biscotto-${index + 1}-originale`]
      ].filter(([, dataUrl]) => dataUrl);
      for (const [, dataUrl, name] of images) {
        attachments.push({ filename: `${name}.${extension(dataUrl)}`, path: dataUrl, cid: `${name}@mycookiedelight` });
      }
      html.push(`<h2 style="font-family:sans-serif">${escape(title)}</h2>`, table(itemRows(item)));
      html.push(images.map(([label, , name]) =>
        `<figure style="display:inline-block;margin:8px;font-family:sans-serif"><img src="cid:${name}@mycookiedelight" alt="${label}" style="max-width:280px;max-height:280px"><figcaption>${label}</figcaption></figure>`).join(''));
      text.push(title.toUpperCase(), ...itemRows(item).map(([label, value]) => `${label}: ${value}`), '');
    });
    const totals = orderTotals(order);
    const totalRows = [['Biscotti', euro(totals.items)], ['Spedizione', euro(totals.shipping)], ['Totale pagato', euro(payment.amount)]];
    html.push('<h2 style="font-family:sans-serif">Totale</h2>', table(totalRows));
    text.push('TOTALE', ...totalRows.map(([label, value]) => `${label}: ${value}`), '');
  } else {
    const warning = "Il dettaglio dei biscotti non è più disponibile sul server: verifica l'ordine nella dashboard Stripe e contatta il cliente.";
    html.push(`<p style="font-family:sans-serif;color:#b00020"><strong>${escape(warning)}</strong></p>`);
    text.push(warning, '');
  }

  const references = [['Ordine', orderId || '—'], ['Sessione Stripe', payment.sessionId], ['Pagamento Stripe', payment.paymentIntent]].filter(([, value]) => value);
  html.push(`<p style="font-family:sans-serif;color:#666;font-size:12px">${references.map(([label, value]) => `${label}: ${escape(value)}`).join('<br>')}</p>`);
  text.push(...references.map(([label, value]) => `${label}: ${value}`));

  return {
    subject: `Nuovo ordine pagato – ${customer} – ${euro(payment.amount)}`,
    html: html.join('\n'),
    text: text.join('\n'),
    attachments,
    replyTo: payment.email || undefined
  };
}

// Mirrors COOKIE_BUSINESS in src/app/cookie-product.ts.
const SHOP = {
  pickup: 'Nonna Delizia, Via Roma, 78, 65012 Cepagatti (PE)',
  whatsapp: '+39 349 168 7845',
  whatsappUrl: 'https://wa.me/393491687845'
};

/** Confirmation for the customer, sent to the email they entered on Stripe Checkout. */
export function buildCustomerEmail(order, session, orderId) {
  const payment = paymentDetails(session);
  const attachments = [];
  const reference = orderId.slice(0, 8).toUpperCase();
  const name = order.customerName || payment.name;
  const intro = [
    `${name ? `Ciao ${name},` : 'Ciao,'} grazie per il tuo ordine!`,
    `Abbiamo ricevuto il pagamento di ${euro(payment.amount)}. Ti contatteremo per confermare i dettagli e la data di consegna.`
  ];
  const delivery = order.deliveryMethod === 'pickup'
    ? ['Ritiro in sede', SHOP.pickup]
    : ['Spedizione', [payment.shippingName, payment.shippingAddress].filter(Boolean).join(' – ') || order.address];
  const orderRows = [
    ['Numero ordine', reference],
    [delivery[0], delivery[1]],
    ['Data desiderata', order.requestedDate ? `${order.requestedDate} (da confermare)` : ''],
    ['Note', order.notes]
  ].filter(([, value]) => value);

  const html = [
    `<h1 style="font-family:sans-serif">Grazie per il tuo ordine!</h1>`,
    ...intro.map(line => `<p style="font-family:sans-serif">${escape(line)}</p>`),
    table(orderRows)
  ];
  const text = [...intro, '', ...orderRows.map(([label, value]) => `${label}: ${value}`), ''];

  order.items.forEach((item, index) => {
    const title = `Biscotto ${index + 1}: ${SHAPES[item.shape]}`;
    const rows = [
      ['Quantità', `${item.quantity} biscotti`],
      ['Impasto', RECIPES[item.recipe]],
      ['Copertura', item.covering ? COVERINGS[item.covering] : 'Biscotto naturale'],
      ['Testo', item.lines.join(' / ')],
      ['Foto', item.image ? 'Stampata su cialda di zucchero' : ''],
      ['Subtotale', euro(itemPriceCents(item.quantity))]
    ].filter(([, value]) => value);
    html.push(`<h2 style="font-family:sans-serif">${escape(title)}</h2>`, table(rows));
    if (item.preview) {
      const cid = `biscotto-${index + 1}@mycookiedelight`;
      attachments.push({ filename: `biscotto-${index + 1}.${extension(item.preview)}`, path: item.preview, cid });
      html.push(`<img src="cid:${cid}" alt="Anteprima del biscotto ${index + 1}" style="max-width:240px;max-height:240px;margin:8px 0">`);
    }
    text.push(title.toUpperCase(), ...rows.map(([label, value]) => `${label}: ${value}`), '');
  });

  const totals = orderTotals(order);
  const totalRows = [['Biscotti', euro(totals.items)], [order.deliveryMethod === 'pickup' ? 'Ritiro in sede' : 'Spedizione', euro(totals.shipping)], ['Totale pagato', euro(payment.amount)]];
  const contact = `Per qualsiasi domanda rispondi a questa email o scrivici su WhatsApp al ${SHOP.whatsapp}.`;
  html.push('<h2 style="font-family:sans-serif">Totale</h2>', table(totalRows),
    `<p style="font-family:sans-serif">Per qualsiasi domanda rispondi a questa email o scrivici su WhatsApp al <a href="${SHOP.whatsappUrl}">${SHOP.whatsapp}</a>.</p>`,
    '<p style="font-family:sans-serif">A presto,<br>My Cookie Delight</p>');
  text.push('TOTALE', ...totalRows.map(([label, value]) => `${label}: ${value}`), '', contact, '', 'A presto,', 'My Cookie Delight');

  return {
    subject: `Conferma ordine My Cookie Delight n. ${reference}`,
    html: html.join('\n'),
    text: text.join('\n'),
    attachments
  };
}

function table(rows) {
  return `<table style="font-family:sans-serif;border-collapse:collapse">${rows.map(([label, value]) =>
    `<tr><th style="text-align:left;padding:4px 12px 4px 0;vertical-align:top">${escape(label)}</th><td style="padding:4px 0">${escape(value)}</td></tr>`).join('')}</table>`;
}
