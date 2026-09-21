import type { Alimento, Macro } from '../types'

// ——————————————————————————————————————————————————————————————
// I PDF del coach NON contengono calorie né macro (verificato su tutti
// e 6 i piani). Questi valori sono CALCOLATI dalle grammature del coach
// usando tabelle di composizione alimentare (CREA/USDA, valori per 100g).
// Ogni voce non quantificata dal coach usa una convenzione dichiarata
// in `assunzioni` — il numero resta descrittivo, mai prescrittivo.
// ——————————————————————————————————————————————————————————————

export const m = (kcal: number, proteine: number, carboidrati: number, grassi: number, fibre: number): Macro =>
  ({ kcal, proteine, carboidrati, grassi, fibre })

export const somma = (...ms: Macro[]): Macro =>
  ms.reduce((a, b) => m(a.kcal + b.kcal, a.proteine + b.proteine, a.carboidrati + b.carboidrati, a.grassi + b.grassi, a.fibre + b.fibre), m(0, 0, 0, 0, 0))

export const scala = (x: Macro, fattore: number): Macro =>
  m(Math.round(x.kcal * fattore), r1(x.proteine * fattore), r1(x.carboidrati * fattore), r1(x.grassi * fattore), r1(x.fibre * fattore))

const r1 = (v: number) => Math.round(v * 10) / 10

export const arrotonda = (x: Macro): Macro =>
  m(Math.round(x.kcal), Math.round(x.proteine), Math.round(x.carboidrati), Math.round(x.grassi), Math.round(x.fibre))

// ————— Cache alimenti (per 100g) — la stessa per target e consumato (BRIEF §8) —————
export const ALIMENTI: Alimento[] = [
  { nome: 'Pasta di semola', per100: m(355, 12, 71, 1.5, 3) },
  { nome: 'Riso', per100: m(360, 7, 80, 0.6, 1) },
  { nome: 'Patate', per100: m(85, 2, 18, 0.1, 1.6) },
  { nome: 'Pane comune', per100: m(270, 8.5, 52, 2, 3.5) },
  { nome: 'Pane di segale', per100: m(240, 8, 45, 1.7, 6) },
  { nome: 'Pan bauletto integrale', per100: m(245, 10, 41, 4, 6.5) },
  { nome: 'Fette biscottate integrali', per100: m(380, 13, 68, 6, 8) },
  { nome: 'Cereali da colazione', per100: m(380, 8, 80, 3, 6) },
  { nome: 'Farina di avena', per100: m(370, 13, 66, 7, 8) },
  { nome: 'Gallette di riso', per100: m(390, 8, 82, 2.5, 2) },
  { nome: 'Latte scremato', per100: m(34, 3.3, 5, 0.2, 0) },
  { nome: 'Latte proteico', per100: m(44, 6, 4.5, 0.5, 0) },
  { nome: 'Yogurt greco 0%', per100: m(57, 10, 4, 0.2, 0) },
  { nome: 'Ricotta vaccina', per100: m(145, 11, 3.5, 10, 0) },
  { nome: 'Parmigiano', per100: m(390, 33, 0, 28, 0) },
  { nome: 'Uovo intero', per100: m(155, 12.5, 1, 11, 0) },
  { nome: 'Albume', per100: m(52, 10.8, 0.7, 0.2, 0) },
  { nome: 'Petto di pollo', per100: m(110, 23, 0, 1.5, 0) },
  { nome: 'Petto di tacchino', per100: m(107, 24, 0, 1, 0) },
  { nome: 'Macinato magro bovino', per100: m(130, 21, 0, 5, 0) },
  { nome: 'Carne rossa taglio magro', per100: m(130, 21.5, 0, 4.8, 0) },
  { nome: 'Bresaola / affettato magro', per100: m(150, 32, 0.5, 2, 0) },
  { nome: 'Tonno al naturale (sgocciolato)', per100: m(100, 23.5, 0, 0.6, 0) },
  { nome: 'Tonno fresco', per100: m(144, 23, 0, 5, 0) },
  { nome: 'Salmone fresco', per100: m(185, 20, 0, 12, 0) },
  { nome: 'Salmone affumicato', per100: m(160, 25, 0, 6.5, 0) },
  { nome: 'Merluzzo', per100: m(72, 17, 0, 0.4, 0) },
  { nome: 'Legumi cotti', per100: m(90, 7, 14, 0.6, 6.5) },
  { nome: 'Olio EVO', per100: m(900, 0, 0, 100, 0) },
  { nome: 'Burro di arachidi', per100: m(600, 26, 12, 50, 7) },
  { nome: 'Frutta secca mista', per100: m(620, 18, 10, 55, 8) },
  { nome: 'Mandorle', per100: m(600, 22, 9, 52, 12) },
  { nome: 'Noci', per100: m(660, 15, 7, 65, 6) },
  { nome: 'Cioccolato fondente 85%', per100: m(590, 10, 28, 46, 12) },
  { nome: 'Marmellata', per100: m(220, 0.5, 54, 0.1, 1) },
  { nome: 'Proteine in polvere', per100: m(370, 80, 8, 4, 0) },
  { nome: 'Spremuta di arancia', per100: m(45, 0.7, 10, 0.2, 0.1) },
  { nome: 'Mela', per100: m(52, 0.3, 14, 0.2, 2.4) },
  { nome: 'Banana', per100: m(89, 1.1, 23, 0.3, 2.6) },
  { nome: 'Verdure miste', per100: m(25, 1.5, 4, 0.3, 2.5) },
  { nome: 'Pomodorini', per100: m(20, 1, 3.5, 0.2, 1) },
  { nome: 'Zucca', per100: m(26, 1, 6.5, 0.1, 0.5) },
  { nome: 'Insalata', per100: m(15, 1.2, 2.2, 0.2, 1.3) },
  { nome: 'Salsa di pomodoro', per100: m(30, 1.3, 5, 0.5, 1.5) },
  { nome: 'Avena', per100: m(370, 13, 66, 7, 8) },
  { nome: 'Couscous', per100: m(360, 12, 72, 1.5, 3) },
  { nome: 'Farro', per100: m(340, 15, 67, 2.5, 7) },
  { nome: 'Hamburger di pollo/tacchino', per100: m(120, 20, 1, 4, 0) },
]

export function trovaAlimento(nome: string, extra: Alimento[] = []): Alimento | undefined {
  const q = nome.trim().toLowerCase()
  const tutti = [...extra, ...ALIMENTI]
  return tutti.find(a => a.nome.toLowerCase() === q) ?? tutti.find(a => a.nome.toLowerCase().includes(q))
}

// ————— Macro per opzione del piano corrente (Settembre/Ottobre) —————
// Chiave: `${pastoId}-${n}` — calcolo voce per voce dalle grammature del coach.
export interface MacroOpzione { macro: Macro; assunzioni: string[] }

export const MACRO_OPZIONI: Record<string, MacroOpzione> = {
  // COLAZIONE
  'colazione-1': { // 200ml latte proteico · 6 fette biscottate integrali (≈48g, o 4 fettine pan bauletto = 100g) · 20g fondente
    macro: arrotonda(somma(scala(m(44, 6, 4.5, 0.5, 0), 2), scala(m(380, 13, 68, 6, 8), 0.48), scala(m(590, 10, 28, 46, 12), 0.2))),
    assunzioni: ['Latte proteico (in alternativa: scremato + 15g proteine, macro simili)', '1 fetta biscottata = 8g → 6 = 48g', 'Scelto fondente (la frutta secca è simile: ~124 kcal)'] },
  'colazione-2': { // 20g burro arachidi · 50g cereali · 200ml latte proteico
    macro: arrotonda(somma(scala(m(600, 26, 12, 50, 7), 0.2), scala(m(380, 8, 80, 3, 6), 0.5), scala(m(44, 6, 4.5, 0.5, 0), 2))),
    assunzioni: ['Latte proteico (in alternativa: scremato + 15g proteine)'] },
  'colazione-3': { // 2 uova (120g) + 150g albume · 200ml spremuta · 60g pane tostato
    macro: arrotonda(somma(scala(m(155, 12.5, 1, 11, 0), 1.2), scala(m(52, 10.8, 0.7, 0.2, 0), 1.5), scala(m(45, 0.7, 10, 0.2, 0.1), 2), scala(m(270, 8.5, 52, 2, 3.5), 0.6))),
    assunzioni: ['2 uova medie = 120g', 'Scelta spremuta (il caffè americano vale ~0 kcal: −90 kcal)'] },
  'colazione-4': { // pancake: 200g albume · 60g farina avena · 20g marmellata · 20g burro arachidi
    macro: arrotonda(somma(scala(m(52, 10.8, 0.7, 0.2, 0), 2), scala(m(370, 13, 66, 7, 8), 0.6), scala(m(220, 0.5, 54, 0.1, 1), 0.2), scala(m(600, 26, 12, 50, 7), 0.2))),
    assunzioni: [] },
  // PRANZO
  'pranzo-1': { // 80g pasta + 150g legumi cotti · 10g olio · tonno GRANDE · 20g parmigiano
    macro: arrotonda(somma(scala(m(355, 12, 71, 1.5, 3), 0.8), scala(m(90, 7, 14, 0.6, 6.5), 1.5), m(90, 0, 0, 10, 0), scala(m(100, 23.5, 0, 0.6, 0), 1.12), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Scatoletta GRANDE = 112g sgocciolati (160g lordi)'] },
  'pranzo-2': { // 100g pasta con verdure · 10g olio · 150g pollo · 20g parmigiano
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), scala(m(25, 1.5, 4, 0.3, 2.5), 2), m(90, 0, 0, 10, 0), scala(m(110, 23, 0, 1.5, 0), 1.5), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Verdure = 200g miste*'] },
  'pranzo-3': { // come 2 ma tacchino
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), scala(m(25, 1.5, 4, 0.3, 2.5), 2), m(90, 0, 0, 10, 0), scala(m(107, 24, 0, 1, 0), 1.5), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Verdure = 200g miste*'] },
  'pranzo-4': { // 100g pasta · 100g salmone affumicato · rucola pomodorini · 20g parmigiano
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), m(160, 25, 0, 6.5, 0), scala(m(20, 1, 3.5, 0.2, 1), 1.5), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Rucola e pomodorini = 150g*'] },
  'pranzo-5': { // 100g pasta · 150g macinato magro · verdure · 20g parmigiano
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), scala(m(130, 21, 0, 5, 0), 1.5), scala(m(25, 1.5, 4, 0.3, 2.5), 2), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Verdure = 200g miste*'] },
  'pranzo-6': { // 80g pasta + 150g legumi · pomodori insalata · 2 uova + 150g albume · 20g parmigiano
    macro: arrotonda(somma(scala(m(355, 12, 71, 1.5, 3), 0.8), scala(m(90, 7, 14, 0.6, 6.5), 1.5), scala(m(18, 1.1, 2.8, 0.2, 1.1), 1.5), scala(m(155, 12.5, 1, 11, 0), 1.2), scala(m(52, 10.8, 0.7, 0.2, 0), 1.5), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Pomodori e insalata = 150g*'] },
  'pranzo-7': { // 100g pasta · 100g tonno · 10g olio · pomodorini · 20g parmigiano
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), m(100, 23.5, 0, 0.6, 0), m(90, 0, 0, 10, 0), m(20, 1, 3.5, 0.2, 1), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Pomodorini = 100g*'] },
  'pranzo-8': { // 100g pasta o riso · 100g ricotta · 100g affettato magro · verdure · 20g parmigiano
    macro: arrotonda(somma(m(355, 12, 71, 1.5, 3), m(145, 11, 3.5, 10, 0), m(150, 32, 0.5, 2, 0), scala(m(25, 1.5, 4, 0.3, 2.5), 2), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['Scelta pasta (il riso sposta poco)', 'Verdure = 200g miste*'] },
  // SPUNTINO
  'spuntino-1': { // 1 frutto · 10g frutta secca · 35g proteine
    macro: arrotonda(somma(scala(m(52, 0.3, 14, 0.2, 2.4), 1.5), scala(m(620, 18, 10, 55, 8), 0.1), scala(m(370, 80, 8, 4, 0), 0.35))),
    assunzioni: ['1 frutto = mela media 150g*'] },
  'spuntino-2': { // 10g mandorle · 150g yogurt greco 0% + 15g proteine
    macro: arrotonda(somma(scala(m(600, 22, 9, 52, 12), 0.1), scala(m(57, 10, 4, 0.2, 0), 1.5), scala(m(370, 80, 8, 4, 0), 0.15))),
    assunzioni: [] },
  // CENA — base fissa (120g pane segale + verdura + 10g fondente) da sommare al secondo
  'cena-base': {
    macro: arrotonda(somma(scala(m(240, 8, 45, 1.7, 6), 1.2), scala(m(25, 1.5, 4, 0.3, 2.5), 2.5), scala(m(590, 10, 28, 46, 12), 0.1))),
    assunzioni: ['Scelto pane di segale 120g (in alternativa 80g riso: ~288 kcal, simile)', 'Verdura = 250g*'] },
  'cena-1': { // 250g merluzzo + 15g olio
    macro: arrotonda(somma(scala(m(72, 17, 0, 0.4, 0), 2.5), scala(m(900, 0, 0, 100, 0), 0.15))),
    assunzioni: [] },
  'cena-2': { // 250g salmone o tonno fresco + 5g olio
    macro: arrotonda(somma(scala(m(185, 20, 0, 12, 0), 2.5), scala(m(900, 0, 0, 100, 0), 0.05))),
    assunzioni: ['Scelto salmone (col tonno fresco: ~100 kcal in meno)'] },
  'cena-3': { // 200g carne rossa magra + 5g olio
    macro: arrotonda(somma(scala(m(130, 21.5, 0, 4.8, 0), 2), scala(m(900, 0, 0, 100, 0), 0.05))),
    assunzioni: [] },
  'cena-4': { // 200g pollo/tacchino + 15g olio
    macro: arrotonda(somma(scala(m(110, 23, 0, 1.5, 0), 2), scala(m(900, 0, 0, 100, 0), 0.15))),
    assunzioni: [] },
  'cena-5': { // frittata: 250ml albume + 2 uova + 20g parmigiano
    macro: arrotonda(somma(scala(m(52, 10.8, 0.7, 0.2, 0), 2.5), scala(m(155, 12.5, 1, 11, 0), 1.2), scala(m(390, 33, 0, 28, 0), 0.2))),
    assunzioni: ['2 uova medie = 120g'] },
}

export const MACRO_VUOTO: Macro = m(0, 0, 0, 0, 0)
