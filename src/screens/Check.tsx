import { useState } from 'react'
import { CHECKS, PROSSIMO_CHECK } from '../data/checks'
import { fmtData, mediaMobile7 } from '../lib/progression'
import { BigNum, Spark, Stepper } from '../components/comuni'
import { oggiISO, useStore } from '../lib/store'
import type { Check as Misure } from '../types'

const PARAMETRI: { key: keyof Omit<Misure, 'data'>; nome: string; unita: string }[] = [
  { key: 'peso', nome: 'Peso', unita: 'kg' }, { key: 'vita', nome: 'Vita', unita: 'cm' }, { key: 'bf', nome: 'Massa grassa', unita: '%' },
  { key: 'lbm', nome: 'Massa magra', unita: 'kg' }, { key: 'fm', nome: 'Massa grassa', unita: 'kg' }, { key: 'bmr', nome: 'BMR', unita: 'kcal' },
  { key: 'fianchi', nome: 'Fianchi', unita: 'cm' }, { key: 'torace', nome: 'Torace', unita: 'cm' }, { key: 'braccioSx', nome: 'Braccio sx', unita: 'cm' },
  { key: 'braccioDx', nome: 'Braccio dx', unita: 'cm' }, { key: 'gambaSx', nome: 'Gamba sx', unita: 'cm' }, { key: 'gambaDx', nome: 'Gamba dx', unita: 'cm' }, { key: 'spalle', nome: 'Spalle', unita: 'cm' },
]
export default function Check() {
  const { stato, invia } = useStore()
  const perData = new Map<string, Partial<Misure> & { data: string }>()
  for (const c of [...(stato.profilo.ospite ? [] : CHECKS), ...stato.checksUtente]) perData.set(c.data, { ...perData.get(c.data), ...c })
  const checks = [...perData.values()].sort((a, b) => a.data.localeCompare(b.data))
  const oggi = oggiISO()
  const [peso, setPeso] = useState(stato.pesate[oggi] ?? checks.at(-1)?.peso ?? 75)
  const media = mediaMobile7(stato.pesate, oggi)
  const pesate = Object.entries(stato.pesate).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
  return <div className="screen stack" style={{ gap: 16 }}>
    <header><span className="kicker">Il tuo corpo, misurato · {checks.length} check</span><h1 className="display" style={{ fontSize: '2.4rem' }}>Il check<span style={{ color: 'var(--fire)' }}>.</span></h1></header>
    <section className="card stack"><span className="kicker">Pesata di oggi</span><div className="row" style={{ gap: 10, flexWrap: 'wrap' }}><Stepper value={peso} step={0.1} min={1} onChange={setPeso} format={v => v.toLocaleString('it-IT')} /><button className="btn btn--fire" style={{ width: 'auto' }} onClick={() => invia({ t: 'pesata', data: oggi, kg: peso })}>{stato.pesate[oggi] !== undefined ? 'Aggiorna' : 'Salva'}</button></div>
      <div><BigNum v={media?.toLocaleString('it-IT') ?? '—'} u="kg" size={2} /><span className="small fade-dim"> · media degli ultimi 7 giorni</span></div>
      {pesate.length > 1 && <Spark punti={pesate.map(([, v]) => v)} etichette={pesate.map(([d]) => fmtData(d))} />}
    </section>
    {!stato.profilo.ospite && !stato.checksUtente.length && <p className="small fade-dim">Prossimo check: {fmtData(PROSSIMO_CHECK.data)} · {PROSSIMO_CHECK.ora}</p>}
    {!checks.length && <p className="card small">Carica il PDF del tuo check da Sala → Importa PDF. Le misure compariranno qui con tabella e grafici.</p>}
    {PARAMETRI.filter(p => ['peso', 'vita', 'bf', 'lbm'].includes(p.key)).map(p => {
      const misure = checks.flatMap(c => typeof c[p.key] === 'number' ? [{ data: c.data, v: c[p.key]! }] : [])
      return misure.length > 0 && <section key={p.key} className="card"><div className="row row--between"><span className="kicker">{p.nome} ({p.unita})</span><b>{misure.at(-1)!.v.toLocaleString('it-IT')}</b></div>
        {misure.length > 1 ? <Spark punti={misure.map(c => c.v)} etichette={misure.map(c => fmtData(c.data))} /> : <p className="tiny fade-dim">{fmtData(misure[0].data)} · il grafico apparirà dal secondo check.</p>}
      </section>
    })}
    {checks.length > 0 && <div className="card" style={{ overflowX: 'auto' }}><table className="workout-table"><caption className="kicker">Misure dei check</caption><thead><tr><th>Parametro</th>{checks.map(c => <th key={c.data}>{fmtData(c.data)}</th>)}</tr></thead><tbody>{PARAMETRI.filter(p => checks.some(c => c[p.key] !== undefined)).map(p => <tr key={p.key}><th>{p.nome} ({p.unita})</th>{checks.map(c => <td key={c.data}>{c[p.key]?.toLocaleString('it-IT') ?? '—'}</td>)}</tr>)}</tbody></table><p className="tiny fade-dim">“—” indica una misura non presente nel documento.</p></div>}
  </div>
}
