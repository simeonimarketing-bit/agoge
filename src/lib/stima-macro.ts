import type { Macro } from '../types'
import { ALIMENTI, arrotonda, scala, somma } from '../data/macro'

// ——————————————————————————————————————————————————————————————
// Stima dei macro di un'opzione importata, dalle righe del coach.
// Stesso metodo dei valori calcolati a mano in data/macro.ts: grammature del
// coach × tabella alimenti (CREA/USDA, per 100g). Regole:
// - con «oppure» / «o» si conta la prima alternativa
// - i pezzi (uova, fette, frutto, scatoletta) usano una convenzione dichiarata
// - le verdure senza peso valgono 200g, dichiarato
// - un alimento pesato ma non riconosciuto non viene inventato: finisce in `ignote`
// ——————————————————————————————————————————————————————————————

export interface Stima {
  macro: Macro | null // null = nessun alimento riconosciuto
  assunzioni: string[]
  ignote: string[] // righe pesate che la tabella non conosce
}

// parole chiave → nome in ALIMENTI (le più specifiche prima)
const DIZIONARIO: [RegExp, string][] = [
  [/fiocchi di latte/, 'Fiocchi di latte'],
  [/latte proteico/, 'Latte proteico'],
  [/\blatte\b/, 'Latte scremato'],
  [/yogurt|skyr/, 'Yogurt greco 0%'],
  [/ricotta/, 'Ricotta vaccina'],
  [/parmigian|grana/, 'Parmigiano'],
  [/album/, 'Albume'],
  [/\buov/, 'Uovo intero'],
  [/hamburger di (pollo|tacchino)/, 'Hamburger di pollo/tacchino'],
  [/tacchino/, 'Petto di tacchino'],
  [/pollo/, 'Petto di pollo'],
  [/macinat|hamburger/, 'Macinato magro bovino'],
  [/carne rossa|manzo|bovin|vitell/, 'Carne rossa taglio magro'],
  [/bresaola|affettat|prosciutto|fesa/, 'Bresaola / affettato magro'],
  [/salmone affumicato/, 'Salmone affumicato'],
  [/salmone/, 'Salmone fresco'],
  [/tonno fresco/, 'Tonno fresco'],
  [/tonno/, 'Tonno al naturale (sgocciolato)'],
  [/merluzzo|nasello|platessa|sogliola/, 'Merluzzo'],
  [/legum|ceci|lenticch|fagiol|piselli/, 'Legumi cotti'],
  [/pan bauletto/, 'Pan bauletto integrale'],
  [/segale/, 'Pane di segale'],
  [/\bpane\b/, 'Pane comune'],
  [/fette biscottat/, 'Fette biscottate integrali'],
  [/cereali/, 'Cereali da colazione'],
  [/avena/, 'Farina di avena'],
  [/gallett/, 'Gallette di riso'],
  [/couscous|cous cous/, 'Couscous'],
  [/farro/, 'Farro'],
  [/pasta/, 'Pasta di semola'],
  [/\briso\b/, 'Riso'],
  [/patat/, 'Patate'],
  [/olio/, 'Olio EVO'],
  [/burro di/, 'Burro di arachidi'],
  [/mandorl/, 'Mandorle'],
  [/\bnoc[ie]\b|nocciol/, 'Noci'],
  [/frutta secca/, 'Frutta secca mista'],
  [/fondente|cioccolat/, 'Cioccolato fondente 85%'],
  [/marmellat|confettur/, 'Marmellata'],
  [/protein/, 'Proteine in polvere'],
  [/spremuta|succo/, 'Spremuta di arancia'],
  [/banan/, 'Banana'],
  [/frutt|mela|mirtill/, 'Mela'],
  [/salsa di pomodoro|passata/, 'Salsa di pomodoro'],
  [/pomodor/, 'Pomodorini'],
  [/zucca/, 'Zucca'],
  [/insalata|rucola|lattuga/, 'Insalata'],
  [/verdur|minestrone|zucchin|broccol/, 'Verdure miste'],
]

// pezzi senza grammatura → grammi per pezzo, alimento, convenzione
const PEZZI: [RegExp, number, string, string][] = [
  [/^uov/, 60, 'Uovo intero', '1 uovo medio = 60g'],
  [/^fett[ae] biscottat/, 8, 'Fette biscottate integrali', '1 fetta biscottata = 8g'],
  [/^fettin[ae]|^fett[ae] di pan bauletto/, 25, 'Pan bauletto integrale', '1 fettina di pan bauletto = 25g (legenda del coach)'],
  [/^gallett/, 8, 'Gallette di riso', '1 galletta = 8g (legenda del coach)'],
  [/^scatolett[ae].*grande/, 112, 'Tonno al naturale (sgocciolato)', 'Scatoletta GRANDE = 112g sgocciolati'],
  [/^scatolett[ae]/, 56, 'Tonno al naturale (sgocciolato)', 'Scatoletta = 56g sgocciolati'],
  [/^banan/, 120, 'Banana', '1 banana = 120g'],
  [/^frutt|^mel[ae]/, 150, 'Mela', '1 frutto = mela media 150g'],
]

const VERDURA_SENZA_PESO = /verdur|insalata|rucola|pomodor|minestrone|zucchin|broccol|lattuga/
const GRAMMI_VERDURA = 200

const per100 = (nome: string) => ALIMENTI.find(a => a.nome === nome)!.per100
const alimentoDi = (testo: string) => DIZIONARIO.find(([re]) => re.test(testo))?.[1]

const QUANTITA = /^(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|ml)\b\.?\s*(?:circa\s+)?(?:di\s+)?(.*)$/i
// piani compilati a mano: «Yogurt 170 g»
const QUANTITA_DOPO = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|grammi|ml)\b\.?$/i
const PEZZO = /^(\d+)\s+(.+)$/

export function stimaVoci(voci: string[]): Stima {
  const parti: Macro[] = []
  const assunzioni = new Set<string>()
  const ignote: string[] = []

  for (const voce of voci) {
    const pulita = voce.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()
    const [prima, ...altre] = pulita.split(/\s*\boppure\b\s*/i)
    if (altre.length && /\d/.test(prima)) assunzioni.add(`Contata la prima alternativa: «${prima.trim()}»`)
    let verdura = false // verdure citate senza peso
    let verduraPesata = false
    // "250g merluzzo + 15 g di olio", "con 250ml di albume, 2 uova intere e 30g di parmigiano"
    const componenti = prima.split(/\s*[+,;·]\s*|\s+con\s+|\s+e\s+(?=\d)/i)
    for (const c of componenti) {
      const testo = c.split(/\s+o\s+|\//i)[0].trim().toLocaleLowerCase('it')
      if (!testo) continue
      const dopo = testo.match(QUANTITA_DOPO)
      const q = testo.match(QUANTITA) ?? (dopo && [dopo[0], dopo[2], dopo[3], dopo[1]])
      if (q) {
        const nome = alimentoDi(q[3])
        if (VERDURA_SENZA_PESO.test(q[3])) verduraPesata = true
        if (nome) parti.push(scala(per100(nome), parseFloat(q[1].replace(',', '.')) / 100))
        else ignote.push(c.trim())
        continue
      }
      const p = testo.match(PEZZO)
      const pezzo = p && PEZZI.find(([re]) => re.test(p[2]))
      if (p && pezzo) {
        parti.push(scala(per100(pezzo[2]), (Number(p[1]) * pezzo[1]) / 100))
        assunzioni.add(pezzo[3])
        continue
      }
      if (VERDURA_SENZA_PESO.test(testo)) verdura = true
    }
    if (verdura && !verduraPesata) {
      parti.push(scala(per100('Verdure miste'), GRAMMI_VERDURA / 100))
      assunzioni.add(`Verdure senza peso = ${GRAMMI_VERDURA}g`)
    }
  }

  return {
    macro: parti.length ? arrotonda(somma(...parti)) : null,
    assunzioni: [...assunzioni],
    ignote,
  }
}

// "Base fissa: 120g pane di segale … · Verdura a tua scelta · 10g fondente" → voci della base
export function vociBaseFissa(nota?: string): string[] {
  const m = nota?.match(/base fissa:\s*(.+)$/i)
  return m ? m[1].split(/\s*·\s*/).filter(Boolean) : []
}
