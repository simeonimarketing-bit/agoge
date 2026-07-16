import { useEffect, useRef, useState } from 'react'
import { fraseDelGiorno, type ContestoFrase } from '../data/frasi'
import { scomponi, BILANCIERE_KG } from '../lib/plates'
import { fmtCarico } from '../lib/progression'
import type { Macro } from '../types'

// ————— Numero grande con unità piccola —————
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

// ————— Stepper: +/− grandi + tocco sul numero = inserimento diretto —————
export function Stepper({ value, step, min = 0, onChange, format, suffix }: {
  value: number; step: number; min?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  suffix?: string
}) {
  const [editing, setEditing] = useState(false)
  const [testo, setTesto] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function conferma() {
    const v = parseFloat(testo.replace(',', '.'))
    if (!isNaN(v) && v >= min) onChange(v)
    setEditing(false)
  }

  return (
    <div className="stepper">
      <button aria-label="meno" onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}>−</button>
      {editing ? (
        <input
          ref={inputRef}
          className="val val--input"
          inputMode="decimal"
          defaultValue={format ? format(value) : String(value)}
          onChange={e => setTesto(e.target.value)}
          onBlur={conferma}
          onKeyDown={e => { if (e.key === 'Enter') conferma() }}
        />
      ) : (
        <button className="val" onClick={() => { setTesto(String(value)); setEditing(true) }} aria-label="scrivi il valore">
          {format ? format(value) : value}{suffix && <span className="val-suffix">{suffix}</span>}
        </button>
      )}
      <button aria-label="più" onClick={() => onChange(Math.round((value + step) * 100) / 100)}>+</button>
    </div>
  )
}

// ————— Selettore RIR (facoltativo, un tocco) —————
export function RirSelect({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <div className="chips" role="group" aria-label="RIR">
      {[0, 1, 2, 3, 4].map(r => (
        <button key={r}
          className={`chip ${value === r ? 'chip--on' : ''}`}
          onClick={() => onChange(value === r ? undefined : r as 0 | 1 | 2 | 3 | 4)}>
          {r === 4 ? '4+' : r}
        </button>
      ))}
      <span className="tiny fade-dim" style={{ alignSelf: 'center' }}>RIR</span>
    </div>
  )
}

// ————— Qualità tecnica (facoltativa) —————
const TECNICHE = [
  { id: 'pulita', label: 'Pulita' },
  { id: 'sporca', label: 'Un po’ sporca' },
  { id: 'compromessa', label: 'Compromessa' },
] as const

export function TecnicaSelect({ value, onChange }: {
  value: 'pulita' | 'sporca' | 'compromessa' | undefined
  onChange: (v: 'pulita' | 'sporca' | 'compromessa' | undefined) => void
}) {
  return (
    <div className="chips" role="group" aria-label="qualità tecnica">
      {TECNICHE.map(t => (
        <button key={t.id}
          className={`chip ${value === t.id ? (t.id === 'compromessa' ? 'chip--fire' : 'chip--on') : ''}`}
          onClick={() => onChange(value === t.id ? undefined : t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ————— Barra rest persistente (non blocca la schermata) —————
export function RestBar({ secondi, onFine }: { secondi: number | null; onFine: () => void }) {
  const countdown = secondi !== null
  const [rimasti, setRimasti] = useState(secondi ?? 0)
  const [trascorsi, setTrascorsi] = useState(0)
  const [pausa, setPausa] = useState(false)
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    if (pausa) return
    const id = setInterval(() => {
      if (countdown) setRimasti(r => r - 1)
      else setTrascorsi(t => t + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [countdown, pausa])

  const mostra = countdown ? Math.max(rimasti + extra, 0) : trascorsi
  const finito = countdown && rimasti + extra <= 0

  useEffect(() => {
    if (finito && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
  }, [finito])

  const mm = Math.floor(mostra / 60)
  const ss = String(mostra % 60).padStart(2, '0')
  const tot = countdown ? (secondi ?? 0) + extra : 1
  const perc = countdown ? Math.max(0, Math.min(1, mostra / Math.max(tot, 1))) : 1

  return (
    <div className={`restbar ${finito ? 'restbar--fine' : ''}`} role="timer">
      <div className="restbar-track" style={{ width: `${perc * 100}%` }} />
      <div className="restbar-inner">
        <div>
          <span className="restbar-t">{mm}:{ss}</span>
          <span className="tiny fade-dim" style={{ marginLeft: 8 }}>
            {finito ? 'sotto il ferro' : countdown ? 'rest' : 'quando ti senti pronto'}
          </span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {countdown && !finito && (
            <>
              <button className="restbar-btn" onClick={() => setExtra(e => e + 15)}>+15</button>
              <button className="restbar-btn" onClick={() => setExtra(e => e + 30)}>+30</button>
              <button className="restbar-btn" onClick={() => setPausa(p => !p)}>{pausa ? '▶' : 'II'}</button>
            </>
          )}
          <button className="restbar-btn restbar-btn--fire" onClick={onFine}>{finito ? 'Vai' : 'Termina'}</button>
        </div>
      </div>
    </div>
  )
}

// ————— Wake Lock: schermo acceso durante la sessione —————
export function useWakeLock(attivo: boolean) {
  useEffect(() => {
    if (!attivo || !('wakeLock' in navigator)) return
    let lock: any = null
    let vivo = true
    const prendi = async () => {
      try { lock = await (navigator as any).wakeLock.request('screen') } catch { /* non supportato: pazienza */ }
    }
    const onVis = () => { if (document.visibilityState === 'visible' && vivo) prendi() }
    prendi()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', onVis)
      lock?.release?.().catch(() => {})
    }
  }, [attivo])
}

// ————— Calcolatore piastre —————
export function PlateCalc({ carico }: { carico: number }) {
  const s = scomponi(carico)
  if (!s) return <div className="small fade-dim">Sotto il peso del bilanciere ({BILANCIERE_KG} kg)</div>
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
      <span className="tiny kicker">Bil {BILANCIERE_KG} + per lato:</span>
      {s.perLato.length === 0 && <span className="small fade-dim">bilanciere scarico</span>}
      {s.perLato.map((p, i) => (
        <span key={i} className="pill" style={{
          padding: '3px 9px', fontSize: '0.78rem',
          color: p >= 20 ? 'var(--fire)' : 'var(--text)',
          borderColor: p >= 20 ? 'var(--fire-deep)' : 'var(--line)',
        }}>{fmtCarico(p)}</span>
      ))}
      {s.resto > 0 && <span className="tiny fade-dim">+{s.resto} kg non componibile</span>}
    </div>
  )
}

// ————— Sparkline rossa —————
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

// ————— Doppia sparkline (carico pieno + reps tratteggiate) —————
export function SparkDoppia({ carichi, reps, w = 300, h = 84, etichette }: {
  carichi: number[]; reps: number[]; w?: number; h?: number; etichette?: string[]
}) {
  if (carichi.length < 2) return null
  const linea = (punti: number[], top: number, bottom: number) => {
    const min = Math.min(...punti), max = Math.max(...punti)
    const span = max - min || 1
    const px = (i: number) => 8 + (i * (w - 16)) / (punti.length - 1)
    const py = (v: number) => bottom - ((v - min) / span) * (bottom - top)
    return punti.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden>
      <line className="spark-grid" x1={8} y1={h - 14} x2={w - 8} y2={h - 14} />
      <path d={linea(reps, 14, h - 18)} stroke="var(--dim)" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
      <path className="spark-line" d={linea(carichi, 10, h - 22)} />
      {etichette?.map((e, i) => (
        <text key={i} x={8 + (i * (w - 16)) / (etichette.length - 1)} y={h - 3} textAnchor="middle" fontSize={8.5} fill="var(--dim)">{e}</text>
      ))}
    </svg>
  )
}

// ————— Barra di avanzamento —————
export function Progress({ done, total }: { done: number; total: number }) {
  const p = total > 0 ? Math.min(1, done / total) : 0
  return (
    <div className="progress" role="progressbar" aria-valuenow={done} aria-valuemax={total}>
      <div className="progress-fill" style={{ width: `${p * 100}%` }} />
    </div>
  )
}

// ————— Riepilogo macro —————
export function MacroRow({ macro, size = 'normale' }: { macro: Macro; size?: 'normale' | 'grande' }) {
  const items: [string, number, string][] = [
    ['kcal', macro.kcal, ''], ['P', macro.proteine, 'g'], ['C', macro.carboidrati, 'g'], ['G', macro.grassi, 'g'], ['F', macro.fibre, 'g'],
  ]
  return (
    <div className="row" style={{ gap: size === 'grande' ? 18 : 12, flexWrap: 'wrap' }}>
      {items.map(([k, v, u]) => (
        <span key={k} className="macro-item">
          <b style={{ fontFamily: 'var(--display)', fontSize: size === 'grande' ? '1.25rem' : '0.95rem', color: k === 'kcal' ? 'var(--fire)' : 'var(--text)' }}>
            {Math.round(v)}
          </b>
          <span className="tiny fade-dim"> {k === 'kcal' ? 'kcal' : `${k}${u ? '' : ''}`}</span>
        </span>
      ))}
    </div>
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
