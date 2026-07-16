import type { Blocco, Prescrizione, Sessione, LogSerie, Stato } from '../types'
import { PROGRAMMA } from '../data/programma'
import { canonicoById } from '../data/canonici'

// ————— Settimana corrente del ciclo —————
export function settimanaCorrente(oggi = new Date()): { n: number; totale: number; fuoriCiclo: boolean } {
  const inizio = new Date(PROGRAMMA.dataInizio + 'T00:00:00')
  const giorni = Math.floor((oggi.getTime() - inizio.getTime()) / 86_400_000)
  const n = Math.floor(giorni / 7) + 1
  const tot = PROGRAMMA.durataSettimane
  return { n: Math.min(Math.max(n, 1), tot), totale: tot, fuoriCiclo: n > tot || n < 1 }
}

// ————— Storico per esercizio canonico (mai per riga PDF — BRIEF §4) —————
export interface VoceStorico {
  data: string
  giornoNome: string
  serie: LogSerie[]
}

export function storicoEsercizio(stato: Stato, esercizioId: string): VoceStorico[] {
  const out: VoceStorico[] = []
  for (const s of stato.sessioni) {
    for (const e of s.esercizi) {
      if (e.esercizioId === esercizioId && e.serie.length > 0) {
        out.push({ data: s.data, giornoNome: s.giornoNome, serie: e.serie })
      }
    }
  }
  return out.sort((a, b) => a.data.localeCompare(b.data))
}

export function ultimaVolta(stato: Stato, esercizioId: string): VoceStorico | null {
  const st = storicoEsercizio(stato, esercizioId)
  return st.length ? st[st.length - 1] : null
}

// Record storico: carico massimo mai loggato (serie lavoranti, back off esclusi)
export function record(stato: Stato, esercizioId: string): { carico: number; reps: number; data: string } | null {
  let best: { carico: number; reps: number; data: string } | null = null
  for (const v of storicoEsercizio(stato, esercizioId)) {
    for (const s of v.serie) {
      if (s.backOff) continue
      if (!best || s.carico > best.carico || (s.carico === best.carico && s.reps > best.reps)) {
        best = { carico: s.carico, reps: s.reps, data: v.data }
      }
    }
  }
  return best
}

// ————— Incremento di carico (convenzione mia, hardcodata: modificabile per esercizio) —————
export function incrementoDefault(esercizioId: string): number {
  const c = canonicoById(esercizioId)
  return c?.attrezzo === 'manubri' ? 2 : 2.5
}

// ————— La doppia progressione — l'algoritmo del coach, aritmetica pura —————
// "Aumenta prima le reps nel range indicato. Al limite massimo: aumenta il carico
//  e torna al range minimo." (PDF, regole globali)
export interface Target {
  carico: number | null // null = nessuno storico, scegli tu
  reps: number
  aumento: boolean // true = oggi si sale di carico
  motivo: string
}

export function targetBlocco(blocco: Blocco, ultima: VoceStorico | null, incremento: number): Target {
  const repMin = blocco.repMin
  const repMax = blocco.repMax ?? blocco.repMin
  if (!ultima) {
    return { carico: null, reps: repMin, aumento: false, motivo: 'Prima volta: scegli il carico' }
  }
  // serie di riferimento: la migliore serie lavorante dell'ultima sessione
  const lavoranti = ultima.serie.filter(s => !s.backOff)
  if (lavoranti.length === 0) {
    return { carico: null, reps: repMin, aumento: false, motivo: 'Nessuna serie lavorante loggata' }
  }
  const rif = lavoranti.reduce((a, s) => (s.carico > a.carico ? s : a))
  if (rif.reps >= repMax) {
    return {
      carico: rif.carico + incremento,
      reps: repMin,
      aumento: true,
      motivo: `Range chiuso a ${rif.reps} reps: carico +${incremento} kg, torni a ${repMin}`,
    }
  }
  return {
    carico: rif.carico,
    reps: Math.min(rif.reps + 1, repMax),
    aumento: false,
    motivo: `Ultima volta ${rif.carico} kg × ${rif.reps}: punta a ${Math.min(rif.reps + 1, repMax)}`,
  }
}

// Blocchi della prescrizione per la settimana corrente
export function blocchiSettimana(p: Prescrizione, settimana: number): Blocco[] {
  return p.blocchi[settimana] ?? p.blocchi[PROGRAMMA.durataSettimane] ?? []
}

// ————— Tonnellaggio (fatti, non consigli) —————
export function tonnellaggio(serie: LogSerie[]): number {
  return serie.reduce((t, s) => t + s.carico * s.reps, 0)
}

export function tonnellaggioSessione(s: Sessione): number {
  return s.esercizi.reduce((t, e) => t + tonnellaggio(e.serie), 0)
}

// Formatta kg: 1250 -> "1.250", 14200 -> "14,2 t"
export function fmtKg(kg: number): { v: string; u: string } {
  if (kg >= 10000) return { v: (kg / 1000).toFixed(1).replace('.', ','), u: 't' }
  return { v: kg.toLocaleString('it-IT'), u: 'kg' }
}

export function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function fmtBlocco(b: Blocco): string {
  const reps = b.repMax && b.repMax !== b.repMin ? `${b.repMin}-${b.repMax}` : `${b.repMin}`
  const extra = [b.tecnica, b.backOff ? 'back off' : null].filter(Boolean).join(' · ')
  return `${b.sets}×${reps}${extra ? `  ${extra}` : ''}`
}
