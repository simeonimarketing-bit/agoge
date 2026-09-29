import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { estraiPagine } from '../src/lib/lettore-pdf'
import { FormatoNonRiconosciuto, leggiPdfAntonio, type Pagina } from '../src/lib/lettore-pappa'
import { erroriImportazione, importSchema } from '../src/lib/import-schema'
import { PROGRAMMA } from '../src/data/programma'
import { CHECKS } from '../src/data/checks'
import { PASTI } from '../src/data/dieta'

// I PDF originali di Antonio stanno fuori dal repository (fonti/): senza, i test si saltano
const DIR = path.resolve(import.meta.dirname, '../../fonti/Check e Prog')
const presenti = fs.existsSync(DIR)
const pdf = (nome: string) => estraiPagine(pdfjs as never, new Uint8Array(fs.readFileSync(path.join(DIR, nome))))

test('tutti i PDF di Antonio si leggono senza errori bloccanti', { skip: !presenti }, async () => {
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.pdf'))) {
    const d = importSchema.parse(leggiPdfAntonio(await pdf(f), f))
    assert.deepEqual(erroriImportazione(d), [], f)
    if (f.startsWith('Allenamento')) assert.equal(d.programma?.giorni.length, 5, f)
    else assert.equal(d.alimentazione?.pasti.length, 4, f)
  }
})

test('la scheda di settembre coincide con quella caricata a mano', { skip: !presenti }, async () => {
  const f = 'Allenamento - Salvatore Simeoni - Settembre Ottobre.pdf'
  const p = leggiPdfAntonio(await pdf(f), f).programma!
  assert.equal(p.nome, 'Settembre Ottobre')
  assert.equal(p.dataInizio, PROGRAMMA.dataInizio)
  assert.equal(p.durataSettimane, PROGRAMMA.durataSettimane)
  assert.ok(p.avvicinamento)
  assert.deepEqual(p.giorni.map(g => g.addome), PROGRAMMA.giorni.map(g => !!g.addome))
  PROGRAMMA.giorni.forEach((g, i) => {
    assert.equal(p.giorni[i].esercizi.length, g.prescrizioni.length, g.nome)
    g.prescrizioni.forEach((atteso, j) => {
      const letto = p.giorni[i].esercizi[j]
      assert.equal(letto.rest, atteso.rest ?? null, atteso.nomePdf)
      for (const w of letto.settimane) assert.deepEqual(
        w.blocchi.map(b => [b.sets, b.repMin, b.repMax, !!b.backOff, b.tecnica]),
        atteso.blocchi[w.n].map(b => [b.sets, b.repMin, b.repMax ?? null, !!b.backOff, b.tecnica ?? null]),
        `${atteso.nomePdf} settimana ${w.n}`)
    })
  })
})

test('piano alimentare e misure del check coincidono con quelli dell’app', { skip: !presenti }, async () => {
  const f = 'Alimentazione Salvatore Simeoni Settembre Ottobre.pdf'
  const d = leggiPdfAntonio(await pdf(f), f)
  assert.equal(d.alimentazione!.nome, 'Settembre Ottobre')
  assert.deepEqual(d.alimentazione!.pasti.map(p => p.opzioni.length), PASTI.map(p => p.opzioni.length))
  assert.deepEqual(d.alimentazione!.pasti.flatMap(p => p.opzioni.map(o => o.categorie.sort())), PASTI.flatMap(p => p.opzioni.map(o => [...o.categorie].sort())))
  assert.match(d.alimentazione!.pasti[3].nota ?? '', /^Base fissa: 120g pane/)
  // tutti e sette i check storici, dalla prima pagina di ogni piano
  const letti = []
  for (const f of fs.readdirSync(DIR).filter(f => f.startsWith('Alimentazione'))) letti.push(...leggiPdfAntonio(await pdf(f), f).checks)
  for (const atteso of CHECKS) {
    const c = letti.find(c => c.data === atteso.data)
    assert.ok(c, atteso.data)
    for (const [k, v] of Object.entries(atteso)) if (k !== 'data') assert.equal(c!.misure[k as keyof typeof c.misure], v, `${atteso.data} ${k}`)
  }
})

test('un PDF di un altro coach viene rifiutato con un messaggio chiaro', () => {
  const pagina: Pagina = { voci: [{ x: 60, y: 700, w: 100, s: 'GIORNO 1 PETTO' }, { x: 60, y: 680, w: 100, s: 'Coach Mario Rossi' }], orizz: [], vert: [] }
  assert.throws(() => leggiPdfAntonio([pagina], 'scheda.pdf'), FormatoNonRiconosciuto)
  assert.throws(() => leggiPdfAntonio([{ voci: [], orizz: [], vert: [] }], 'scansione.pdf'), /scansione/)
})
