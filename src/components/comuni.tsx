import { useEffect, useRef, useState } from 'react'
import { fraseCasuale, fraseDelGiorno, type ContestoFrase } from '../data/frasi'
import { scomponi, BILANCIERE_KG } from '../lib/plates'

// ————— Numero gigante con unità piccola (lo stack di piastre) —————
export function BigNum({ v, u, size = 2.6, fire = false }: { v: string | number; u?: string; size?: number; fire?: boolean }) {
  return (
    <span className="bignum" style={{ fontSize: `${size}rem`, color: fire ? 'var(--fire)' : undefined }}>
      {v}
      {u && <span className="unit">{u}</span>}
    </span>
  )
}

// ————— Frase del giorno —————
export function Quote({ contesto }: { contesto: ContestoFrase }) {
  const f = fraseDelGiorno(contesto)
  return (
    <div className="quote" role="note">
      “{f.testo}”
      {f.autore && <span className="autore">— {f.autore}</span>}
    </div>
  )
}

// ————— Stepper (kg / reps) —————
export function Stepper({ value, step, min = 0, onChange, format }: {
  value: number; step: number; min?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="stepper">
      <button aria-label="meno" onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}>−</button>
      <div className="val">{format ? format(value) : value}</div>
      <button aria-label="più" onClick={() => onChange(Math.round((value + step) * 100) / 100)}>+</button>
    </div>
  )
}

// ————— Rest timer a tutto schermo —————
export function RestTimer({ secondi, onFine }: { secondi: number | null; onFine: () => void }) {
  const [rimasti, setRimasti] = useState(secondi ?? 0)
  const [trascorsi, setTrascorsi] = useState(0)
  const frase = useRef(fraseCasuale('rest'))
  const countdown = secondi !== null

  useEffect(() => {
    const id = setInterval(() => {
      if (countdown) setRimasti(r => r - 1)
      else setTrascorsi(t => t + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [countdown])

  useEffect(() => {
    if (countdown && rimasti === 0 && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
  }, [rimasti, countdown])

  const mostra = countdown ? Math.max(rimasti, 0) : trascorsi
  const mm = Math.floor(mostra / 60)
  const ss = String(mostra % 60).padStart(2, '0')
  const finito = countdown && rimasti <= 0

  return (
    <div className="rest-overlay" onClick={onFine}>
      <div className="kicker">{countdown ? 'REST' : 'RECUPERO — QUANDO TI SENTI PRONTO'}</div>
      <div className={`t ${finito ? 'fine' : ''}`}>{mm}:{ss}</div>
      {finito && <div className="kicker kicker--fire">SOTTO IL FERRO</div>}
      <div className="quote" style={{ textAlign: 'center', maxWidth: 320, padding: '0 20px' }}>
        “{frase.current.testo}”
        {frase.current.autore && <span className="autore">— {frase.current.autore}</span>}
      </div>
      <button className="btn btn--ghost" style={{ width: 'auto', color: 'var(--muted)' }}>
        tocca per chiudere
      </button>
    </div>
  )
}

// ————— Calcolatore piastre —————
export function PlateCalc({ carico }: { carico: number }) {
  const s = scomponi(carico)
  if (!s) return <div className="small fade-dim">Sotto il peso del bilanciere ({BILANCIERE_KG} kg)</div>
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
      <span className="tiny kicker">BIL {BILANCIERE_KG} + PER LATO:</span>
      {s.perLato.length === 0 && <span className="small fade-dim">bilanciere scarico</span>}
      {s.perLato.map((p, i) => (
        <span key={i} className="pill" style={{
          padding: '3px 9px', fontSize: '0.78rem',
          color: p >= 20 ? 'var(--fire)' : 'var(--text)',
          borderColor: p >= 20 ? 'var(--fire-deep)' : 'var(--line)',
        }}>{p}</span>
      ))}
      {s.resto > 0 && <span className="tiny fade-dim">+{s.resto} kg non componibile</span>}
    </div>
  )
}

// ————— Sparkline rossa incandescente —————
export function Spark({ punti, w = 300, h = 72, etichette }: {
  punti: number[]; w?: number; h?: number; etichette?: string[]
}) {
  if (punti.length < 2) return null
  const min = Math.min(...punti), max = Math.max(...punti)
  const span = max - min || 1
  const px = (i: number) => 8 + (i * (w - 16)) / (punti.length - 1)
  const py = (v: number) => h - 14 - ((v - min) / span) * (h - 28)
  const d = punti.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden>
      <line className="spark-grid" x1={8} y1={h - 14} x2={w - 8} y2={h - 14} />
      <path className="spark-line" d={d} />
      {punti.map((v, i) => <circle key={i} className="spark-dot" cx={px(i)} cy={py(v)} r={2.6} />)}
      {etichette?.map((e, i) => (
        <text key={i} x={px(i)} y={h - 3} textAnchor="middle" fontSize={8.5} fill="var(--dim)">{e}</text>
      ))}
    </svg>
  )
}

// ————— Sheet dal basso —————
export function Sheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-back" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">{children}</div>
    </div>
  )
}
