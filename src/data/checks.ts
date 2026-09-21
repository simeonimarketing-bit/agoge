import type { Check } from '../types'

// 7 check antropometrici — estratti da pag. 1 dei PDF alimentari (Dic 2025 → Set 2026).
// La data è la data di inizio del piano alimentare corrispondente.
export const CHECKS: Check[] = [
  { data: '2025-11-23', peso: 78.5, bf: 18.86, fm: 14.8, lbm: 63.7, bmr: 1803, vita: 87, fianchi: 97, torace: 105, braccioSx: 36, braccioDx: 36, gambaSx: 63, gambaDx: 63, spalle: 125, bmi: 28.5 },
  { data: '2026-01-15', peso: 79.3, bf: 13.78, fm: 10.9, lbm: 68.4, bmr: 1829, vita: 84, fianchi: 98.5, torace: 105.5, braccioSx: 37, braccioDx: 37, gambaSx: 65, gambaDx: 65, spalle: 126, bmi: 28.8 },
  { data: '2026-02-19', peso: 80.1, bf: 12.61, fm: 10.1, lbm: 70, bmr: 1843, vita: 84.5, fianchi: 101, torace: 105, braccioSx: 37, braccioDx: 37, gambaSx: 65.5, gambaDx: 65.5, spalle: 125, bmi: 29.1 },
  { data: '2026-03-26', peso: 81.9, bf: 13.25, fm: 10.9, lbm: 71, bmr: 1864, vita: 85.5, fianchi: 100, torace: 105.5, braccioSx: 37.5, braccioDx: 37.5, gambaSx: 65.5, gambaDx: 65.5, spalle: 125.5, bmi: 29.7 },
  { data: '2026-04-30', peso: 82.7, bf: 13.22, fm: 10.9, lbm: 71.8, bmr: 1875, vita: 86.5, fianchi: 101, torace: 107.5, braccioSx: 38, braccioDx: 38, gambaSx: 65, gambaDx: 65, spalle: 128, bmi: 30 },
  { data: '2026-06-10', peso: 82.5, bf: 12.59, fm: 10.4, lbm: 72.1, bmr: 1875, vita: 85, fianchi: 100, torace: 105.5, braccioSx: 37, braccioDx: 37, gambaSx: 64, gambaDx: 64, spalle: 125, bmi: 29.9 },
  // Set 2026: dopo 3 settimane di stop. BF 12,59 → 19,21 a peso invariato è un salto da strumento
  // (bioimpedenza/idratazione), non da 7 kg di grasso in 3 mesi: si riporta com'è, senza raccontare storie.
  { data: '2026-09-16', peso: 82, bf: 19.21, fm: 15.8, lbm: 66.2, bmr: 1843, vita: 88.5, fianchi: 97.5, torace: 105.5, braccioSx: 37, braccioDx: 37, gambaSx: 63.5, gambaDx: 63.5, spalle: 124, bmi: 29.8 },
]

// prossimo controllo, dal PDF corrente
export const PROSSIMO_CHECK = { data: '2026-10-29', ora: '17:30' }

// Parametri con trend affidabile vs rumore di misura (BRIEF §6):
// peso e vita = trend vero; braccio/gamba = precisione al mezzo cm, non raccontare storie.
export const PARAMETRI_GRAFICABILI = [
  { key: 'peso', label: 'Peso', unit: 'kg', affidabile: true },
  { key: 'vita', label: 'Vita', unit: 'cm', affidabile: true },
  { key: 'bf', label: 'Massa grassa', unit: '%', affidabile: true },
  { key: 'lbm', label: 'Massa magra', unit: 'kg', affidabile: true },
] as const
// Il BMI non si grafica. Mai. (BRIEF §6)
