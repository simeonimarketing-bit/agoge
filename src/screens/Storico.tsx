import { useMemo, useState } from 'react'
import { CANONICI, canonicoById } from '../data/canonici'
import { useStore } from '../lib/store'
import { storicoEsercizio, record, fmtData } from '../lib/progression'
import { BigNum, Quote, Spark } from '../components/comuni'

// ————— Dettaglio esercizio: la pila di piastre —————
function Dettaglio({ id, onBack }: { id: string; onBack: () => void }) {
  const { stato } = useStore()
  const can = canonicoById(id)!
  const voci = storicoEsercizio(stato, id)
  const rec = record(stato, id)
  const topSet = voci.map(v => Math.max(...v.serie.filter(s => !s.backOff).map(s => s.carico), 0))

  return (
    <div className="stack" style={{ gap: 14 }}>
      <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={onBack}>‹ tutti gli esercizi</button>
      <div>
        <h2 className="display" style={{ fontSize: '1.7rem', lineHeight: 1.05 }}>{can.nome}</h2>
        {can.alias.length > 0 && (
          <div className="tiny" style={{ color: 'var(--dim)', marginTop: 4 }}>
            Nei PDF del coach anche come: {can.alias.slice(0, 3).join(' · ')}{can.alias.length > 3 ? ' · …' : ''}
          </div>
        )}
      </div>

      {rec && (
        <div className="card card--knurled row row--between">
          <div style={{ paddingLeft: 8 }}>
            <span className="tiny kicker kicker--fire">MASSIMO STORICO</span>
            <div><BigNum v={rec.carico} u="kg" size={2.4} fire /> <span className="fade-dim">× {rec.reps}</span></div>
          </div>
          <span className="small fade-dim">{fmtData(rec.data)}</span>
        </div>
      )}

      {topSet.filter(v => v > 0).length >= 2 && (
        <div className="card">
          <span className="tiny kicker">TOP SET NEL TEMPO</span>
          <Spark punti={topSet} etichette={voci.map(v => fmtData(v.data).slice(0, 5))} />
        </div>
      )}

      {voci.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <div className="display" style={{ fontSize: '1.1rem', color: 'var(--muted)' }}>PILA VUOTA</div>
          <div className="small fade-dim" style={{ marginTop: 4 }}>La prima piastra la metti alla prossima sessione.</div>
        </div>
      )}

      {/* la pila: sessioni dalla più recente */}
      <div className="stack" style={{ gap: 8 }}>
        {[...voci].reverse().map((v, i) => {
          const top = Math.max(...v.serie.filter(s => !s.backOff).map(s => s.carico), 0)
          const isPr = rec !== null && top === rec.carico && v.data === rec.data
          return (
            <div key={i} className={`plate-row ${isPr ? 'pr' : ''}`}>
              <div style={{ minWidth: 64 }}>
                <div className="small" style={{ fontWeight: 700 }}>{fmtData(v.data)}</div>
                <div className="tiny fade-dim">{v.giornoNome}</div>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                {v.serie.map((s, j) => (
                  <span key={j} style={{ marginRight: 12, color: s.backOff ? 'var(--dim)' : 'var(--text)' }}>
                    {s.carico}<span className="tiny fade-dim">kg</span>×{s.reps}
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

// ————— Elenco esercizi —————
export default function Storico() {
  const { stato } = useStore()
  const [sel, setSel] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')

  const conStorico = useMemo(() => {
    const conteggio = new Map<string, number>()
    for (const s of stato.sessioni) for (const e of s.esercizi) {
      conteggio.set(e.esercizioId, (conteggio.get(e.esercizioId) ?? 0) + 1)
    }
    return conteggio
  }, [stato.sessioni])

  const lista = CANONICI
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
            <span className="kicker">IL QUADERNO — {stato.sessioni.length} SESSIONI</span>
            <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: 6 }}>
              STORICO<span style={{ color: 'var(--fire)' }}>.</span>
            </h1>
          </header>
          <Quote contesto="storico" />
          <input
            placeholder="Cerca esercizio…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ padding: '12px 14px', fontSize: '1rem' }}
          />
          <div className="stack" style={{ gap: 8 }}>
            {lista.map(c => {
              const n = conStorico.get(c.id) ?? 0
              return (
                <button key={c.id} className="card row row--between" style={{ textAlign: 'left', padding: '12px 14px' }}
                  onClick={() => setSel(c.id)}>
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
    </div>
  )
}
