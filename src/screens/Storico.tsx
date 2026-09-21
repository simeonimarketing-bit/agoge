import { useMemo, useState } from 'react'
import { useStore, oggiISO, lunediDi } from '../lib/store'
import {
  storicoEsercizio, record, recordReps, fmtData, e1rm, migliorSerie, isAllenante,
  rirMedio, fmtCarico, tuttiICanonici, canonico, programmaAttivo, tonnellaggio, fineProgramma,
} from '../lib/progression'
import { MUSCOLO, DISTRETTI_LABEL, PROGRAMMI_STORICI, type Distretto } from '../data/muscoli'
import { PROGRAMMA } from '../data/programma'
import { SCHEDE_SEED } from '../data/riattivazione'
import { BigNum, Quote, SparkDoppia } from '../components/comuni'
import type { Stato, LogSerie } from '../types'

type Vista = 'esercizi' | 'cicli' | 'settimana'

// periodo di un programma (per filtrare i log per mesociclo)
function periodi(stato: Stato) {
  const attuale = programmaAttivo(stato)
  const visti = new Set<string>()
  const lista: { id: string; nome: string; dataInizio: string; dataFine: string }[] = []
  const aggiungi = (p: { id: string; nome: string; dataInizio: string; dataFine: string }) => {
    if (!visti.has(p.id)) { visti.add(p.id); lista.push(p) }
  }
  if (!stato.profilo.ospite) {
    PROGRAMMI_STORICI.forEach(aggiungi)
    // la scheda del coach e le seed (riattivazione) hanno sempre il loro periodo, anche se non attive
    for (const p of [PROGRAMMA, ...SCHEDE_SEED]) aggiungi({ id: p.id, nome: p.nome, dataInizio: p.dataInizio, dataFine: fineProgramma(p) })
  }
  aggiungi({ id: attuale.id, nome: attuale.nome, dataInizio: attuale.dataInizio, dataFine: fineProgramma(attuale) })
  for (const p of stato.programmiUtente) aggiungi({ id: p.id, nome: p.nome, dataInizio: p.dataInizio, dataFine: fineProgramma(p) })
  return lista.sort((a, b) => a.dataInizio.localeCompare(b.dataInizio))
}

// ————— Dettaglio esercizio —————
function Dettaglio({ id, onBack }: { id: string; onBack: () => void }) {
  const { stato } = useStore()
  const can = canonico(stato, id)!
  const voci = storicoEsercizio(stato, id)
  const rec = record(stato, id)

  const perSessione = voci.map(v => {
    const best = migliorSerie(v.serie)
    return { data: v.data, best, rir: rirMedio(v.serie), vol: v.serie.filter(isAllenante).length }
  }).filter(x => x.best)

  const carichi = perSessione.map(x => x.best!.carico)
  const repsArr = perSessione.map(x => x.best!.reps)
  const e1rms = perSessione.map(x => e1rm(x.best!.carico, x.best!.reps))
  const rirTrend = perSessione.map(x => x.rir).filter((x): x is number => x !== null)

  // confronto mesociclo corrente vs precedente (e1RM medio della miglior serie)
  const ps = periodi(stato)
  const confronto = useMemo(() => {
    const media = (da: string, a: string) => {
      const vals = perSessione.filter(x => x.data >= da && x.data <= a).map(x => e1rm(x.best!.carico, x.best!.reps))
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    }
    for (let i = ps.length - 1; i > 0; i--) {
      const cur = media(ps[i].dataInizio, ps[i].dataFine)
      const prev = media(ps[i - 1].dataInizio, ps[i - 1].dataFine)
      if (cur !== null && prev !== null) {
        return { delta: Math.round(((cur - prev) / prev) * 1000) / 10, vs: ps[i - 1].nome }
      }
    }
    return null
  }, [perSessione])

  // rep record per i carichi usati
  const repRecords = useMemo(() => {
    const carichiUsati = [...new Set(voci.flatMap(v => v.serie.filter(isAllenante).map(s => s.carico)))].sort((a, b) => b - a).slice(0, 4)
    return carichiUsati.map(c => ({ carico: c, reps: recordReps(stato, id, c) }))
  }, [voci])

  return (
    <div className="stack" style={{ gap: 14 }}>
      <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={onBack}>‹ tutti gli esercizi</button>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.1 }}>{can.nome}</h2>
        {can.alias.length > 0 && (
          <div className="tiny" style={{ color: 'var(--dim)', marginTop: 4 }}>
            Nei PDF anche come: {can.alias.slice(0, 3).join(' · ')}{can.alias.length > 3 ? ' · …' : ''}
          </div>
        )}
      </div>

      {rec && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div className="card card--knurled" style={{ flex: 1, minWidth: 130 }}>
            <span className="tiny kicker kicker--fire">Massimo</span>
            <div style={{ paddingLeft: 8 }}><BigNum v={fmtCarico(rec.carico)} u="kg" size={1.9} fire /> <span className="small fade-dim">× {rec.reps}</span></div>
          </div>
          {perSessione.length > 0 && (
            <div className="card" style={{ flex: 1, minWidth: 130 }}>
              <span className="tiny kicker">e1RM (stima)</span>
              <div><BigNum v={fmtCarico(Math.max(...e1rms))} u="kg" size={1.9} /></div>
            </div>
          )}
          {confronto && (
            <div className="card" style={{ flex: 1, minWidth: 130 }}>
              <span className="tiny kicker">vs {confronto.vs}</span>
              <div><BigNum v={`${confronto.delta > 0 ? '+' : ''}${confronto.delta}`} u="%" size={1.9} fire={confronto.delta > 0} /></div>
            </div>
          )}
        </div>
      )}

      {carichi.length >= 2 && (
        <div className="card">
          <div className="row row--between">
            <span className="tiny kicker">Carico (linea) e reps (tratteggio) — miglior serie</span>
          </div>
          <SparkDoppia carichi={carichi} reps={repsArr} etichette={perSessione.map(x => fmtData(x.data).slice(0, 5))} />
          {rirTrend.length >= 2 && (
            <div className="tiny fade-dim" style={{ marginTop: 4 }}>
              RIR medio: {rirTrend[0]} → {rirTrend[rirTrend.length - 1]}
            </div>
          )}
        </div>
      )}

      {repRecords.length > 0 && (
        <div className="card">
          <span className="tiny kicker">Rep record per carico</span>
          <div className="row" style={{ gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {repRecords.map(r => (
              <span key={r.carico} className="small"><b style={{ fontFamily: 'var(--display)' }}>{fmtCarico(r.carico)}</b><span className="tiny fade-dim">kg</span> × {r.reps}</span>
            ))}
          </div>
        </div>
      )}

      {voci.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div style={{ fontWeight: 800, color: 'var(--muted)' }}>Pila vuota</div>
          <div className="small fade-dim" style={{ marginTop: 4 }}>La prima piastra la metti alla prossima sessione.</div>
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {[...voci].reverse().map((v, i) => {
          const allen = v.serie.filter(isAllenante)
          const top = Math.max(...allen.map(s => s.carico), 0)
          const isPr = rec !== null && top === rec.carico && v.data === rec.data
          const rir = rirMedio(v.serie)
          return (
            <div key={i} className={`plate-row ${isPr ? 'pr' : ''}`}>
              <div style={{ minWidth: 64 }}>
                <div className="small" style={{ fontWeight: 700 }}>{fmtData(v.data)}</div>
                <div className="tiny fade-dim">{v.giornoNome}{rir !== null ? ` · RIR ${rir}` : ''}</div>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--display)', fontSize: '1.02rem', letterSpacing: '0.05em' }}>
                {v.serie.map((s, j) => (
                  <span key={j} style={{ marginRight: 12, color: isAllenante(s) ? 'var(--text)' : 'var(--dim)' }}>
                    {fmtCarico(s.carico)}<span className="tiny fade-dim">kg</span>×{s.reps}
                    {s.tecnica === 'compromessa' && <span style={{ color: 'var(--fire)' }}>!</span>}
                  </span>
                ))}
              </div>
              {isPr && <span className="tag-pr">PR</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ————— Analisi per ciclo (programmazione) —————
function Cicli() {
  const { stato } = useStore()
  const ps = periodi(stato)
  const [sel, setSel] = useState<string | null>(null)
  const periodo = ps.find(p => p.id === sel)

  const analisi = useMemo(() => {
    if (!periodo) return []
    const perEsercizio = new Map<string, { data: string; serie: LogSerie[] }[]>()
    for (const s of stato.sessioni) {
      if (s.data < periodo.dataInizio || s.data > periodo.dataFine) continue
      for (const e of s.esercizi) {
        if (!perEsercizio.has(e.esercizioId)) perEsercizio.set(e.esercizioId, [])
        perEsercizio.get(e.esercizioId)!.push({ data: s.data, serie: e.serie })
      }
    }
    return [...perEsercizio.entries()].map(([id, sessioniRaw]) => {
      const sessioni = [...sessioniRaw].sort((a, b) => a.data.localeCompare(b.data))
      const best = sessioni.map(x => migliorSerie(x.serie)).filter(Boolean) as LogSerie[]
      return {
        id,
        nome: canonico(stato, id)?.nome ?? id,
        sessioni: sessioni.length,
        carichi: best.map(b => b.carico),
        reps: best.map(b => b.reps),
        etichette: sessioni.map(x => fmtData(x.data).slice(0, 5)),
        vol: sessioni.reduce((n, x) => n + x.serie.filter(isAllenante).length, 0),
        ton: sessioni.reduce((n, x) => n + tonnellaggio(x.serie), 0),
      }
    }).filter(x => x.carichi.length > 0).sort((a, b) => b.ton - a.ton)
  }, [periodo, stato.sessioni])

  if (!periodo) {
    return (
      <div className="stack" style={{ gap: 8 }}>
        <p className="small fade-dim">Tocca una programmazione per l’analisi carichi/reps dei suoi esercizi.</p>
        {[...ps].reverse().map(p => {
          const n = stato.sessioni.filter(s => s.data >= p.dataInizio && s.data <= p.dataFine).length
          return (
            <button key={p.id} className="card row row--between" style={{ textAlign: 'left' }} onClick={() => setSel(p.id)}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.nome}</div>
                <div className="tiny fade-dim">{fmtData(p.dataInizio)} → {fmtData(p.dataFine)} · {n ? `${n} sessioni loggate` : 'nessun log (prima dell’app)'}</div>
              </div>
              <span className="display" style={{ color: n ? 'var(--fire)' : 'var(--dim)', fontSize: '1.2rem' }}>›</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={() => setSel(null)}>‹ tutte le programmazioni</button>
      <h2 style={{ fontWeight: 800, fontSize: '1.3rem' }}>{periodo.nome}</h2>
      {analisi.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 26 }}>
          <div style={{ fontWeight: 700, color: 'var(--muted)' }}>Nessun log in questo ciclo</div>
          <p className="small fade-dim" style={{ marginTop: 4 }}>I cicli precedenti all’app vivono sul quaderno di carta: qui si va avanti, da oggi.</p>
        </div>
      )}
      {analisi.map(a => (
        <div key={a.id} className="card">
          <div className="row row--between">
            <span style={{ fontWeight: 700 }}>{a.nome}</span>
            <span className="tiny fade-dim">{a.sessioni} sessioni · {a.vol} working</span>
          </div>
          {a.carichi.length >= 2
            ? <SparkDoppia carichi={a.carichi} reps={a.reps} etichette={a.etichette} />
            : <div className="small fade-dim" style={{ marginTop: 6 }}>{fmtCarico(a.carichi[0])} kg × {a.reps[0]} — servono 2+ sessioni per la curva</div>}
        </div>
      ))}
    </div>
  )
}

// ————— Volume settimanale per distretto —————
function Settimana() {
  const { stato } = useStore()
  const oggi = oggiISO()
  const lun = lunediDi(oggi)

  const conta = useMemo(() => {
    const m = new Map<Distretto, number>()
    const sessioni = [...stato.sessioni, ...(stato.sessioneCorrente ? [stato.sessioneCorrente] : [])]
    for (const s of sessioni) {
      if (s.data < lun || s.data > oggi) continue
      for (const e of s.esercizi) {
        const d = MUSCOLO[e.esercizioId]
        if (!d) continue
        m.set(d, (m.get(d) ?? 0) + e.serie.filter(isAllenante).length)
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [stato.sessioni, stato.sessioneCorrente, lun, oggi])

  const max = Math.max(...conta.map(([, n]) => n), 1)

  return (
    <div className="stack" style={{ gap: 10 }}>
      <p className="small fade-dim">Working set per distretto, da lunedì. Solo il muscolo primario: niente attribuzioni automatiche ai secondari.</p>
      {conta.length === 0 && <div className="card small fade-dim" style={{ textAlign: 'center', padding: 24 }}>Ancora nessuna working set questa settimana.</div>}
      {conta.map(([d, n]) => (
        <div key={d} className="row" style={{ gap: 10 }}>
          <span className="small" style={{ width: 118, color: 'var(--muted)' }}>{DISTRETTI_LABEL[d]}</span>
          <div style={{ flex: 1 }} className="progress"><div className="progress-fill" style={{ width: `${(n / max) * 100}%` }} /></div>
          <span className="small" style={{ fontFamily: 'var(--display)', width: 26, textAlign: 'right' }}>{n}</span>
        </div>
      ))}
    </div>
  )
}

// ————— Schermata —————
export default function Storico() {
  const { stato } = useStore()
  const [vista, setVista] = useState<Vista>('esercizi')
  const [sel, setSel] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')

  const conStorico = useMemo(() => {
    const conteggio = new Map<string, number>()
    for (const s of stato.sessioni) for (const e of s.esercizi) {
      conteggio.set(e.esercizioId, (conteggio.get(e.esercizioId) ?? 0) + 1)
    }
    return conteggio
  }, [stato.sessioni])

  const lista = tuttiICanonici(stato)
    .filter(c => c.id !== 'crunch' && c.id !== 'reverse-crunch')
    .filter(c => filtro === '' || (c.nome + ' ' + c.alias.join(' ')).toLowerCase().includes(filtro.toLowerCase()))
    .sort((a, b) => (conStorico.get(b.id) ?? 0) - (conStorico.get(a.id) ?? 0))

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      {sel ? (
        <Dettaglio id={sel} onBack={() => setSel(null)} />
      ) : (
        <>
          <header>
            <span className="kicker">Il quaderno — {stato.sessioni.length} sessioni</span>
            <h1 className="display" style={{ fontSize: '2.4rem', lineHeight: 1, marginTop: 6 }}>
              Storico<span style={{ color: 'var(--fire)' }}>.</span>
            </h1>
          </header>
          <Quote contesto="storico" />

          <div className="row" style={{ gap: 8 }}>
            {([['esercizi', 'Esercizi'], ['cicli', 'Cicli'], ['settimana', 'Settimana']] as [Vista, string][]).map(([v, l]) => (
              <button key={v} className={`pill ${vista === v ? 'pill--on' : ''}`} onClick={() => setVista(v)}>{l}</button>
            ))}
          </div>

          {vista === 'cicli' && <Cicli />}
          {vista === 'settimana' && <Settimana />}
          {vista === 'esercizi' && (
            <>
              <input placeholder="Cerca esercizio…" value={filtro} onChange={e => setFiltro(e.target.value)}
                style={{ padding: '12px 14px', fontSize: '1rem' }} />
              <div className="stack" style={{ gap: 8 }}>
                {lista.map(c => {
                  const n = conStorico.get(c.id) ?? 0
                  return (
                    <button key={c.id} className="card row row--between" style={{ textAlign: 'left', padding: '12px 14px' }} onClick={() => setSel(c.id)}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{c.nome}</div>
                        <div className="tiny fade-dim">{c.attrezzo}{n > 0 ? ` · ${n} session${n === 1 ? 'e' : 'i'}` : ' · pila vuota'}</div>
                      </div>
                      <span className="display" style={{ color: n > 0 ? 'var(--fire)' : 'var(--dim)', fontSize: '1.2rem' }}>›</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
