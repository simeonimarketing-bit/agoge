import type { Pasto } from '../types'

// Piano alimentare "Settembre Ottobre" — inizio 16/09/2026, 5 settimane.
// Timeline INDIPENDENTE dal programma allenamento (BRIEF §3).
// Differenze dal piano Giu/Lug: pasta a pranzo 120 → 100g (80g nelle opzioni coi legumi),
// pan bauletto a colazione 3 → 4 fettine. Il resto è identico.
export const DIETA_INIZIO = '2026-09-16'
export const DIETA_NOME = 'Set/Ott'

export const PASTI: Pasto[] = [
  {
    id: 'colazione', nome: 'Colazione',
    opzioni: [
      { n: 1, voci: ['200ml latte proteico (o scremato + 15g proteine)', '6 fette biscottate integrali o 4 fettine pan bauletto', '20g fondente min 85% o 20g frutta secca'], categorie: ['latticini'] },
      { n: 2, voci: ['20g burro di arachidi/mandorle/nocciole o 20g frutta secca', '50g cereali', '200ml latte proteico (o scremato + 15g proteine)'], categorie: ['latticini'] },
      { n: 3, voci: ['2 uova + 150g albume', '200ml spremuta di arancia o caffè americano', '60g pane tostato'], categorie: ['uova'] },
      { n: 4, titolo: 'Pancake', voci: ['200g albume', '60g farina di avena aromatizzata', '20g marmellata classica', '20g burro di arachidi'], categorie: ['uova'] },
    ],
  },
  {
    id: 'pranzo', nome: 'Pranzo',
    opzioni: [
      { n: 1, voci: ['80g pasta con 150g legumi cotti (o minestrone o zucca)', '10g olio EVO', '1 scatoletta tonno GRANDE al naturale', '20g parmigiano'], categorie: ['legumi', 'pesce'] },
      { n: 2, voci: ['100g pasta con verdure o salsa di pomodoro', '10g olio EVO', '150g petto di pollo', '20g parmigiano'], categorie: ['carne_bianca'] },
      { n: 3, voci: ['100g pasta con verdure o salsa di pomodoro', '150g petto di tacchino', '10g olio EVO', '20g parmigiano'], categorie: ['carne_bianca'] },
      { n: 4, voci: ['100g pasta', '100g salmone affumicato', 'Rucola, pomodorini', '20g parmigiano'], categorie: ['pesce'] },
      { n: 5, voci: ['100g pasta', '150g macinato magro o hamburger magro', 'Verdure', '20g parmigiano'], categorie: ['carne_rossa'] },
      { n: 6, voci: ['80g pasta con 150g legumi cotti (o minestrone o zucca)', 'Pomodori, insalata', '2 uova intere + 150g albume', '20g parmigiano'], categorie: ['legumi', 'uova'] },
      { n: 7, voci: ['100g pasta', '100g tonno al naturale', '10g olio', 'Pomodorini', '20g parmigiano'], categorie: ['pesce'] },
      { n: 8, voci: ['100g pasta o riso', '100g ricotta vaccina', '100g affettato magro', 'Verdure', '20g parmigiano'], categorie: ['affettato', 'latticini'] },
    ],
  },
  {
    id: 'spuntino', nome: 'Spuntino pomeriggio', nota: 'Puoi dividerlo o spostarlo',
    opzioni: [
      { n: 1, voci: ['1 frutto', '10g mandorle o noci o nocciole', '35g proteine in polvere'], categorie: [] },
      { n: 2, voci: ['10g mandorle', '150g yogurt greco bianco 0% + 15g proteine in polvere'], categorie: ['latticini'] },
    ],
  },
  {
    id: 'cena', nome: 'Cena', nota: 'Base fissa: 120g pane di segale/farro/cereali oppure 80g riso · verdura a scelta · 10g fondente min 85%',
    opzioni: [
      { n: 1, voci: ['250g merluzzo', '15g olio EVO (sulla verdura)'], categorie: ['pesce'] },
      { n: 2, voci: ['250g filetto di salmone o tonno fresco', '5g olio EVO (sulla verdura)'], categorie: ['pesce'] },
      { n: 3, voci: ['200g carne rossa taglio magro', '5g olio EVO (sulla verdura)'], categorie: ['carne_rossa'] },
      { n: 4, voci: ['200g petto di pollo/tacchino', '15g olio EVO (sulla verdura)'], categorie: ['carne_bianca'] },
      { n: 5, titolo: 'Frittata', voci: ['250ml albume + 2 uova intere', '20g parmigiano', 'Al forno o padella antiaderente senza olio'], categorie: ['uova'] },
    ],
  },
]

// Frequenze settimanali dal PDF (tracciabili via opzioni loggate)
export const FREQUENZE = [
  { key: 'legumi', label: 'Legumi', target: '2-3× settimana', min: 2, max: 3 },
  { key: 'pesce', label: 'Pesce', target: '3× settimana', min: 3, max: 3 },
  { key: 'carne_rossa', label: 'Carne rossa', target: '1-2× settimana', min: 1, max: 2 },
  { key: 'carne_bianca', label: 'Carne bianca', target: '2-3× settimana', min: 2, max: 3 },
] as const

export const INTEGRAZIONE = {
  colazione: '1 multivitaminico + 0,5g vit. C + 4-5g creatina creapure',
  cena: '3g omega 3 + 2000 UI vit. D3+K2',
}

export const REGOLE_DIETA = [
  'Bere sui 2 litri + 1 litro durante l’allenamento',
  'Sgarro: uno ogni 15 giorni',
  'Tolleranza ±20g sul peso crudo dei secondi',
  'Tutto pesato a crudo (tranne legumi se indicato)',
  '100g pasta/riso = 400g patate',
  'Frutta + verdura: 4-5 porzioni al giorno · cereali integrali tutti i giorni',
  'Spezie, limone, basilico, aceto, aglio, cipolla: liberi · bevande ZERO ammesse',
]
