import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type {
  Stato, Sessione, LogEsercizio, DietaGiorno, Pasto, Programma,
  EsercizioCanonico, Alimento, VoceLibera, Profilo,
} from '../types'

const KEY = 'agoge.v1'

const PROFILO_DEFAULT: Profilo = { ospite: false, dietaLibera: false }

const VUOTO: Stato = {
  versione: 2,
  profilo: PROFILO_DEFAULT,
  sessioni: [],
  sessioneCorrente: null,
  dieta: {},
  incrementi: {},
  pesate: {},
  programmiUtente: [],
  canoniciUtente: [],
  alimentiUtente: [],
  noteCheckIn: '',
}

// ————— Date: sempre in ora LOCALE, mai toISOString() —————
// toISOString() converte in UTC: la mezzanotte italiana diventa le 22/23 del giorno prima
// e ogni "settimana", "media a 7 giorni" e "da lunedì" scivola di un giorno.
export function isoLocale(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const oggiISO = () => isoLocale(new Date())
export function aggiungiGiorni(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoLocale(d)
}
// lunedì della settimana che contiene la data
export function lunediDi(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return aggiungiGiorni(iso, -((d.getDay() + 6) % 7))
}
// giorni interi tra due date ISO (b − a)
export function giorniTra(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000)
}

const DIETA_GIORNO_VUOTA: DietaGiorno = {
  pasti: {}, acqua: false, acquaAllenamento: false, sgarro: false,
  integrazioneColazione: false, integrazioneCena: false,
}

type Azione =
  | { t: 'avvia-sessione'; giornoN: number; giornoNome: string; programmaId?: string }
  | { t: 'annulla-sessione' }
  | { t: 'logga-esercizio'; log: LogEsercizio }
  | { t: 'rimanda-esercizio'; esercizioId: string }
  | { t: 'riprendi-esercizio'; esercizioId: string }
  | { t: 'chiudi-sessione' }
  | { t: 'dieta'; data: string; patch: Partial<DietaGiorno> }
  | { t: 'dieta-pasto'; data: string; pasto: Pasto['id']; opzione: number | undefined }
  | { t: 'dieta-libera-aggiungi'; data: string; voce: VoceLibera }
  | { t: 'dieta-libera-rimuovi'; data: string; indice: number }
  | { t: 'pesata'; data: string; kg: number | undefined }
  | { t: 'incremento'; esercizioId: string; kg: number }
  | { t: 'profilo'; patch: Partial<Profilo> }
  | { t: 'salva-programma'; programma: Programma }
  | { t: 'elimina-programma'; id: string }
  | { t: 'aggiungi-canonico'; canonico: EsercizioCanonico }
  | { t: 'aggiungi-alimento'; alimento: Alimento }
  | { t: 'note-checkin'; testo: string }
  | { t: 'importa'; stato: Stato }

function riduci(s: Stato, a: Azione): Stato {
  switch (a.t) {
    case 'avvia-sessione':
      return {
        ...s,
        sessioneCorrente: {
          id: String(Date.now()), data: oggiISO(), giornoN: a.giornoN, giornoNome: a.giornoNome,
          programmaId: a.programmaId, esercizi: [], rimandati: [], inizio: new Date().toISOString(),
        },
      }
    case 'annulla-sessione':
      return { ...s, sessioneCorrente: null }
    case 'logga-esercizio': {
      if (!s.sessioneCorrente) return s
      const rest = s.sessioneCorrente.esercizi.filter(e => e.esercizioId !== a.log.esercizioId)
      const esercizi = a.log.serie.length === 0 ? rest : [...rest, a.log]
      // se loggato, esce dalla coda "in attesa"
      const rimandati = (s.sessioneCorrente.rimandati ?? []).filter(id => id !== a.log.esercizioId)
      return { ...s, sessioneCorrente: { ...s.sessioneCorrente, esercizi, rimandati } }
    }
    case 'rimanda-esercizio': {
      if (!s.sessioneCorrente) return s
      const r = new Set(s.sessioneCorrente.rimandati ?? [])
      r.add(a.esercizioId)
      return { ...s, sessioneCorrente: { ...s.sessioneCorrente, rimandati: [...r] } }
    }
    case 'riprendi-esercizio': {
      if (!s.sessioneCorrente) return s
      return {
        ...s,
        sessioneCorrente: {
          ...s.sessioneCorrente,
          rimandati: (s.sessioneCorrente.rimandati ?? []).filter(id => id !== a.esercizioId),
        },
      }
    }
    case 'chiudi-sessione': {
      const c = s.sessioneCorrente
      if (!c || c.esercizi.length === 0) return { ...s, sessioneCorrente: null }
      const chiusa: Sessione = { ...c, fine: new Date().toISOString() }
      return { ...s, sessioneCorrente: null, sessioni: [...s.sessioni, chiusa] }
    }
    case 'dieta': {
      const g = s.dieta[a.data] ?? DIETA_GIORNO_VUOTA
      return { ...s, dieta: { ...s.dieta, [a.data]: { ...g, ...a.patch } } }
    }
    case 'dieta-pasto': {
      const g = s.dieta[a.data] ?? DIETA_GIORNO_VUOTA
      const pasti = { ...g.pasti }
      if (a.opzione === undefined) delete pasti[a.pasto]
      else pasti[a.pasto] = a.opzione
      return { ...s, dieta: { ...s.dieta, [a.data]: { ...g, pasti } } }
    }
    case 'dieta-libera-aggiungi': {
      const g = s.dieta[a.data] ?? DIETA_GIORNO_VUOTA
      return { ...s, dieta: { ...s.dieta, [a.data]: { ...g, libere: [...(g.libere ?? []), a.voce] } } }
    }
    case 'dieta-libera-rimuovi': {
      const g = s.dieta[a.data] ?? DIETA_GIORNO_VUOTA
      return { ...s, dieta: { ...s.dieta, [a.data]: { ...g, libere: (g.libere ?? []).filter((_, i) => i !== a.indice) } } }
    }
    case 'pesata': {
      const pesate = { ...s.pesate }
      if (a.kg === undefined) delete pesate[a.data]
      else pesate[a.data] = a.kg
      return { ...s, pesate }
    }
    case 'incremento':
      return { ...s, incrementi: { ...s.incrementi, [a.esercizioId]: a.kg } }
    case 'profilo':
      return { ...s, profilo: { ...s.profilo, ...a.patch } }
    case 'salva-programma': {
      const altri = s.programmiUtente.filter(p => p.id !== a.programma.id)
      return { ...s, programmiUtente: [...altri, a.programma] }
    }
    case 'elimina-programma':
      return {
        ...s,
        programmiUtente: s.programmiUtente.filter(p => p.id !== a.id),
        profilo: s.profilo.programmaAttivoId === a.id ? { ...s.profilo, programmaAttivoId: undefined } : s.profilo,
      }
    case 'aggiungi-canonico':
      return { ...s, canoniciUtente: [...s.canoniciUtente.filter(c => c.id !== a.canonico.id), a.canonico] }
    case 'aggiungi-alimento':
      return { ...s, alimentiUtente: [...s.alimentiUtente.filter(x => x.nome !== a.alimento.nome), a.alimento] }
    case 'note-checkin':
      return { ...s, noteCheckIn: a.testo }
    case 'importa':
      return migra(a.stato)
  }
}

// migrazione v1 → v2 (serie: backOff → tipo)
function migra(raw: any): Stato {
  const s = { ...VUOTO, ...raw }
  s.versione = 2
  s.profilo = { ...PROFILO_DEFAULT, ...(raw.profilo ?? {}) }
  const fix = (sess: any) => ({
    ...sess,
    esercizi: (sess.esercizi ?? []).map((e: any) => ({
      ...e,
      serie: (e.serie ?? []).map((x: any) => ({
        carico: x.carico, reps: x.reps,
        tipo: x.tipo ?? (x.backOff ? 'backoff' : 'working'),
        rir: x.rir, tecnica: x.tecnica,
      })),
    })),
  })
  s.sessioni = (s.sessioni ?? []).map(fix)
  s.sessioneCorrente = s.sessioneCorrente ? fix(s.sessioneCorrente) : null
  return s as Stato
}

function carica(): Stato {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migra(JSON.parse(raw))
  } catch { /* dati corrotti: riparti pulito, il backup esiste apposta */ }
  return VUOTO
}

const Ctx = createContext<{ stato: Stato; invia: (a: Azione) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stato, invia] = useReducer(riduci, undefined, carica)
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(stato))
  }, [stato])
  return <Ctx.Provider value={{ stato, invia }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider mancante')
  return v
}

export function esportaBackup(stato: Stato) {
  const blob = new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `agoge-backup-${oggiISO()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
