import test from 'node:test'
import assert from 'node:assert/strict'
import { stimaVoci, vociBaseFissa } from '../src/lib/stima-macro'
import { PASTI } from '../src/data/dieta'
import { MACRO_OPZIONI } from '../src/data/macro'

// Le righe del piano Set/Ott come le scrive il PDF (stesse che legge il lettore)
const RIGHE_PDF: Record<string, string[]> = {
  'colazione-1': ['200ml latte proteico oppure 200ml latte scremato +15g proteine', '6 fette biscottate INTEGRALI OPPURE 4 fettine di pan bauletto', '20g fondente min 85% oppure 20g frutta secca a tua scelta'],
  'colazione-3': ['2 uova + 150g albume', '200ml circa di Spremuta di arancia (100% arancia) o una tazza di caffè americano', '60g pane tostato'],
  'pranzo-1': ['80g di pasta con 150g di legumi cotti oppure minestrone oppure zucca', '10 g di olio EVO', '1 Scatoletta di tonno GRANDE al naturale', '20g parmigiano'],
  'pranzo-2': ['100g di pasta con verdure o salsa di pomodoro bollita', '10g di olio EVO', '150g di petto di pollo', '20g parmigiano'],
  'spuntino-1': ['1 frutto', '10g mandorle o noci o nocciole', '35g proteine in polvere'],
  'cena-1': ['250g merluzzo+ 15 g di olio EVO (da mettere sulla verdura)'],
  'cena-5': ['Frittata da fare al forno o in padella antiaderente senza olio con 250ml di albume, 2 uova intere e 20g di parmigiano'],
}

test('la stima automatica coincide con i macro calcolati a mano', () => {
  for (const [id, righe] of Object.entries(RIGHE_PDF)) {
    const s = stimaVoci(righe)
    assert.deepEqual(s.ignote, [], id)
    // a mano a volte si è scelto un alimento vicino (frutta secca mista per le mandorle): ±5 kcal, ±1 g
    const mano = MACRO_OPZIONI[id].macro
    assert.ok(Math.abs(s.macro!.kcal - mano.kcal) <= 5, `${id} kcal ${s.macro!.kcal} vs ${mano.kcal}`)
    for (const k of ['proteine', 'carboidrati', 'grassi'] as const) assert.ok(Math.abs(s.macro![k] - mano[k]) <= 1, `${id} ${k}`)
  }
  assert.equal(PASTI.length, 4)
})

test('base fissa della cena: letta dalla nota e stimata', () => {
  const base = vociBaseFissa('Base fissa: 120g pane di segale o di farro o ai cereali oppure 80g riso · Verdura a tua scelta · 10g fondente min 85%')
  assert.equal(base.length, 3)
  const kcal = stimaVoci(base).macro!.kcal
  assert.ok(Math.abs(kcal - MACRO_OPZIONI['cena-base'].macro.kcal) < 20, String(kcal))
})

test('le righe di un altro piano di Antonio vengono riconosciute tutte', () => {
  const opzioni = [
    ['1 uovo + 150g albume', '200ml circa di Spremuta di arancia (100% arancia) o una tazza di caffè americano', '2 fettine di pan bauletto tostato'],
    ['120g di pasta o riso con verdure o salsa di pomodoro bollita', '150g fiocchi di latte oppure 100g ricotta proteica', '20g parmigiano'],
    ['30g proteine in polvere isolate', '1 frutta (no banana)', '10g mandorle o noci o nocciole'],
    ['200g di petto di pollo/tacchino + 20 g di olio EVO (da metter sulla verdura)'],
  ]
  for (const o of opzioni) {
    const s = stimaVoci(o)
    assert.deepEqual(s.ignote, [], o.join(' · '))
    assert.ok(s.macro && s.macro.kcal > 150, o.join(' · '))
  }
})

test('ciò che non si riconosce non viene inventato', () => {
  const s = stimaVoci(['50g quinoa soffiata', '20g parmigiano'])
  assert.deepEqual(s.ignote, ['50g quinoa soffiata'])
  assert.equal(s.macro!.kcal, 78)
  assert.equal(stimaVoci(['Verdure a volontà']).macro!.kcal, 50)
  assert.equal(stimaVoci(['Acqua e limone']).macro, null)
  assert.equal(stimaVoci(['Yogurt 170 g', 'Avena 40 g']).macro!.kcal, 245)
})
