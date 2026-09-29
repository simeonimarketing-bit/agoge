import type { Importazione } from './import-schema'

// Lettore dei PDF di Antonio Pappa (scheda di allenamento e piano alimentare,
// con le misure del check nella prima pagina). Gira tutto sul dispositivo.
// Chi segue un altro coach crea scheda e dieta a mano: qui si riconosce un
// solo formato, e lo si riconosce bene.

export interface Voce { x: number; y: number; w: number; s: string }
export interface Pagina {
  voci: Voce[]
  orizz: { y: number; x1: number; x2: number }[]
  vert: { x: number; y1: number; y2: number }[]
}

export class FormatoNonRiconosciuto extends Error {}

type Programma = NonNullable<Importazione['programma']>
type Esercizio = Programma['giorni'][number]['esercizi'][number]
type Blocco = Esercizio['settimane'][number]['blocchi'][number]
type Alimentazione = NonNullable<Importazione['alimentazione']>
type Pasto = Alimentazione['pasti'][number]
type Opzione = Pasto['opzioni'][number]

// ————— Ricostruzione delle righe: celle di tabella e testo libero —————

interface Cella { x1: number; x2: number; righe: string[] }
type Elemento = { t: 'riga'; celle: Cella[] } | { t: 'testo'; s: string }

const spazi = (s: string) => s.replace(/\s+/g, ' ').trim()

function unisciRiga(voci: Voce[]): string {
  const ordinate = [...voci].sort((a, b) => a.x - b.x)
  let out = ''
  let fine = -Infinity
  for (const v of ordinate) {
    if (out && v.x - fine > 1.5 && !out.endsWith(' ')) out += ' '
    out += v.s
    fine = v.x + v.w
  }
  return spazi(out)
}

function perRighe(voci: Voce[]): string[] {
  const gruppi: Voce[][] = []
  for (const v of [...voci].sort((a, b) => b.y - a.y)) {
    const g = gruppi.find(g => Math.abs(g[0].y - v.y) < 2.5)
    if (g) g.push(v); else gruppi.push([v])
  }
  return gruppi.map(unisciRiga).filter(Boolean)
}

function raggruppa(valori: number[], tolleranza: number): number[] {
  const out: number[] = []
  for (const v of [...valori].sort((a, b) => a - b)) if (!out.length || v - out[out.length - 1] > tolleranza) out.push(v)
  return out
}

function elementiPagina(p: Pagina): Elemento[] {
  const livelli = raggruppa(p.orizz.map(o => o.y), 1.5).reverse()
  const usate = new Set<Voce>()
  const blocchi: { y: number; el: Elemento }[] = []
  for (let i = 0; i + 1 < livelli.length; i++) {
    const alto = livelli[i], basso = livelli[i + 1]
    const xs = raggruppa(p.vert.filter(v => v.y1 <= basso + 2 && v.y2 >= alto - 2).map(v => v.x), 1.5)
    if (xs.length < 2) continue
    const celle: Cella[] = []
    for (let j = 0; j + 1 < xs.length; j++) {
      const dentro = p.voci.filter(v => !usate.has(v) && v.y > basso && v.y < alto && v.x + Math.min(v.w, 8) / 2 >= xs[j] && v.x + Math.min(v.w, 8) / 2 < xs[j + 1])
      dentro.forEach(v => usate.add(v))
      celle.push({ x1: xs[j], x2: xs[j + 1], righe: perRighe(dentro) })
    }
    if (celle.some(c => c.righe.length)) blocchi.push({ y: alto, el: { t: 'riga', celle } })
  }
  const libere = p.voci.filter(v => !usate.has(v))
  const righeLibere: Voce[][] = []
  for (const v of [...libere].sort((a, b) => b.y - a.y)) {
    const g = righeLibere.find(g => Math.abs(g[0].y - v.y) < 2.5)
    if (g) g.push(v); else righeLibere.push([v])
  }
  for (const g of righeLibere) blocchi.push({ y: g[0].y, el: { t: 'testo', s: unisciRiga(g) } })
  return blocchi.sort((a, b) => b.y - a.y).map(b => b.el)
}

// Una riga per ogni linea di testo, celle affiancate separate da uno spazio
function righePiatte(pagine: Pagina[]): string[][] {
  return pagine.map(p => elementiPagina(p).flatMap(el => {
    if (el.t === 'testo') return [el.s]
    const n = Math.max(...el.celle.map(c => c.righe.length))
    return Array.from({ length: n }, (_, i) => spazi(el.celle.map(c => c.righe[i] ?? '').join(' '))).filter(Boolean)
  }))
}

// ————— Utilità —————

const numero = (s: string) => Number(s.replace(',', '.'))

function dataIso(testo: string, etichetta: RegExp): string | null {
  const m = testo.match(new RegExp(etichetta.source + String.raw`\s*:?\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})`, 'i'))
  if (!m) return null
  const anno = m[3].length === 2 ? '20' + m[3] : m[3]
  return `${anno}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const PAROLE_NUMERO: Record<string, number> = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 }

const frase = (s: string) => { const t = spazi(s); return t ? t[0].toLocaleUpperCase('it') + t.slice(1).toLocaleLowerCase('it') : t }
const inizialeMaiuscola = (s: string) => { const t = spazi(s); return t ? t[0].toLocaleUpperCase('it') + t.slice(1) : t }

// "Allenamento - Mario Rossi - Ottobre.pdf" → "Ottobre"
function nomeDaFile(file: string, tipo: RegExp, atleta: string | null): string | null {
  let s = file.replace(/\.pdf$/i, '').replace(tipo, ' ')
  if (atleta) for (const parola of atleta.split(/\s+/)) if (parola.length > 1) s = s.replace(new RegExp(`\\b${parola}\\b`, 'ig'), ' ')
  s = spazi(s.replace(/[-_–]+/g, ' '))
  return s ? inizialeMaiuscola(s) : null
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const nomeDaData = (iso: string | null, prefisso: string) => iso ? `${prefisso} ${inizialeMaiuscola(MESI[Number(iso.slice(5, 7)) - 1])} ${iso.slice(0, 4)}` : prefisso

// ————— Scheda di allenamento —————

const BLOCCO = /(\d{1,2})\s*[x×X]\s*(\d{1,3}(?:[.,]5)?)(?:\s*[-–]\s*(\d{1,3}(?:[.,]5)?))?/g

function attrezzo(nome: string): Esercizio['attrezzo'] {
  const n = nome.toLocaleLowerCase('it')
  if (/manubri|manubrio|db\b|hammer/.test(n)) return 'manubri'
  if (/\bcav[oi]\b|pulley|push ?down|corda|lat\b|lat machine|pulldown|face pull|iliac|crunch al cavo/.test(n)) return 'cavo'
  if (/bilanciere|\bbil\b|\bez\b|stacco|rdl|squat(?! machine)|smith/.test(n)) return 'bilanciere'
  if (/dip|trazion|corpo libero|affondi in camminata|piegament|plank/.test(n)) return 'corpo'
  return 'macchina'
}

function settimaneIntestazione(testo: string): number[] {
  const m = testo.match(/sett\w*\.?\s*(\d+)(?:\s*(?:e|-|–|\/|,|a)\s*(\d+))?/i)
  if (!m) return []
  const a = Number(m[1]), b = m[2] ? Number(m[2]) : a
  return b >= a && b - a < 10 ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]
}

// Una cella settimana: uno o più blocchi (il secondo a reps più alte è il back off)
// e l'eventuale testo libero, che diventa nota dell'esercizio.
function leggiCella(testo: string, esercizio: string, avvisi: string[]): { blocchi: Blocco[]; nota: string } {
  const blocchi: Blocco[] = []
  for (const m of testo.matchAll(BLOCCO)) {
    let min = numero(m[2]), max = m[3] ? numero(m[3]) : null
    if (max !== null && max < min) {
      avvisi.push(`${esercizio}: «${m[0]}» ha il range al contrario, letto come ${max}-${min}.`)
      ;[min, max] = [max, min]
    }
    if (max === min) max = null
    const prec = blocchi[blocchi.length - 1]
    const backOff = !!prec && min > (prec.repMax ?? prec.repMin)
    blocchi.push({ sets: Number(m[1]), repMin: min, repMax: max, tecnica: null, backOff, aumentoCarico: false })
  }
  const nota = spazi(testo.replace(BLOCCO, ' ').replace(/sett\w*\.?\s*\d+\s*:?/gi, ' '))
  return { blocchi, nota: /[a-z]{2}/i.test(nota) ? nota : '' }
}

function leggiRecupero(testo: string): { rest: number | null; resto: string } {
  const sec = testo.match(/(\d{2,3})\s*(?:["”″]|''|sec\b|s\b)/i)
  if (sec && Number(sec[1]) >= 20) return { rest: Number(sec[1]), resto: spazi(testo.replace(sec[0], ' ')) }
  const min = testo.match(/(?:^|\s)([1-5](?:[.,]5)?)\s*(?:['’′](?!\w)|min\b)/i)
  if (min) return { rest: Math.round(numero(min[1]) * 60), resto: spazi(testo.replace(min[0], ' ')) }
  return { rest: null, resto: testo }
}

interface Colonne { nome: [number, number]; settimane: { x: [number, number]; n: number[] }[]; note: [number, number] | null }

function leggiAllenamento(pagine: Pagina[], file: string, avvisi: string[]): Programma | null {
  const elementi = pagine.flatMap(elementiPagina)
  const tutto = righePiatte(pagine).flat().join('\n')
  const giorni: Programma['giorni'] = []
  let colonne: Colonne | null = null
  let giorno: Programma['giorni'][number] | null = null
  const settimaneViste = new Set<number>()

  const apriGiorno = (s: string) => {
    const m = s.match(/^\s*GIORNO\s*(\d*)\s*[:.\-–]?\s*(.*)$/i)
    if (!m) return false
    const nome = spazi(m[2].replace(/[-–+]/g, ' ')) || `Giorno ${m[1] || giorni.length + 1}`
    giorno = { nome, addome: false, esercizi: [] }
    giorni.push(giorno)
    colonne = null
    return true
  }
  const centro = (c: Cella) => (c.x1 + c.x2) / 2
  const dentro = (c: Cella, r: [number, number]) => centro(c) > r[0] && centro(c) < r[1]

  for (const el of elementi) {
    if (el.t === 'testo') { apriGiorno(el.s); continue }
    const piene = el.celle.filter(c => c.righe.length)
    const primo = piene[0]?.righe.join(' ') ?? ''
    if (piene.length === 1 && apriGiorno(primo)) continue
    if (/^ESERCIZI/i.test(primo)) {
      const c: Colonne = { nome: [el.celle[0].x1, el.celle[0].x2], settimane: [], note: null }
      for (const cella of el.celle.slice(1)) {
        const t = cella.righe.join(' ')
        const n = settimaneIntestazione(t)
        if (n.length) { c.settimane.push({ x: [cella.x1, cella.x2], n }); n.forEach(x => settimaneViste.add(x)) }
        else if (/rest|note|recuper/i.test(t)) c.note = [cella.x1, cella.x2]
      }
      if (c.settimane.length) colonne = c
      if (!giorno) apriGiorno('GIORNO ' + (giorni.length + 1))
      continue
    }
    const col = colonne as Colonne | null
    if (!col || !giorno) continue
    const g = giorno as Programma['giorni'][number]
    const nome = spazi(el.celle.filter(c => dentro(c, col.nome)).flatMap(c => c.righe).join(' '))
    if (!nome) continue
    const noteCella = col.note ? el.celle.filter(c => dentro(c, col.note!)).flatMap(c => c.righe).join(' ') : ''
    const { rest, resto } = leggiRecupero(noteCella)
    const note: string[] = resto ? [inizialeMaiuscola(resto)] : []
    const perSettimana = new Map<number, Blocco[]>()
    for (const s of col.settimane) {
      const testo = el.celle.filter(c => dentro(c, s.x)).flatMap(c => c.righe).join('\n')
      // "Sett 1: … Sett 2: …" dentro una colonna che vale per più settimane
      const parti = testo.split(/(?=sett\w*\.?\s*\d+\s*:?)/i).filter(p => p.trim())
      const perParte = parti.length > 1 && parti.every(p => /^sett/i.test(p.trim()))
      for (const parte of perParte ? parti : [testo]) {
        const { blocchi, nota } = leggiCella(parte, nome, avvisi)
        if (nota && !note.some(n => n.toLocaleLowerCase('it') === nota.toLocaleLowerCase('it'))) note.push(nota === nota.toUpperCase() ? frase(nota) : inizialeMaiuscola(nota))
        const target = perParte ? settimaneIntestazione(parte).filter(n => s.n.includes(n)) : s.n
        if (!blocchi.length) continue
        for (const n of target.length ? target : s.n) perSettimana.set(n, blocchi)
      }
    }
    if (!perSettimana.size) {
      avvisi.push(`${g.nome} · ${nome}: nessuna serie×ripetizioni riconosciuta, esercizio non importato.`)
      continue
    }
    const testoNote = note.join(' · ')
    const drop = /drop/i.test(testoNote), restPause = /rest[ -]?pause/i.test(testoNote)
    const esercizio: Esercizio = { nome, attrezzo: attrezzo(nome), note: testoNote || null, rest, settimane: [] }
    for (const [n, blocchi] of perSettimana) {
      const copia = blocchi.map(b => ({ ...b }))
      if (drop || restPause) {
        const ultimo = [...copia].reverse().find(b => !b.backOff) ?? copia[copia.length - 1]
        ultimo.tecnica = drop ? '+1 drop' : '+rest pause'
      }
      esercizio.settimane.push({ n, blocchi: copia })
    }
    g.esercizi.push(esercizio)
  }

  const esercizi = giorni.flatMap(g => g.esercizi)
  if (!esercizi.length) return null

  const durataTesto = tutto.match(/DURATA\s*:?\s*(\d+|[a-z]+)/i)
  const durataScritta = durataTesto ? (Number(durataTesto[1]) || PAROLE_NUMERO[durataTesto[1].toLowerCase()] || null) : null
  const durata = durataScritta ?? (settimaneViste.size ? Math.max(...settimaneViste) : null)
  if (!durataScritta) avvisi.push('Durata non scritta nel PDF: ricavata dalle colonne delle settimane.')

  // Settimane non presenti in una riga (cella vuota): si ripete l'ultima letta
  for (const g of giorni) for (const e of g.esercizi) {
    e.settimane.sort((a, b) => a.n - b.n)
    if (!durata) continue
    const complete: Esercizio['settimane'] = []
    let ultima = e.settimane[0].blocchi
    let mancanti = 0
    for (let n = 1; n <= durata; n++) {
      const w = e.settimane.find(w => w.n === n)
      if (w) ultima = w.blocchi; else mancanti++
      complete.push({ n, blocchi: (w?.blocchi ?? ultima).map(b => ({ ...b })) })
    }
    if (mancanti) avvisi.push(`${g.nome} · ${e.nome}: ${mancanti} settimana/e senza prescrizione, ripetuta quella accanto.`)
    e.settimane = complete
  }

  // L'addome va "prima di dorso e gambe" quando la prima pagina lo prevede
  const addome = /addome|abs/i.test(tutto) && /prima di (dorso|schiena)|prima di.*gambe/i.test(tutto)
  if (addome) for (const g of giorni) g.addome = /dorso|schiena|pull|gamb|legs|quad|glute|femor|lower/i.test(g.nome)

  // La regola generale sta in maiuscolo nella prima pagina ("ARRIVA A CEDIMENTO …")
  const primaPagina = righePiatte(pagine.slice(0, 1))[0] ?? []
  const da = primaPagina.findIndex(r => /cedimento/i.test(r) && r === r.toUpperCase())
  const regola = da < 0 ? '' : primaPagina.slice(da, da + 4).filter((r, i) => i === 0 || (r === r.toUpperCase() && /[A-Z]{3}/.test(r) && !/^(GIORNO|DOTT|ATLETA)/.test(r))).join(' ')
  const atleta = tutto.match(/ATLETA\s*:?\s*([^\n]+)/i)?.[1]?.trim() ?? null
  const dataInizio = dataIso(tutto, /DATA INIZIO/)
  if (!dataInizio) avvisi.push('Data di inizio non trovata nel PDF: inseriscila prima di salvare.')
  return {
    nome: nomeDaFile(file, /allenamento|scheda/ig, atleta) ?? nomeDaData(dataInizio, 'Scheda'),
    dataInizio, durataSettimane: durata,
    nota: regola ? frase(regola) : null,
    avvicinamento: /avvicinamento/i.test(tutto),
    giorni: giorni.filter(g => g.esercizi.length),
  }
}

// ————— Piano alimentare e misure del check —————

const INTESTAZIONE = /^(piano nutrizionale|dott\.?\s|biologo|via\s|tel\s*[:.]|mail\s*[:.]|cell\s*[:.])/i

function categorie(voci: string[]): Opzione['categorie'] {
  const t = voci.join(' ').toLocaleLowerCase('it')
  const out: Opzione['categorie'] = []
  if (/legum|ceci|lenticch|fagiol/.test(t)) out.push('legumi')
  if (/tonno|salmone|merluzzo|pesce|sgombro|orata|spigola|gamber|calamar|sogliola|platessa|baccal/.test(t)) out.push('pesce')
  if (/carne rossa|macinato|bovino|manzo|vitello|cavallo|hamburger magro/.test(t)) out.push('carne_rossa')
  if (/pollo|tacchino/.test(t)) out.push('carne_bianca')
  if (/\buov[ao]|albume/.test(t)) out.push('uova')
  if (/latte|yogurt|ricotta|mozzarella|fiocchi di latte|skyr|formaggio/.test(t)) out.push('latticini')
  if (/affettat|bresaola|prosciutto|fesa/.test(t)) out.push('affettato')
  return out
}

const MISURE: [keyof Importazione['checks'][number]['misure'], RegExp][] = [
  ['bf', /massa grassa.*\(?bf\)?|^%\s*massa grassa/i], ['fm', /\(fm\)/i], ['lbm', /massa magra|\(lbm\)/i],
  ['bmr', /metabolismo basale|\(bmr\)/i], ['peso', /^peso\b/i], ['bmi', /^bmi\b/i], ['vita', /^vita\b/i],
  ['fianchi', /^fianchi\b/i], ['torace', /^torace\b/i], ['braccioSx', /^braccio\s*sx/i], ['braccioDx', /^braccio\s*dx/i],
  ['gambaSx', /^gamba\s*sx/i], ['gambaDx', /^gamba\s*dx/i], ['spalle', /^spalle\b/i],
]

function leggiMisure(righe: string[], data: string | null): Importazione['checks'] {
  const misure = Object.fromEntries(MISURE.map(([k]) => [k, null])) as Importazione['checks'][number]['misure']
  for (const r of righe) {
    const voce = MISURE.find(([, re]) => re.test(r))
    const valore = r.match(/(\d+(?:[.,]\d+)?)\s*$/)
    if (voce && valore && misure[voce[0]] === null) misure[voce[0]] = numero(valore[1])
  }
  return Object.values(misure).some(v => v !== null) ? [{ data, misure }] : []
}

function leggiAlimentazione(pagine: Pagina[], file: string, avvisi: string[]): { piano: Alimentazione | null; checks: Importazione['checks'] } {
  const righe = righePiatte(pagine).flat().filter(r => !INTESTAZIONE.test(r))
  const tutto = righe.join('\n')
  const dataInizio = dataIso(tutto, /Data inizio/)
  const pasti: Pasto[] = []
  const integrazione: string[] = []
  let pasto: Pasto | null = null
  let opzione: Opzione | null = null
  let numerata = false // l'opzione aperta viene da "1) …" (formato della cena)
  let base: string[] = []
  let sezione: 'prima' | 'pasti' | 'integrazione' | 'fine' = 'prima'

  const chiudiPasto = () => {
    if (!pasto) return
    if (base.length) {
      if (pasto.opzioni.length) pasto.nota = spazi([pasto.nota, 'Base fissa: ' + base.join(' · ')].filter(Boolean).join(' · '))
      else pasto.opzioni.push({ titolo: null, voci: [...base], categorie: [], macro: null })
    }
    for (const o of pasto.opzioni) o.categorie = categorie(o.voci)
    if (pasto.opzioni.length) pasti.push(pasto)
    else avvisi.push(`${pasto.nome}: nessuna opzione riconosciuta.`)
    pasto = null; opzione = null; numerata = false; base = []
  }
  const aggiungiVoci = (testo: string) => {
    const voci = testo.split(/(?:^|\s)-(?=\S)/).map(spazi).filter(Boolean).map(inizialeMaiuscola)
    if (opzione) opzione.voci.push(...voci)
    else base.push(...voci)
  }

  for (const r of righe) {
    if (sezione === 'fine') break
    if (/^consigli e norme|^legenda/i.test(r)) { chiudiPasto(); sezione = 'fine'; continue }
    if (/^integrazione\b/i.test(r)) { chiudiPasto(); sezione = 'integrazione'; continue }
    if (sezione === 'integrazione') { integrazione.push(r); continue }
    const nuovoPasto = r.match(/^PASTO\s*N?\s*[°º.]?\s*(\d+)\s*[:\-–]?\s*(.*)$/i)
    if (nuovoPasto) {
      chiudiPasto(); sezione = 'pasti'
      const inParentesi = nuovoPasto[2].match(/\(([^)]+)\)/)
      const nome = frase(nuovoPasto[2].replace(/\([^)]*\)/, '')) || `Pasto ${nuovoPasto[1]}`
      pasto = { nome, nota: inParentesi ? frase(inParentesi[1]) : null, opzioni: [] }
      continue
    }
    if (sezione !== 'pasti' || !pasto) continue
    const p = pasto as Pasto
    const nuovaOpzione = r.match(/^Opzione\s*(\d+)\s*\)?\s*[:.]?\s*(.*)$/i)
    if (nuovaOpzione) {
      opzione = { titolo: nuovaOpzione[2] ? inizialeMaiuscola(nuovaOpzione[2]) : null, voci: [], categorie: [], macro: null }
      numerata = false
      p.opzioni.push(opzione)
      continue
    }
    if (/scegli\s+una/i.test(r)) { opzione = null; numerata = false; continue }
    const num = r.match(/^(\d{1,2})\s*\)\s*(.+)$/)
    if (num) {
      // Cena: "1) 250g merluzzo + 15 g di olio EVO (da mettere sulla verdura)"
      opzione = { titolo: null, voci: [], categorie: [], macro: null }
      numerata = true
      p.opzioni.push(opzione)
      aggiungiVoci(num[2])
      continue
    }
    if (r.trimStart().startsWith('-')) {
      // Dopo le opzioni numerate le righe "-" tornano a valere per tutte
      if (numerata) { opzione = null; numerata = false }
      aggiungiVoci(r)
      continue
    }
    // riga spezzata: continua l'ultima voce
    const dest = opzione ? opzione.voci : base
    if (dest.length) dest[dest.length - 1] = spazi(dest[dest.length - 1] + ' ' + r)
    else dest.push(inizialeMaiuscola(r))
  }
  chiudiPasto()

  const atleta = righePiatte(pagine).flat().join("\n").match(/PERSONALIZZATO PER\s+([^\n]+)/i)?.[1]?.trim() ?? null
  const checks = leggiMisure(righe.slice(0, 60), dataInizio)
  // "DOPO CENA: 3G OMEGA 3 …" → "Dopo cena: 3G OMEGA 3 …"; le righe tutte maiuscole in minuscolo
  const noteDieta = integrazione.filter(r => r.trim()).map(r => {
    const [prima, ...resto] = r.split(':')
    if (r === r.toUpperCase()) return resto.length ? `${frase(prima)}: ${resto.join(':').trim().toLocaleLowerCase('it')}` : frase(r)
    return resto.length && prima === prima.toUpperCase() ? `${frase(prima)}: ${resto.join(':').trim()}` : r
  })
  const piano: Alimentazione | null = pasti.length ? {
    nome: nomeDaFile(file, /alimentazione|dieta|piano/ig, atleta) ?? nomeDaData(dataInizio, 'Dieta'),
    dataInizio,
    note: noteDieta.length ? noteDieta.join('\n').slice(0, 6000) : null,
    pasti,
  } : null
  if (piano && !dataInizio) avvisi.push('Data di inizio del piano alimentare non trovata: inseriscila prima di salvare.')
  return { piano, checks }
}

// ————— Ingresso —————

export function eDiAntonio(pagine: Pagina[]): boolean {
  return /antonio\s+pappa/i.test(pagine.flatMap(p => p.voci.map(v => v.s)).join(' ').replace(/\s+/g, ' '))
}

export function leggiPdfAntonio(pagine: Pagina[], file: string): Importazione {
  if (!pagine.some(p => p.voci.length)) throw new FormatoNonRiconosciuto('Il PDF non contiene testo leggibile (forse è una scansione o una foto).')
  if (!eDiAntonio(pagine)) throw new FormatoNonRiconosciuto('Questo PDF non è di Antonio Pappa.')
  const avvisi: string[] = []
  const testo = pagine.flatMap(p => p.voci.map(v => v.s)).join(' ')
  const programma = /GIORNO/i.test(testo) && /ESERCIZI/i.test(testo) ? leggiAllenamento(pagine, file, avvisi) : null
  const { piano, checks } = /PASTO/i.test(testo) || /PIANO NUTRIZIONALE/i.test(testo) ? leggiAlimentazione(pagine, file, avvisi) : { piano: null, checks: [] }
  if (!programma && !piano && !checks.length) throw new FormatoNonRiconosciuto('Il PDF è di Antonio ma non ci sono né scheda né piano alimentare nel formato abituale.')
  return { avvisi, programma, checks, alimentazione: piano }
}
