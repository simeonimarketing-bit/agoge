// ————— Schema dati (BRIEF §4) —————

export interface EsercizioCanonico {
  id: string
  nome: string
  alias: string[]
  attrezzo: 'manubri' | 'bilanciere' | 'macchina' | 'cavo' | 'corpo'
}

export interface Blocco {
  sets: number
  repMin: number
  repMax?: number // assente = reps fisse
  tecnica?: string // "+1 drop", "TC", ...
  backOff?: boolean // serie di scarico -20/25%
  aumentoCarico?: boolean // freccia ⬆ del coach
}

export interface Prescrizione {
  esercizioId: string
  nomePdf: string // com'era scritto nel PDF (riferimento secondario)
  ordine: number
  // blocchi indicizzati per settimana 1..5 (il PDF può avere 4 o 5 colonne)
  blocchi: Record<number, Blocco[]>
  rest?: number // secondi; assente = "quando ti senti pronto"
  note?: string
  flag?: string // anomalia rilevata al parsing, confermata in import
}

export interface GiornoProgramma {
  n: number
  nome: string
  addome?: boolean // regola globale: addome prima di dorso e gambe
  prescrizioni: Prescrizione[]
}

export interface Programma {
  id: string
  nome: string
  dataInizio: string // ISO
  durataSettimane: number
  pdfSorgente: string
  giorni: GiornoProgramma[]
}

// ————— Log —————

export interface LogSerie {
  carico: number // kg
  reps: number
  backOff?: boolean
}

export interface LogEsercizio {
  esercizioId: string
  serie: LogSerie[]
  note?: string
}

export interface Sessione {
  id: string
  data: string // ISO date
  giornoN: number
  giornoNome: string
  esercizi: LogEsercizio[]
  inizio?: string // ISO datetime
  fine?: string
}

// ————— Antropometria (15 parametri, BRIEF §6) —————

export interface Check {
  data: string // ISO — data inizio piano alimentare
  peso: number
  bf: number
  fm: number
  lbm: number
  bmr: number
  vita: number
  fianchi: number
  torace: number
  braccioSx: number
  braccioDx: number
  gambaSx: number
  gambaDx: number
  spalle: number
  bmi: number // presente nei dati, MAI graficato
}

// ————— Alimentazione (l'opzione è l'unità, BRIEF §7) —————

export type CategoriaFrequenza =
  | 'legumi' | 'pesce' | 'carne_rossa' | 'carne_bianca' | 'uova' | 'latticini' | 'affettato'

export interface OpzionePasto {
  n: number
  titolo?: string
  voci: string[]
  categorie: CategoriaFrequenza[]
}

export interface Pasto {
  id: 'colazione' | 'pranzo' | 'spuntino' | 'cena'
  nome: string
  nota?: string
  opzioni: OpzionePasto[]
}

// ————— Stato persistito —————

export interface DietaGiorno {
  pasti: Partial<Record<Pasto['id'], number>> // n opzione scelta
  acqua: boolean // 2 litri base
  acquaAllenamento: boolean // +1 litro se ci si allena
  sgarro: boolean
  integrazioneColazione: boolean
  integrazioneCena: boolean
}

export interface Stato {
  versione: 1
  sessioni: Sessione[]
  sessioneCorrente: Sessione | null
  dieta: Record<string, DietaGiorno> // chiave = data ISO
  incrementi: Record<string, number> // esercizioId -> kg di incremento doppia progressione
}
