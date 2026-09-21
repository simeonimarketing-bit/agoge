import { useMemo, useRef, useState } from 'react'
import { REGOLE_GLOBALI, PROGRAMMA } from '../data/programma'
import { CHECKS } from '../data/checks'
import { SCHEDE_SEED } from '../data/riattivazione'
import { useStore, esportaBackup, oggiISO, aggiungiGiorni } from '../lib/store'
import {
  tonnellaggioSessione, fmtKg, fmtData, programmaAttivo, canonico, tuttiICanonici,
  storicoEsercizio, migliorSerie, e1rm, rirMedio, mediaMobile7,
  settimanaCorrente, fineProgramma,
} from '../lib/progression'
import { Sheet, Stepper } from '../components/comuni'
import type { Stato, Programma, GiornoProgramma, EsercizioCanonico } from '../types'

// ————— Check-in v2: compressione della settimana, solo fatti —————
function generaCheckIn(stato: Stato): string {
  const oggi = oggiISO()
  const r: string[] = []
  const settimanaFa = aggiungiGiorni(oggi, -7)

  r.push(`CHECK-IN — ${fmtData(oggi)}`)
  r.push('')

  // peso: media mobile e variazione
  const media = mediaMobile7(stato.pesate, oggi)
  const mediaPrec = mediaMobile7(stato.pesate, settimanaFa)
  if (media !== null) {
    r.push(`PESO`)
    r.push(`• Media 7 giorni: ${media.toFixed(1)} kg${mediaPrec !== null ? ` (${media - mediaPrec >= 0 ? '+' : ''}${(media - mediaPrec).toFixed(1)} vs settimana scorsa)` : ''}`)
  }
  if (!stato.profilo.ospite && CHECKS.length) {
    const u = CHECKS[CHECKS.length - 1]
    r.push(`• Ultimo check ufficiale (${fmtData(u.data)}): ${u.peso} kg · vita ${u.vita} · BF ${u.bf}% · LBM ${u.lbm} kg`)
  }
  r.push('')

  // aderenza dieta ultimi 7 giorni
  const giorniDieta = Object.entries(stato.dieta).filter(([d]) => d > settimanaFa && d <= oggi)
  if (giorniDieta.length) {
    const completi = giorniDieta.filter(([, g]) => Object.keys(g.pasti).length >= 4).length
    const sgarri = giorniDieta.filter(([, g]) => g.sgarro).length
    const libere = giorniDieta.reduce((n, [, g]) => n + (g.libere?.length ?? 0), 0)
    r.push(`DIETA (ultimi 7 giorni)`)
    r.push(`• Giorni completi da piano: ${completi}/${giorniDieta.length}`)
    r.push(`• Sgarri: ${sgarri}${libere ? ` · pasti fuori piano: ${libere}` : ''}`)
    r.push('')
  }

  // allenamento
  const programma = programmaAttivo(stato)
  const sessCiclo = stato.sessioni.filter(s => s.data >= programma.dataInizio)
  if (sessCiclo.length) {
    const ton = sessCiclo.reduce((t, s) => t + tonnellaggioSessione(s), 0)
    const t = fmtKg(ton)
    r.push(`ALLENAMENTO (ciclo ${programma.nome})`)
    r.push(`• ${sessCiclo.length} sessioni · ${t.v} ${t.u} totali`)
    const tutteRir = sessCiclo.flatMap(s => s.esercizi.flatMap(e => e.serie))
    const rm = rirMedio(tutteRir)
    const compromesse = tutteRir.filter(s => s.tecnica === 'compromessa').length
    if (rm !== null) r.push(`• RIR medio working set: ${rm}${compromesse ? ` · serie a tecnica compromessa: ${compromesse}` : ''}`)

    // in miglioramento / in stallo: e1RM prima vs ultima nel ciclo
    const migliorano: string[] = [], stallo: string[] = []
    const ids = [...new Set(sessCiclo.flatMap(s => s.esercizi.map(e => e.esercizioId)))]
    for (const id of ids) {
      const voci = storicoEsercizio(stato, id).filter(v => v.data >= programma.dataInizio)
      if (voci.length < 2) continue
      const prima = migliorSerie(voci[0].serie); const dopo = migliorSerie(voci[voci.length - 1].serie)
      if (!prima || !dopo) continue
      const d = (e1rm(dopo.carico, dopo.reps) - e1rm(prima.carico, prima.reps)) / e1rm(prima.carico, prima.reps) * 100
      const nome = canonico(stato, id)?.nome ?? id
      if (d > 1) migliorano.push(`${nome} (+${d.toFixed(1)}%)`)
      else if (d < 1) stallo.push(nome)
    }
    if (migliorano.length) r.push(`• In miglioramento: ${migliorano.join(', ')}`)
    if (stallo.length) r.push(`• In stallo o in calo: ${stallo.join(', ')}`)
    r.push('')
  }

  if (stato.noteCheckIn.trim()) {
    r.push('NOTE E FASTIDI')
    r.push(stato.noteCheckIn.trim())
    r.push('')
  }
  r.push('(allego le foto della settimana)')
  r.push('')
  r.push('— generato da AGOGE: solo fatti, zero opinioni. e1RM = stima (Epley).')
  return r.join('\n')
}

// ————— Editor scheda (modalità ospite / schede custom) —————
function EditorScheda({ esistente, onClose }: { esistente: Programma | null; onClose: () => void }) {
  const { stato, invia } = useStore()
  const [nome, setNome] = useState(esistente?.nome ?? '')
  const [dataInizio, setDataInizio] = useState(esistente?.dataInizio ?? oggiISO())
  const [settimane, setSettimane] = useState(esistente?.durataSettimane ?? 5)
  const [giorni, setGiorni] = useState<GiornoProgramma[]>(esistente?.giorni ?? [])
  const [cerca, setCerca] = useState('')
  const [giornoAperto, setGiornoAperto] = useState<number | null>(null)

  const stile = { padding: '12px 14px', fontSize: '1rem', width: '100%' } as const

  function aggiungiGiorno() {
    const n = giorni.length + 1
    setGiorni([...giorni, { n, nome: `Giorno ${n}`, prescrizioni: [] }])
    setGiornoAperto(n)
  }

  function aggiungiEsercizio(giornoN: number, esercizioId: string, nomeEs: string) {
    setGiorni(giorni.map(g => g.n !== giornoN ? g : {
      ...g,
      prescrizioni: [...g.prescrizioni, {
        esercizioId, nomePdf: nomeEs, ordine: g.prescrizioni.length + 1,
        blocchi: Object.fromEntries(Array.from({ length: settimane }, (_, i) => [i + 1, [{ sets: 3, repMin: 8, repMax: 12 }]])),
      }],
    }))
    setCerca('')
  }

  function creaCustom(nomeEs: string) {
    const id = 'custom-' + nomeEs.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const c: EsercizioCanonico = { id, nome: nomeEs, alias: [], attrezzo: 'macchina', custom: true }
    invia({ t: 'aggiungi-canonico', canonico: c })
    return c
  }

  function aggiornaBlocco(giornoN: number, ordine: number, campo: 'sets' | 'repMin' | 'repMax', v: number) {
    setGiorni(giorni.map(g => g.n !== giornoN ? g : {
      ...g,
      prescrizioni: g.prescrizioni.map(p => {
        if (p.ordine !== ordine) return p
        const blocchi = Object.fromEntries(Object.entries(p.blocchi).map(([k, b]) => [k, b.map(x => ({ ...x, [campo]: v }))]))
        return { ...p, blocchi }
      }),
    }))
  }

  function salva() {
    if (!nome.trim() || giorni.length === 0) return
    const p: Programma = {
      id: esistente?.id ?? 'scheda-' + Date.now(),
      nome: nome.trim(), dataInizio, durataSettimane: settimane, giorni, custom: true,
    }
    invia({ t: 'salva-programma', programma: p })
    invia({ t: 'profilo', patch: { programmaAttivoId: p.id } })
    onClose()
  }

  const risultati = cerca.trim().length >= 2
    ? tuttiICanonici(stato).filter(c => c.nome.toLowerCase().includes(cerca.toLowerCase())).slice(0, 5)
    : []

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <span className="kicker">{esistente ? 'Modifica scheda' : 'Nuova scheda'}</span>
        <input style={stile} placeholder="Nome (es. Mesociclo settembre)" value={nome} onChange={e => setNome(e.target.value)} />
        <div className="row" style={{ gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span className="tiny kicker">Inizio</span>
            <input style={stile} type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} />
          </div>
          <div>
            <span className="tiny kicker">Settimane</span>
            <Stepper value={settimane} step={1} min={1} onChange={setSettimane} />
          </div>
        </div>

        {giorni.map(g => (
          <div key={g.n} className="card stack" style={{ gap: 8 }}>
            <div className="row row--between">
              <input style={{ ...stile, padding: '8px 10px', flex: 1 }} value={g.nome}
                onChange={e => setGiorni(giorni.map(x => x.n === g.n ? { ...x, nome: e.target.value } : x))} />
              <button className="tiny fade-dim" onClick={() => setGiornoAperto(giornoAperto === g.n ? null : g.n)}>
                {giornoAperto === g.n ? 'chiudi ▴' : `${g.prescrizioni.length} esercizi ▾`}
              </button>
            </div>
            {giornoAperto === g.n && (
              <>
                {g.prescrizioni.map(p => {
                  const b = p.blocchi[1][0]
                  return (
                    <div key={p.ordine} className="row row--between" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="small" style={{ fontWeight: 700, flex: 1, minWidth: 120 }}>{canonico(stato, p.esercizioId)?.nome}</span>
                      <span className="row" style={{ gap: 4 }}>
                        {(['sets', 'repMin', 'repMax'] as const).map(campo => (
                          <input key={campo} style={{ ...stile, width: 52, padding: '8px 6px', textAlign: 'center' }}
                            inputMode="numeric" value={b[campo] ?? ''}
                            placeholder={campo === 'sets' ? 'set' : campo === 'repMin' ? 'min' : 'max'}
                            onChange={e => aggiornaBlocco(g.n, p.ordine, campo, parseInt(e.target.value) || 0)} />
                        ))}
                        <button className="tiny" style={{ color: 'var(--dim)', padding: '0 6px' }}
                          onClick={() => setGiorni(giorni.map(x => x.n === g.n ? { ...x, prescrizioni: x.prescrizioni.filter(q => q.ordine !== p.ordine) } : x))}>✕</button>
                      </span>
                    </div>
                  )
                })}
                <input style={stile} placeholder="Aggiungi esercizio… (cerca o crea)" value={cerca} onChange={e => setCerca(e.target.value)} />
                {risultati.map(c => (
                  <button key={c.id} className="small" style={{ textAlign: 'left', color: 'var(--text)' }}
                    onClick={() => aggiungiEsercizio(g.n, c.id, c.nome)}>+ {c.nome}</button>
                ))}
                {cerca.trim().length >= 2 && !risultati.length && (
                  <button className="small" style={{ textAlign: 'left', color: 'var(--fire)' }}
                    onClick={() => { const c = creaCustom(cerca.trim()); aggiungiEsercizio(g.n, c.id, c.nome) }}>
                    + crea «{cerca.trim()}»
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        <button className="btn" onClick={aggiungiGiorno}>+ Aggiungi giorno</button>
        <button className="btn btn--fire" onClick={salva} disabled={!nome.trim() || giorni.length === 0}>
          Salva e attiva
        </button>
        <button className="btn btn--ghost" onClick={onClose}>Annulla</button>
      </div>
    </Sheet>
  )
}

export default function Altro() {
  const { stato, invia } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [copiato, setCopiato] = useState(false)
  const [editor, setEditor] = useState<null | { programma: Programma | null }>(null)
  const programma = programmaAttivo(stato)
  const flags = programma.giorni.flatMap(g => g.prescrizioni.filter(p => p.flag).map(p => ({ g: g.n, p })))
  const testoCheckIn = useMemo(() => generaCheckIn(stato), [stato])

  async function copiaCheckIn() {
    await navigator.clipboard.writeText(testoCheckIn)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2500)
  }

  function importaBackup(f: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const dati = JSON.parse(String(reader.result)) as Stato
        invia({ t: 'importa', stato: dati })
        alert('Backup ripristinato.')
      } catch {
        alert('File non valido: serve un backup esportato da AGOGE.')
      }
    }
    reader.readAsText(f)
  }

  function modalitaOspite() {
    if (!confirm('Modalità ospite: nasconde la scheda e i check di Salvatore. I tuoi dati restano su questo dispositivo. Continuare?')) return
    invia({ t: 'profilo', patch: { ospite: true, dietaLibera: true } })
  }

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <header>
        <span className="kicker">Motore, regole, dati</span>
        <h1 className="display" style={{ fontSize: '2.4rem', lineHeight: 1, marginTop: 6 }}>
          La sala<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
      </header>

      {/* check-in generator */}
      <div className="card card--knurled">
        <div style={{ paddingLeft: 8 }}>
          <span className="tiny kicker kicker--fire">Check-in per il coach</span>
          <p className="small fade-dim" style={{ margin: '4px 0 10px' }}>
            La settimana compressa: peso medio, aderenza, RIR, esercizi in crescita e in stallo. Solo fatti — decide lui.
          </p>
          <textarea
            style={{ width: '100%', minHeight: 64, padding: 10, fontSize: '0.85rem' }}
            placeholder="Note e fastidi per il coach (spalla, sonno, fame…)"
            value={stato.noteCheckIn}
            onChange={e => invia({ t: 'note-checkin', testo: e.target.value })}
          />
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn" style={{ flex: 2 }} onClick={copiaCheckIn}>
              {copiato ? 'Copiato ✓' : 'Copia testo'}
            </button>
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => window.print()}>PDF</button>
          </div>
        </div>
      </div>

      {/* la mia scheda / modalità ospite */}
      <div className="card">
        <span className="tiny kicker">La mia scheda</span>
        <p className="small fade-dim" style={{ marginTop: 4 }}>
          Attiva: <b style={{ color: 'var(--text)' }}>{programma.nome}</b> (dal {fmtData(programma.dataInizio)}, {programma.durataSettimane} settimane
          — sett. {settimanaCorrente(programma).n})
        </p>
        {(stato.programmiUtente.length > 0 || SCHEDE_SEED.length > 0) && (
          <div className="stack" style={{ gap: 6, marginTop: 8 }}>
            {!stato.profilo.ospite && SCHEDE_SEED.map(p => (
              <div key={p.id} className="row row--between">
                <button className="small" style={{ fontWeight: 700, textAlign: 'left' }}
                  onClick={() => invia({ t: 'profilo', patch: { programmaAttivoId: p.id } })}>
                  {programma.id === p.id ? '● ' : '○ '}{p.nome}
                </button>
                <span className="tiny fade-dim">
                  {p.giorni.length} sedute · {fmtData(p.dataInizio)} → {fmtData(fineProgramma(p))}{oggiISO() > fineProgramma(p) ? ' · scaduta' : ''}
                </span>
              </div>
            ))}
            {stato.programmiUtente.map(p => (
              <div key={p.id} className="row row--between">
                <button className="small" style={{ fontWeight: 700, textAlign: 'left' }}
                  onClick={() => invia({ t: 'profilo', patch: { programmaAttivoId: p.id } })}>
                  {stato.profilo.programmaAttivoId === p.id ? '● ' : '○ '}{p.nome}
                </button>
                <span className="row" style={{ gap: 10 }}>
                  <button className="tiny fade-dim" onClick={() => setEditor({ programma: p })}>modifica</button>
                  <button className="tiny" style={{ color: 'var(--dim)' }}
                    onClick={() => { if (confirm(`Eliminare «${p.nome}»?`)) invia({ t: 'elimina-programma', id: p.id }) }}>✕</button>
                </span>
              </div>
            ))}
            {!stato.profilo.ospite && (
              <button className="small" style={{ textAlign: 'left', fontWeight: 700 }}
                onClick={() => invia({ t: 'profilo', patch: { programmaAttivoId: undefined } })}>
                {programma.id === PROGRAMMA.id ? '● ' : '○ '}Scheda del coach — {PROGRAMMA.nome} (PDF)
              </button>
            )}
          </div>
        )}
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => setEditor({ programma: null })}>+ Nuova scheda</button>
          {!stato.profilo.ospite && (
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={modalitaOspite}>Modalità ospite</button>
          )}
        </div>
        {stato.profilo.ospite && (
          <p className="tiny" style={{ color: 'var(--dim)', marginTop: 8 }}>
            Sei in modalità ospite: dieta libera e schede tue.{' '}
            <button className="tiny" style={{ color: 'var(--fire)' }}
              onClick={() => invia({ t: 'profilo', patch: { ospite: false, dietaLibera: false } })}>
              Torna a Salvatore
            </button>
          </p>
        )}
        {!stato.profilo.ospite && (
          <label className="row small fade-dim" style={{ marginTop: 8, gap: 8 }}>
            <input type="checkbox" checked={stato.profilo.dietaLibera}
              onChange={e => invia({ t: 'profilo', patch: { dietaLibera: e.target.checked } })} />
            Dieta solo libera (senza opzioni del coach)
          </label>
        )}
      </div>

      {/* import nuovo ciclo */}
      {!stato.profilo.ospite && (
        <div className="card">
          <span className="tiny kicker">Import nuovo ciclo</span>
          <p className="small fade-dim" style={{ marginTop: 4 }}>
            Quando il Dott. Pappa manda i nuovi PDF: mettili in <b>Check e Prog</b>, apri Claude Code e scrivi
            «importa il nuovo ciclo». L'AI propone, tu confermi. Due minuti ogni cinque settimane.
          </p>
          {flags.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="small" style={{ color: 'var(--fire)', cursor: 'pointer' }}>
                {flags.length} anomalie risolte alla conferma dell'import
              </summary>
              <ul className="small fade-dim" style={{ paddingLeft: 18, marginTop: 6 }}>
                {flags.map(({ g, p }, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>G{g} · {canonico(stato, p.esercizioId)?.nome}: {p.flag}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!stato.profilo.ospite && (
        <div className="card">
          <span className="tiny kicker">Le regole del coach — valide tutto il ciclo</span>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {REGOLE_GLOBALI.map((r, i) => (
              <div key={i}><b className="small">{r.t}.</b> <span className="small fade-dim">{r.d}</span></div>
            ))}
          </div>
        </div>
      )}

      {/* backup */}
      <div className="card">
        <span className="tiny kicker">I tuoi dati</span>
        <p className="small fade-dim" style={{ marginTop: 4 }}>
          Tutto vive su questo dispositivo: {stato.sessioni.length} sessioni, {Object.keys(stato.dieta).length} giorni di dieta,
          {' '}{Object.keys(stato.pesate).length} pesate. Esporta un backup ogni tanto: lo storico non si ricompra.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => esportaBackup(stato)}>Esporta</button>
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Ripristina</button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) importaBackup(f) }} />
        </div>
      </div>

      <p className="tiny" style={{ color: 'var(--dim)', textAlign: 'center', marginTop: 8 }}>
        AGOGE v0.3 — l'AI cattura, comprime, ricorda, esegue. Non consiglia. Mai.
      </p>

      {/* area stampa per l'export PDF del check-in */}
      <pre className="print-area" style={{ display: 'none', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{testoCheckIn}</pre>
      <style>{`@media print { .print-area { display: block !important; } }`}</style>

      {editor && <EditorScheda esistente={editor.programma} onClose={() => setEditor(null)} />}
    </div>
  )
}
