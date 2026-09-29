import { z } from 'zod'

const testo = z.string().max(6000)
const nome = z.string().min(1).max(200)
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const numero = z.number().min(0).max(10000)
const blocco = z.object({ sets: z.number().int().min(1).max(30), repMin: z.number().min(0.5).max(200), repMax: z.number().min(0.5).max(200).nullable(), tecnica: testo.nullable(), backOff: z.boolean(), aumentoCarico: z.boolean() })
const misure = z.object({ peso: numero.nullable(), bf: numero.nullable(), fm: numero.nullable(), lbm: numero.nullable(), bmr: numero.nullable(), vita: numero.nullable(), fianchi: numero.nullable(), torace: numero.nullable(), braccioSx: numero.nullable(), braccioDx: numero.nullable(), gambaSx: numero.nullable(), gambaDx: numero.nullable(), spalle: numero.nullable(), bmi: numero.nullable() })
export const importSchema = z.object({
  avvisi: z.array(testo).max(100),
  programma: z.object({ nome, dataInizio: data.nullable(), durataSettimane: z.number().int().min(1).max(52).nullable(), nota: testo.nullable(), avvicinamento: z.boolean(), giorni: z.array(z.object({ nome, addome: z.boolean(), esercizi: z.array(z.object({ nome, attrezzo: z.enum(['manubri', 'bilanciere', 'macchina', 'cavo', 'corpo']), note: testo.nullable(), rest: z.number().min(0).max(1800).nullable(), settimane: z.array(z.object({ n: z.number().int().min(1).max(52), blocchi: z.array(blocco).min(1).max(20) })).min(1).max(52) })).min(1).max(50) })).min(1).max(14) }).nullable(),
  checks: z.array(z.object({ data: data.nullable(), misure })).max(100),
  alimentazione: z.object({ nome, dataInizio: data.nullable(), note: testo.nullable(), pasti: z.array(z.object({ nome, nota: testo.nullable(), opzioni: z.array(z.object({ titolo: testo.nullable(), voci: z.array(nome).min(1).max(100), categorie: z.array(z.enum(['legumi', 'pesce', 'carne_rossa', 'carne_bianca', 'uova', 'latticini', 'affettato'])), macro: z.object({ kcal: numero, proteine: numero, carboidrati: numero, grassi: numero, fibre: numero }).nullable() })).min(1).max(30) })).min(1).max(12) }).nullable(),
})
export type Importazione = z.infer<typeof importSchema>

export function erroriImportazione(d: Importazione): string[] {
  const errori: string[] = []
  const validaData = (s: string | null) => {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    const d = new Date(s + 'T12:00:00Z')
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
  }
  if (!d.programma && !d.alimentazione && !d.checks.length) errori.push('Nessuna scheda, dieta o misura riconosciuta.')
  if (d.programma) {
    const p = d.programma
    if (!validaData(p.dataInizio)) errori.push('Indica la data di inizio della scheda.')
    if (!p.durataSettimane) errori.push('Indica la durata della scheda.')
    for (const g of p.giorni) for (const e of g.esercizi) {
      const ns = e.settimane.map(w => w.n)
      if (new Set(ns).size !== ns.length || ns.length !== p.durataSettimane || ns.some(n => n > (p.durataSettimane ?? 0))) errori.push(`${e.nome}: controlla le prescrizioni per ogni settimana.`)
      for (const w of e.settimane) for (const b of w.blocchi) if (b.repMax !== null && b.repMax < b.repMin) errori.push(`${e.nome}: range di ripetizioni invertito.`)
    }
  }
  for (const c of d.checks) {
    if (!validaData(c.data)) errori.push('Indica la data di ogni check.')
    if (Object.values(c.misure).every(v => v === null)) errori.push('Check senza misure: rimuovilo o completa i dati.')
  }
  if (d.alimentazione && !validaData(d.alimentazione.dataInizio)) errori.push('Indica la data di inizio del piano alimentare.')
  return [...new Set(errori)]
}
