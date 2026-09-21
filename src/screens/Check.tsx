import { useState } from 'react'
import { CHECKS, PROSSIMO_CHECK, PARAMETRI_GRAFICABILI } from '../data/checks'
import { DIETA_INIZIO } from '../data/dieta'
import { fmtData, settimanaCorrente, programmaAttivo, mediaMobile7 } from '../lib/progression'
import { BigNum, Spark, Stepper } from '../components/comuni'
import { oggiISO, useStore, aggiungiGiorni, giorniTra } from '../lib/store'

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']
const label = (iso: string) => MESI[Number(iso.slice(5, 7)) - 1]
const labelLunga = (iso: string) => `${MESI[Number(iso.slice(5, 7)) - 1].toLowerCase()} ${iso.slice(0, 4)}`

export default function Check() {
  const { stato, invia } = useStore()
  const ospite = stato.profilo.ospite
  const ultimo = CHECKS[CHECKS.length - 1]
  const primo = CHECKS[0]
  const oggi = oggiISO()
  const giorniAlCheck = giorniTra(oggi, PROSSIMO_CHECK.data)

  // pesata quotidiana + media mobile
  const pesataOggi = stato.pesate[oggi]
  const [peso, setPeso] = useState<number>(pesataOggi ?? ultimo?.peso ?? 75)
  const media = mediaMobile7(stato.pesate, oggi)
  const settimanaScorsa = mediaMobile7(stato.pesate, aggiungiGiorni(oggi, -7))
  const pesateOrdinate = Object.entries(stato.pesate).sort((a, b) => a[0].localeCompare(b[0]))

  // contesto del mesociclo
  const programma = programmaAttivo(stato)
  const sett = settimanaCorrente(programma)
  const giorniDieta = giorniTra(DIETA_INIZIO, oggi)
  const mesiDiCheck = Math.round(giorniTra(primo.data, ultimo.data) / 30.4)

  const delta = (k: 'peso' | 'vita' | 'bf' | 'lbm') => {
    const d = ultimo[k] - primo[k]
    return `${d > 0 ? '+' : ''}${(Math.round(d * 10) / 10).toLocaleString('it-IT')}`
  }

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">{ospite ? 'Il tuo corpo, misurato' : `${CHECKS.length} check · ${labelLunga(primo.data)} → ${labelLunga(ultimo.data)} · Dott. Pappa`}</span>
        <h1 className="display" style={{ fontSize: '2.4rem', lineHeight: 1, marginTop: 6 }}>
          Il check<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      {/* pesata quotidiana: la media settimanale è il numero leggibile */}
      <div className="card card--knurled">
        <div style={{ paddingLeft: 8 }}>
          <div className="row row--between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span className="tiny kicker">Pesata di oggi</span>
              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <Stepper value={peso} step={0.1} onChange={setPeso} format={v => v.toFixed(1).replace('.', ',')} />
                <button className="btn btn--fire" style={{ width: 'auto', minHeight: 56 }}
                  onClick={() => invia({ t: 'pesata', data: oggi, kg: Math.round(peso * 10) / 10 })}>
                  {pesataOggi !== undefined ? '✓' : 'Salva'}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="tiny kicker">Media 7 giorni</span>
              <div>
                <BigNum v={media !== null ? media.toFixed(1).replace('.', ',') : '—'} u="kg" size={2.1} fire={media !== null} />
              </div>
              {media !== null && settimanaScorsa !== null && (
                <div className="tiny fade-dim">
                  vs sett. scorsa: {media - settimanaScorsa >= 0 ? '+' : ''}{(media - settimanaScorsa).toFixed(1).replace('.', ',')} kg
                </div>
              )}
            </div>
          </div>
          {pesateOrdinate.length >= 2 && (
            <div style={{ marginTop: 8 }}>
              <Spark punti={pesateOrdinate.slice(-14).map(([, v]) => v)}
                etichette={pesateOrdinate.slice(-14).map(([d]) => fmtData(d).slice(0, 5))} />
            </div>
          )}
          <p className="tiny" style={{ color: 'var(--dim)', marginTop: 6 }}>
            La pesata quotidiana oscilla: leggi la media, non il singolo giorno. Il check ufficiale resta quello del coach.
          </p>
        </div>
      </div>

      {/* contesto */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="pill">Mesociclo: sett. {sett.n}/{sett.totale}</span>
        {!ospite && <span className="pill">Dieta: giorno {giorniDieta + 1}</span>}
        {!ospite && <span className="pill">Fase: off-season</span>}
        {!ospite && (giorniAlCheck === 0
          ? <span className="pill pill--fire">Check oggi · {PROSSIMO_CHECK.ora}</span>
          : giorniAlCheck > 0
            ? <span className="pill pill--fire">Check ufficiale: −{giorniAlCheck}g</span>
            : <span className="pill">Prossimo check: col nuovo PDF</span>)}
      </div>

      {!ospite && (
        <>
          <div className="card">
            <span className="tiny kicker">{mesiDiCheck} mesi in numeri — dal primo all'ultimo check del coach</span>
            <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
              <div><BigNum v={delta('peso')} u="kg" size={1.5} /><div className="tiny kicker">peso</div></div>
              <div><BigNum v={delta('bf')} u="%" size={1.5} fire /><div className="tiny kicker">grasso</div></div>
              <div><BigNum v={delta('lbm')} u="kg" size={1.5} /><div className="tiny kicker">magra</div></div>
              <div><BigNum v={delta('vita')} u="cm" size={1.5} /><div className="tiny kicker">vita</div></div>
            </div>
          </div>

          {PARAMETRI_GRAFICABILI.map(p => (
            <div key={p.key} className="card">
              <div className="row row--between">
                <span className="tiny kicker">{p.label} ({p.unit})</span>
                <span className="small" style={{ fontFamily: 'var(--display)' }}>
                  {ultimo[p.key].toLocaleString('it-IT')}<span className="tiny fade-dim"> {p.unit}</span>
                </span>
              </div>
              <Spark punti={CHECKS.map(c => c[p.key])} etichette={CHECKS.map(c => label(c.data))} />
            </div>
          ))}

          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th style={th}>Parametro</th>
                  {CHECKS.map(c => <th key={c.data} style={th}>{label(c.data)}</th>)}
                </tr>
              </thead>
              <tbody>
                {([
                  ['Peso (kg)', (c: typeof ultimo) => c.peso],
                  ['BF (%)', c => c.bf],
                  ['Massa grassa (kg)', c => c.fm],
                  ['Massa magra (kg)', c => c.lbm],
                  ['BMR (kcal)', c => c.bmr],
                  ['Vita (cm)', c => c.vita],
                  ['Fianchi (cm)', c => c.fianchi],
                  ['Torace (cm)', c => c.torace],
                  ['Braccio dx (cm)', c => c.braccioDx],
                  ['Gamba dx (cm)', c => c.gambaDx],
                  ['Spalle (cm)', c => c.spalle],
                ] as [string, (c: typeof ultimo) => number][]).map(([nome, f]) => (
                  <tr key={nome}>
                    <td style={{ ...td, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{nome}</td>
                    {CHECKS.map(c => <td key={c.data} style={td}>{f(c).toLocaleString('it-IT')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="tiny" style={{ color: 'var(--dim)' }}>
            Su peso e vita il trend è reale. Braccia e gambe sono misure al mezzo centimetro:
            sotto quella soglia è rumore, non un cambiamento. Il BMI non viene graficato:
            con questa massa magra è solo il peso riscalato.
          </p>
        </>
      )}
    </div>
  )
}

const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--dim)', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--line-soft)', fontVariantNumeric: 'tabular-nums' }
