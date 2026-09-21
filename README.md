# AGOGE

App personale, per un solo utente. Trasforma il programma del coach da PDF morto a sistema vivo:
cattura, comprime, ricorda, esegue. **Non consiglia. Mai.**

- **Oggi** — la sessione: prescrizione della settimana, ultima volta, target della doppia progressione, serie di avvicinamento, back off e drop set pre-caricati, note per esercizio (sedile, presa), rest timer, calcolatore piastre, resoconto finale.
- **Storico** — il quaderno di ghisa: ogni esercizio canonico con la sua pila di sessioni e i massimi storici.
- **Tavola** — il piano alimentare per opzioni: quattro tap al giorno.
- **Check** — l'antropometria dei controlli, graficata dove il trend è reale.
- **Sala** — check-in per il coach, regole del ciclo, backup.

## Sviluppo

```bash
npm install
npm run dev
```

## Deploy

`npm run deploy` — builda e pubblica su GitHub Pages (branch `gh-pages`).

## Ciclo attivo

**Settembre / Ottobre 2026** — allenamento dal 21/09 (5 giorni, `src/data/programma.ts`), alimentazione dal 16/09
(`dieta.ts`, `macro.ts`), check del 16/09 (`checks.ts`), prossimo controllo 29/10 ore 17:30.
Le schede seed (riattivazione) scadono da sole: dal giorno in cui parte il PDF del coach, vince il PDF.

## Verifica

`npx tsc --noEmit` (con `noUnusedLocals`) e `npm run build`. Le date si calcolano sempre in ora locale
(`isoLocale`, `aggiungiGiorni`, `lunediDi`, `giorniTra` in `src/lib/store.tsx`): mai `toISOString()`
su una mezzanotte locale, in Italia scala di un giorno.

## Import nuovo ciclo

Ogni ~5 settimane arrivano due PDF nuovi: si mettono in `Check e Prog`, si apre Claude Code
e si dice «importa il nuovo ciclo». L'AI propone, l'umano conferma, i dati entrano
(`src/data/programma.ts`, `checks.ts`, `dieta.ts`, e gli alias in `canonici.ts`).
