import { useState } from 'react'
import { useStore } from '../lib/store'
import { canonico, idInSlot, fmtCarico, fmtData, fmtBlocco, isEffettiva, tonnellaggioSessione, pianoSerie, TIPI_LABEL } from '../lib/progression'

export default function Workouts() {
  const { stato, invia } = useStore()
  const [id, setId] = useState<string | null>(null)
  const sessioni = [...stato.sessioni].sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
  const s = sessioni.find(x => x.id === id)
  if (!s) return <div className="stack">
    <p className="small fade-dim">Apri una seduta per confrontare il programma con quello che hai fatto.</p>
    {!sessioni.length && <div className="card">I tuoi resoconti compariranno qui dopo il primo allenamento.</div>}
    {sessioni.map(x => <button key={x.id} className="card row row--between" style={{ textAlign: 'left' }} onClick={() => setId(x.id)}>
      <div><b>{fmtData(x.data)} · {x.giornoNome}</b><div className="small fade-dim">{x.esercizi.filter(e => e.serie.length).length} esercizi · {fmtCarico(tonnellaggioSessione(x))} kg di volume</div></div><span>›</span>
    </button>)}
  </div>
  const precedente = sessioni.find(x => x.id !== s.id && (x.inizio ?? x.data) < (s.inizio ?? s.data) && x.programmaId === s.programmaId && x.giornoN === s.giornoN)
  const nonSvolti = s.programmaSnapshot?.giorni.find(g => g.n === s.giornoN)?.prescrizioni.filter(p => !s.esercizi.some(e => (e.esercizioId === p.esercizioId || (s.programmaId && e.esercizioId === idInSlot(stato, s.programmaId, s.giornoN, p.esercizioId))) && e.serie.length)) ?? []
  const durata = s.inizio && s.fine ? Math.max(0, Math.round((Date.parse(s.fine) - Date.parse(s.inizio)) / 60000)) : null
  return <div className="stack">
    <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={() => setId(null)}>‹ Tutti i workout</button>
    <h2>{fmtData(s.data)} · {s.giornoNome}</h2>
    <div className="card"><b>{fmtCarico(tonnellaggioSessione(s))} kg</b> di volume · {s.esercizi.reduce((n, e) => n + e.serie.filter(isEffettiva).length, 0)} serie effettive{durata !== null ? ` · ${durata} min` : ''}
      {precedente && <p className="small fade-dim">Seduta precedente ({fmtData(precedente.data)}): {fmtCarico(tonnellaggioSessione(precedente))} kg. Il volume dipende anche da esercizi e serie svolti.</p>}
    </div>
    {s.esercizi.filter(e => e.serie.length).map(e => {
      const eff = e.serie.filter(isEffettiva)
      const piano = e.prescrizione ? pianoSerie(e.prescrizione) : []
      const max = Math.max(...eff.map(x => x.carico), 1)
      let indice = 0
      return <section key={e.esercizioId} className="card stack" style={{ gap: 10 }}>
        <h3>{stato.nomiEsercizi[e.esercizioId] || e.nome || canonico(stato, e.esercizioId)?.nome || e.esercizioId}</h3>
        <p className="small fade-dim">{eff.length} serie effettive{piano.length ? ` su ${piano.length} previste` : ''}<br />Prescrizione: {e.prescrizione?.map(fmtBlocco).join(' + ') || 'non registrata in questa vecchia seduta'}</p>
        <div role="img" aria-label="Carico per serie effettiva; valori e ripetizioni nella tabella">
          {eff.map((x, i) => <div key={i} className="row" style={{ gap: 8, marginBottom: 6 }}>
            <span className="tiny" style={{ width: 20 }}>S{i + 1}</span><div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 4 }}><div style={{ width: `${100 * x.carico / max}%`, minWidth: 2, height: 16, background: 'var(--fire)', borderRadius: 4 }} /></div><span className="tiny" style={{ width: 95, textAlign: 'right' }}>{fmtCarico(x.carico)} kg × {fmtCarico(x.reps)}</span>
          </div>)}
        </div>
        <div style={{ overflowX: 'auto' }}><table className="workout-table"><thead><tr><th>Serie</th><th>Previsto</th><th>Fatto</th><th>RIR</th></tr></thead><tbody>
          {e.serie.map((x, i) => {
            const target = isEffettiva(x) ? piano[indice++] : undefined
            const b = target?.blocco
            const confrontabile = target?.tipo === x.tipo
            const esito = b && confrontabile ? x.reps < b.repMin ? 'Sotto range' : x.reps > (b.repMax ?? b.repMin) ? 'Sopra range' : 'Nel range' : ''
            return <tr key={i}><td>{i + 1} · {TIPI_LABEL[x.tipo]}{x.tecnica && <div className="tiny fade-dim">{x.tecnica}</div>}</td><td>{b ? `${b.repMin}${b.repMax ? `–${b.repMax}` : ''} · ${TIPI_LABEL[target!.tipo]}` : '—'}</td><td>{fmtCarico(x.carico)} kg × {fmtCarico(x.reps)}{esito && <div className="tiny fade-dim">{esito}</div>}</td><td>{x.rir === 4 ? '4+' : x.rir ?? '—'}</td></tr>
          })}
        </tbody></table></div>
        {e.note && <div className="exercise-note-preview"><b>Note della seduta</b><br />{e.note}</div>}
      </section>
    })}
    {nonSvolti.length > 0 && <details className="card"><summary>Esercizi non registrati ({nonSvolti.length})</summary><ul>{nonSvolti.map(p => <li key={p.ordine}>{canonico(stato, p.esercizioId)?.nome ?? p.nomePdf}</li>)}</ul></details>}
    <section className="card stack exercise-notes"><label htmlFor="workout-note" className="kicker">Cosa ricordare per la prossima seduta</label><textarea id="workout-note" placeholder="Cosa ha funzionato? Cosa vuoi cambiare?" value={stato.noteWorkout[s.id] ?? ''} onChange={e => invia({ t: 'nota-workout', id: s.id, testo: e.target.value })} /><span className="tiny fade-dim">Salvataggio automatico.</span></section>
    <button className="btn btn--ghost" style={{ color: 'var(--fire)' }} onClick={() => {
      if (!confirm(`Eliminare l’allenamento del ${fmtData(s.data)} · ${s.giornoNome}? Serie, carichi e note di questa seduta spariscono dallo storico e non si recuperano.`)) return
      invia({ t: 'elimina-sessione', id: s.id }); setId(null)
    }}>Elimina questo allenamento</button>
  </div>
}
