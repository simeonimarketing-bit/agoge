import { useMemo, useState } from 'react'
import { PROGRAMMA, ADDOME } from '../data/programma'
import { canonicoById } from '../data/canonici'
import { PROSSIMO_CHECK } from '../data/checks'
import { useStore, oggiISO } from '../lib/store'
import {
  settimanaCorrente, blocchiSettimana, targetBlocco, ultimaVolta, record,
  incrementoDefault, tonnellaggioSessione, fmtKg, fmtData, fmtBlocco,
} from '../lib/progression'
import { BigNum, Quote, RestTimer, PlateCalc, Sheet, Stepper } from '../components/comuni'
import { fraseDelGiorno } from '../data/frasi'
import type { Blocco, LogSerie, Prescrizione } from '../types'

// ————— Card esercizio nella lista del giorno —————
function CardEsercizio({ p, settimana, fatto, onApri }: {
  p: Prescrizione; settimana: number; fatto: boolean; onApri: () => void
}) {
  const { stato } = useStore()
  const can = canonicoById(p.esercizioId)!
  const blocchi = blocchiSettimana(p, settimana)
  const ultima = ultimaVolta(stato, p.esercizioId)
  const inc = stato.incrementi[p.esercizioId] ?? incrementoDefault(p.esercizioId)
  const tgt = blocchi.length ? targetBlocco(blocchi[0], ultima, inc) : null

  return (
    <button className="card card--knurled" style={{ textAlign: 'left', opacity: fatto ? 0.55 : 1 }} onClick={onApri}>
      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingLeft: 8 }}>
          <div className="display" style={{ fontSize: '1.05rem', letterSpacing: '0.03em' }}>{can.nome}</div>
          <div className="small fade-dim" style={{ marginTop: 2 }}>
            {blocchi.map(fmtBlocco).join('  +  ')}
            {p.rest ? `  ·  rest ${p.rest}"` : ''}
          </div>
          {p.note && <div className="tiny" style={{ color: 'var(--dim)', marginTop: 2 }}>{p.note}</div>}
          <div className="small" style={{ marginTop: 8 }}>
            {ultima
              ? <span className="fade-dim">Ultima volta ({fmtData(ultima.data)}): <b style={{ color: 'var(--text)' }}>
                  {ultima.serie.map(s => `${s.carico}×${s.reps}`).join('  ')}</b></span>
              : <span className="fade-dim">Mai loggato — si parte oggi</span>}
          </div>
          {tgt && tgt.carico !== null && (
            <div className="small" style={{ marginTop: 3, color: tgt.aumento ? 'var(--fire)' : 'var(--text)', fontWeight: 700 }}>
              {tgt.aumento ? '▲ ' : ''}Target: {tgt.carico} kg × {tgt.reps}
            </div>
          )}
        </div>
        <div style={{ paddingLeft: 6 }}>
          {fatto
            ? <span className="tag-pr" style={{ color: 'var(--text)', borderColor: 'var(--line)' }}>FATTO</span>
            : <span className="display" style={{ color: 'var(--dim)', fontSize: '1.4rem' }}>›</span>}
        </div>
      </div>
    </button>
  )
}

// ————— Sheet di logging serie per serie —————
function LogSheet({ p, settimana, onClose }: { p: Prescrizione; settimana: number; onClose: () => void }) {
  const { stato, invia } = useStore()
  const can = canonicoById(p.esercizioId)!
  const blocchi = blocchiSettimana(p, settimana)
  const ultima = ultimaVolta(stato, p.esercizioId)
  const inc = stato.incrementi[p.esercizioId] ?? incrementoDefault(p.esercizioId)
  const rec = record(stato, p.esercizioId)

  // righe pianificate: espandi i blocchi in serie singole
  const piano = useMemo(() => {
    const righe: { blocco: Blocco; backOff: boolean }[] = []
    for (const b of blocchi) for (let i = 0; i < b.sets; i++) righe.push({ blocco: b, backOff: !!b.backOff })
    return righe
  }, [blocchi])

  const giaLoggate = stato.sessioneCorrente?.esercizi.find(e => e.esercizioId === p.esercizioId)?.serie ?? []
  const [serie, setSerie] = useState<LogSerie[]>(giaLoggate)
  const [timer, setTimer] = useState<null | { secondi: number | null }>(null)

  const prossima = serie.length
  const bloccoCorr = piano[Math.min(prossima, piano.length - 1)]?.blocco
  const tgt = bloccoCorr ? targetBlocco(bloccoCorr, ultima, inc) : null
  const isBackOff = piano[Math.min(prossima, piano.length - 1)]?.backOff ?? false

  // precompila: target, oppure ultima serie loggata
  const base = serie.length > 0 ? serie[serie.length - 1] : null
  const caricoInit = isBackOff && base
    ? Math.round(base.carico * 0.775 / 0.5) * 0.5 // back off: -22,5% (metà del range 20-25 del coach)
    : base?.carico ?? tgt?.carico ?? 20
  const [carico, setCarico] = useState<number>(caricoInit)
  const [reps, setReps] = useState<number>(tgt?.reps ?? bloccoCorr?.repMin ?? 8)
  const [vediPiastre, setVediPiastre] = useState(false)

  const stepKg = can.attrezzo === 'manubri' ? 1 : 0.5

  function salvaSerie() {
    const nuova: LogSerie = { carico, reps, ...(isBackOff ? { backOff: true } : {}) }
    const agg = [...serie, nuova]
    setSerie(agg)
    invia({ t: 'logga-esercizio', log: { esercizioId: p.esercizioId, serie: agg } })
    // rest: prescritto → countdown; altrimenti cronometro libero ("quando ti senti pronto")
    if (agg.length < piano.length) setTimer({ secondi: p.rest ?? null })
    // prossimo blocco può cambiare reps target e carico (back off: -22,5%, metà del range 20-25)
    const prossimo = piano[Math.min(agg.length, piano.length - 1)]
    if (prossimo) {
      if (prossimo.backOff && !isBackOff) {
        setCarico(Math.round(nuova.carico * 0.775 * 2) / 2)
      }
      const t2 = targetBlocco(prossimo.blocco, ultima, inc)
      setReps(t2?.reps ?? prossimo.blocco.repMin)
    }
  }

  function rimuoviUltima() {
    const agg = serie.slice(0, -1)
    setSerie(agg)
    invia({ t: 'logga-esercizio', log: { esercizioId: p.esercizioId, serie: agg } })
  }

  const nuovoRecord = rec && carico > rec.carico

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div>
          <div className="kicker">{fmtBlocco(bloccoCorr ?? blocchi[0])}{p.rest ? ` · REST ${p.rest}"` : ''}</div>
          <h2 className="display" style={{ fontSize: '1.5rem', marginTop: 2 }}>{can.nome}</h2>
          {p.note && <div className="small fade-dim">{p.note}</div>}
        </div>

        {ultima && (
          <div className="card" style={{ background: 'var(--surface-2)', padding: 10 }}>
            <span className="tiny kicker">ULTIMA VOLTA — {fmtData(ultima.data)}</span>
            <div style={{ marginTop: 4, fontFamily: 'var(--display)', fontSize: '1.1rem', letterSpacing: '0.04em' }}>
              {ultima.serie.map((s, i) => (
                <span key={i} style={{ marginRight: 14, color: s.backOff ? 'var(--muted)' : 'var(--text)' }}>
                  {s.carico}<span className="tiny fade-dim">kg</span>×{s.reps}
                </span>
              ))}
            </div>
            {tgt && tgt.motivo && <div className="tiny" style={{ color: tgt.aumento ? 'var(--fire)' : 'var(--dim)', marginTop: 4 }}>{tgt.motivo}</div>}
          </div>
        )}

        {/* serie già fatte */}
        {serie.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {serie.map((s, i) => (
              <span key={i} className="pill pill--on" style={s.backOff ? { background: 'var(--surface-2)', color: 'var(--muted)', borderColor: 'var(--line)' } : {}}>
                {i + 1}ª · {s.carico}kg × {s.reps}{s.backOff ? ' BO' : ''}
              </span>
            ))}
            <button className="pill" onClick={rimuoviUltima} aria-label="rimuovi ultima serie">↩︎</button>
          </div>
        )}

        {prossima < piano.length ? (
          <>
            <div className="kicker" style={{ marginTop: 4 }}>
              SERIE {prossima + 1} DI {piano.length}{isBackOff ? ' — BACK OFF (−20/25%)' : ''}
            </div>
            <div className="row row--between">
              <div>
                <div className="tiny kicker" style={{ marginBottom: 4 }}>CARICO</div>
                <Stepper value={carico} step={stepKg} onChange={setCarico}
                  format={v => `${v % 1 === 0 ? v : v.toFixed(1)}`} />
              </div>
              <div>
                <div className="tiny kicker" style={{ marginBottom: 4 }}>REPS</div>
                <Stepper value={reps} step={1} min={1} onChange={setReps} />
              </div>
            </div>
            {nuovoRecord && !isBackOff && (
              <div className="tag-pr" style={{ alignSelf: 'flex-start' }}>▲ SOPRA IL TUO MASSIMO STORICO ({rec!.carico} kg)</div>
            )}
            {(can.attrezzo === 'bilanciere') && (
              <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={() => setVediPiastre(v => !v)}>
                {vediPiastre ? '▾' : '▸'} piastre
              </button>
            )}
            {vediPiastre && can.attrezzo === 'bilanciere' && <PlateCalc carico={carico} />}
            <button className="btn btn--fire" onClick={salvaSerie}>
              SEGNA {carico % 1 === 0 ? carico : carico.toFixed(1)} KG × {reps}
            </button>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', background: 'var(--surface-2)' }}>
            <div className="display" style={{ fontSize: '1.2rem' }}>ESERCIZIO COMPLETO</div>
            <div className="small fade-dim">Tutte le {piano.length} serie a referto.</div>
          </div>
        )}

        <button className="btn" onClick={onClose}>CHIUDI</button>
      </div>
      {timer && <RestTimer secondi={timer.secondi} onFine={() => setTimer(null)} />}
    </Sheet>
  )
}

// ————— Resoconto di fine sessione —————
function Resoconto({ onChiudi }: { onChiudi: () => void }) {
  const { stato, invia } = useStore()
  const c = stato.sessioneCorrente!
  const ton = tonnellaggioSessione(c)
  const nSerie = c.esercizi.reduce((n, e) => n + e.serie.length, 0)
  const durata = c.inizio ? Math.round((Date.now() - new Date(c.inizio).getTime()) / 60000) : null

  // confronto con l'ultima sessione dello stesso giorno (descrizione di trend, non consiglio)
  const precedente = [...stato.sessioni].reverse().find(s => s.giornoN === c.giornoN)
  const tonPrec = precedente ? tonnellaggioSessione(precedente) : null

  // record battuti oggi
  const records: string[] = []
  for (const e of c.esercizi) {
    const can = canonicoById(e.esercizioId)
    const statoSenzaOggi = { ...stato, sessioni: stato.sessioni }
    const rec = record(statoSenzaOggi, e.esercizioId)
    const maxOggi = Math.max(...e.serie.filter(s => !s.backOff).map(s => s.carico), 0)
    if (can && maxOggi > 0 && (!rec || maxOggi > rec.carico)) {
      records.push(`${can.nome} — ${maxOggi} kg`)
    }
  }

  const t = fmtKg(ton)
  const frase = fraseDelGiorno('chiusura')

  return (
    <Sheet onClose={() => {}}>
      <div className="stack" style={{ textAlign: 'center', paddingTop: 8 }}>
        <div className="kicker kicker--fire">SESSIONE CHIUSA — GIORNO {c.giornoN} · {c.giornoNome}</div>
        <div>
          <BigNum v={t.v} u={t.u} size={4.4} />
          <div className="kicker" style={{ marginTop: 4 }}>FERRO SPOSTATO OGGI</div>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 28 }}>
          <div><BigNum v={nSerie} size={1.9} /><div className="tiny kicker">SERIE</div></div>
          <div><BigNum v={c.esercizi.length} size={1.9} /><div className="tiny kicker">ESERCIZI</div></div>
          {durata !== null && durata > 0 && (
            <div><BigNum v={durata} u="min" size={1.9} /><div className="tiny kicker">DURATA</div></div>
          )}
        </div>
        {tonPrec !== null && tonPrec > 0 && (
          <div className="small fade-dim">
            Stesso giorno, ciclo in corso ({fmtData(precedente!.data)}): {fmtKg(tonPrec).v} {fmtKg(tonPrec).u} —{' '}
            {ton >= tonPrec
              ? <b style={{ color: 'var(--fire)' }}>+{fmtKg(ton - tonPrec).v} {fmtKg(ton - tonPrec).u}</b>
              : <b>{fmtKg(ton - tonPrec).v.replace('-', '−')} {fmtKg(Math.abs(ton - tonPrec)).u}</b>}
          </div>
        )}
        {records.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--fire-deep)' }}>
            <div className="kicker kicker--fire" style={{ marginBottom: 6 }}>MASSIMI STORICI DI OGGI</div>
            {records.map((r, i) => <div key={i} className="small" style={{ fontWeight: 700 }}>{r}</div>)}
          </div>
        )}
        <div className="quote" style={{ marginTop: 6 }}>
          “{frase.testo}”{frase.autore && <span className="autore">— {frase.autore}</span>}
        </div>
        <button className="btn btn--fire" onClick={() => { invia({ t: 'chiudi-sessione' }); onChiudi() }}>
          A REFERTO
        </button>
      </div>
    </Sheet>
  )
}

// ————— Schermata OGGI —————
export default function Oggi() {
  const { stato, invia } = useStore()
  const sett = settimanaCorrente()

  // giorno suggerito: il successivo all'ultima sessione
  const ultimo = stato.sessioni.length ? stato.sessioni[stato.sessioni.length - 1].giornoN : 0
  const suggerito = (ultimo % 5) + 1
  const [giornoSel, setGiornoSel] = useState(stato.sessioneCorrente?.giornoN ?? suggerito)
  const [aperto, setAperto] = useState<string | null>(null)
  const [resoconto, setResoconto] = useState(false)

  const giorno = PROGRAMMA.giorni.find(g => g.n === giornoSel)!
  const inSessione = stato.sessioneCorrente !== null && stato.sessioneCorrente.giornoN === giornoSel
  const fatti = new Set(stato.sessioneCorrente?.esercizi.filter(e => e.serie.length > 0).map(e => e.esercizioId))

  const oggi = oggiISO()
  const checkOggi = PROSSIMO_CHECK.data === oggi
  const giorniAlCheck = Math.ceil((new Date(PROSSIMO_CHECK.data + 'T00:00:00').getTime() - new Date(oggi + 'T00:00:00').getTime()) / 86_400_000)

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <div className="row row--between">
          <span className="kicker">SETTIMANA {sett.n} / {sett.totale} · {PROGRAMMA.nome.toUpperCase()}</span>
          {checkOggi
            ? <span className="pill pill--fire">CHECK OGGI {PROSSIMO_CHECK.ora}</span>
            : giorniAlCheck > 0 && giorniAlCheck <= 14
              ? <span className="pill">check −{giorniAlCheck}g</span>
              : null}
        </div>
        <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: 6 }}>
          OGGI<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      <Quote contesto={giornoSel === 2 || giornoSel === 5 ? 'legday' : 'apertura'} />

      {/* selettore giorno */}
      <div className="row" style={{ overflowX: 'auto', paddingBottom: 4, gap: 8 }}>
        {PROGRAMMA.giorni.map(g => (
          <button key={g.n}
            className={`pill ${g.n === giornoSel ? 'pill--on' : ''}`}
            onClick={() => setGiornoSel(g.n)}>
            G{g.n} · {g.nome}
          </button>
        ))}
      </div>

      {!inSessione ? (
        <button className="btn btn--fire" onClick={() => invia({ t: 'avvia-sessione', giornoN: giorno.n, giornoNome: giorno.nome })}>
          INIZIA — GIORNO {giorno.n} · {giorno.nome}
        </button>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => invia({ t: 'annulla-sessione' })}>ANNULLA</button>
          <button className="btn btn--fire" style={{ flex: 2 }}
            disabled={fatti.size === 0}
            onClick={() => setResoconto(true)}>
            CHIUDI SESSIONE ({fatti.size}/{giorno.prescrizioni.length})
          </button>
        </div>
      )}

      {giorno.addome && (
        <div className="card" style={{ borderStyle: 'dashed', background: 'none' }}>
          <span className="tiny kicker kicker--fire">REGOLA DEL COACH</span>
          <div className="small" style={{ marginTop: 2 }}><b>{ADDOME.nome}</b> — {ADDOME.dettaglio}</div>
        </div>
      )}

      <div className="stack">
        {giorno.prescrizioni.map(p => (
          <CardEsercizio key={p.esercizioId + p.ordine} p={p} settimana={sett.n}
            fatto={fatti.has(p.esercizioId)}
            onApri={() => {
              if (!inSessione) invia({ t: 'avvia-sessione', giornoN: giorno.n, giornoNome: giorno.nome })
              setAperto(p.esercizioId)
            }} />
        ))}
      </div>

      {aperto && (
        <LogSheet
          p={giorno.prescrizioni.find(p => p.esercizioId === aperto)!}
          settimana={sett.n}
          onClose={() => setAperto(null)} />
      )}
      {resoconto && <Resoconto onChiudi={() => setResoconto(false)} />}
    </div>
  )
}
