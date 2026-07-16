import type { Programma, Blocco } from '../types'

// Helper compatti per scrivere le prescrizioni
const b = (sets: number, repMin: number, repMax?: number, extra?: Partial<Blocco>): Blocco =>
  ({ sets, repMin, repMax, ...extra })
// blocchi uguali su tutte le settimane
const tutte = (blk: Blocco[]) => ({ 1: blk, 2: blk, 3: blk, 4: blk, 5: blk })
// colonne del PDF: [Sett 1 e 2, Sett 3, Sett 4, Sett 5]
const col4 = (w12: Blocco[], w3: Blocco[], w4: Blocco[], w5: Blocco[]) =>
  ({ 1: w12, 2: w12, 3: w3, 4: w4, 5: w5 })

// ————— PROGRAMMA CORRENTE — parsato dal PDF "Giugno Luglio 2" —————
// Data inizio 15/06/2026 · 5 settimane · conferma import: 2 anomalie risolte (vedi flag)
export const PROGRAMMA: Programma = {
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

// Regole globali del ciclo (estratte da pag. 1 del PDF)
export const REGOLE_GLOBALI = [
  { t: 'Tempo', d: 'Eccentrica frenata 3s → fermo in massimo allungamento 0,5s → concentrica esplosiva.' },
  { t: 'Doppia progressione', d: 'Aumenta prima le reps nel range indicato. Al limite massimo del range: aumenta il carico e torna al minimo.' },
  { t: 'Back off', d: 'Scarica tra il 20 e il 25% a lato.' },
  { t: 'Recupero', d: 'Quando ti senti pronto riparti, senza estremizzare in un senso o nell’altro.' },
  { t: 'Mobilità', d: 'Upper: schiena e spalle (cat-camel, circonduzioni, elastici). Lower: anche e caviglie dopo la schiena.' },
  { t: 'Stretching', d: 'Statici 20-30" a fine allenamento: schiena, quadricipiti, femorali, glutei.' },
  { t: 'Addome', d: '2 volte a settimana, prima di dorso e gambe: crunch macchina/cavo 4×12 poi 3×15 reverse.' },
]

export const ADDOME = {
  nome: 'ADDOME (prima della sessione)',
  dettaglio: 'Crunch macchina o cavo con corda 4×12 · poi 3×15 reverse',
}
