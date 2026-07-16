import type { Blocco, Prescrizione, Sessione, LogSerie, Stato, Programma, TipoSerie } from '../types'
import { TIPI_ALLENANTI } from '../types'
import { PROGRAMMA } from '../data/programma'
import { canonicoById, CANONICI } from '../data/canonici'

// ————— Carichi reali: tutto si muove a passi di 2,5 kg —————
// (manubri 10 → 12,5 → 15 → 17,5 → 20; bilanciere con le 1,25 per lato = 2,5 totali)
export const PASSO_CARICO = 2.5
export const arrotondaCarico = (kg: number) => Math.round(kg / PASSO_CARICO) * PASSO_CARICO
export const fmtCarico = (kg: number) => (kg % 1 === 0 ? String(kg) : kg.toFixed(1).replace('.', ','))

export function incrementoDefault(_esercizioId: string): number {
  return PASSO_CARICO
}

// ————— Programma attivo (seed di Salvatore o creato con l'editor) —————
export function programmaAttivo(stato: Stato): Programma {
  if (stato.profilo.programmaAttivoId) {
    const p = stato.programmiUtente.find(p => p.id === stato.profilo.programmaAttivoId)
    if (p) return p
  }
  if (stato.profilo.ospite) return stato.programmiUtente[0] ?? PROGRAMMA_VUOTO
  return PROGRAMMA
}

const PROGRAMMA_VUOTO: Programma = {
  id: 'vuoto', nome: 'Nessuna scheda', dataInizio: '2026-01-01', durataSettimane: 5, giorni: [], custom: true,
}

export function tuttiICanonici(stato: Stato) {
  return [...CANONICI, ...stato.canoniciUtente]
}

export function canonico(stato: Stato, id: string) {
  return canonicoById(id) ?? stato.canoniciUtente.find(c => c.id === id)
}

// ————— Settimana corrente del ciclo —————
export function settimanaCorrente(programma: Programma, oggi = new Date()): { n: number; totale: number; fuoriCiclo: boolean } {
  const inizio = new Date(programma.dataInizio + 'T00:00:00')
  const giorni = Math.floor((oggi.getTime() - inizio.getTime()) / 86_400_000)
  const n = Math.floor(giorni / 7) + 1
  const tot = programma.durataSettimane
  return { n: Math.min(Math.max(n, 1), tot), totale: tot, fuoriCiclo: n > tot || n < 1 }
}

// ————— Serie: allenanti vs il resto —————
export const isAllenante = (s: LogSerie) => TIPI_ALLENANTI.includes(s.tipo)

export const TIPI_LABEL: Record<TipoSerie, string> = {
  riscaldamento: 'Riscaldamento', preparatoria: 'Preparatoria', working: 'Working', top: 'Top set',
  backoff: 'Back off', drop: 'Drop set', restpause: 'Rest-pause', parziale: 'Parziali',
}
export const TIPI_SIGLA: Record<TipoSerie, string> = {
  riscaldamento: 'W-UP', preparatoria: 'PREP', working: 'W', top: 'TOP',
  backoff: 'BO', drop: 'DROP', restpause: 'R-P', parziale: 'PARZ',
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

// Record: solo serie allenanti (working/top). Drop, back off e riscaldamenti non contano.
export function record(stato: Stato, esercizioId: string): { carico: number; reps: number; data: string } | null {
  let best: { carico: number; reps: number; data: string } | null = null
  for (const v of storicoEsercizio(stato, esercizioId)) {
    for (const s of v.serie) {
      if (!isAllenante(s)) continue
      if (!best || s.carico > best.carico || (s.carico === best.carico && s.reps > best.reps)) {
        best = { carico: s.carico, reps: s.reps, data: v.data }
      }
    }
  }
  return best
}

// Record di reps per un carico specifico
export function recordReps(stato: Stato, esercizioId: string, carico: number): number {
  let best = 0
  for (const v of storicoEsercizio(stato, esercizioId)) {
    for (const s of v.serie) {
      if (isAllenante(s) && s.carico === carico && s.reps > best) best = s.reps
    }
  }
  return best
}

// e1RM (Epley) — è una STIMA, dichiarata come tale nell'interfaccia
export const e1rm = (carico: number, reps: number) => Math.round(carico * (1 + reps / 30) * 10) / 10

export function migliorSerie(serie: LogSerie[]): LogSerie | null {
  const allenanti = serie.filter(isAllenante)
  if (!allenanti.length) return null
  return allenanti.reduce((a, s) => (e1rm(s.carico, s.reps) > e1rm(a.carico, a.reps) ? s : a))
}

// ————— La doppia progressione — l'algoritmo del coach, aritmetica pura —————
export interface Target {
  carico: number | null
  reps: number
  aumento: boolean
  motivo: string
}

export function targetBlocco(blocco: Blocco, ultima: VoceStorico | null, incremento: number): Target {
  const repMin = blocco.repMin
  const repMax = blocco.repMax ?? blocco.repMin
  if (!ultima) {
    return { carico: null, reps: repMin, aumento: false, motivo: 'Prima volta: scegli il carico' }
  }
  // riferimento: la migliore serie ALLENANTE dell'ultima sessione
  const rif = migliorSerie(ultima.serie)
  if (!rif) {
    return { carico: null, reps: repMin, aumento: false, motivo: 'Nessuna working set nell’ultimo log' }
  }
  if (rif.reps >= repMax) {
    const nuovo = arrotondaCarico(rif.carico + incremento)
    return {
      carico: nuovo, reps: repMin, aumento: true,
      motivo: `Range chiuso a ${rif.reps} reps → ${fmtCarico(nuovo)} kg, torni a ${repMin}`,
    }
  }
  return {
    carico: rif.carico,
    reps: Math.min(rif.reps + 1, repMax),
    aumento: false,
    motivo: `Ultima: ${fmtCarico(rif.carico)} kg × ${rif.reps}${rif.rir !== undefined ? ` @${rif.rir}RIR` : ''} → punta a ${Math.min(rif.reps + 1, repMax)}`,
  }
}

export function blocchiSettimana(p: Prescrizione, settimana: number): Blocco[] {
  const max = Math.max(...Object.keys(p.blocchi).map(Number))
  return p.blocchi[settimana] ?? p.blocchi[max] ?? []
}

// ————— Statistiche (fatti, non consigli) —————
export function tonnellaggio(serie: LogSerie[]): number {
  // i riscaldamenti non entrano nel tonnellaggio
  return serie.filter(s => s.tipo !== 'riscaldamento').reduce((t, s) => t + s.carico * s.reps, 0)
}

export function tonnellaggioSessione(s: Sessione): number {
  return s.esercizi.reduce((t, e) => t + tonnellaggio(e.serie), 0)
}

export function serieAllenantiSessione(s: Sessione): number {
  return s.esercizi.reduce((t, e) => t + e.serie.filter(isAllenante).length, 0)
}

export function rirMedio(serie: LogSerie[]): number | null {
  const conRir = serie.filter(s => isAllenante(s) && s.rir !== undefined)
  if (!conRir.length) return null
  return Math.round((conRir.reduce((t, s) => t + (s.rir ?? 0), 0) / conRir.length) * 10) / 10
}

export function fmtKg(kg: number): { v: string; u: string } {
  if (kg >= 10000) return { v: (kg / 1000).toFixed(1).replace('.', ','), u: 't' }
  return { v: Math.round(kg).toLocaleString('it-IT'), u: 'kg' }
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

// media mobile a 7 giorni delle pesate
export function mediaMobile7(pesate: Record<string, number>, data: string): number | null {
  const d0 = new Date(data + 'T00:00:00')
  const valori: number[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(d0)
    d.setDate(d0.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    if (pesate[iso] !== undefined) valori.push(pesate[iso])
  }
  if (!valori.length) return null
  return Math.round((valori.reduce((a, b) => a + b, 0) / valori.length) * 100) / 100
}
