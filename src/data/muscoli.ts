// Mappatura esplicita esercizio canonico → distretto PRIMARIO.
// Nessuna attribuzione automatica ai muscoli secondari (scelta deliberata):
// il volume settimanale conta solo il distretto principale.
export type Distretto =
  | 'petto' | 'dorso' | 'delt-laterali' | 'delt-posteriori' | 'delt-anteriori'
  | 'bicipiti' | 'tricipiti' | 'quadricipiti' | 'femorali' | 'glutei'
  | 'polpacci' | 'adduttori' | 'abduttori' | 'addome'

export const DISTRETTI_LABEL: Record<Distretto, string> = {
  petto: 'Petto', dorso: 'Dorso',
  'delt-laterali': 'Delt. laterali', 'delt-posteriori': 'Delt. posteriori', 'delt-anteriori': 'Delt. anteriori',
  bicipiti: 'Bicipiti', tricipiti: 'Tricipiti',
  quadricipiti: 'Quadricipiti', femorali: 'Femorali', glutei: 'Glutei',
  polpacci: 'Polpacci', adduttori: 'Adduttori', abduttori: 'Abduttori', addome: 'Addome',
}

export const MUSCOLO: Record<string, Distretto> = {
  'panca-piana-manubri': 'petto',
  'smith-panca-45': 'petto',
  'smith-panca-30': 'petto',
  'smith-panca-15': 'petto',
  'manubri-panca-30': 'petto',
  'manubri-panca-45': 'petto',
  'chest-press': 'petto',
  'chest-press-inclinata': 'petto',
  'croci-cavi': 'petto',
  'croci-panca-30': 'petto',
  'pec-fly': 'petto',
  'dip-parallele': 'petto',
  'alzate-laterali-manubri': 'delt-laterali',
  'alzate-laterali-macchina': 'delt-laterali',
  'alzate-laterali-cavo': 'delt-laterali',
  'alzate-frontali-cavo': 'delt-anteriori',
  'distensioni-manubri-80': 'delt-anteriori',
  'lento-avanti-smith': 'delt-anteriori',
  'shoulder-press': 'delt-anteriori',
  'apertura-posteriori': 'delt-posteriori',
  'apertura-90-manubri': 'delt-posteriori',
  'lat-machine-trazy': 'dorso',
  'lat-machine-prona': 'dorso',
  'lat-machine-inversa': 'dorso',
  'rematore-manubrio': 'dorso',
  'pulley-asta-dritta': 'dorso',
  'pulley-triangolo': 'dorso',
  'iliac-maniglia': 'dorso',
  'pulldown': 'dorso',
  'rematore-2-manubri-panca': 'dorso',
  'tbar-row': 'dorso',
  'rematore-bil-ez-inverso': 'dorso',
  'curl-manubri-panca-70': 'bicipiti',
  'curl-concentrato-scott': 'bicipiti',
  'curl-cavo-basso': 'bicipiti',
  'curl-bil-ez': 'bicipiti',
  'curl-scott-ez': 'bicipiti',
  'curl-hammer': 'bicipiti',
  'curl-manubri-seduto': 'bicipiti',
  'curl-scott-martello': 'bicipiti',
  'push-down-sbarra-curva': 'tricipiti',
  'push-down-corda': 'tricipiti',
  'push-down-vulken': 'tricipiti',
  'push-down-asta-dritta': 'tricipiti',
  'push-down-cavigliera': 'tricipiti',
  'dist-cavo-nuca': 'tricipiti',
  'french-press-manubri': 'tricipiti',
  'french-press-cavo-ez': 'tricipiti',
  'leg-extension': 'quadricipiti',
  'leg-press': 'quadricipiti',
  'leg-press-singola': 'quadricipiti',
  'squat-smith': 'quadricipiti',
  'hack-squat': 'quadricipiti',
  'adductor': 'adduttori',
  'abductor': 'abduttori',
  'leg-curl': 'femorali',
  'rdl-bilanciere': 'femorali',
  'rdl-manubri': 'femorali',
  'hip-thrust': 'glutei',
  'bulgari-manubri': 'glutei',
  'affondo-smith': 'glutei',
  'affondi-camminata': 'glutei',
  'polpacci-pressa': 'polpacci',
  'polpacci-in-piedi': 'polpacci',
  'polpacci-seduto': 'polpacci',
  'crunch': 'addome',
  'reverse-crunch': 'addome',
}

// Alternative AUTORIZZATE dal coach — solo coppie che lui stesso ha scritto
// con "/" nei suoi PDF. L'app non genera mai sostituzioni autonome.
export const ALTERNATIVE_COACH: Record<string, string[]> = {
  'squat-smith': ['hack-squat'], // "Hack squat/Squat alla smith" (Maggio)
  'hack-squat': ['squat-smith'],
  'tbar-row': ['rematore-2-manubri-panca'], // "T-BAR row o rematore due manubri su panca" (Maggio)
  'rematore-2-manubri-panca': ['tbar-row'],
  'lento-avanti-smith': ['distensioni-manubri-80'], // "Lento avanti manubri/Lento avanti alla smith" (Dicembre)
  'distensioni-manubri-80': ['lento-avanti-smith'],
  'pec-fly': ['croci-cavi'], // "Croci ai cavi stretto seduto/Pec fly" (Maggio)
  'croci-cavi': ['pec-fly'],
  'push-down-vulken': ['push-down-corda'], // "Push down corda o vulken in ginocchio" (Set/Ott)
  'push-down-corda': ['push-down-vulken'],
  'alzate-laterali-macchina': ['alzate-laterali-cavo'], // "Alzate laterali alla macchina o ai cavi singole" (Set/Ott)
  'alzate-laterali-cavo': ['alzate-laterali-macchina'],
  'dip-parallele': [], // "Dip parallele o machine": stesso canonico, cambia solo l'attrezzo
}

// Programmi storici (metadati per l'analisi per ciclo — i log partono da luglio 2026).
// Il ciclo corrente e le schede seed (riattivazione) si aggiungono a runtime in Storico.
export const PROGRAMMI_STORICI: { id: string; nome: string; dataInizio: string; dataFine: string }[] = [
  { id: 'dicembre-2025', nome: 'Dicembre', dataInizio: '2025-11-24', dataFine: '2026-01-14' },
  { id: 'gennaio-febbraio-2026', nome: 'Gennaio / Febbraio', dataInizio: '2026-01-19', dataFine: '2026-02-18' },
  { id: 'marzo-2026', nome: 'Marzo', dataInizio: '2026-02-23', dataFine: '2026-03-27' },
  { id: 'aprile-2026', nome: 'Aprile', dataInizio: '2026-03-30', dataFine: '2026-05-03' },
  { id: 'maggio-2026', nome: 'Maggio', dataInizio: '2026-05-04', dataFine: '2026-06-14' },
  { id: 'giugno-luglio-2-2026', nome: 'Giugno / Luglio 2', dataInizio: '2026-06-15', dataFine: '2026-07-19' },
]
