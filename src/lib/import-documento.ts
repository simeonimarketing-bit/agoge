import type { Importazione } from './import-schema'
import { erroriImportazione, importSchema } from './import-schema'
import type { Stato, EsercizioCanonico, Programma } from '../types'
import { tuttiICanonici } from './progression'

export function preparaImportazione(raw: Importazione, stato: Stato, file: string, collegamenti: Record<string, string> = {}, opzioni: { attiva?: boolean; documento?: Stato['documentiPdf'][number] } = {}) {
  const d = importSchema.parse(raw)
  const errori = erroriImportazione(d)
  if (errori.length) throw new Error(errori.join('\n'))
  const id = crypto.randomUUID()
  const canonici: EsercizioCanonico[] = []
  const disponibili = tuttiICanonici(stato)
  const normalizza = (s: string) => s.toLocaleLowerCase('it').trim().replace(/\s+/g, ' ')
  const trova = (nome: string, attrezzo: EsercizioCanonico['attrezzo']) => {
    const scelto = collegamenti[nome]
    const c = scelto && scelto !== 'nuovo' ? disponibili.find(c => c.id === scelto) : scelto === 'nuovo' ? undefined : [...disponibili, ...canonici].find(c => [c.nome, ...c.alias].some(a => normalizza(a) === normalizza(nome)))
    if (c) return c.id
    const creato = canonici.find(c => c.alias.includes(nome))
    if (creato) return creato.id
    const nuovo: EsercizioCanonico = { id: 'pdf-' + crypto.randomUUID(), nome, alias: [nome], attrezzo, custom: true }
    canonici.push(nuovo)
    return nuovo.id
  }
  const programmi: Programma[] = d.programma ? [{
    id: 'pdf-' + id, nome: d.programma.nome, dataInizio: d.programma.dataInizio!, durataSettimane: d.programma.durataSettimane!, nota: d.programma.nota ?? undefined, pdfSorgente: file, custom: true, avvicinamento: d.programma.avvicinamento,
    giorni: d.programma.giorni.map((g, i) => ({ n: i + 1, nome: g.nome, addome: g.addome, prescrizioni: g.esercizi.map((e, j) => ({ esercizioId: trova(e.nome, e.attrezzo), nomePdf: e.nome, ordine: j + 1, rest: e.rest ?? undefined, note: e.note ?? undefined, blocchi: Object.fromEntries(e.settimane.map(w => [w.n, w.blocchi.map(b => ({ ...b, repMax: b.repMax ?? undefined, tecnica: b.tecnica ?? undefined }))])) })) })),
  }] : []
  for (const g of programmi[0]?.giorni ?? []) {
    if (new Set(g.prescrizioni.map(p => p.esercizioId)).size !== g.prescrizioni.length) throw new Error(`${g.nome}: due righe sono collegate allo stesso esercizio. Dai nomi distinti o scegli collegamenti diversi.`)
  }
  const checks: Stato['checksUtente'] = d.checks.map(c => ({ data: c.data!, ...Object.fromEntries(Object.entries(c.misure).filter(([, v]) => v !== null)) }))
  const piani: Stato['pianiAlimentari'] = d.alimentazione ? [{ id: 'dieta-' + id, nome: d.alimentazione.nome, dataInizio: d.alimentazione.dataInizio!, note: d.alimentazione.note ?? undefined,
    pasti: d.alimentazione.pasti.map((p, i) => ({ id: `pdf-${id}-${i}`, nome: p.nome, nota: p.nota ?? undefined, opzioni: p.opzioni.map((o, j) => ({ n: j + 1, titolo: o.titolo ?? undefined, voci: o.voci, categorie: o.categorie, macro: o.macro ?? undefined })) })),
  }] : []
  const sezioni = [programmi.length ? 'allenamento' : null, piani.length ? 'alimentazione' : null, checks.length ? 'check' : null].filter(Boolean)
  const documento = opzioni.documento ? { ...opzioni.documento, stato: 'importato' as const,
    titolo: d.programma?.nome ?? d.alimentazione?.nome ?? opzioni.documento.titolo,
    dataDocumento: d.programma?.dataInizio ?? d.alimentazione?.dataInizio ?? checks[0]?.data ?? opzioni.documento.dataDocumento,
    categoria: (sezioni.length > 1 ? 'misto' : sezioni[0]) as Stato['documentiPdf'][number]['categoria'],
    programmi: programmi.map(p => p.id), piani: piani.map(p => p.id), checks: checks.map(c => c.data),
  } : undefined
  return { t: 'importa-documento' as const, programmi, canonici, checks, piani, attiva: opzioni.attiva ?? true, documento }
}
