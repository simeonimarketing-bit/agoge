import { CHECKS, PROSSIMO_CHECK, PARAMETRI_GRAFICABILI } from '../data/checks'
import { fmtData } from '../lib/progression'
import { BigNum, Spark } from '../components/comuni'
import { oggiISO } from '../lib/store'

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']
const label = (iso: string) => MESI[Number(iso.slice(5, 7)) - 1]

export default function Check() {
  const ultimo = CHECKS[CHECKS.length - 1]
  const primo = CHECKS[0]
  const oggi = oggiISO()
  const giorniAlCheck = Math.ceil((new Date(PROSSIMO_CHECK.data + 'T00:00:00').getTime() - new Date(oggi + 'T00:00:00').getTime()) / 86_400_000)

  const delta = (k: 'peso' | 'vita' | 'bf' | 'lbm') => {
    const d = ultimo[k] - primo[k]
    return `${d > 0 ? '+' : ''}${(Math.round(d * 10) / 10).toLocaleString('it-IT')}`
  }

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">6 CHECK · NOV 2025 → GIU 2026 · DOTT. PAPPA</span>
        <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: 6 }}>
          IL CHECK<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      <div className="card card--knurled row row--between">
        <div style={{ paddingLeft: 8 }}>
          <span className="tiny kicker kicker--fire">PROSSIMO CONTROLLO</span>
          <div className="display" style={{ fontSize: '1.3rem' }}>
            {giorniAlCheck === 0 ? `OGGI · ORE ${PROSSIMO_CHECK.ora}` :
             giorniAlCheck > 0 ? `${fmtData(PROSSIMO_CHECK.data)} · ${PROSSIMO_CHECK.ora}` :
             'DA FISSARE — ARRIVA COL PROSSIMO PDF'}
          </div>
        </div>
        {giorniAlCheck > 0 && <BigNum v={giorniAlCheck} u="giorni" size={2} fire />}
      </div>

      {/* la storia in una riga — descrizione, mai prescrizione */}
      <div className="card">
        <span className="tiny kicker">7 MESI IN NUMERI (dal primo all'ultimo check)</span>
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <div><BigNum v={delta('peso')} u="kg" size={1.5} /><div className="tiny kicker">PESO</div></div>
          <div><BigNum v={delta('bf')} u="%" size={1.5} fire /><div className="tiny kicker">GRASSO</div></div>
          <div><BigNum v={delta('lbm')} u="kg" size={1.5} /><div className="tiny kicker">MAGRA</div></div>
          <div><BigNum v={delta('vita')} u="cm" size={1.5} /><div className="tiny kicker">VITA</div></div>
        </div>
      </div>

      {PARAMETRI_GRAFICABILI.map(p => (
        <div key={p.key} className="card">
          <div className="row row--between">
            <span className="tiny kicker">{p.label.toUpperCase()} ({p.unit})</span>
            <span className="small" style={{ fontFamily: 'var(--display)' }}>
              {ultimo[p.key].toLocaleString('it-IT')}<span className="tiny fade-dim"> {p.unit}</span>
            </span>
          </div>
          <Spark punti={CHECKS.map(c => c[p.key])} etichette={CHECKS.map(c => label(c.data))} />
        </div>
      ))}

      {/* tabella completa */}
      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
          <thead>
            <tr>
              <th style={th}>PARAMETRO</th>
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
        sotto quella soglia è rumore di misura, non un cambiamento. Il BMI non viene graficato:
        con la tua massa magra è solo il peso riscalato.
      </p>
    </div>
  )
}

const th: React.CSSProperties = { padding: '9px 10px', textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--dim)', fontSize: '0.62rem', letterSpacing: '0.12em' }
const td: React.CSSProperties = { padding: '7px 10px', borderBottom: '1px solid var(--line-soft)', fontVariantNumeric: 'tabular-nums' }
