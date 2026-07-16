// Frasi motivazionali e filosofiche — lista curata, statica, contestuale.
// Mix: stoici e filosofia (IT) + leggende del ferro (EN originale).

export type ContestoFrase = 'apertura' | 'rest' | 'chiusura' | 'legday' | 'dieta' | 'storico'

export interface Frase {
  testo: string
  autore?: string
  contesti: ContestoFrase[]
}

export const FRASI: Frase[] = [
  // ——— Stoici & filosofia ———
  { testo: 'L’ostacolo è la via.', autore: 'Marco Aurelio', contesti: ['apertura', 'rest'] },
  { testo: 'Non è perché le cose sono difficili che non osiamo: è perché non osiamo che sono difficili.', autore: 'Seneca', contesti: ['apertura'] },
  { testo: 'Il corpo va trattato con rigore, perché non disobbedisca alla mente.', autore: 'Seneca', contesti: ['apertura', 'dieta'] },
  { testo: 'Bisogna immaginare Sisifo felice.', autore: 'Albert Camus', contesti: ['legday', 'rest'] },
  { testo: 'Nessun uomo ha il diritto di essere un dilettante in fatto di allenamento fisico.', autore: 'Socrate', contesti: ['apertura'] },
  { testo: 'Ciò che non mi uccide mi rende più forte.', autore: 'Nietzsche', contesti: ['chiusura', 'legday'] },
  { testo: 'Tu hai potere sulla tua mente, non sugli eventi esterni. Renditene conto, e troverai la forza.', autore: 'Marco Aurelio', contesti: ['rest', 'apertura'] },
  { testo: 'Scava dentro di te: lì c’è la sorgente del bene, e può sempre zampillare, se continui a scavare.', autore: 'Marco Aurelio', contesti: ['storico', 'chiusura'] },
  { testo: 'La disciplina pesa grammi, il rimpianto pesa tonnellate.', contesti: ['dieta', 'apertura'] },
  { testo: 'Che tu possa vivere tutta la vita senza dover dire: ho lasciato qualcosa sul bilanciere.', contesti: ['chiusura'] },
  { testo: 'Prima o poi il carico che oggi ti schiaccia sarà il tuo riscaldamento.', contesti: ['storico', 'rest'] },
  { testo: 'La fortuna non esiste: esiste il momento in cui la preparazione incontra l’occasione.', autore: 'Seneca', contesti: ['apertura', 'storico'] },

  // ——— Leggende del ferro ———
  { testo: 'The last three or four reps is what makes the muscle grow.', autore: 'Arnold Schwarzenegger', contesti: ['rest'] },
  { testo: 'The mind is the limit.', autore: 'Arnold Schwarzenegger', contesti: ['apertura', 'rest'] },
  { testo: 'Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.', autore: 'Ronnie Coleman', contesti: ['apertura', 'legday'] },
  { testo: 'Light weight, baby!', autore: 'Ronnie Coleman', contesti: ['rest', 'legday'] },
  { testo: 'Yeah buddy!', autore: 'Ronnie Coleman', contesti: ['chiusura'] },
  { testo: 'Squat till you drop.', autore: 'Tom Platz', contesti: ['legday'] },
  { testo: 'The pain of the squat is temporary. The legs are forever.', autore: 'Tom Platz', contesti: ['legday'] },
  { testo: 'Stimulate, don’t annihilate.', autore: 'Lee Haney', contesti: ['rest', 'chiusura'] },
  { testo: 'Blood and guts.', autore: 'Dorian Yates', contesti: ['apertura', 'legday'] },
  { testo: 'A champion is someone who gets up when he can’t.', autore: 'Jack Dempsey', contesti: ['rest', 'chiusura'] },
  { testo: 'The worst thing I can be is the same as everybody else.', autore: 'Arnold Schwarzenegger', contesti: ['apertura', 'storico'] },
  { testo: 'Everybody pities the weak; jealousy you have to earn.', autore: 'Arnold Schwarzenegger', contesti: ['chiusura', 'storico'] },
]

// Frase deterministica per data+contesto: stessa frase tutto il giorno, cambia domani.
export function fraseDelGiorno(contesto: ContestoFrase, data = new Date()): Frase {
  const pool = FRASI.filter(f => f.contesti.includes(contesto))
  const seed = Math.floor(data.getTime() / 86_400_000) + contesto.length * 7
  return pool[seed % pool.length]
}

// Frase casuale (per il rest timer: una diversa a ogni serie)
export function fraseCasuale(contesto: ContestoFrase): Frase {
  const pool = FRASI.filter(f => f.contesti.includes(contesto))
  return pool[Math.floor(Math.random() * pool.length)]
}
