import { useRef, useState } from 'react'
import { PROGRAMMA, REGOLE_GLOBALI } from '../data/programma'
import { CHECKS, PROSSIMO_CHECK } from '../data/checks'
import { CANONICI, canonicoById } from '../data/canonici'
import { useStore, esportaBackup, oggiISO } from '../lib/store'
import { record, tonnellaggioSessione, fmtKg, fmtData } from '../lib/progression'
import type { Stato } from '../types'

// ————— Generatore check-in: compressione, non consiglio —————
function generaCheckIn(stato: Stato): string {
  const primo = CHECKS[0], ultimo = CHECKS[CHECKS.length - 1]
  const righe: string[] = []
  righe.push(`CHECK-IN — ${fmtData(oggiISO())}`)
  righe.push('')
  righe.push(`Antropometria (ultimo check ${fmtData(ultimo.data)}):`)
  righe.push(`• Peso ${ultimo.peso} kg (era ${primo.peso} a nov: ${(ultimo.peso - primo.peso).toFixed(1)} kg)`)
  righe.push(`• Vita ${ultimo.vita} cm · BF ${ultimo.bf}% · LBM ${ultimo.lbm} kg`)
  righe.push('')
  const sessioni = stato.sessioni
  if (sessioni.length > 0) {
    const ton = sessioni.reduce((t, s) => t + tonnellaggioSessione(s), 0)
    const t = fmtKg(ton)
    righe.push(`Allenamento: ${sessioni.length} sessioni loggate · ${t.v} ${t.u} totali`)
    // top 5 record
    const recs = CANONICI
      .map(c => ({ c, r: record(stato, c.id) }))
      .filter(x => x.r !== null)
      .sort((a, b) => b.r!.carico - a.r!.carico)
      .slice(0, 5)
    if (recs.length) {
      righe.push('Massimi attuali:')
      for (const { c, r } of recs) righe.push(`• ${c.nome}: ${r!.carico} kg × ${r!.reps}`)
    }
    righe.push('')
  }
  const sgarri = Object.entries(stato.dieta).filter(([, g]) => g.sgarro).map(([d]) => d).sort()
  righe.push(`Sgarri registrati: ${sgarri.length}${sgarri.length ? ` (ultimo ${fmtData(sgarri[sgarri.length - 1])})` : ''}`)
  righe.push('')
  righe.push('— generato da AGOGE: solo fatti, zero opinioni.')
  return righe.join('\n')
}

export default function Altro() {
  const { stato, invia } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [copiato, setCopiato] = useState(false)
  const flags = PROGRAMMA.giorni.flatMap(g => g.prescrizioni.filter(p => p.flag).map(p => ({ g: g.n, p })))

  async function copiaCheckIn() {
    await navigator.clipboard.writeText(generaCheckIn(stato))
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2500)
  }

  function importaBackup(f: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const dati = JSON.parse(String(reader.result)) as Stato
        if (dati.versione !== 1) throw new Error('versione sconosciuta')
        invia({ t: 'importa', stato: dati })
        alert('Backup ripristinato.')
      } catch {
        alert('File non valido: serve un backup esportato da AGOGE.')
      }
    }
    reader.readAsText(f)
  }

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">MOTORE, REGOLE, DATI</span>
        <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: 6 }}>
          LA SALA<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      {/* check-in generator */}
      <div className="card card--knurled">
        <div style={{ paddingLeft: 8 }}>
          <span className="tiny kicker kicker--fire">CHECK-IN PER IL COACH</span>
          <p className="small fade-dim" style={{ margin: '4px 0 10px' }}>
            Sei settimane di dati compressi in un messaggio: trend, massimi, sgarri.
            Solo fatti — decide lui, come sempre.
          </p>
          <button className="btn" onClick={copiaCheckIn}>
            {copiato ? 'COPIATO ✓ — INCOLLALO SU WHATSAPP' : 'GENERA E COPIA CHECK-IN'}
          </button>
        </div>
      </div>

      {/* import PDF — il rito delle 5 settimane */}
      <div className="card">
        <span className="tiny kicker">IMPORT NUOVO CICLO</span>
        <p className="small fade-dim" style={{ marginTop: 4 }}>
          Programma attivo: <b style={{ color: 'var(--text)' }}>{PROGRAMMA.nome}</b> (dal {fmtData(PROGRAMMA.dataInizio)},
          {' '}{PROGRAMMA.durataSettimane} settimane) · fonte: {PROGRAMMA.pdfSorgente}
        </p>
        <p className="small fade-dim" style={{ marginTop: 6 }}>
          Quando il Dott. Pappa manda i nuovi PDF: mettili nella cartella <b>Check e Prog</b>,
          apri Claude Code e scrivi «importa il nuovo ciclo». L'AI propone, tu confermi, i dati entrano.
          Due minuti ogni cinque settimane.
        </p>
        {flags.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary className="small" style={{ color: 'var(--fire)', cursor: 'pointer' }}>
              {flags.length} anomalie risolte alla conferma dell'import
            </summary>
            <ul className="small fade-dim" style={{ paddingLeft: 18, marginTop: 6 }}>
              {flags.map(({ g, p }, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  G{g} · {canonicoById(p.esercizioId)?.nome}: {p.flag}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* regole globali del coach */}
      <div className="card">
        <span className="tiny kicker">LE REGOLE DEL COACH — VALIDE TUTTO IL CICLO</span>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          {REGOLE_GLOBALI.map((r, i) => (
            <div key={i}>
              <b className="small">{r.t}.</b> <span className="small fade-dim">{r.d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* backup */}
      <div className="card">
        <span className="tiny kicker">I TUOI DATI</span>
        <p className="small fade-dim" style={{ marginTop: 4 }}>
          Tutto vive su questo telefono: {stato.sessioni.length} sessioni,{' '}
          {Object.keys(stato.dieta).length} giorni di dieta, 6 check. Esporta un backup ogni tanto:
          lo storico è l'unica cosa che non si ricompra.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => esportaBackup(stato)}>ESPORTA</button>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>RIPRISTINA</button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) importaBackup(f) }} />
        </div>
      </div>

      <p className="tiny" style={{ color: 'var(--dim)', textAlign: 'center', marginTop: 8 }}>
        AGOGE v0.1 — un'app per un solo utente.<br />
        L'AI cattura, comprime, ricorda, esegue. Non consiglia. Mai.
      </p>
    </div>
  )
}
