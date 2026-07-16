import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import type { Stato, Sessione, LogEsercizio, DietaGiorno, Pasto } from '../types'

const KEY = 'agoge.v1'

const VUOTO: Stato = {
  versione: 1,
  sessioni: [],
  sessioneCorrente: null,
  dieta: {},
  incrementi: {},
}

export function oggiISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DIETA_GIORNO_VUOTA: DietaGiorno = {
  pasti: {}, acqua: false, acquaAllenamento: false, sgarro: false,
  integrazioneColazione: false, integrazioneCena: false,
}

type Azione =
  | { t: 'avvia-sessione'; giornoN: number; giornoNome: string }
  | { t: 'annulla-sessione' }
  | { t: 'logga-esercizio'; log: LogEsercizio }
  | { t: 'chiudi-sessione' }
  | { t: 'dieta'; data: string; patch: Partial<DietaGiorno> }
  | { t: 'dieta-pasto'; data: string; pasto: Pasto['id']; opzione: number | undefined }
  | { t: 'incremento'; esercizioId: string; kg: number }
  | { t: 'importa'; stato: Stato }

function riduci(s: Stato, a: Azione): Stato {
  switch (a.t) {
    case 'avvia-sessione':
      return {
        ...s,
        sessioneCorrente: {
          id: String(Date.now()), data: oggiISO(), giornoN: a.giornoN, giornoNome: a.giornoNome,
          esercizi: [], inizio: new Date().toISOString(),
        },
      }
    case 'annulla-sessione':
      return { ...s, sessioneCorrente: null }
    case 'logga-esercizio': {
      if (!s.sessioneCorrente) return s
      const rest = s.sessioneCorrente.esercizi.filter(e => e.esercizioId !== a.log.esercizioId)
      const esercizi = a.log.serie.length === 0 ? rest : [...rest, a.log]
      return { ...s, sessioneCorrente: { ...s.sessioneCorrente, esercizi } }
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
    case 'incremento':
      return { ...s, incrementi: { ...s.incrementi, [a.esercizioId]: a.kg } }
    case 'importa':
      return a.stato
  }
}

function carica(): Stato {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...VUOTO, ...JSON.parse(raw) }
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
