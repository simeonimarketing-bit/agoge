import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VUOTO, riduci, migra } from '../src/lib/store'
import { ultimaNota, canonico, programmaAttivo } from '../src/lib/progression'
import { preparaImportazione } from '../src/lib/import-documento'
import { erroriImportazione, importSchema } from '../src/lib/import-schema'
import { estraiPdf } from '../server/import'
import { documento } from './fixture'

const vuoto = () => structuredClone(VUOTO)
test('migrazione conserva backup vecchi, serie e aggiunge campi nuovi', () => {
  const s = migra({ sessioni: [{ id: 's', data: '2026-09-01', esercizi: [{ esercizioId: 'chest-press', serie: [{ carico: 20, reps: 7.5, backOff: true }] }] }] })
  assert.equal(s.sessioni[0].esercizi[0].serie[0].tipo, 'backoff')
  assert.equal(s.sessioni[0].esercizi[0].serie[0].reps, 7.5)
  assert.deepEqual(s.nomiEsercizi, {})
  assert.deepEqual(s.checksUtente, [])
})
test('note persistono senza serie e la cancellazione non ripropone vecchie note', () => {
  let s = riduci(vuoto(), { t: 'nota-esercizio', id: 'chest-press', testo: 'Sedile 3\nPresa stretta' })
  assert.equal(ultimaNota(migra(JSON.parse(JSON.stringify(s))), 'chest-press'), 'Sedile 3\nPresa stretta')
  s.sessioni = [{ id: 'old', data: '2026-09-01', giornoN: 1, giornoNome: 'Upper', esercizi: [{ esercizioId: 'chest-press', note: 'vecchia', serie: [] }] }]
  s = riduci(s, { t: 'nota-esercizio', id: 'chest-press', testo: '' })
  assert.equal(ultimaNota(s, 'chest-press'), null)
})
test('nomi personalizzati non spezzano identità o collegamento da PDF', () => {
  const s = riduci(vuoto(), { t: 'nome-esercizio', id: 'chest-press', testo: 'Chest press della Hammer' })
  assert.equal(canonico(s, 'chest-press')?.nome, 'Chest press della Hammer')
  const azione = preparaImportazione(documento, s, 'coach.pdf')
  assert.equal(azione.programmi[0].giorni[0].prescrizioni[0].esercizioId, 'chest-press')
  assert.equal(azione.canonici.length, 0)
})
test('importazione atomica aggiunge scheda, check parziale, pasti e conserva lo storico', () => {
  const s = riduci(vuoto(), preparaImportazione(documento, vuoto(), 'coach.pdf'))
  assert.equal(programmaAttivo(s).nome, 'Scheda amici')
  assert.equal(s.checksUtente[0].peso, 70)
  assert.equal(s.checksUtente[0].bf, undefined)
  assert.equal(s.pianiAlimentari[0].pasti[0].opzioni[0].macro, undefined)
  assert.equal(s.pianiAlimentari[0].pasti[1].nome, 'Merenda')
  assert.equal(s.pianoAlimentareId, s.pianiAlimentari[0].id)
  const dopo = riduci(s, preparaImportazione(documento, s, 'secondo.pdf'))
  assert.equal(dopo.checksUtente.length, 1)
  assert.equal(dopo.programmiUtente.length, 2)
  assert.notEqual(dopo.pianiAlimentari[0].pasti[0].id, dopo.pianiAlimentari[1].pasti[0].id)
})
test('sessione aperta conserva programma e settimana dopo un nuovo import', () => {
  let s = riduci(vuoto(), preparaImportazione(documento, vuoto(), 'coach.pdf'))
  const p = programmaAttivo(s)
  s = riduci(s, { t: 'avvia-sessione', giornoN: 1, giornoNome: 'Upper', programmaId: p.id, programmaSnapshot: p, settimana: 1 })
  s = riduci(s, { t: 'logga-esercizio', log: { esercizioId: 'chest-press', nome: 'Chest', prescrizione: p.giorni[0].prescrizioni[0].blocchi[1], serie: [{ reps: 8.5, carico: 40, tipo: 'working' }] } })
  s = riduci(s, preparaImportazione(documento, s, 'nuovo.pdf'))
  assert.equal(s.sessioneCorrente?.programmaSnapshot?.id, p.id)
  assert.equal(s.sessioneCorrente?.settimana, 1)
  const ricaricato = migra(JSON.parse(JSON.stringify(s)))
  const chiuso = riduci(ricaricato, { t: 'chiudi-sessione' })
  assert.equal(chiuso.sessioni[0].esercizi[0].serie[0].reps, 8.5)
  assert.equal(chiuso.sessioni[0].esercizi[0].prescrizione?.[0].repMax, 10)
})
test('blocca date invalide, settimane mancanti, range invertiti e documento vuoto', () => {
  const d = structuredClone(documento)
  d.programma!.dataInizio = '2026-99-99'
  d.programma!.giorni[0].esercizi[0].settimane.pop()
  d.programma!.giorni[0].esercizi[0].settimane[0].blocchi[0].repMax = 5
  assert.equal(erroriImportazione(d).length, 3)
  assert.throws(() => preparaImportazione(d, vuoto(), 'bad.pdf'))
  assert.equal(erroriImportazione({ avvisi: [], programma: null, alimentazione: null, checks: [] }).length, 1)
  assert.equal(importSchema.safeParse({ ...documento, checks: 'errore' }).success, false)
})
test('duplicati nella seduta richiedono collegamenti distinti', () => {
  const d = structuredClone(documento)
  d.programma!.giorni[0].esercizi.push(structuredClone(d.programma!.giorni[0].esercizi[0]))
  assert.throws(() => preparaImportazione(d, vuoto(), 'dup.pdf'), /due righe/)
})
test('backend invia PDF con schema, store false e valida risposta', async () => {
  let body: any
  const fetcher = (async (_url, options) => { body = JSON.parse(String(options?.body)); return new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(documento) }] }] }), { status: 200 }) }) as typeof fetch
  const result = await estraiPdf(Buffer.from('%PDF-1.4'), 'coach.pdf', 'fake-key', 'test-model', fetcher)
  assert.deepEqual(result, documento)
  assert.equal(body.store, false)
  assert.equal(body.text.format.strict, true)
  assert.equal(body.input[0].content[0].type, 'input_file')
  assert.equal(body.model, 'test-model')
})
test('backend non accetta risposta incompleta o rifiuto', async () => {
  for (const response of [{ status: 'incomplete', output: [] }, { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }]) {
    const fetcher = (async () => new Response(JSON.stringify(response))) as typeof fetch
    await assert.rejects(estraiPdf(Buffer.from('%PDF'), 'coach.pdf', 'fake', 'test', fetcher))
  }
})

test('PDF vecchi archiviati non attivano schede o diete per un nuovo ospite', () => {
  const guest = { ...vuoto(), profilo: { ospite: true, dietaLibera: true, inizializzato: true } }
  const s = riduci(guest, preparaImportazione(documento, guest, 'storico.pdf', {}, { attiva: false }))
  assert.equal(s.programmiUtente.length, 1)
  assert.equal(s.pianiAlimentari.length, 1)
  assert.equal(s.programmiUtente[0].soloArchivio, true)
  assert.equal(s.pianoAlimentareId, undefined)
  assert.equal(s.profilo.dietaLibera, true)
  assert.equal(programmaAttivo(s).id, 'vuoto')
  assert.equal(s.sessioni.length, 0)
  assert.equal(s.checksUtente.length, 1)
})

test('import storico preserva piani correnti e doppia conferma non duplica dati', () => {
  let s = riduci(vuoto(), preparaImportazione(documento, vuoto(), 'attuale.pdf'))
  const programmaId = s.profilo.programmaAttivoId
  const dietaId = s.pianoAlimentareId
  const doc = { id: 'pdf-test', titolo: 'Vecchio', nome: 'vecchio.pdf', categoria: 'da-classificare' as const, stato: 'da-leggere' as const, caricatoIl: '2026-09-29T12:00:00Z', dimensione: 100, programmi: [], piani: [], checks: [] }
  const old = structuredClone(documento)
  old.programma!.dataInizio = '2025-01-01'
  old.alimentazione!.dataInizio = '2025-01-01'
  const action = preparaImportazione(old, s, 'vecchio.pdf', {}, { attiva: false, documento: doc })
  s = riduci(s, action)
  assert.equal(s.profilo.programmaAttivoId, programmaId)
  assert.equal(s.pianoAlimentareId, dietaId)
  assert.equal(s.documentiPdf[0].dataDocumento, '2025-01-01')
  assert.equal(s.documentiPdf[0].stato, 'importato')
  assert.equal(s.documentiPdf[0].programmi[0], s.programmiUtente[1].id)
  assert.equal(riduci(s, action), s)
})
