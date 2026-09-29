import type { Importazione } from '../src/lib/import-schema'
export const documento: Importazione = {
  avvisi: ['Verificare la data con il coach.'],
  programma: { nome: 'Scheda amici', dataInizio: '2026-09-28', durataSettimane: 2, nota: 'Controlla il movimento.', avvicinamento: true,
    giorni: [{ nome: 'Upper', addome: false, esercizi: [{ nome: 'Chest press', attrezzo: 'macchina', note: 'Sedile basso', rest: 90,
      settimane: [1, 2].map(n => ({ n, blocchi: [{ sets: 2, repMin: 8, repMax: 10, tecnica: null, backOff: false, aumentoCarico: false }] })) }] }] },
  checks: [{ data: '2026-09-28', misure: { peso: 70, bf: null, fm: null, lbm: null, bmr: null, vita: 80, fianchi: null, torace: null, braccioSx: null, braccioDx: null, gambaSx: null, gambaDx: null, spalle: null, bmi: null } }],
  alimentazione: { nome: 'Piano amici', dataInizio: '2026-09-28', note: 'Acqua secondo indicazioni del coach.', pasti: [
    { nome: 'Colazione', nota: null, opzioni: [{ titolo: 'Yogurt', voci: ['Yogurt 170 g', 'Avena 40 g'], categorie: ['latticini'], macro: null }] },
    { nome: 'Merenda', nota: 'Prima del workout', opzioni: [{ titolo: null, voci: ['Mela 150 g'], categorie: [], macro: { kcal: 80, proteine: 0, carboidrati: 20, grassi: 0, fibre: 2 } }] },
  ] },
}
