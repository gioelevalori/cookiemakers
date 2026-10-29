# Pubblicazione su Aruba Linux

Dominio mostrato nel pannello: **www.mycookiedelight.it** (non .com).

## Preparazione

Da PowerShell, nella cartella del progetto:

```powershell
./scripts/package-aruba.ps1
```

Se Node non si trova nel PATH, passare `-NodePath` con il percorso di node.exe.
Il pacchetto pronto e `dist/mycookiedelight-aruba.zip`.
La build ha base href `/`, rotte normali (senza hash) e regole Apache `.htaccess`.
Include soltanto il sito compilato; non contiene il progetto sorgente o node_modules.
Su Aruba il pagamento usa Stripe reale tramite la cartella `api/` (PHP) inclusa
nello ZIP. Compilare prima `api/config.php` (vedi `api/README.md`): se manca, lo
script avvisa e il pagamento non funziona. Lo ZIP con `config.php` contiene le
chiavi: caricarlo solo su Aruba. Le richieste WhatsApp restano disponibili.

## Caricamento iniziale

1. Nel File Manager selezionare **www.mycookiedelight.it**.
2. Prima di sovrascrivere file, scaricare un backup del contenuto esistente,
   inclusi `index.php`, `ver.php` e l'eventuale `.htaccess` (mostrare i file nascosti).
   Se esiste gia un `.htaccess`, confrontare e integrare le regole invece di
   sovrascriverlo senza verifica.
3. Caricare lo ZIP dal comando **Carica file**. Non caricarlo dentro `cgi-bin`
   e non usare le cartelle di backup come destinazione.
4. Con il tasto destro sull'archivio usare **Estrai** / **Estrai archivio**, se
   disponibile, scegliendo la cartella corrente. In alternativa caricare tutto
   il contenuto di `dist/aruba/browser` con File Manager o un client FTPS.
5. `index.html`, `.htaccess`, i file JavaScript/CSS e le cartelle `assets` e
   `media` devono essere direttamente nella cartella del dominio. Non deve
   esserci un livello `browser`, `dist` o `mycookiedelight-aruba` tra questi file
   e la cartella del dominio.
6. Non cancellare `cgi-bin`, le cartelle di backup o file Aruba sconosciuti.
   `index.php` e `ver.php` non sono necessari all'app Angular, ma il pacchetto
   non li rimuove. La nuova homepage e `index.html`.
7. Dopo l'estrazione rimuovere soltanto lo ZIP caricato (la copia locale resta).

## Verifiche

- Aprire `https://www.mycookiedelight.it/` e controllare immagini e font.
- Aprire direttamente `/esagono`, `/galleria`, `/eventi`, `/su-misura` e ricaricare.
- Verificare l'anteprima 3D da smartphone, le bozze e il carrello.
- Il pulsante WhatsApp deve puntare al numero della cliente e includere le note.
- Aprire `/api/check.php`, controllare che ogni riga sia `[OK]` e poi eliminarlo.
  Configurare il webhook Stripe e fare un pagamento di prova come in `api/README.md`.
- Aggiornando il sito, non cancellare `api/data/`: contiene gli ordini in attesa di pagamento.
- Verificare il certificato SSL da pannello prima di forzare il redirect HTTPS.
  Lo ZIP non modifica DNS, certificati o redirect del dominio.
- Verificare nell'account EmailJS che il nuovo dominio sia autorizzato. Un test
  del modulo contatti invia realmente una email: effettuarlo con dati di prova
  riconoscibili, soltanto quando si vuole eseguire questo invio.
- Verificare che l'account Iubenda e i documenti legali siano configurati per
  il dominio effettivo. Il caricamento del sito non aggiorna gli account esterni.
- La scheda completa degli ingredienti e allergeni deve ancora essere fornita
  dalla cliente: il sito non inventa queste informazioni.

Il sito locale e GitHub Pages non cambiano configurazione. I salvataggi del
browser sono separati per dominio: le bozze locali/GitHub non si trasferiscono
automaticamente su Aruba. Gli aggiornamenti Aruba sono manuali finche non
si configura un deploy FTPS dedicato.

Riferimenti:
- https://guide.aruba.it/hosting-e-domini/hosting/gestione-strumenti-hosting/file-manager/comprimere-uplodare-file
- https://guide.aruba.it/faq/hosting-e-domini/linguaggi-e-spazio-web-linux
- https://angular.dev/tools/cli/deployment
