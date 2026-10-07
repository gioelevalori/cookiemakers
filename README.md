# My Cookie Delight

Configuratore di biscotti personalizzati, aggiornato ad Angular e Material 22.2.1,
TypeScript 6.0 e al builder application. Il progetto usa pnpm come unico package manager.

## Requisiti e avvio

Node.js 24 LTS, versione 24.15 o successiva, e pnpm 11. Node 25 non e supportato
da questa configurazione. Non e necessario cambiare il Node globale per usare
un runtime compatibile in una shell dedicata.

```powershell
pnpm install --frozen-lockfile
pnpm start -- --host 127.0.0.1 --port 4201
```

Anteprima: http://127.0.0.1:4201. Build: `pnpm build`.
Output statico: `dist/cookie-maker/browser`. Le configurazioni Firebase includono
il fallback delle rotte Angular; questa modifica non esegue alcun deploy.

## Verifiche

Nel checkout la data desiderata di consegna e facoltativa e viene mantenuta sul
dispositivo e riportata nella scheda biscotto. La stima usa 5 giorni lavorativi
di preparazione e 2 di spedizione, configurabili in src/app/delivery.service.ts.
Il conteggio parte dal giorno successivo all'ordine ed esclude sabato e domenica;
festivita, disponibilita e conferma ordine possono modificare i tempi. Una data
troppo vicina mostra un invito a contattare il negozio, senza promettere la consegna.
Le date passate o non valide bloccano il checkout. La demo pubblica Stripe non
riceve la data; il futuro endpoint di checkout ricevera requestedDate (YYYY-MM-DD).

```powershell
pnpm test -- --watch=false --browsers=ChromeHeadless
pnpm test:e2e
pnpm peers check
```

I test browser richiedono Chrome installato e il server sulla porta 4201.
La variabile COOKIE_URL permette di scegliere un altro URL. Gli screenshot
sono generati in artifacts/. I test bloccano i servizi esterni e non inviano
email, iscrizioni newsletter o pagamenti.

## Pagamento e servizi esterni

Il vecchio checkout generava un token Stripe e mostrava una conferma senza
effettuare un addebito. E stato sostituito con il redirect a una sessione
Stripe Checkout creata sul server. La configurazione attuale usa stripe.demo=true:
il pulsante apre https://checkout.stripe.dev/checkout, la demo pubblica ufficiale
di Stripe, senza addebiti. La demo mostra un ordine di esempio e non riceve
importo, quantita o personalizzazione del biscotto. Funziona anche su GitHub Pages.
Per usare il checkout del proprio account, impostare stripe.demo=false e
configurare stripe.checkoutEndpoint negli environment; senza endpoint il pagamento
resta disabilitato.

Il server deve ricevere POST JSON con quantity, shape, preview, message,
textColor, backgroundColor, font e image, validare quantita e dati, calcolare
il prezzo dal proprio listino e restituire { "url": "https://checkout.stripe.com/..." }.
La conferma dell'ordine deve dipendere dal webhook Stripe sul server.
Questo repository non contiene quel backend.

Il listino mostrato conserva i valori precedenti: 15 EUR per 10 biscotti,
5 EUR per ciascun biscotto aggiuntivo e 6 EUR di spedizione. Verificare questi
importi col cliente prima della pubblicazione.

Il modulo contatti usa la configurazione EmailJS esistente, con validazione
e gestione degli errori. L'invio reale e la validita del servizio non sono
stati verificati. Iubenda conserva la configurazione originale, eliminando
i caricamenti duplicati. Anche questi servizi richiedono un controllo
sull'account del cliente prima della pubblicazione.

La chiave Mailchimp e il token Bitly incorporati nel frontend sono stati
rimossi: revocarli o ruotarli negli account originali, perche le versioni
precedenti del sito potrebbero averli esposti. La newsletter richiede
newsletterEndpoint, un endpoint server che custodisca le credenziali.

## Migrazione e design

Le dipendenze Angular incompatibili o inutilizzate sono state rimosse.
I componenti NgModule dichiarano standalone: false e la strategia Eager
per conservare l'aggiornamento delle viste del codice precedente.
Il cropper locale mantiene OnPush.

Home, menu, cinque configuratori, pannelli, checkout, contatti e scheda PDF
usano un layout responsive. Le icone e i font personalizzati sono locali.
L'anteprima esporta il nodo corretto, conserva le forme e viene completata
prima della navigazione al checkout. PDF ed esportazione PNG sono caricati
su richiesta. Il PDF contiene la personalizzazione reale, senza importi
di fattura fittizi.

La texture originale del biscotto e salvata in assets/cookie-texture.jpg.
Il logo originale viene mostrato senza il margine trasparente del file.
Testo e sfondo si modificano accanto all'anteprima; la bozza resta disponibile
passando tra le forme e tornando dal checkout. Testo, colori, carattere, posizione,
foto ritagliata e ultima forma vengono salvati automaticamente nel localStorage
del dispositivo e ripristinati dopo un ricaricamento. La home offre "Riprendi il tuo
biscotto"; "Azzera personalizzazione" salva una bozza vuota. Se lo spazio locale
non basta, un avviso segnala che la bozza resta solo nella sessione corrente.
Le foto non vengono inviate a un server per il salvataggio della bozza.
Un ritaglio con lato minore sotto 600 pixel mostra un consiglio sulla nitidezza;
si tratta di una soglia indicativa, non di una certificazione della resa di stampa.
La vista 3D usa Three.js, caricato su richiesta, con rotazione mouse e touch.
La superficie segue testo, foto e colore del configuratore; lo spessore e
illustrativo e non rappresenta una misura certificata del prodotto.
La faccia del modello deriva dalla resa 2D, inclusi ritagli e posizioni;
il bordo usa una mappatura lungo il perimetro e la vista iniziale e inclinata.
Il modello rimane nascosto fino al caricamento della texture e della superficie.
Fraunces e Nunito Sans sono distribuiti localmente tramite Fontsource per il sito.
I font selezionabili del biscotto restano CocoGothic, BeckMan e PhotoShoot.
Il test dedicato si esegue con `node scripts/three-smoke.cjs` a server avviato.

## Pubblicazione

Repository: https://github.com/gioelevalori/cookiemakers.
GitHub Actions compila e pubblica su Pages a ogni push su main.
La build Pages usa il base href /cookiemakers/ e rotte hash per consentire
il ricaricamento delle pagine senza un server Angular.
Su Pages il pagamento apre la demo pubblica Stripe senza addebiti; la newsletter
resta disabilitata senza un endpoint backend.

## Riepilogo PDF

La scheda PDF separa anteprima finale del biscotto, foto originale caricata,
ritaglio applicato, tre righe di testo, font, dimensione e posizione nell'editor,
campioni colore con codici, quantita e consegna richiesta. La foto originale
viene conservata nella bozza con il nome del file; le vecchie bozze che contengono
solo il ritaglio indicano esplicitamente che l'originale non e disponibile.
Le sezioni vengono mantenute integre tra le pagine e le immagini conservano
le proporzioni. La data resta da confermare; il riepilogo non e una fattura.
