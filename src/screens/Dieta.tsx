import { useMemo, useState } from 'react'
import { PASTI, FREQUENZE, INTEGRAZIONE, REGOLE_DIETA, DIETA_NOME } from '../data/dieta'
import { MACRO_OPZIONI, MACRO_VUOTO, somma, scala, arrotonda, ALIMENTI } from '../data/macro'
import { useStore, oggiISO, lunediDi, giorniTra } from '../lib/store'
import { Quote, Sheet, MacroRow } from '../components/comuni'
import type { Pasto, Macro, VoceLibera, Alimento } from '../types'

const macroOpzione = (pastoId: string, n: number): Macro =>
  MACRO_OPZIONI[`${pastoId}-${n}`]?.macro ?? MACRO_VUOTO

// la cena = base fissa + secondo scelto
const macroCena = (n: number): Macro =>
  arrotonda(somma(MACRO_OPZIONI['cena-base'].macro, macroOpzione('cena', n)))

// ————— Dieta libera: aggiungi ciò che mangi, senza opzioni —————
function LiberaSheet({ onClose, data }: { onClose: () => void; data: string }) {
  const { stato, invia } = useStore()
  const [q, setQ] = useState('')
  const [grammi, setGrammi] = useState('100')
  const [nuovo, setNuovo] = useState<null | { nome: string; kcal: string; p: string; c: string; g: string }>(null)

  const tuttiAlimenti = [...stato.alimentiUtente, ...ALIMENTI]
  const risultati = q.trim().length >= 2
    ? tuttiAlimenti.filter(a => a.nome.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6)
    : []

  function aggiungi(a: Alimento) {
    const g = parseFloat(grammi.replace(',', '.')) || 100
    const voce: VoceLibera = { alimento: a.nome, grammi: g, macro: arrotonda(scala(a.per100, g / 100)) }
    invia({ t: 'dieta-libera-aggiungi', data, voce })
    setQ('')
  }

  function salvaNuovo() {
    if (!nuovo || !nuovo.nome.trim()) return
    const num = (s: string) => parseFloat(s.replace(',', '.')) || 0
    const a: Alimento = {
      nome: nuovo.nome.trim(), custom: true,
      per100: { kcal: num(nuovo.kcal), proteine: num(nuovo.p), carboidrati: num(nuovo.c), grassi: num(nuovo.g), fibre: 0 },
    }
    invia({ t: 'aggiungi-alimento', alimento: a })
    aggiungi(a)
    setNuovo(null)
  }

  const stile = { padding: '12px 14px', fontSize: '1rem', width: '100%' } as const

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div>
          <span className="kicker">Inserimento libero</span>
          <p className="tiny fade-dim" style={{ marginTop: 4 }}>
            Cerca un alimento e indica i grammi (peso a crudo). Ogni alimento fa sempre lo stesso numero: la cache è l'unità di misura.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input style={{ ...stile, flex: 2 }} placeholder="Alimento… (es. riso)" value={q} onChange={e => setQ(e.target.value)} />
          <input style={{ ...stile, flex: 1 }} inputMode="decimal" placeholder="g" value={grammi} onChange={e => setGrammi(e.target.value)} />
        </div>
        {risultati.map(a => (
          <button key={a.nome} className="card row row--between" style={{ textAlign: 'left', padding: '10px 14px' }} onClick={() => aggiungi(a)}>
            <div>
              <div style={{ fontWeight: 700 }}>{a.nome}{a.custom ? ' ·' : ''} {a.custom && <span className="tiny fade-dim">tuo</span>}</div>
              <div className="tiny fade-dim">{a.per100.kcal} kcal · P{a.per100.proteine} C{a.per100.carboidrati} G{a.per100.grassi} /100g</div>
            </div>
            <span style={{ color: 'var(--fire)', fontWeight: 800 }}>+</span>
          </button>
        ))}
        {q.trim().length >= 2 && !risultati.length && !nuovo && (
          <button className="btn" onClick={() => setNuovo({ nome: q.trim(), kcal: '', p: '', c: '', g: '' })}>
            «{q.trim()}» non c'è — aggiungilo alla cache
          </button>
        )}
        {nuovo && (
          <div className="card stack" style={{ gap: 8 }}>
            <span className="tiny kicker">Nuovo alimento — valori per 100g (da etichetta o CREA/USDA)</span>
            <input style={stile} value={nuovo.nome} onChange={e => setNuovo({ ...nuovo, nome: e.target.value })} placeholder="Nome" />
            <div className="row" style={{ gap: 6 }}>
              {(['kcal', 'p', 'c', 'g'] as const).map(k => (
                <input key={k} style={{ ...stile, padding: '10px 8px' }} inputMode="decimal" placeholder={k.toUpperCase()}
                  value={nuovo[k]} onChange={e => setNuovo({ ...nuovo, [k]: e.target.value })} />
              ))}
            </div>
            <button className="btn btn--fire" onClick={salvaNuovo}>Salva e aggiungi</button>
          </div>
        )}
        <button className="btn btn--ghost" onClick={onClose}>Chiudi</button>
      </div>
    </Sheet>
  )
}

function DietaSeed() {
  const { stato, invia } = useStore()
  const oggi = oggiISO()
  const g = stato.dieta[oggi] ?? {
    pasti: {}, acqua: false, acquaAllenamento: false, sgarro: false,
    integrazioneColazione: false, integrazioneCena: false,
  }
  const [pastoAperto, setPastoAperto] = useState<Pasto | null>(null)
  const [liberaAperta, setLiberaAperta] = useState(false)
  const soloLibera = stato.profilo.dietaLibera

  const allenamentoOggi =
    stato.sessioneCorrente?.data === oggi || stato.sessioni.some(s => s.data === oggi)

  // ————— Totale giornaliero: opzioni scelte + voci libere —————
  const { totale, selezionati, mancanti } = useMemo(() => {
    const parti: Macro[] = []
    let sel = 0
    const manca: string[] = []
    if (!soloLibera) {
      for (const p of PASTI) {
        const n = g.pasti[p.id]
        if (n !== undefined) {
          sel++
          parti.push(p.id === 'cena' ? macroCena(n) : macroOpzione(p.id, n))
        } else manca.push(p.nome.toLowerCase())
      }
    }
    for (const v of g.libere ?? []) parti.push(v.macro)
    return { totale: arrotonda(somma(...parti)), selezionati: sel, mancanti: manca }
  }, [g, soloLibera])

  const lunedi = lunediDi(oggi)
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

  const ultimoSgarro = Object.entries(stato.dieta).filter(([, dg]) => dg.sgarro).map(([d]) => d).sort().pop()
  const giorniDaSgarro = ultimoSgarro ? giorniTra(ultimoSgarro, oggi) : null

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">{soloLibera ? 'Dieta libera — logghi quello che mangi' : `Piano ${DIETA_NOME} · 4 pasti · l'opzione è l'unità`}</span>
        <h1 className="display" style={{ fontSize: '2.4rem', lineHeight: 1, marginTop: 6 }}>
          La tavola<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      <Quote contesto="dieta" />

      {/* totale giornaliero live */}
      <div className="card card--knurled">
        <div style={{ paddingLeft: 8 }}>
          <div className="row row--between">
            <span className="tiny kicker">Totale di oggi</span>
            {!soloLibera && (
              <span className="tiny" style={{ color: selezionati === PASTI.length ? 'var(--fire)' : 'var(--dim)' }}>
                {selezionati === PASTI.length
                  ? `${selezionati} pasti su ${PASTI.length} ✓`
                  : `parziale — manca ${mancanti.join(', ')}`}
              </span>
            )}
          </div>
          <div style={{ marginTop: 8 }}><MacroRow macro={totale} size="grande" /></div>
          <p className="tiny" style={{ color: 'var(--dim)', marginTop: 8 }}>
            Macro calcolati da tabelle CREA/USDA sulle grammature del coach — nei suoi PDF non ci sono.
            Le voci con * usano una convenzione dichiarata. Descrizione, non prescrizione.
          </p>
        </div>
      </div>

      {/* i 4 pasti a opzioni */}
      {!soloLibera && (
        <div className="stack" style={{ gap: 8 }}>
          {PASTI.map(p => {
            const scelta = g.pasti[p.id]
            const opz = p.opzioni.find(o => o.n === scelta)
            const mac = scelta !== undefined ? (p.id === 'cena' ? macroCena(scelta) : macroOpzione(p.id, scelta)) : null
            return (
              <button key={p.id} className={`card ${scelta ? 'card--fatta' : 'card--knurled'} row row--between`} style={{ textAlign: 'left' }}
                onClick={() => setPastoAperto(p)}>
                <div style={{ paddingLeft: scelta ? 0 : 8, flex: 1 }}>
                  <div className="row row--between">
                    <span style={{ fontWeight: 800 }}>{scelta ? '✓ ' : ''}{p.nome}</span>
                    {mac && <span className="tiny fade-dim">{mac.kcal} kcal</span>}
                  </div>
                  {opz
                    ? <div className="small fade-dim" style={{ marginTop: 2 }}>Opzione {opz.n}{opz.titolo ? ` · ${opz.titolo}` : ''}</div>
                    : <div className="small fade-dim" style={{ marginTop: 2 }}>{p.opzioni.length} opzioni del coach — tocca e scegli</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* inserimento libero (eccezioni per Salvatore, standard per ospiti) */}
      <div className="card">
        <div className="row row--between">
          <span className="tiny kicker">{soloLibera ? 'Cosa hai mangiato' : 'Fuori piano / sgarro'}</span>
          <button className="pill pill--fire" onClick={() => setLiberaAperta(true)}>+ aggiungi</button>
        </div>
        {(g.libere ?? []).length === 0
          ? <p className="small fade-dim" style={{ marginTop: 6 }}>{soloLibera ? 'Aggiungi il primo alimento della giornata.' : 'Vuoto — oggi tutto da piano.'}</p>
          : (g.libere ?? []).map((v, i) => (
            <div key={i} className="row row--between" style={{ marginTop: 8 }}>
              <span className="small">{v.alimento} · <b>{v.grammi}g</b></span>
              <span className="row" style={{ gap: 10 }}>
                <span className="tiny fade-dim">{v.macro.kcal} kcal</span>
                <button className="tiny" style={{ color: 'var(--dim)' }} onClick={() => invia({ t: 'dieta-libera-rimuovi', data: oggi, indice: i })}>✕</button>
              </span>
            </div>
          ))}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className={`pill ${g.acqua ? 'pill--on' : ''}`} style={{ flex: 1 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { acqua: !g.acqua } })}>
          2L acqua {g.acqua ? '✓' : ''}
        </button>
        <button className={`pill ${g.acquaAllenamento ? 'pill--on' : ''}`} style={{ flex: 1, opacity: allenamentoOggi ? 1 : 0.45 }}
          onClick={() => invia({ t: 'dieta', data: oggi, patch: { acquaAllenamento: !g.acquaAllenamento } })}>
          +1L allenamento {g.acquaAllenamento ? '✓' : ''}
        </button>
      </div>

      {!soloLibera && (
        <>
          <div className="row" style={{ gap: 8 }}>
            <button className={`pill ${g.integrazioneColazione ? 'pill--on' : ''}`} style={{ flex: 1 }}
              onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneColazione: !g.integrazioneColazione } })}>
              Integr. colazione {g.integrazioneColazione ? '✓' : ''}
            </button>
            <button className={`pill ${g.integrazioneCena ? 'pill--on' : ''}`} style={{ flex: 1 }}
              onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneCena: !g.integrazioneCena } })}>
              Integr. cena {g.integrazioneCena ? '✓' : ''}
            </button>
          </div>
          <div className="tiny" style={{ color: 'var(--dim)', marginTop: -8 }}>
            Colazione: {INTEGRAZIONE.colazione} · Cena: {INTEGRAZIONE.cena}
          </div>

          <div className="card row row--between">
            <div>
              <span className="tiny kicker">Sgarri — uno ogni 15 giorni</span>
              <div className="small" style={{ marginTop: 2 }}>
                {giorniDaSgarro === null ? 'Nessuno registrato.'
                  : giorniDaSgarro === 0 ? 'Registrato oggi.'
                  : <>Ultimo: <b>{giorniDaSgarro} giorn{giorniDaSgarro === 1 ? 'o' : 'i'} fa</b></>}
              </div>
            </div>
            <button className={`pill ${g.sgarro ? 'pill--fire' : ''}`}
              onClick={() => invia({ t: 'dieta', data: oggi, patch: { sgarro: !g.sgarro } })}>
              {g.sgarro ? 'Sgarro ✓' : 'Segna sgarro'}
            </button>
          </div>

          <div className="card">
            <span className="tiny kicker">Frequenze della settimana</span>
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

          <details>
            <summary className="small fade-dim" style={{ cursor: 'pointer' }}>Regole del piano</summary>
            <ul className="small fade-dim" style={{ paddingLeft: 18, marginTop: 8 }}>
              {REGOLE_DIETA.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
            </ul>
          </details>
        </>
      )}

      {/* sheet scelta opzione */}
      {pastoAperto && (
        <Sheet onClose={() => setPastoAperto(null)}>
          <div className="stack">
            <div>
              <span className="kicker">{pastoAperto.nome}</span>
              {pastoAperto.nota && <div className="tiny" style={{ color: 'var(--dim)' }}>{pastoAperto.nota}</div>}
            </div>
            {pastoAperto.opzioni.map(o => {
              const scelta = g.pasti[pastoAperto.id] === o.n
              const info = MACRO_OPZIONI[`${pastoAperto.id}-${o.n}`]
              const mac = pastoAperto.id === 'cena' ? macroCena(o.n) : info?.macro
              const assunzioni = [
                ...(pastoAperto.id === 'cena' ? MACRO_OPZIONI['cena-base'].assunzioni : []),
                ...(info?.assunzioni ?? []),
              ]
              return (
                <button key={o.n} className="card" style={{ textAlign: 'left', borderColor: scelta ? 'var(--fire)' : 'var(--line-soft)' }}
                  onClick={() => {
                    invia({ t: 'dieta-pasto', data: oggi, pasto: pastoAperto.id, opzione: scelta ? undefined : o.n })
                    setPastoAperto(null)
                  }}>
                  <div className="row row--between">
                    <span style={{ fontWeight: 800, color: scelta ? 'var(--fire)' : 'var(--text)' }}>
                      Opzione {o.n}{o.titolo ? ` — ${o.titolo}` : ''}
                    </span>
                    {scelta && <span style={{ color: 'var(--fire)' }}>✓</span>}
                  </div>
                  <ul className="small fade-dim" style={{ paddingLeft: 16, marginTop: 4 }}>
                    {o.voci.map((v, i) => <li key={i}>{v}</li>)}
                    {pastoAperto.id === 'cena' && <li style={{ color: 'var(--dim)' }}>+ base fissa (pane/riso, verdura, fondente)</li>}
                  </ul>
                  {mac && <div style={{ marginTop: 8 }}><MacroRow macro={mac} /></div>}
                  {assunzioni.length > 0 && (
                    <div className="tiny" style={{ color: 'var(--dim)', marginTop: 6 }}>* {assunzioni.join(' · ')}</div>
                  )}
                </button>
              )
            })}
            <button className="btn btn--ghost" onClick={() => setPastoAperto(null)}>Chiudi</button>
          </div>
        </Sheet>
      )}
      {liberaAperta && <LiberaSheet data={oggi} onClose={() => setLiberaAperta(false)} />}
    </div>
  )
}

function DietaImportata() {
  const { stato, invia } = useStore()
  const piano = stato.pianiAlimentari.find(p => p.id === stato.pianoAlimentareId)!
  const oggi = oggiISO()
  const giorno = stato.dieta[oggi]
  const [pasto, setPasto] = useState<Pasto | null>(null)
  const [libera, setLibera] = useState(false)
  const opzioni = piano.pasti.flatMap(p => { const o = p.opzioni.find(o => o.n === giorno?.pasti[p.id]); return o ? [o] : [] })
  const macro = somma(...opzioni.flatMap(o => o.macro ? [o.macro] : []), ...(giorno?.libere ?? []).map(v => v.macro))
  const incompleto = opzioni.some(o => !o.macro)
  return <div className="screen stack" style={{ gap: 16 }}>
    <header><span className="kicker">Il tuo piano alimentare</span><h1 className="display" style={{ fontSize: '2.4rem' }}>A tavola<span style={{ color: 'var(--fire)' }}>.</span></h1><p className="small fade-dim">{piano.nome} · {opzioni.length}/{piano.pasti.length} pasti scelti</p></header>
    {piano.note && <details className="card"><summary>Indicazioni del coach</summary><p className="small" style={{ whiteSpace: 'pre-wrap' }}>{piano.note}</p></details>}
    <div className="card"><span className="kicker">{incompleto ? 'Macro disponibili · totale parziale' : 'Macro registrati oggi'}</span><MacroRow macro={arrotonda(macro)} />{incompleto && <p className="tiny fade-dim">Alcune opzioni non riportano i macro nel PDF: non vengono stimati.</p>}</div>
    {piano.pasti.map(p => {
      const o = p.opzioni.find(o => o.n === giorno?.pasti[p.id])
      return <button key={p.id} className={`card ${o ? 'card--fatta' : ''}`} style={{ textAlign: 'left' }} onClick={() => setPasto(p)}><b>{o ? '✓ ' : ''}{p.nome}</b><p className="small fade-dim">{o ? o.titolo || `Opzione ${o.n}` : `${p.opzioni.length} opzioni · scegli`}</p>{o && <p className="small">{o.voci.join(' · ')}</p>}</button>
    })}
    <section className="card stack"><div className="row row--between"><b>Alimenti aggiunti</b><button className="pill" onClick={() => setLibera(true)}>+ aggiungi</button></div>{giorno?.libere?.map((v, i) => <div key={i} className="row row--between"><span>{v.alimento} · {v.grammi} g</span><button className="pill" aria-label={`Rimuovi ${v.alimento}`} onClick={() => invia({ t: 'dieta-libera-rimuovi', data: oggi, indice: i })}>×</button></div>)}</section>
    {pasto && <Sheet onClose={() => setPasto(null)}><div className="stack"><h2>{pasto.nome}</h2>{pasto.nota && <p className="small">{pasto.nota}</p>}{pasto.opzioni.map(o => <button key={o.n} className="card" style={{ textAlign: 'left' }} onClick={() => { invia({ t: 'dieta-pasto', data: oggi, pasto: pasto.id, opzione: giorno?.pasti[pasto.id] === o.n ? undefined : o.n }); setPasto(null) }}><b>{giorno?.pasti[pasto.id] === o.n ? '✓ ' : ''}Opzione {o.n}{o.titolo ? ` · ${o.titolo}` : ''}</b><ul>{o.voci.map((v, i) => <li key={i} className="small">{v}</li>)}</ul>{o.macro ? <MacroRow macro={o.macro} /> : <p className="tiny fade-dim">Macro non riportati nel documento</p>}</button>)}<button className="btn btn--ghost" onClick={() => setPasto(null)}>Chiudi</button></div></Sheet>}
    {libera && <LiberaSheet data={oggi} onClose={() => setLibera(false)} />}
  </div>
}

export default function Dieta() {
  const { stato } = useStore()
  return stato.pianiAlimentari.some(p => p.id === stato.pianoAlimentareId) && !stato.profilo.dietaLibera ? <DietaImportata /> : <DietaSeed />
}
