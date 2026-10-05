import { useMemo, useState } from 'react'
import { PASTI, FREQUENZE, INTEGRAZIONE, REGOLE_DIETA, DIETA_NOME } from '../data/dieta'
import { MACRO_OPZIONI, somma, scala, arrotonda, ALIMENTI } from '../data/macro'
import { stimaVoci, vociBaseFissa, type Stima } from '../lib/stima-macro'
import { useStore, oggiISO, lunediDi, giorniTra } from '../lib/store'
import { Quote, Sheet, MacroRow } from '../components/comuni'
import type { Pasto, Macro, VoceLibera, Alimento, Stato } from '../types'

// ————— La Tavola è una sola: cambia solo da dove arrivano pasti, macro e regole —————
// Piano di Salvatore: data/dieta.ts + macro calcolati a mano (data/macro.ts).
// Piano importato: righe del PDF + stima automatica (lib/stima-macro.ts).
interface Vista {
  kicker: string
  pasti: Pasto[]
  stima: (pasto: Pasto, n: number) => Stima
  conBase: (pasto: Pasto) => boolean
  integrazione: { colazione?: string; cena?: string } | null
  sgarriOgni: number | null
  frequenze: boolean
  regole: string[]
  indicazioni?: string
  fonteMacro: string
}

const NESSUNA: Stima = { macro: null, assunzioni: [], ignote: [] }

const unisci = (...stime: Stima[]): Stima => {
  const conMacro = stime.flatMap(s => s.macro ? [s.macro] : [])
  return {
    macro: conMacro.length ? arrotonda(somma(...conMacro)) : null,
    assunzioni: [...new Set(stime.flatMap(s => s.assunzioni))],
    ignote: stime.flatMap(s => s.ignote),
  }
}

const VISTA_SALVATORE: Vista = {
  kicker: `Piano ${DIETA_NOME} · 4 pasti · l'opzione è l'unità`,
  pasti: PASTI,
  stima: (p, n) => {
    const info = MACRO_OPZIONI[`${p.id}-${n}`]
    const opz: Stima = info ? { macro: info.macro, assunzioni: info.assunzioni, ignote: [] } : NESSUNA
    if (p.id !== 'cena') return opz
    const base = MACRO_OPZIONI['cena-base']
    return unisci({ macro: base.macro, assunzioni: base.assunzioni, ignote: [] }, opz)
  },
  conBase: p => p.id === 'cena',
  integrazione: INTEGRAZIONE,
  sgarriOgni: 15,
  frequenze: true,
  regole: REGOLE_DIETA,
  fonteMacro: 'Macro calcolati da tabelle CREA/USDA sulle grammature del coach — nei suoi PDF non ci sono.',
}

function vistaImportata(piano: Stato['pianiAlimentari'][number]): Vista {
  const righe = (piano.note ?? '').split('\n').map(r => r.trim()).filter(Boolean)
  const integratore = (re: RegExp) => righe.find(r => re.test(r))?.replace(/^[^:]*:\s*/, '')
  const colazione = integratore(/^(dopo\s+)?colazione\s*:/i)
  const cena = integratore(/^(dopo\s+)?cena\s*:/i)
  const sgarri = (piano.note ?? '').match(/uno ogni\s+(\d+)\s+giorni/i)
  // le categorie (pesce, legumi…) le assegna solo il lettore dei PDF di Antonio:
  // se ci sono, valgono anche le sue frequenze e norme standard
  const diAntonio = piano.pasti.some(p => p.opzioni.some(o => o.categorie.length))
  return {
    kicker: `Piano ${piano.nome} · ${piano.pasti.length} pasti · l'opzione è l'unità`,
    pasti: piano.pasti,
    stima: (p, n) => {
      const o = p.opzioni.find(o => o.n === n)
      if (!o) return NESSUNA
      if (o.macro) return { macro: o.macro, assunzioni: [], ignote: [] }
      const base = vociBaseFissa(p.nota)
      return base.length ? unisci(stimaVoci(base), stimaVoci(o.voci)) : stimaVoci(o.voci)
    },
    conBase: p => vociBaseFissa(p.nota).length > 0,
    integrazione: colazione || cena ? { colazione, cena } : null,
    sgarriOgni: sgarri ? Number(sgarri[1]) : null,
    frequenze: diAntonio,
    regole: diAntonio ? REGOLE_DIETA : [],
    indicazioni: piano.note,
    fonteMacro: 'Macro stimati in automatico da tabelle CREA/USDA sulle grammature del piano — nel PDF non ci sono.',
  }
}

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

function Tavola({ vista }: { vista: Vista }) {
  const { stato, invia } = useStore()
  const pasti = vista.pasti
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
  const { totale, selezionati, mancanti, escluse } = useMemo(() => {
    const parti: Macro[] = []
    let sel = 0
    const manca: string[] = []
    const ignote: string[] = []
    if (!soloLibera) {
      for (const p of pasti) {
        const n = g.pasti[p.id]
        if (n !== undefined) {
          sel++
          const st = vista.stima(p, n)
          if (st.macro) parti.push(st.macro)
          else ignote.push(`${p.nome}: opzione ${n}`)
          ignote.push(...st.ignote)
        } else manca.push(p.nome.toLowerCase())
      }
    }
    for (const v of g.libere ?? []) parti.push(v.macro)
    return { totale: arrotonda(somma(...parti)), selezionati: sel, mancanti: manca, escluse: ignote }
  }, [g, soloLibera, vista, pasti])

  const lunedi = lunediDi(oggi)
  const contaCategorie = useMemo(() => {
    const conta: Record<string, number> = {}
    for (const [data, dg] of Object.entries(stato.dieta)) {
      if (data < lunedi || data > oggi) continue
      for (const [pastoId, opzN] of Object.entries(dg.pasti)) {
        const pasto = pasti.find(p => p.id === pastoId)
        const opz = pasto?.opzioni.find(o => o.n === opzN)
        for (const c of opz?.categorie ?? []) conta[c] = (conta[c] ?? 0) + 1
      }
    }
    return conta
  }, [stato.dieta, lunedi, oggi, pasti])

  const ultimoSgarro = Object.entries(stato.dieta).filter(([, dg]) => dg.sgarro).map(([d]) => d).sort().pop()
  const giorniDaSgarro = ultimoSgarro ? giorniTra(ultimoSgarro, oggi) : null

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">{soloLibera ? 'Dieta libera — logghi quello che mangi' : vista.kicker}</span>
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
              <span className="tiny" style={{ color: selezionati === pasti.length ? 'var(--fire)' : 'var(--dim)' }}>
                {selezionati === pasti.length
                  ? `${selezionati} pasti su ${pasti.length} ✓`
                  : `parziale — manca ${mancanti.join(', ')}`}
              </span>
            )}
          </div>
          <div style={{ marginTop: 8 }}><MacroRow macro={totale} size="grande" /></div>
          <p className="tiny" style={{ color: 'var(--dim)', marginTop: 8 }}>
            {vista.fonteMacro} Le voci con * usano una convenzione dichiarata. Descrizione, non prescrizione.
          </p>
          {escluse.length > 0 && (
            <p className="tiny" style={{ color: 'var(--fire)', marginTop: 6 }}>
              Non riconosciuti, esclusi dal totale: {escluse.join(' · ')}. Se ti servono, aggiungili da «+ aggiungi».
            </p>
          )}
        </div>
      </div>

      {/* i 4 pasti a opzioni */}
      {!soloLibera && (
        <div className="stack" style={{ gap: 8 }}>
          {pasti.map(p => {
            const scelta = g.pasti[p.id]
            const opz = p.opzioni.find(o => o.n === scelta)
            const mac = scelta !== undefined ? vista.stima(p, scelta).macro : null
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
          {vista.integrazione && <>
          <div className="row" style={{ gap: 8 }}>
            {vista.integrazione.colazione && <button className={`pill ${g.integrazioneColazione ? 'pill--on' : ''}`} style={{ flex: 1 }}
              onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneColazione: !g.integrazioneColazione } })}>
              Integr. colazione {g.integrazioneColazione ? '✓' : ''}
            </button>}
            {vista.integrazione.cena && <button className={`pill ${g.integrazioneCena ? 'pill--on' : ''}`} style={{ flex: 1 }}
              onClick={() => invia({ t: 'dieta', data: oggi, patch: { integrazioneCena: !g.integrazioneCena } })}>
              Integr. cena {g.integrazioneCena ? '✓' : ''}
            </button>}
          </div>
          <div className="tiny" style={{ color: 'var(--dim)', marginTop: -8 }}>
            {[vista.integrazione.colazione && `Colazione: ${vista.integrazione.colazione}`, vista.integrazione.cena && `Cena: ${vista.integrazione.cena}`].filter(Boolean).join(' · ')}
          </div>
          </>}

          <div className="card row row--between">
            <div>
              <span className="tiny kicker">{vista.sgarriOgni ? `Sgarri — uno ogni ${vista.sgarriOgni} giorni` : 'Sgarri'}</span>
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

          {vista.frequenze && <div className="card">
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
          </div>}

          {vista.regole.length > 0 && <details>
            <summary className="small fade-dim" style={{ cursor: 'pointer' }}>Regole del piano</summary>
            <ul className="small fade-dim" style={{ paddingLeft: 18, marginTop: 8 }}>
              {vista.regole.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
            </ul>
          </details>}
          {vista.indicazioni && <details>
            <summary className="small fade-dim" style={{ cursor: 'pointer' }}>Indicazioni del coach</summary>
            <p className="small fade-dim" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{vista.indicazioni}</p>
          </details>}
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
              const { macro: mac, assunzioni, ignote } = vista.stima(pastoAperto, o.n)
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
                    {vista.conBase(pastoAperto) && <li style={{ color: 'var(--dim)' }}>+ base fissa del pasto</li>}
                  </ul>
                  {mac
                    ? <div style={{ marginTop: 8 }}><MacroRow macro={mac} /></div>
                    : <div className="tiny fade-dim" style={{ marginTop: 6 }}>Macro non stimabili da queste righe</div>}
                  {ignote.length > 0 && (
                    <div className="tiny" style={{ color: 'var(--fire)', marginTop: 6 }}>Non riconosciuti: {ignote.join(' · ')}</div>
                  )}
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

export default function Dieta() {
  const { stato } = useStore()
  const piano = stato.pianiAlimentari.find(p => p.id === stato.pianoAlimentareId)
  const vista = useMemo(() => piano && !stato.profilo.dietaLibera ? vistaImportata(piano) : VISTA_SALVATORE, [piano, stato.profilo.dietaLibera])
  return <Tavola vista={vista} />
}
