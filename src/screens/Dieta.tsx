import { useMemo, useState } from 'react'
import { PASTI, FREQUENZE, INTEGRAZIONE, REGOLE_DIETA } from '../data/dieta'
import { useStore, oggiISO } from '../lib/store'
import { Quote, Sheet } from '../components/comuni'
import type { Pasto } from '../types'

function inizioSettimana(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const lun = new Date(d)
  lun.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return lun.toISOString().slice(0, 10)
}

export default function Dieta() {
  const { stato, invia } = useStore()
  const oggi = oggiISO()
  const g = stato.dieta[oggi] ?? {
    pasti: {}, acqua: false, acquaAllenamento: false, sgarro: false,
    integrazioneColazione: false, integrazioneCena: false,
  }
  const [pastoAperto, setPastoAperto] = useState<Pasto | null>(null)

  const allenamentoOggi =
    stato.sessioneCorrente?.data === oggi ||
    stato.sessioni.some(s => s.data === oggi)

  // frequenze settimanali dalle opzioni loggate (l'app conosce già le categorie)
  const lunedi = inizioSettimana(oggi)
  const contaCategorie = useMemo(() => {
    const conta: Record<string, number> = {}
    for (const [data, dg] of Object.entries(stato.dieta)) {
      if (data < lunedi || data > oggi) continue
      for (const [pastoId, opzN] of Object.entries(dg.pasti)) {
        const pasto = PASTI.find(p => p.id === pastoId)
        const opz = pasto?.opzioni.find(o => o.n === opzN)
        for (const c of opz?.categorie ?? []) conta[c] = (conta[c] ?? 0) + 1
      }
    }
    return conta
  }, [stato.dieta, lunedi, oggi])

  // ultimo sgarro: fatti, non opinioni
  const ultimoSgarro = Object.entries(stato.dieta)
    .filter(([, dg]) => dg.sgarro)
    .map(([data]) => data)
    .sort()
    .pop()
  const giorniDaSgarro = ultimoSgarro
    ? Math.floor((new Date(oggi + 'T00:00:00').getTime() - new Date(ultimoSgarro + 'T00:00:00').getTime()) / 86_400_000)
    : null

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">PIANO GIU/LUG · 4 PASTI · L'OPZIONE È L'UNITÀ</span>
        <h1 className="display" style={{ fontSize: '2.6rem', lineHeight: 1, marginTop: 6 }}>
          LA TAVOLA<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      <Quote contesto="dieta" />

      {/* i 4 pasti — quattro tap al giorno */}
      <div className="stack" style={{ gap: 8 }}>
        {PASTI.map(p => {
          const scelta = g.pasti[p.id]
          const opz = p.opzioni.find(o => o.n === scelta)
          return (
            <button key={p.id} className="card card--knurled row row--between" style={{ textAlign: 'left' }}
              onClick={() => setPastoAperto(p)}>
              <div style={{ paddingLeft: 8, flex: 1 }}>
                <div className="display" style={{ fontSize: '1rem' }}>{p.nome}</div>
                {opz
                  ? <div className="small" style={{ color: 'var(--text)', marginTop: 2 }}>
                      <b style={{ color: 'var(--fire)' }}>Opzione {opz.n}</b>{opz.titolo ? ` · ${opz.titolo}` : ''} — {opz.voci[0]}{opz.voci.length > 1 ? '…' : ''}
                    </div>
                  : <div className="small fade-dim" style={{ marginTop: 2 }}>{p.opzioni.length} opzioni del coach — tocca e scegli</div>}
              </div>
              <span className="display" style={{ color: scelta ? 'var(--fire)' : 'var(--dim)', fontSize: '1.3rem' }}>
                {scelta ? '✓' : '›'}
              </span>
            </button>
          )
        })}
      </div>

      {/* acqua · sgarro · integrazione */}
      <div className="row" style={{ gap: 8 }}>
        <button className={`pill ${g.acqua ? 'pill--on' : ''}`} style={{ flex: 1 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { acqua: !g.acqua } })}>
          2L ACQUA {g.acqua ? '✓' : ''}
        </button>
        <button className={`pill ${g.acquaAllenamento ? 'pill--on' : ''}`} style={{ flex: 1, opacity: allenamentoOggi ? 1 : 0.45 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { acquaAllenamento: !g.acquaAllenamento } })}>
          +1L ALLENAMENTO {g.acquaAllenamento ? '✓' : ''}
        </button>
      </div>
      {!allenamentoOggi && <div className="tiny" style={{ color: 'var(--dim)', marginTop: -8 }}>Il litro extra vale nei giorni di allenamento (regola del coach).</div>}

      <div className="row" style={{ gap: 8 }}>
        <button className={`pill ${g.integrazioneColazione ? 'pill--on' : ''}`} style={{ flex: 1 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneColazione: !g.integrazioneColazione } })}>
          INTEGR. COLAZIONE {g.integrazioneColazione ? '✓' : ''}
        </button>
        <button className={`pill ${g.integrazioneCena ? 'pill--on' : ''}`} style={{ flex: 1 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneCena: !g.integrazioneCena } })}>
          INTEGR. CENA {g.integrazioneCena ? '✓' : ''}
        </button>
      </div>
      <div className="tiny" style={{ color: 'var(--dim)', marginTop: -8 }}>
        Colazione: {INTEGRAZIONE.colazione} · Cena: {INTEGRAZIONE.cena}
      </div>

      {/* sgarri — contatore, non giudizio */}
      <div className="card row row--between">
        <div>
          <span className="tiny kicker">GESTIONE SGARRI — UNO OGNI 15 GIORNI</span>
          <div className="small" style={{ marginTop: 2 }}>
            {giorniDaSgarro === null
              ? 'Nessuno sgarro registrato.'
              : giorniDaSgarro === 0 ? 'Sgarro registrato oggi.'
              : <>Ultimo sgarro: <b>{giorniDaSgarro} giorn{giorniDaSgarro === 1 ? 'o' : 'i'} fa</b></>}
          </div>
        </div>
        <button className={`pill ${g.sgarro ? 'pill--fire' : ''}`}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { sgarro: !g.sgarro } })}>
          {g.sgarro ? 'SGARRO ✓' : 'SEGNA SGARRO'}
        </button>
      </div>

      {/* frequenze settimanali */}
      <div className="card">
        <span className="tiny kicker">FREQUENZE DELLA SETTIMANA (dal lunedì)</span>
        <div className="stack" style={{ gap: 6, marginTop: 8 }}>
          {FREQUENZE.map(f => {
            const n = contaCategorie[f.key] ?? 0
            return (
              <div key={f.key} className="row row--between">
                <span className="small">{f.label} <span className="tiny fade-dim">({f.target})</span></span>
                <span className="row" style={{ gap: 4 }}>
                  {Array.from({ length: f.max }).map((_, i) => (
                    <span key={i} style={{
                      width: 12, height: 12, borderRadius: 3,
                      background: i < n ? 'var(--fire)' : 'var(--surface-2)',
                      border: '1px solid var(--line)',
                    }} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* banda macro: fase 3 */}
      <div className="card" style={{ borderStyle: 'dashed', background: 'none' }}>
        <span className="tiny kicker">BANDA MACRO DERIVATA — FASE 3</span>
        <p className="small fade-dim" style={{ marginTop: 4 }}>
          Qui arriverà la conversione del menù in kcal e macro: la banda che il piano ammette,
          congelata, estratta dalle grammature del coach. Serve per il discorso di settembre.
        </p>
      </div>

      <details>
        <summary className="small fade-dim" style={{ cursor: 'pointer' }}>Regole del piano</summary>
        <ul className="small fade-dim" style={{ paddingLeft: 18, marginTop: 8 }}>
          {REGOLE_DIETA.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>
      </details>

      {/* sheet scelta opzione */}
      {pastoAperto && (
        <Sheet onClose={() => setPastoAperto(null)}>
          <div className="stack">
            <div>
              <span className="kicker">{pastoAperto.nome.toUpperCase()}</span>
              {pastoAperto.nota && <div className="tiny" style={{ color: 'var(--dim)' }}>{pastoAperto.nota}</div>}
            </div>
            {pastoAperto.opzioni.map(o => {
              const scelta = g.pasti[pastoAperto.id] === o.n
              return (
                <button key={o.n} className="card" style={{
                  textAlign: 'left',
                  borderColor: scelta ? 'var(--fire)' : 'var(--line-soft)',
                }}
                  onClick={() => {
                    invia({ t: 'dieta-pasto', data: oggi, pasto: pastoAperto.id, opzione: scelta ? undefined : o.n })
                    setPastoAperto(null)
                  }}>
                  <div className="row row--between">
                    <span className="display" style={{ fontSize: '0.95rem', color: scelta ? 'var(--fire)' : 'var(--text)' }}>
                      OPZIONE {o.n}{o.titolo ? ` — ${o.titolo}` : ''}
                    </span>
                    {scelta && <span style={{ color: 'var(--fire)' }}>✓</span>}
                  </div>
                  <ul className="small fade-dim" style={{ paddingLeft: 16, marginTop: 4 }}>
                    {o.voci.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </button>
              )
            })}
            <button className="btn" onClick={() => setPastoAperto(null)}>CHIUDI</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
