// ————— Schema dati (BRIEF §4, esteso v2) —————

export interface EsercizioCanonico {
  id: string
  nome: string
  alias: string[]
  attrezzo: 'manubri' | 'bilanciere' | 'macchina' | 'cavo' | 'corpo'
  custom?: boolean // creato dall'utente (modalità ospite / editor)
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
  // blocchi indicizzati per settimana 1..N (il PDF può avere 4 o 5 colonne)
  blocchi: Record<number, Blocco[]>
  rest?: number // secondi; assente = "quando ti senti pronto"
  note?: string
  flag?: string // anomalia rilevata al parsing, confermata in import
}

export interface GiornoProgramma {
  n: number
  nome: string
  addome?: boolean
  prescrizioni: Prescrizione[]
}

export interface Programma {
  id: string
  nome: string
  dataInizio: string // ISO
  durataSettimane: number
  pdfSorgente?: string
  giorni: GiornoProgramma[]
  nota?: string // regola valida per tutto il ciclo, mostrata in Oggi
  soloArchivio?: boolean // non selezionare automaticamente come scheda attiva
  avvicinamento?: boolean
  custom?: boolean // creato con l'editor in-app
}

// ————— Log v2 —————

export type TipoSerie =
  | 'riscaldamento' | 'preparatoria' | 'working' | 'top'
  | 'backoff' | 'drop' | 'restpause' | 'parziale'

// le serie che contano per volume, record e progressione
export const TIPI_ALLENANTI: TipoSerie[] = ['working', 'top']

export type Tecnica = 'pulita' | 'sporca' | 'compromessa'

export interface LogSerie {
  carico: number // kg
  reps: number
  tipo: TipoSerie
  rir?: 0 | 1 | 2 | 3 | 4 // 4 = "4+"
  tecnica?: Tecnica
}

export interface LogEsercizio {
  esercizioId: string
  nome?: string
  prescrizione?: Blocco[]
  serie: LogSerie[]
  note?: string
}

export interface Sessione {
  id: string
  data: string // ISO date
  giornoN: number
  giornoNome: string
  programmaId?: string
  programmaSnapshot?: Programma
  settimana?: number
  esercizi: LogEsercizio[]
  inizio?: string // ISO datetime
  fine?: string
  // gestione attrezzi occupati: solo ordine della seduta, la scheda non cambia
  rimandati?: string[] // esercizioId in coda
}

// ————— Antropometria —————

export interface Check {
  data: string
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

// ————— Alimentazione —————

export type CategoriaFrequenza =
  | 'legumi' | 'pesce' | 'carne_rossa' | 'carne_bianca' | 'uova' | 'latticini' | 'affettato'

export interface Macro {
  kcal: number
  proteine: number
  carboidrati: number
  grassi: number
  fibre: number
}

export interface OpzionePasto {
  n: number
  titolo?: string
  voci: string[]
  categorie: CategoriaFrequenza[]
  macro?: Macro // calcolati da tabelle nutrizionali, NON presenti nei PDF del coach
  assunzioni?: string[] // convenzioni usate nel calcolo (es. "1 frutto = mela 150g")
}

export interface Pasto {
  id: string
  nome: string
  nota?: string
  opzioni: OpzionePasto[]
}

// alimento per la dieta libera (macro per 100g)
export interface Alimento {
  nome: string
  per100: Macro
  custom?: boolean
}

export interface VoceLibera {
  alimento: string
  grammi: number
  macro: Macro // già scalati sui grammi
}

// ————— Stato persistito —————

export interface DietaGiorno {
  pasti: Partial<Record<Pasto['id'], number>>
  libere?: VoceLibera[] // dieta libera (ospiti o eccezioni)
  acqua: boolean
  acquaAllenamento: boolean
  sgarro: boolean
  integrazioneColazione: boolean
  integrazioneCena: boolean
}

export interface Profilo {
  inizializzato?: boolean
  ospite: boolean // true = amico: niente dati seed di Salvatore
  nome?: string
  dietaLibera: boolean // logging alimentare senza opzioni
  programmaAttivoId?: string
}

export interface DocumentoPdf {
  id: string
  nome: string
  titolo: string
  dimensione: number
  caricatoIl: string
  dataDocumento?: string
  categoria: 'allenamento' | 'alimentazione' | 'check' | 'misto' | 'da-classificare'
  stato: 'da-leggere' | 'importato'
  programmi: string[]
  piani: string[]
  checks: string[]
}

export interface Stato {
  documentiPdf: DocumentoPdf[]
  versione: 2
  profilo: Profilo
  sessioni: Sessione[]
  sessioneCorrente: Sessione | null
  dieta: Record<string, DietaGiorno>
  incrementi: Record<string, number>
  pesate: Record<string, number> // pesata quotidiana: data ISO -> kg
  programmiUtente: Programma[] // creati con l'editor
  canoniciUtente: EsercizioCanonico[] // esercizi custom
  alimentiUtente: Alimento[] // alimenti aggiunti a mano
  checksUtente: (Partial<Check> & { data: string })[]
  pianiAlimentari: { id: string; nome: string; dataInizio: string; note?: string; pasti: Pasto[] }[]
  pianoAlimentareId?: string
  nomiEsercizi: Record<string, string>
  noteEsercizi: Record<string, string>
  noteWorkout: Record<string, string>
  noteCheckIn: string // note e fastidi per il prossimo check-in
}
