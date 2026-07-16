# AGOGE

App personale, per un solo utente. Trasforma il programma del coach da PDF morto a sistema vivo:
cattura, comprime, ricorda, esegue. **Non consiglia. Mai.**

- **Oggi** — la sessione: prescrizione della settimana, ultima volta, target della doppia progressione, rest timer, calcolatore piastre, resoconto finale.
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

## Import nuovo ciclo

Ogni ~5 settimane arrivano due PDF nuovi: si mettono in `Check e Prog`, si apre Claude Code
e si dice «importa il nuovo ciclo». L'AI propone, l'umano conferma, i dati entrano
(`src/data/programma.ts`, `checks.ts`, `dieta.ts`, e gli alias in `canonici.ts`).
