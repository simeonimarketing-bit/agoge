import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VUOTO, riduci, migra } from '../src/lib/store'
import { canonico, chiaveSlot, idInSlot, tempoTimer, ultimaVolta } from '../src/lib/progression'
import type { Sessione, Stato } from '../src/types'

const vuoto = () => structuredClone(VUOTO)
const seduta = (id: string, giornoN: number, carico: number, programmaId = 'set-ott'): Sessione => ({
  id, data: `2026-09-2${giornoN}`, giornoN, giornoNome: `G${giornoN}`, programmaId,
  esercizi: [{ esercizioId: 'chest-press', serie: [{ carico, reps: 10, tipo: 'working' }] }],
})

test('rinominare la chest press del giorno 5 non tocca quella del giorno 2', () => {
  let s: Stato = { ...vuoto(), sessioni: [seduta('a', 2, 60), seduta('b', 5, 40), seduta('c', 5, 42, 'vecchia-scheda')] }
  const chiave = chiaveSlot('set-ott', 5, 'chest-press')
  s = riduci(s, { t: 'nome-esercizio-slot', chiave, programmaId: 'set-ott', giornoN: 5, base: 'chest-press', attuale: 'chest-press', testo: 'Chest press Flex Leverage', nuovoId: 'var-1', attrezzo: 'macchina' })
  assert.equal(idInSlot(s, 'set-ott', 5, 'chest-press'), 'var-1')
  assert.equal(idInSlot(s, 'set-ott', 2, 'chest-press'), 'chest-press')
  assert.equal(canonico(s, 'var-1')?.nome, 'Chest press Flex Leverage')
  assert.notEqual(canonico(s, 'chest-press')?.nome, 'Chest press Flex Leverage')
  // lo storico del giorno 5 di questa scheda segue la variante, il resto resta alla chest press
  assert.equal(ultimaVolta(s, 'var-1')?.serie[0].carico, 40)
  assert.equal(ultimaVolta(s, 'chest-press')?.serie[0].carico, 42)
  assert.equal(s.sessioni.find(x => x.id === 'a')!.esercizi[0].esercizioId, 'chest-press')
  // seconda rinomina dello stesso giorno: cambia solo il nome, nessuna nuova variante
  s = riduci(s, { t: 'nome-esercizio-slot', chiave, programmaId: 'set-ott', giornoN: 5, base: 'chest-press', attuale: 'var-1', testo: 'Chest press Nautilus' })
  assert.equal(canonico(s, 'var-1')?.nome, 'Chest press Nautilus')
  assert.equal(s.canoniciUtente.length, 1)
  // sopravvive a salvataggio e ricarica
  assert.equal(idInSlot(migra(JSON.parse(JSON.stringify(s))), 'set-ott', 5, 'chest-press'), 'var-1')
})

test('un allenamento si elimina dallo storico con le sue note', () => {
  let s: Stato = { ...vuoto(), sessioni: [seduta('a', 2, 60), seduta('b', 5, 40)], noteWorkout: { a: 'troppo carico', b: 'ok' } }
  s = riduci(s, { t: 'elimina-sessione', id: 'a' })
  assert.deepEqual(s.sessioni.map(x => x.id), ['b'])
  assert.deepEqual(s.noteWorkout, { b: 'ok' })
})

test('il timer segue l’orologio anche dopo che l’app è rimasta chiusa', () => {
  let s = riduci(vuoto(), { t: 'timer-avvia', durata: 120, ora: 1_000_000 })
  // app in background per 50 secondi e ricaricata da zero
  s = migra(JSON.parse(JSON.stringify(s)))
  assert.deepEqual(tempoTimer(s.timer!, 1_050_000), { secondi: 70, finito: false })
  // pausa di 30 secondi: il tempo si ferma e poi riparte da dove era
  s = riduci(s, { t: 'timer-pausa', ora: 1_050_000 })
  assert.equal(tempoTimer(s.timer!, 1_080_000).secondi, 70)
  s = riduci(s, { t: 'timer-pausa', ora: 1_080_000 })
  s = riduci(s, { t: 'timer-aggiungi', secondi: 15 })
  assert.equal(tempoTimer(s.timer!, 1_090_000).secondi, 75)
  assert.deepEqual(tempoTimer(s.timer!, 1_300_000), { secondi: 0, finito: true })
  // senza recupero indicato conta in avanti
  const libero = riduci(vuoto(), { t: 'timer-avvia', durata: null, ora: 0 })
  assert.deepEqual(tempoTimer(libero.timer!, 95_000), { secondi: 95, finito: false })
  // chiudendo la seduta il timer si spegne
  assert.equal(riduci({ ...s, sessioneCorrente: null }, { t: 'chiudi-sessione' }).timer, null)
})

test('la superserie si collega e si scollega per giorno', () => {
  const chiave = chiaveSlot('set-ott', 1, 'curl-cavo-basso')
  let s = riduci(vuoto(), { t: 'superserie', chiave, attiva: true })
  assert.equal(s.superserie[chiave], true)
  s = riduci(s, { t: 'superserie', chiave, attiva: false })
  assert.deepEqual(s.superserie, {})
})
