// Calcolatore piastre — aritmetica pura.
// Attrezzatura hardcodata (BRIEF: hardcoda tutto ciò che è fisso).
// Se la tua palestra ha piastre diverse, si cambia QUI e basta.
export const BILANCIERE_KG = 20
export const PIASTRE = [25, 20, 15, 10, 5, 2.5, 1.25] // disponibili, per lato

export interface Scomposizione {
  perLato: number[]
  resto: number // kg non componibili con le piastre disponibili
}

// Dato un carico totale col bilanciere, cosa metto per lato
export function scomponi(caricoTotale: number): Scomposizione | null {
  const daCaricare = (caricoTotale - BILANCIERE_KG) / 2
  if (daCaricare < 0) return null
  let resto = daCaricare
  const perLato: number[] = []
  for (const p of PIASTRE) {
    while (resto >= p - 1e-9) {
      perLato.push(p)
      resto -= p
    }
  }
  return { perLato, resto: Math.round(resto * 100) / 100 }
}
