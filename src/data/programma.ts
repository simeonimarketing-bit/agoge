import type { Programma, Blocco } from '../types'

// Helper compatti per scrivere le prescrizioni
const b = (sets: number, repMin: number, repMax?: number, extra?: Partial<Blocco>): Blocco =>
  ({ sets, repMin, repMax, ...extra })
// blocchi uguali su tutte le settimane
const tutte = (blk: Blocco[]) => ({ 1: blk, 2: blk, 3: blk, 4: blk, 5: blk })
// colonne del PDF: [Sett 1 e 2, Sett 3, Sett 4, Sett 5]
const col4 = (w12: Blocco[], w3: Blocco[], w4: Blocco[], w5: Blocco[]) =>
  ({ 1: w12, 2: w12, 3: w3, 4: w4, 5: w5 })

// pattern ricorrente del PDF Set/Ott: top set 6-8 + back off 10-12 nella stessa cella
const topBackOff = (topReps: [number, number] = [6, 8], boReps: [number, number] = [10, 12]) =>
  [b(1, topReps[0], topReps[1]), b(1, boReps[0], boReps[1], { backOff: true })]

// ————— PROGRAMMA CORRENTE — parsato dal PDF "Settembre Ottobre" —————
// Data inizio 21/09/2026 · 5 settimane · tutte le colonne-settimana sono identiche:
// la progressione è tutta nel log book ("batti carico o reps, non i set").
// Conferma import 21/09/2026: 4 canonici nuovi, 3 letture flaggate (vedi flag).
export const PROGRAMMA: Programma = {
  id: 'settembre-ottobre-2026',
  nome: 'Settembre / Ottobre',
  dataInizio: '2026-09-21',
  durataSettimane: 5,
  pdfSorgente: 'Allenamento - Salvatore Simeoni - Settembre Ottobre.pdf',
  nota: 'Cedimento a ogni set effettivo. Prima 2-3 serie di avvicinamento progressive, lontane dal cedimento.',
  giorni: [
    {
      n: 1, nome: 'PETTO BRACCIA',
      prescrizioni: [
        { esercizioId: 'pec-fly', nomePdf: 'Pec fly', ordine: 1,
          blocchi: tutte([b(2, 10, 12, { tecnica: '+1 drop' })]), note: '1 drop set dopo l’ultima' },
        { esercizioId: 'smith-panca-15', nomePdf: 'Panca 15° alla smith', ordine: 2,
          blocchi: tutte(topBackOff()), note: 'Nel back off F1 al petto' },
        { esercizioId: 'manubri-panca-45', nomePdf: 'Distensioni manubri panca 45°', ordine: 3,
          blocchi: tutte([b(2, 10, 12)]), rest: 120 },
        { esercizioId: 'chest-press', nomePdf: 'Chest press', ordine: 4,
          blocchi: tutte([b(2, 10, 12)]), rest: 120 },
        { esercizioId: 'curl-cavo-basso', nomePdf: 'Curl cavo basso su panca a 70', ordine: 5,
          blocchi: tutte([b(3, 10, 15, { tecnica: '+1 drop' })]), note: '1 drop set dopo l’ultima' },
        { esercizioId: 'curl-concentrato-scott', nomePdf: 'Panca scott manubrio singolo', ordine: 6,
          blocchi: tutte([b(2, 10, 15)]), rest: 90 },
        { esercizioId: 'push-down-vulken', nomePdf: 'Push down corda o vulken in ginocchio', ordine: 7,
          blocchi: tutte([b(3, 10, 15)]), rest: 90,
          flag: 'Il coach lascia scegliere corda o vulken: agganciato al vulken (usato a luglio) per non spezzare lo storico' },
        { esercizioId: 'dist-cavo-nuca', nomePdf: 'Distensione dietro la nuca su panca', ordine: 8,
          blocchi: tutte([b(2, 10, 15)]), rest: 90,
          flag: '«su panca» letto come la distensione al cavo dietro la nuca da seduto (stesso movimento di luglio)' },
      ],
    },
    {
      n: 2, nome: 'QUADS SPALLE', addome: true,
      prescrizioni: [
        { esercizioId: 'leg-extension', nomePdf: 'Leg extension', ordine: 1,
          blocchi: tutte([b(2, 10, 15)]), rest: 90, note: 'F1 in allungamento e F1 in accorciamento' },
        { esercizioId: 'adductor', nomePdf: 'Adductor machine', ordine: 2,
          blocchi: tutte([b(2, 10, 15)]), note: 'F1 in accorciamento' },
        { esercizioId: 'leg-press', nomePdf: 'Leg press', ordine: 3,
          blocchi: tutte(topBackOff()), note: 'Quad focus · fermo in eccentrica 1"' },
        { esercizioId: 'squat-smith', nomePdf: 'Squat machine/hack squat/power squat/squat alla smith', ordine: 4,
          blocchi: tutte([b(2, 10, 15)]), note: 'Tensione continua, focus quad' },
        { esercizioId: 'alzate-laterali-macchina', nomePdf: 'Alzate laterali alla macchina o ai cavi singole', ordine: 5,
          blocchi: tutte([b(2, 8, 10), b(1, 12, 15, { backOff: true })]), note: 'F1 in contrazione' },
        { esercizioId: 'apertura-posteriori', nomePdf: 'Aperture rear delt alla macchina o ai cavi', ordine: 6,
          blocchi: tutte([b(3, 10, 15)]), note: 'F1 in contrazione' },
        { esercizioId: 'polpacci-pressa', nomePdf: 'Polpacci', ordine: 7,
          blocchi: tutte([b(4, 15)]), note: 'Full rom' },
      ],
    },
    {
      n: 3, nome: 'SCHIENA BRACCIA', addome: true,
      prescrizioni: [
        { esercizioId: 'tbar-row', nomePdf: 'Row machine con petto in appoggio presa prona', ordine: 1,
          blocchi: tutte([b(2, 6, 8), b(1, 10, 12, { backOff: true })]), rest: 120 },
        { esercizioId: 'lat-machine-trazy', nomePdf: 'Lat trazy bar', ordine: 2,
          blocchi: tutte([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'iliac-maniglia', nomePdf: 'Iliac maniglia singola', ordine: 3,
          blocchi: tutte([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'pulley-asta-dritta', nomePdf: 'Pulley sbarra dritta focus centro schiena', ordine: 4,
          blocchi: tutte([b(2, 10, 12)]), rest: 90, note: 'Focus centro schiena' },
        { esercizioId: 'curl-bil-ez', nomePdf: 'Curl bilanciere ez in piedi', ordine: 5,
          blocchi: tutte([b(3, 10, 12)]), rest: 90 },
        { esercizioId: 'curl-hammer', nomePdf: 'Curl hammer seduto', ordine: 6,
          blocchi: tutte([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'push-down-cavigliera', nomePdf: 'Push down braccio singolo', ordine: 7,
          blocchi: tutte([b(3, 10, 12)]), rest: 90,
          flag: '«braccio singolo» agganciato al push down singolo (cavigliera o maniglia): stesso movimento' },
        { esercizioId: 'french-press-cavo-ez', nomePdf: 'French press bil ez', ordine: 8,
          blocchi: tutte([b(2, 10, 12)]), rest: 90 },
      ],
    },
    {
      n: 4, nome: 'GLUTEI FEMORALI', addome: true,
      prescrizioni: [
        { esercizioId: 'rdl-bilanciere', nomePdf: 'Rdl Bilanciere', ordine: 1,
          blocchi: tutte(topBackOff()) },
        { esercizioId: 'hip-thrust', nomePdf: 'Hip trust', ordine: 2,
          blocchi: tutte([b(2, 10, 12)]), note: 'F1 in contrazione' },
        { esercizioId: 'affondo-smith', nomePdf: 'Affondo singolo alla smith', ordine: 3,
          blocchi: tutte([b(2, 10, 12)]), rest: 120, note: 'Per gamba' },
        { esercizioId: 'leg-curl', nomePdf: 'Leg curl', ordine: 4,
          blocchi: tutte([b(2, 10, 12)]), rest: 120 },
        { esercizioId: 'abductor', nomePdf: 'Abductor', ordine: 5,
          blocchi: tutte([b(2, 20)]), rest: 90 },
        { esercizioId: 'affondi-camminata', nomePdf: 'Affondi in camminata', ordine: 6,
          blocchi: tutte([b(1, 40)]), rest: 90, note: '40 passi totali' },
        { esercizioId: 'polpacci-pressa', nomePdf: 'Polpacci', ordine: 7,
          blocchi: tutte([b(4, 10, 15)]), rest: 90 },
      ],
    },
    {
      n: 5, nome: 'PETTO SPALLE BRACCIA',
      prescrizioni: [
        { esercizioId: 'alzate-laterali-manubri', nomePdf: 'Alzate laterali manubri seduto', ordine: 1,
          blocchi: tutte([b(2, 10, 12, { tecnica: '+1 drop' })]), note: 'Da seduto · 1 drop set dopo l’ultima' },
        { esercizioId: 'chest-press', nomePdf: 'Chest press', ordine: 2,
          blocchi: tutte(topBackOff()), note: 'Nel back off F1 al petto' },
        { esercizioId: 'croci-panca-30', nomePdf: 'Croci manubri panca a 30°', ordine: 3,
          blocchi: tutte([b(2, 10, 12)]), rest: 120 },
        { esercizioId: 'shoulder-press', nomePdf: 'Shoulder press', ordine: 4,
          blocchi: tutte([b(2, 10, 12)]), rest: 120 },
        { esercizioId: 'curl-manubri-panca-70', nomePdf: 'Curl manubri su panca a 70°', ordine: 5,
          blocchi: tutte([b(3, 10, 15, { tecnica: '+1 drop' })]), note: '1 drop set dopo l’ultima' },
        { esercizioId: 'curl-scott-martello', nomePdf: 'Panca scott manubrio singolo a martello', ordine: 6,
          blocchi: tutte([b(2, 10, 15)]), rest: 90 },
        { esercizioId: 'push-down-asta-dritta', nomePdf: 'Push down asta dritta', ordine: 7,
          blocchi: tutte([b(3, 10, 15)]), rest: 90 },
        { esercizioId: 'dip-parallele', nomePdf: 'Dip parallele o machine', ordine: 8,
          blocchi: tutte([b(2, 10, 15)]), rest: 90 },
      ],
    },
  ],
}

// ————— PROGRAMMA PRECEDENTE — "Giugno Luglio 2" (15/06 → 19/07/2026) —————
// Resta nel codice perché i log di quel ciclo puntano al suo id; non è più selezionabile.
export const PROGRAMMA_GIUGNO_LUGLIO: Programma = {
  id: 'giugno-luglio-2-2026',
  nome: 'Giugno / Luglio 2',
  dataInizio: '2026-06-15',
  durataSettimane: 5,
  pdfSorgente: 'Allenamento - Salvatore Simeoni - Giugno Luglio 2.pdf',
  giorni: [
    {
      n: 1, nome: 'PETTO BRACCIA',
      prescrizioni: [
        { esercizioId: 'panca-piana-manubri', nomePdf: 'Distensioni Panca piana MANUBRI', ordine: 1,
          blocchi: col4([b(2, 8)], [b(2, 8, 10)], [b(2, 10)], [b(1, 10, undefined, { aumentoCarico: true }), b(1, 12, 15, { backOff: true })]),
          flag: 'Refuso corretto: "2x10-8" letto come 2×8-10' },
        { esercizioId: 'smith-panca-45', nomePdf: 'Distensioni alla smith panca 45°', ordine: 2,
          blocchi: col4([b(3, 10, 12)], [b(3, 8, undefined, { aumentoCarico: true })], [b(3, 10)], [b(2, 8, undefined, { aumentoCarico: true })]),
          note: 'Tensione continua e full rom' },
        { esercizioId: 'croci-cavi', nomePdf: 'Croci ai cavi', ordine: 3,
          blocchi: col4([b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)], [b(2, 12)]), rest: 90 },
        { esercizioId: 'push-down-sbarra-curva', nomePdf: 'Push down sbarra curva', ordine: 4,
          blocchi: col4([b(3, 12, 15)], [b(3, 10, undefined, { aumentoCarico: true })], [b(3, 12, 15)], [b(2, 10, undefined, { aumentoCarico: true })]), rest: 90 },
        { esercizioId: 'dist-cavo-nuca', nomePdf: 'Distensione cavo dietro la nuca singolo', ordine: 5,
          blocchi: col4([b(3, 12, 15)], [b(3, 10, undefined, { aumentoCarico: true })], [b(3, 12, 15)], [b(2, 10, undefined, { aumentoCarico: true })]), rest: 90 },
        { esercizioId: 'curl-manubri-panca-70', nomePdf: 'Curl manubri panca 70', ordine: 6,
          blocchi: col4([b(3, 10, 12)], [b(3, 8, undefined, { aumentoCarico: true })], [b(3, 10)], [b(3, 12)]) },
        { esercizioId: 'curl-concentrato-scott', nomePdf: 'Curl concentrato alla scott o panca 70° singolo', ordine: 7,
          blocchi: col4([b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)], [b(2, 12)]) },
      ],
    },
    {
      n: 2, nome: 'QUADRICIPITI', addome: true,
      prescrizioni: [
        { esercizioId: 'leg-extension', nomePdf: 'Leg extension', ordine: 1,
          blocchi: col4([b(3, 10, 12)], [b(3, 8, undefined, { aumentoCarico: true })], [b(3, 10, 12)], [b(2, 10, undefined, { tecnica: '+1 drop', aumentoCarico: true })]),
          rest: 90, note: 'F1 in allungamento e F1 in accorciamento' },
        { esercizioId: 'leg-press', nomePdf: 'Leg press', ordine: 2,
          blocchi: tutte([b(2, 8, 10)]), note: 'Quad focus' },
        { esercizioId: 'adductor', nomePdf: 'Adductor', ordine: 3,
          blocchi: tutte([b(2, 10, 15)]), note: 'Tensione continua' },
        { esercizioId: 'hip-thrust', nomePdf: 'Hip trust', ordine: 4,
          blocchi: col4([b(3, 10, 12)], [b(3, 8, undefined, { aumentoCarico: true })], [b(3, 10, 12)], [b(2, 10, undefined, { tecnica: '+1 drop', aumentoCarico: true })]),
          note: 'F1 in contrazione' },
        { esercizioId: 'squat-smith', nomePdf: 'Squat alla smith', ordine: 5,
          blocchi: col4([b(2, 10, 15)], [b(2, 10, 15)], [b(3, 8, 10)], [b(2, 10, 12)]),
          flag: 'Riga con 6 valori nel PDF: presi i primi 4 (regola di validazione)' },
        { esercizioId: 'rdl-manubri', nomePdf: 'RDL manubri', ordine: 6,
          blocchi: tutte([b(2, 10, 15)]) },
        { esercizioId: 'polpacci-pressa', nomePdf: 'Polpacci', ordine: 7,
          blocchi: tutte([b(4, 12)]), note: 'Full rom' },
      ],
    },
    {
      n: 3, nome: 'SCHIENA SPALLE', addome: true,
      prescrizioni: [
        { esercizioId: 'lat-machine-trazy', nomePdf: 'Lat machine trazy bar', ordine: 1,
          blocchi: col4([b(2, 8, 10)], [b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)]),
          note: 'F1 in contrazione' },
        { esercizioId: 'rematore-manubrio', nomePdf: 'Rematore manubrio', ordine: 2,
          blocchi: col4([b(3, 10, 12)], [b(3, 8, undefined, { aumentoCarico: true })], [b(3, 10, 12)], [b(2, 10, undefined, { aumentoCarico: true })]),
          note: 'Focus gran dorsale, core compatto e schiena dritta' },
        { esercizioId: 'pulley-asta-dritta', nomePdf: 'Pulley asta dritta', ordine: 3,
          blocchi: col4([b(2, 8, 10)], [b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)]) },
        { esercizioId: 'iliac-maniglia', nomePdf: 'iliac maniglia singola', ordine: 4,
          blocchi: col4([b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)], [b(2, 12)]) },
        { esercizioId: 'alzate-laterali-manubri', nomePdf: 'Alzate laterali manubri', ordine: 5,
          blocchi: tutte([b(3, 10, 15)]) },
        { esercizioId: 'distensioni-manubri-80', nomePdf: 'Distensioni manubri panca 80°', ordine: 6,
          blocchi: col4([b(2, 10)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 8, 10)], [b(2, 6, undefined, { aumentoCarico: true })]) },
        { esercizioId: 'alzate-laterali-cavo', nomePdf: 'Alzate laterali cavo basso', ordine: 7,
          blocchi: tutte([b(2, 8, 10)]) },
        { esercizioId: 'apertura-posteriori', nomePdf: 'Apertura cavi per posteriori', ordine: 8,
          blocchi: tutte([b(3, 10, 15)]) },
      ],
    },
    {
      n: 4, nome: 'PETTO BRACCIA',
      prescrizioni: [
        { esercizioId: 'chest-press', nomePdf: 'Chest press', ordine: 1,
          blocchi: col4([b(3, 8, 10)], [b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)]) },
        { esercizioId: 'croci-panca-30', nomePdf: 'Croci panca 30 con manubri', ordine: 2,
          blocchi: tutte([b(2, 10, 15)]) },
        { esercizioId: 'chest-press-inclinata', nomePdf: 'Chest press inclinata', ordine: 3,
          blocchi: col4([b(2, 8, 10)], [b(2, 8, 10)], [b(2, 10)], [b(1, 10, undefined, { aumentoCarico: true }), b(1, 12, 15, { backOff: true })]),
          flag: 'Refuso corretto: "2x10-8" letto come 2×8-10' },
        { esercizioId: 'curl-cavo-basso', nomePdf: 'Curl cavo basso', ordine: 4,
          blocchi: tutte([b(3, 10, 15)]) },
        { esercizioId: 'push-down-vulken', nomePdf: 'Push down vulken in ginocchio', ordine: 5,
          blocchi: col4([b(2, 10)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 8, 10)], [b(2, 6, undefined, { aumentoCarico: true })]) },
        { esercizioId: 'curl-bil-ez', nomePdf: 'Curl bil ez in piedi', ordine: 6,
          blocchi: tutte([b(2, 8, 10)]) },
        { esercizioId: 'french-press-manubri', nomePdf: 'French press manubri', ordine: 7,
          blocchi: tutte([b(3, 10, 15)]) },
      ],
    },
    {
      n: 5, nome: 'GLUTEI FEMORALI', addome: true,
      prescrizioni: [
        { esercizioId: 'rdl-bilanciere', nomePdf: 'RDL', ordine: 1,
          blocchi: col4([b(3, 8, 10)], [b(2, 10, 12)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 10)]) },
        { esercizioId: 'bulgari-manubri', nomePdf: 'Bulgari con manubri', ordine: 2,
          blocchi: tutte([b(2, 10, 15)]) },
        { esercizioId: 'leg-curl', nomePdf: 'Leg curl', ordine: 3,
          blocchi: col4([b(2, 8, 10)], [b(2, 8, 10)], [b(2, 10)], [b(1, 10, undefined, { aumentoCarico: true }), b(1, 12, 15, { backOff: true })]),
          flag: 'Refuso corretto: "2x10-8" letto come 2×8-10' },
        { esercizioId: 'abductor', nomePdf: 'Abductor', ordine: 4,
          blocchi: tutte([b(3, 10, 15)]) },
        { esercizioId: 'hip-thrust', nomePdf: 'Hip trust', ordine: 5,
          blocchi: col4([b(2, 10)], [b(2, 8, undefined, { aumentoCarico: true })], [b(2, 8, 10)], [b(2, 6, undefined, { aumentoCarico: true })]) },
        { esercizioId: 'polpacci-in-piedi', nomePdf: 'Polpacci in piedi', ordine: 6,
          blocchi: tutte([b(3, 10, 15)]) },
        { esercizioId: 'polpacci-seduto', nomePdf: 'Polpacci seduto', ordine: 7,
          blocchi: tutte([b(3, 10, 15)]) },
      ],
    },
  ],
}

// Regole globali del ciclo (estratte da pag. 1 del PDF Settembre Ottobre)
export const REGOLE_GLOBALI = [
  { t: 'Cedimento', d: 'Arriva a cedimento a ogni set effettivo. Prima fai 2-3 serie di avvicinamento progressive, lontane dal cedimento.' },
  { t: 'Log book', d: 'Cerca di battere le tue performance nel corso delle settimane: carico o reps, non i set. L’app applica la doppia progressione sul range indicato.' },
  { t: 'Tempo', d: 'Eccentrica frenata 3s → fermo in massimo allungamento 0,5s → concentrica esplosiva.' },
  { t: 'Back off', d: 'Nelle celle «1×6-8 + 1×10-12» la seconda è il back off. Sul petto: F1 al petto. Scarico proposto −20/25% (regola dei cicli precedenti).' },
  { t: 'Mobilità', d: 'Upper: schiena e spalle (cat-camel, circonduzioni, elastici). Lower: anche e caviglie dopo la schiena.' },
  { t: 'Stretching', d: 'Statici 20-30" a fine allenamento: schiena, quadricipiti, femorali, glutei.' },
  { t: 'Addome', d: '2 volte a settimana, prima di dorso e gambe: crunch al cavo con corda 3×12 · reverse su panchetta 3×20.' },
]

export const ADDOME = {
  nome: 'ADDOME (prima della sessione)',
  dettaglio: 'Crunch al cavo con corda 3×12 · Reverse su panchetta 3×20',
}
