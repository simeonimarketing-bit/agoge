# AGOGE

App palestra React/PWA. Ogni dispositivo conserva i dati in localStorage e gli
originali PDF in IndexedDB:
non esistono account né sincronizzazione tra dispositivi. Al primo accesso si può
partire con i propri dati oppure scegliere il programma precompilato di Salvatore.
Gli utenti già presenti conservano profilo e storico automaticamente.

- **Oggi**: prescrizioni settimanali, carichi, progressione, recuperi, mezze ripetizioni
  (passo 0,5, anche con virgola), nomi personalizzati dei macchinari, note multilinea
  salvate subito e visibili alle sedute successive. “Rimanda” richiede conferma.
- **Storico → Workout**: sedute per data, grafico carichi per serie, tabella
  previsto/fatto, RIR, tecnica, note dell’esercizio e conclusioni personali.
  Le nuove registrazioni conservano la prescrizione effettiva della seduta;
  quelle precedenti mostrano “non registrata”, senza ricostruzioni arbitrarie.
- **Tavola**: pasti e opzioni del PDF, quantità, macro se riportati e alimenti liberi.
  Ogni piano importato ha identificatori distinti: le selezioni precedenti non
  vengono associate per errore alle nuove opzioni. Il piano si seleziona in Sala.
- **Check**: pesate quotidiane, media a 7 giorni, misure importate, grafici e tabella.
  Le misure assenti restano assenti, senza zeri inventati.
- **Sala → Archivio programmazioni / Storico → Programmazioni**: caricamento
  multiplo di PDF di allenamento, alimentazione e check, anche vecchi e senza servizio
  API. Originali apribili/scaricabili, categoria e data modificabili, elenco
  cronologico e nessun duplicato per lo stesso contenuto. I PDF sono inclusi nel
  backup e possono essere ripristinati su un altro dispositivo.
- **Sala → Importa PDF**: scheda, alimentazione e check dai PDF di Antonio Pappa,
  con anteprima modificabile, avvisi e conferma prima del salvataggio atomico.
  “Solo archivio” conserva i dati senza attivare schede o diete, anche al primo
  accesso ospite. “Attiva come piano attuale” è una scelta esplicita.
  Un programma prescritto non crea sessioni o carichi eseguiti: quelli restano
  separati nella vista Workout.

## Sviluppo e verifiche

Node.js 22+.

```sh
npm install
npm run dev
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

I test unitari verificano migrazione, importazione, collegamento esercizi,
mezze rep, note, snapshot della scheda e gestione delle risposte API.
I test browser su viewport mobile verificano logging, persistenza, conferma
“Rimanda”, resoconto, archiviazione multipla offline, deduplicazione, apertura
degli originali, backup/ripristino su browser vuoto e importazione completa con
**risposta di estrazione simulata**.
Non attestano la qualità dell'estrazione reale dei PDF, da verificare con un account
API configurato e documenti rappresentativi dei coach.

## Importazione PDF

La lettura avviene **sul dispositivo** con PDF.js: nessun servizio esterno, nessuna
chiave API, nessun costo, funziona anche offline. Riconosce **solo il formato di
Antonio Pappa** (`src/lib/lettore-pappa.ts`):

- **Scheda**: ricostruisce le celle dai bordi della tabella Word, legge
  «GIORNO N», le colonne «Sett 1 e 2 / Sett 3 …» (anche separate), più blocchi
  nella stessa cella (il secondo a reps più alte è il back off), «Sett 1: … Sett 2: …»
  dentro una cella, recuperi (`120”`), drop set, note, data di inizio, durata,
  regola del cedimento e giorni con l’addome.
- **Alimentazione**: «PASTO N°», «Opzione N)», righe «-», base fissa della cena
  con i secondi numerati, integrazione e gestione sgarri; categorie per parole chiave.
- **Check**: le misure della prima pagina del piano alimentare, datate con l’inizio del piano.

Un PDF di un altro coach viene rifiutato con un messaggio: si conserva nell’archivio,
la scheda si crea da Sala → + Nuova scheda e il piano alimentare con
«Compila il piano alimentare a mano». I test (`tests/lettore-pappa.test.ts`) leggono
i 14 PDF originali in `../fonti/` e verificano che la scheda e la dieta di settembre
e i 7 check coincidano con i dati caricati a mano; senza quei file si saltano.

La cartella `server/` (lettura via OpenAI) non è più usata dall’app.

**Revisione**: aprire giorni, esercizi, settimane, pasti e check per verificare i
campi; correggerli direttamente e usare “Duplica ultima voce” quando serve.
Le settimane devono essere complete e le date valide prima di attivare la scheda.
Le ambiguità e le omissioni dichiarate dal lettore restano visibili negli avvisi.
Le prescrizioni a tempo o AMRAP non vengono convertite in ripetizioni inventate:
sono segnalate come non supportate. Un errore semantico del lettore può comunque
sfuggire ai controlli strutturali: confrontare sempre l'anteprima con il PDF.

I nomi esatti e gli alias sono collegati al catalogo esistente. Per nomi diversi,
“Collega gli esercizi al tuo storico” permette una scelta esplicita. Due righe
nello stesso giorno non possono essere collegate allo stesso ID: creare nomi
separati quando rappresentano macchine/esercizi distinti.

L'attivazione conserva lo storico e le vecchie schede. La seduta in corso resta
legata al suo snapshot, anche se viene importato o modificato un nuovo programma.
Un check importato sulla stessa data aggiorna solo le misure presenti. Per
ripristinare uno stato precedente usare il backup di Sala, che include anche
nomi, note, nuovi programmi, piani, check e originali PDF. Il ripristino verifica
l’integrità dei PDF prima di sostituire i dati dell’app; se l’esportazione rileva
un originale mancante, chiede di ricaricarlo prima di creare il backup completo.

## Pubblicazione

`npm run deploy` pubblica il frontend su GitHub Pages (`/agoge/`). Non serve backend.
