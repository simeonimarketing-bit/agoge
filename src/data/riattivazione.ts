import type { Programma, Blocco } from '../types'

// ————— SCHEDA DI RIATTIVAZIONE — 15-20/09/2026 —————
// NON è del coach: costruita sul suo stile (tempo, sigle, doppia progressione) per coprire
// la settimana di rientro dopo 3 settimane di stop. Sorgente e razionale:
// schede/0915-riattivazione.md. Dal 21/09 si torna al PDF di Pappa.
// Vincoli: 4 sedute, max 60', max 2 serie allenanti per esercizio, tutti i distretti.

const b = (sets: number, repMin: number, repMax?: number, extra?: Partial<Blocco>): Blocco =>
  ({ sets, repMin, repMax, ...extra })
// una sola settimana: un solo blocco per esercizio
const w1 = (blk: Blocco[]) => ({ 1: blk })

export const PROGRAMMA_RIATTIVAZIONE: Programma = {
  id: 'riattivazione-settembre-2026',
  nome: 'Riattivazione',
  dataInizio: '2026-09-15',
  durataSettimane: 1,
  custom: true,
  nota:
    'Rientro dopo 3 settimane di stop. G1-G2 a RIR 3 con carichi al 60-65% di luglio, ' +
    'eccentrica 2s e niente fermo in allungamento. G3-G4 a RIR 2 al 75-80%, tempo pieno del coach. ' +
    'Nessun cedimento, nessun drop, nessun back off: tornano lunedì 21 con la scheda nuova.',
  giorni: [
    {
      n: 1, nome: 'UPPER A',
      prescrizioni: [
        { esercizioId: 'lat-machine-trazy', nomePdf: 'Lat machine trazy bar', ordine: 1,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'F1 in contrazione' },
        { esercizioId: 'chest-press', nomePdf: 'Chest press', ordine: 2,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Tensione continua' },
        { esercizioId: 'pulley-asta-dritta', nomePdf: 'Pulley asta dritta', ordine: 3,
          blocchi: w1([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'croci-cavi', nomePdf: 'Croci ai cavi', ordine: 4,
          blocchi: w1([b(2, 12, 15)]), rest: 75, note: 'Niente fermo in allungamento' },
        { esercizioId: 'alzate-laterali-manubri', nomePdf: 'Alzate laterali manubri', ordine: 5,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
        { esercizioId: 'push-down-sbarra-curva', nomePdf: 'Push down sbarra curva', ordine: 6,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
        { esercizioId: 'curl-manubri-panca-70', nomePdf: 'Curl manubri panca 70°', ordine: 7,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
      ],
    },
    {
      n: 2, nome: 'LOWER A',
      prescrizioni: [
        { esercizioId: 'crunch', nomePdf: 'Crunch macchina o cavo con corda', ordine: 1,
          blocchi: w1([b(2, 12)]), rest: 45, note: 'Prima delle gambe, regola del coach' },
        { esercizioId: 'reverse-crunch', nomePdf: 'Reverse crunch', ordine: 2,
          blocchi: w1([b(2, 15)]), rest: 45 },
        { esercizioId: 'leg-extension', nomePdf: 'Leg extension', ordine: 3,
          blocchi: w1([b(2, 12, 15)]), rest: 75, note: 'F1 in accorciamento. Vale anche da riscaldamento ginocchia' },
        { esercizioId: 'leg-press', nomePdf: 'Leg press', ordine: 4,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Quad focus' },
        { esercizioId: 'leg-curl', nomePdf: 'Leg curl', ordine: 5,
          blocchi: w1([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'hip-thrust', nomePdf: 'Hip trust', ordine: 6,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'F1 in contrazione' },
        { esercizioId: 'adductor', nomePdf: 'Adductor', ordine: 7,
          blocchi: w1([b(2, 12, 15)]), rest: 60, note: 'Tensione continua' },
        { esercizioId: 'polpacci-in-piedi', nomePdf: 'Polpacci in piedi', ordine: 8,
          blocchi: w1([b(2, 15)]), rest: 60, note: 'Full rom' },
      ],
    },
    {
      n: 3, nome: 'UPPER B',
      prescrizioni: [
        { esercizioId: 'panca-piana-manubri', nomePdf: 'Distensioni panca piana manubri', ordine: 1,
          blocchi: w1([b(2, 8, 10)]), rest: 120, note: 'Tempo pieno del coach. Tre serie di rampa prima' },
        { esercizioId: 'rematore-manubrio', nomePdf: 'Rematore manubrio', ordine: 2,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Focus gran dorsale, core compatto e schiena dritta' },
        { esercizioId: 'smith-panca-45', nomePdf: 'Distensioni alla smith panca 45°', ordine: 3,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Full rom' },
        { esercizioId: 'iliac-maniglia', nomePdf: 'Iliac maniglia singola', ordine: 4,
          blocchi: w1([b(2, 10, 12)]), rest: 90 },
        { esercizioId: 'alzate-laterali-cavo', nomePdf: 'Alzate laterali cavo basso', ordine: 5,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
        { esercizioId: 'apertura-posteriori', nomePdf: 'Apertura cavi per posteriori', ordine: 6,
          blocchi: w1([b(2, 15)]), rest: 60 },
        { esercizioId: 'french-press-manubri', nomePdf: 'French press manubri', ordine: 7,
          blocchi: w1([b(2, 12, 15)]), rest: 60, note: 'In superserie col curl se sei lungo di tempo' },
        { esercizioId: 'curl-cavo-basso', nomePdf: 'Curl cavo basso', ordine: 8,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
      ],
    },
    {
      n: 4, nome: 'LOWER B',
      prescrizioni: [
        { esercizioId: 'crunch', nomePdf: 'Crunch macchina o cavo con corda', ordine: 1,
          blocchi: w1([b(2, 12)]), rest: 45 },
        { esercizioId: 'reverse-crunch', nomePdf: 'Reverse crunch', ordine: 2,
          blocchi: w1([b(2, 15)]), rest: 45 },
        { esercizioId: 'leg-curl', nomePdf: 'Leg curl', ordine: 3,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Prima del RDL: femorali già caldi' },
        { esercizioId: 'rdl-manubri', nomePdf: 'RDL manubri', ordine: 4,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Fermati un dito sopra il massimo allungamento' },
        { esercizioId: 'squat-smith', nomePdf: 'Squat alla smith', ordine: 5,
          blocchi: w1([b(2, 10, 12)]), rest: 120, note: 'Rampa lunga: è il movimento che hai perso di più' },
        { esercizioId: 'bulgari-manubri', nomePdf: 'Bulgari con manubri', ordine: 6,
          blocchi: w1([b(2, 10, 12)]), rest: 90, note: 'Per gamba. Focus gluteo' },
        { esercizioId: 'abductor', nomePdf: 'Abductor', ordine: 7,
          blocchi: w1([b(2, 12, 15)]), rest: 60 },
        { esercizioId: 'polpacci-seduto', nomePdf: 'Polpacci seduto', ordine: 8,
          blocchi: w1([b(2, 15)]), rest: 60 },
      ],
    },
  ],
}

// Schede seed selezionabili dalla Sala oltre a quella del coach.
// Non stanno in programmiUtente: non si eliminano e non si perdono con un backup vecchio.
export const SCHEDE_SEED: Programma[] = [PROGRAMMA_RIATTIVAZIONE]
