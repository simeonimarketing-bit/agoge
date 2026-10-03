import { useEffect, useMemo, useState } from 'react'
import { ADDOME } from '../data/programma'
import { PROSSIMO_CHECK } from '../data/checks'
import { ALTERNATIVE_COACH } from '../data/muscoli'
import { useStore, oggiISO, giorniTra } from '../lib/store'
import {
  settimanaCorrente, blocchiSettimana, targetBlocco, ultimaVolta, record, recordReps,
  incrementoDefault, tonnellaggioSessione, serieAllenantiSessione, serieEffettiveSessione, fmtKg, fmtData, fmtBlocco,
  programmaAttivo, canonico, isAllenante, isEffettiva, rirMedio, PASSO_CARICO, arrotondaCarico, fmtCarico,
  TIPI_SIGLA, TIPI_LABEL, pianoSerie, serieEffettivePianificate, ultimaNota, SCARICO, chiaveSlot, idInSlot,
} from '../lib/progression'
import { BigNum, Quote, PlateCalc, Sheet, Stepper, RirSelect, TecnicaSelect, Progress, useWakeLock } from '../components/comuni'
import { fraseDelGiorno } from '../data/frasi'
import type { LogSerie, Prescrizione, TipoSerie, Tecnica } from '../types'
import heroImg from '../assets/img/chalk.jpg'
import arnoldImg from '../assets/img/arnold.jpg'

const TIPI_ORDINE: TipoSerie[] = ['riscaldamento', 'preparatoria', 'working', 'top', 'backoff', 'drop', 'restpause', 'parziale']

// la prescrizione col suo esercizio di questo giorno (eventuale variante rinominata) e quello della scheda
type PrescrizioneGiorno = Prescrizione & { base: string }

// ————— Sheet di logging —————
function LogSheet({ p, settimana, avvicinamento, onClose, onSerieEffettiva, onRinomina, altriGiorni, superserie, successivo, onCollega }: {
  p: PrescrizioneGiorno; settimana: number
  avvicinamento: boolean // il coach chiede 2-3 serie di avvicinamento prima di ogni esercizio
  onClose: () => void
  onSerieEffettiva: (fatte: number) => void
  onRinomina: (testo: string) => void
  altriGiorni: number[] // altri giorni della scheda in cui compare lo stesso esercizio
  superserie: string | null // nomi degli esercizi collegati
  successivo: { nome: string; collegato: boolean } | null // esercizio dopo nella scheda
  onCollega: (attiva: boolean) => void
}) {
  const { stato, invia } = useStore()
  const can = canonico(stato, p.esercizioId)!
  const blocchi = blocchiSettimana(p, settimana)
  const ultima = ultimaVolta(stato, p.esercizioId)
  const notaPrecedente = ultimaNota(stato, p.esercizioId)
  const inc = stato.incrementi[p.esercizioId] ?? incrementoDefault(p.esercizioId)
  const rec = record(stato, p.esercizioId)

  // il piano del coach riga per riga: working, back off, drop "dopo l'ultima"
  const piano = useMemo(() => pianoSerie(blocchi), [blocchi])

  const giaLoggato = stato.sessioneCorrente?.esercizi.find(e => e.esercizioId === p.esercizioId)
  const [serie, setSerie] = useState<LogSerie[]>(giaLoggato?.serie ?? [])
  const [note, setNote] = useState(giaLoggato?.note ?? notaPrecedente ?? '')
  const [modificaNome, setModificaNome] = useState(false)
  const [nome, setNome] = useState(can.nome)

  // la prossima riga del piano è la prossima serie EFFETTIVA (le preparatorie non consumano il piano)
  const idx = serie.filter(isEffettiva).length
  const rigaCorr = piano[Math.min(idx, piano.length - 1)]
  const tipoPianificato = rigaCorr?.tipo ?? 'working'
  const bloccoCorr = rigaCorr?.blocco ?? blocchi[0]
  const tgt = bloccoCorr ? targetBlocco(bloccoCorr, ultima, inc) : null

  const ultimaLoggata = serie[serie.length - 1] ?? null
  const [tipo, setTipo] = useState<TipoSerie>(tipoPianificato)
  const [carico, setCarico] = useState<number>(ultimaLoggata?.carico ?? tgt?.carico ?? 20)
  const [reps, setReps] = useState<number>(tgt?.reps ?? bloccoCorr?.repMin ?? 8)
  const [rir, setRir] = useState<LogSerie['rir']>(ultimaLoggata?.rir)
  const [tecnica, setTecnica] = useState<Tecnica | undefined>(undefined)
  const [vediPiastre, setVediPiastre] = useState(false)
  const [vediTipi, setVediTipi] = useState(false)

  const persisti = (agg: LogSerie[], n = note) =>
    invia({ t: 'logga-esercizio', log: { esercizioId: p.esercizioId, nome: can.nome, prescrizione: blocchi, serie: agg, note: n.trim() || undefined } })

  function salva(s: LogSerie) {
    const agg = [...serie, s]
    setSerie(agg)
    persisti(agg)
    // le serie di avvicinamento non fanno partire il rest e non toccano il piano
    if (!isEffettiva(s)) return
    onSerieEffettiva(agg.filter(isEffettiva).length)
    // prepara la prossima riga del piano: back off e drop scalano il carico
    const prossima = piano[Math.min(agg.filter(isEffettiva).length, piano.length - 1)]
    const prossimoTipo = prossima?.tipo ?? s.tipo
    setTipo(prossimoTipo)
    if ((prossimoTipo === 'backoff' || prossimoTipo === 'drop') && s.tipo !== prossimoTipo) {
      setCarico(arrotondaCarico(s.carico * SCARICO))
      setReps(prossima?.blocco.repMin ?? s.reps)
    }
    setTecnica(undefined)
  }

  const salvaCorrente = () => salva({ carico, reps, tipo, rir, tecnica })
  const salvaAvvicinamento = () => salva({ carico, reps, tipo: 'preparatoria' })
  const ripetiUltima = () => { if (ultimaLoggata) salva({ ...ultimaLoggata, tecnica: undefined }) }

  function rimuoviUltima() {
    const agg = serie.slice(0, -1)
    setSerie(agg)
    persisti(agg)
  }

  function salvaNote(testo: string) {
    setNote(testo)
    invia({ t: 'nota-esercizio', id: p.esercizioId, testo })
    if (serie.length > 0) persisti(serie, testo)
  }

  const nuovoRecordCarico = rec && isAllenante({ carico, reps, tipo }) && carico > rec.carico
  const repRecord = recordReps(stato, p.esercizioId, carico)
  const fatteEffettive = serie.filter(isEffettiva).length
  const nPrep = serie.filter(s => s.tipo === 'preparatoria').length

  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div>
          <div className="kicker">{blocchi.map(fmtBlocco).join(' + ')}{p.rest ? ` · rest ${p.rest}"` : ''}</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: 2, lineHeight: 1.15 }}>{can.nome}</h2>
          <button className="small fade-dim" onClick={() => setModificaNome(v => !v)}>✎ Personalizza nome</button>
          {modificaNome && <form className="stack" onSubmit={e => { e.preventDefault(); if (!nome.trim()) return; onRinomina(nome); setModificaNome(false) }}>
            <label className="small">Nome del macchinario<input aria-label="Nome personalizzato" maxLength={120} value={nome} onChange={e => setNome(e.target.value)} /></label>
            <span className="tiny fade-dim">Nel PDF: {p.nomePdf}. Il nome vale solo per questo giorno della scheda e lo ritrovi le settimane successive.{altriGiorni.length > 0 && p.esercizioId === p.base ? ` Lo stesso esercizio nel giorno ${altriGiorni.join(', ')} resta com’è, con il suo storico.` : ''}</span>
            <button className="btn" disabled={!nome.trim()}>Salva nome</button>
          </form>}
          {p.note && <div className="small fade-dim">{p.note}</div>}
          {superserie && <div className="small" style={{ color: 'var(--fire)', marginTop: 4 }}>⇄ Superserie: {superserie}. Dopo ogni serie passi all’esercizio collegato, il recupero parte alla fine del giro.</div>}
        </div>

        {ultima && (
          <div className="card" style={{ background: 'var(--surface-2)', padding: 10 }}>
            <span className="tiny kicker">Ultima volta — {fmtData(ultima.data)}</span>
            <div style={{ marginTop: 4, fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: '0.04em' }}>
              {ultima.serie.map((s, i) => (
                <span key={i} style={{ marginRight: 12, color: isAllenante(s) ? 'var(--text)' : 'var(--dim)' }}>
                  {fmtCarico(s.carico)}<span className="tiny fade-dim">kg</span>×{s.reps}
                  {s.rir !== undefined && <span className="tiny fade-dim">@{s.rir}</span>}
                </span>
              ))}
            </div>
            {tgt?.motivo && <div className="tiny" style={{ color: tgt.aumento ? 'var(--fire)' : 'var(--dim)', marginTop: 4 }}>{tgt.motivo}</div>}
            {notaPrecedente && <div className="tiny" style={{ color: 'var(--muted)', marginTop: 4 }}>✎ {notaPrecedente}</div>}
          </div>
        )}

        {avvicinamento && serie.length === 0 && (
          <div className="tiny" style={{ color: 'var(--muted)' }}>
            Coach: 2-3 serie di avvicinamento progressive, poi ogni set effettivo a cedimento.
          </div>
        )}

        {serie.length > 0 && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {serie.map((s, i) => (
              <span key={i} className={`pill anim-pop ${isAllenante(s) ? 'pill--on' : ''}`}>
                {fmtCarico(s.carico)}×{s.reps}
                {s.rir !== undefined ? ` @${s.rir}` : ''}
                {!isAllenante(s) ? ` ${TIPI_SIGLA[s.tipo]}` : ''}
              </span>
            ))}
            <button className="pill" onClick={rimuoviUltima} aria-label="rimuovi ultima serie">↩︎</button>
          </div>
        )}

        <div className="row row--between">
          <span className="kicker">
            Serie {serie.length + 1}{piano.length ? ` · effettive ${fatteEffettive}/${piano.length}` : ''}{nPrep ? ` · ${nPrep} avvic.` : ''}
          </span>
          <button className="tiny fade-dim" onClick={() => setVediTipi(v => !v)}>
            {TIPI_LABEL[tipo]} {vediTipi ? '▴' : '▾'}
          </button>
        </div>
        {vediTipi && (
          <div className="chips">
            {TIPI_ORDINE.map(t => (
              <button key={t} className={`chip ${tipo === t ? 'chip--on' : ''}`}
                onClick={() => { setTipo(t); setVediTipi(false) }}>
                {TIPI_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        <div className="row row--between">
          <div>
            <div className="tiny kicker" style={{ marginBottom: 4 }}>Carico (kg)</div>
            <Stepper value={carico} step={PASSO_CARICO} onChange={setCarico} format={fmtCarico} />
          </div>
          <div>
            <div className="tiny kicker" style={{ marginBottom: 4 }}>Reps</div>
            <Stepper value={reps} step={0.5} min={0.5} onChange={v => setReps(Math.round(v * 2) / 2)} format={fmtCarico} />
          </div>
        </div>

        <RirSelect value={rir} onChange={v => setRir(v as LogSerie['rir'])} />
        <TecnicaSelect value={tecnica} onChange={setTecnica} />

        {nuovoRecordCarico && (
          <div className="tag-pr anim-record" style={{ alignSelf: 'flex-start' }}>
            ▲ Sopra il tuo massimo storico ({fmtCarico(rec!.carico)} kg)
          </div>
        )}
        {!nuovoRecordCarico && repRecord > 0 && reps > repRecord && isAllenante({ carico, reps, tipo }) && (
          <div className="tag-pr anim-record" style={{ alignSelf: 'flex-start' }}>
            ▲ Rep record a {fmtCarico(carico)} kg (finora {repRecord})
          </div>
        )}

        {can.attrezzo === 'bilanciere' && (
          <button className="small fade-dim" style={{ textAlign: 'left' }} onClick={() => setVediPiastre(v => !v)}>
            {vediPiastre ? '▾' : '▸'} piastre
          </button>
        )}
        {vediPiastre && can.attrezzo === 'bilanciere' && <PlateCalc carico={carico} />}

        <button className="btn btn--fire" onClick={salvaCorrente}>
          Segna {fmtCarico(carico)} kg × {reps}{rir !== undefined ? ` @${rir === 4 ? '4+' : rir} RIR` : ''}
        </button>
        <div className="row" style={{ gap: 8 }}>
          {avvicinamento && fatteEffettive === 0 && (
            <button className="btn" style={{ flex: 1 }} onClick={salvaAvvicinamento}>
              Avvicinamento · {fmtCarico(carico)} × {reps}
            </button>
          )}
          {ultimaLoggata && (
            <button className="btn" style={{ flex: 1 }} onClick={ripetiUltima}>
              Ripeti · {fmtCarico(ultimaLoggata.carico)} × {ultimaLoggata.reps}{ultimaLoggata.rir !== undefined ? ` @${ultimaLoggata.rir}` : ''}
            </button>
          )}
        </div>
        {successivo && (
          <button className="small" style={{ textAlign: 'left', color: successivo.collegato ? 'var(--fire)' : 'var(--dim)' }} onClick={() => onCollega(!successivo.collegato)}>
            {successivo.collegato ? `⇄ In superserie con ${successivo.nome} · scollega` : `⇄ Fai in superserie con ${successivo.nome}`}
          </button>
        )}
        <section className="card stack exercise-notes">
          <label htmlFor="exercise-note" className="kicker">Le tue note · per la prossima volta</label>
          <textarea id="exercise-note" rows={4} placeholder="Sedile, presa, sensazioni e cosa ricordare…" value={note} onChange={e => salvaNote(e.target.value)} />
          <span className="tiny fade-dim">Salvate automaticamente, anche prima della prima serie.</span>
        </section>
        <button className="btn btn--ghost" onClick={onClose}>Chiudi</button>
      </div>
    </Sheet>
  )
}

// ————— Resoconto di fine sessione —————
function Resoconto({ onChiudi }: { onChiudi: () => void }) {
  const { stato, invia } = useStore()
  const c = stato.sessioneCorrente!
  const ton = tonnellaggioSessione(c)
  const nAllenanti = serieAllenantiSessione(c)
  const nEffettive = serieEffettiveSessione(c)
  const nTotali = c.esercizi.reduce((n, e) => n + e.serie.length, 0)
  const durata = c.inizio ? Math.round((Date.now() - new Date(c.inizio).getTime()) / 60000) : null
  const tutteLeSerie = c.esercizi.flatMap(e => e.serie)
  const rir = rirMedio(tutteLeSerie)

  const precedente = [...stato.sessioni].reverse().find(s => s.giornoN === c.giornoN && s.programmaId === c.programmaId)
  const tonPrec = precedente ? tonnellaggioSessione(precedente) : null

  const records: string[] = []
  for (const e of c.esercizi) {
    const can = canonico(stato, e.esercizioId)
    const rec = record(stato, e.esercizioId)
    const maxOggi = Math.max(...e.serie.filter(isAllenante).map(s => s.carico), 0)
    if (can && maxOggi > 0 && (!rec || maxOggi > rec.carico)) records.push(`${can.nome} — ${fmtCarico(maxOggi)} kg`)
  }

  const t = fmtKg(ton)
  const frase = fraseDelGiorno('chiusura')

  return (
    <Sheet onClose={() => {}}>
      <div className="hero" style={{ backgroundImage: `url(${arnoldImg})`, margin: '-18px -16px 0', padding: '28px 16px 18px', borderRadius: '18px 18px 0 0' }}>
        <div className="kicker kicker--fire" style={{ textAlign: 'center' }}>Sessione chiusa — giorno {c.giornoN} · {c.giornoNome}</div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <BigNum v={t.v} u={t.u} size={4.4} />
          <div className="kicker" style={{ marginTop: 4 }}>ferro spostato (riscaldamenti esclusi)</div>
        </div>
      </div>
      <div className="stack" style={{ textAlign: 'center', paddingTop: 14 }}>
        <div className="row" style={{ justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div><BigNum v={nAllenanti} size={1.8} /><div className="tiny kicker">working set</div></div>
          {nEffettive > nAllenanti && <div><BigNum v={nEffettive} size={1.8} /><div className="tiny kicker">effettive</div></div>}
          <div><BigNum v={nTotali} size={1.8} /><div className="tiny kicker">serie totali</div></div>
          {rir !== null && <div><BigNum v={rir} size={1.8} /><div className="tiny kicker">RIR medio</div></div>}
          {durata !== null && durata > 0 && <div><BigNum v={durata} u="min" size={1.8} /><div className="tiny kicker">durata</div></div>}
        </div>
        {tonPrec !== null && tonPrec > 0 && (
          <div className="small fade-dim">
            Stesso giorno ({fmtData(precedente!.data)}): {fmtKg(tonPrec).v} {fmtKg(tonPrec).u} —{' '}
            {ton >= tonPrec
              ? <b style={{ color: 'var(--fire)' }}>+{fmtKg(ton - tonPrec).v} {fmtKg(ton - tonPrec).u}</b>
              : <b>−{fmtKg(Math.abs(ton - tonPrec)).v} {fmtKg(Math.abs(ton - tonPrec)).u}</b>}
          </div>
        )}
        {records.length > 0 && (
          <div className="card anim-record" style={{ borderColor: 'var(--fire-deep)' }}>
            <div className="kicker kicker--fire" style={{ marginBottom: 6 }}>Massimi storici di oggi</div>
            {records.map((r, i) => <div key={i} className="small" style={{ fontWeight: 700 }}>{r}</div>)}
          </div>
        )}
        <div className="quote" style={{ marginTop: 6 }}>
          “{frase.testo}”{frase.autore && <span className="autore">— {frase.autore}</span>}
        </div>
        <button className="btn btn--fire" onClick={() => { invia({ t: 'chiudi-sessione' }); onChiudi() }}>
          A referto
        </button>
      </div>
    </Sheet>
  )
}

// ————— Schermata OGGI —————
export default function Oggi() {
  const { stato, invia } = useStore()
  const programma = stato.sessioneCorrente?.programmaSnapshot ?? programmaAttivo(stato)
  const sett = settimanaCorrente(programma)
  if (stato.sessioneCorrente?.settimana) sett.n = stato.sessioneCorrente.settimana

  // giorno suggerito: quello dopo l'ultima sessione DI QUESTA scheda (cambiata la scheda, si riparte da G1)
  const ultimaDiQuesta = [...stato.sessioni].reverse().find(s => s.programmaId === programma.id)
  const nGiorni = programma.giorni.length || 1
  const suggerito = programma.giorni.length
    ? (ultimaDiQuesta ? programma.giorni[(programma.giorni.findIndex(g => g.n === ultimaDiQuesta.giornoN) + 1) % nGiorni]?.n : undefined) ?? programma.giorni[0].n
    : 1
  const [giornoSel, setGiornoSel] = useState(stato.sessioneCorrente?.giornoN ?? suggerito)
  const [aperto, setAperto] = useState<string | null>(null)
  const [resoconto, setResoconto] = useState(false)

  useEffect(() => {
    if (!programma.giorni.some(g => g.n === giornoSel)) setGiornoSel(suggerito)
  }, [programma.id, giornoSel, suggerito])

  const giornoScheda = programma.giorni.find(g => g.n === giornoSel) ?? programma.giorni[0]
  // ogni esercizio con l'identità che ha in questo giorno (rinominato qui = esercizio a sé)
  const giorno = useMemo(() => giornoScheda && {
    ...giornoScheda,
    prescrizioni: giornoScheda.prescrizioni.map((p): PrescrizioneGiorno => ({ ...p, base: p.esercizioId, esercizioId: idInSlot(stato, programma.id, giornoScheda.n, p.esercizioId) })),
  }, [giornoScheda, programma.id, stato.variantiSlot])
  const sc = stato.sessioneCorrente
  const inSessione = sc !== null && sc.giornoN === giornoSel
  // c'è una sessione aperta su un altro giorno: non si sovrascrive mai in silenzio
  const altraAperta = sc !== null && !inSessione
  useWakeLock(sc !== null)

  const fatti = new Set(sc?.esercizi.filter(e => e.serie.length > 0).map(e => e.esercizioId))
  const rimandati = new Set(sc?.rimandati ?? [])

  // ordine seduta: prescrizioni della scheda, ma i rimandati scivolano in fondo (la scheda non cambia)
  const ordinati = useMemo(() => {
    if (!giorno) return []
    const base = [...giorno.prescrizioni].sort((a, b) => a.ordine - b.ordine)
    return [...base.filter(p => !rimandati.has(p.esercizioId)), ...base.filter(p => rimandati.has(p.esercizioId))]
  }, [giorno, sc?.rimandati])

  const attivo = inSessione ? ordinati.find(p => !fatti.has(p.esercizioId) && !rimandati.has(p.esercizioId)) : null
  const prossimo = attivo ? ordinati.find(p => p !== attivo && !fatti.has(p.esercizioId)) : null

  // avanzamento: serie effettive fatte / pianificate (working + back off + drop; avvicinamenti esclusi)
  const seriePianificate = giorno ? giorno.prescrizioni.reduce((n, p) => n + serieEffettivePianificate(blocchiSettimana(p, sett.n)), 0) : 0
  const serieFatte = sc?.esercizi.reduce((n, e) => n + e.serie.filter(isEffettiva).length, 0) ?? 0
  const minuti = sc?.inizio ? Math.round((Date.now() - new Date(sc.inizio).getTime()) / 60000) : 0

  const notaSedutaPrecedente = ultimaDiQuesta && stato.noteWorkout[ultimaDiQuesta.id]
  const oggi = oggiISO()
  const mostraCheck = !stato.profilo.ospite && !stato.checksUtente.length
  const giorniAlCheck = giorniTra(oggi, PROSSIMO_CHECK.data)
  const chiedeAvvicinamento = programma.avvicinamento ?? !programma.custom

  // ————— Superserie: un esercizio è collegato al successivo nell'ordine della scheda —————
  const ordineScheda = giorno ? [...giorno.prescrizioni].sort((a, b) => a.ordine - b.ordine) : []
  const collegatoAlSuccessivo = (p: PrescrizioneGiorno) => !!giorno && !!stato.superserie[chiaveSlot(programma.id, giorno.n, p.base)]
  const gruppo = (p: PrescrizioneGiorno): PrescrizioneGiorno[] => {
    let i = ordineScheda.findIndex(x => x.esercizioId === p.esercizioId)
    while (i > 0 && collegatoAlSuccessivo(ordineScheda[i - 1])) i--
    const out = [ordineScheda[i]]
    while (i < ordineScheda.length - 1 && collegatoAlSuccessivo(ordineScheda[i])) out.push(ordineScheda[++i])
    return out
  }
  const effettiveFatte = (id: string) => sc?.esercizi.find(e => e.esercizioId === id)?.serie.filter(isEffettiva).length ?? 0
  const restanti = (p: PrescrizioneGiorno, fatteOra?: number) => serieEffettivePianificate(blocchiSettimana(p, sett.n)) - (fatteOra ?? effettiveFatte(p.esercizioId))

  // dopo una serie effettiva: nel giro di superserie si passa al prossimo esercizio senza recupero,
  // a fine giro parte il recupero e si torna al primo che ha ancora serie
  function dopoSerie(p: PrescrizioneGiorno, fatte: number) {
    const g = gruppo(p)
    const rimasti = (x: PrescrizioneGiorno) => x.esercizioId === p.esercizioId ? restanti(x, fatte) : restanti(x)
    if (g.length > 1) {
      const dopo = g.slice(g.indexOf(p) + 1).find(x => rimasti(x) > 0)
      if (dopo) { invia({ t: 'timer-stop' }); setAperto(dopo.esercizioId); return }
      const rest = [...g].reverse().find(x => x.rest)?.rest ?? null
      invia({ t: 'timer-avvia', durata: rest, ora: Date.now() })
      const primo = g.find(x => rimasti(x) > 0)
      if (primo) setAperto(primo.esercizioId)
      return
    }
    invia({ t: 'timer-avvia', durata: p.rest ?? null, ora: Date.now() })
  }

  function rinomina(p: PrescrizioneGiorno, testo: string) {
    const condiviso = programma.giorni.flatMap(g => g.prescrizioni).filter(x => x.esercizioId === p.base).length > 1
    const separa = condiviso && p.esercizioId === p.base
    const nuovoId = separa ? 'var-' + crypto.randomUUID() : undefined
    invia({ t: 'nome-esercizio-slot', chiave: chiaveSlot(programma.id, giorno!.n, p.base), programmaId: programma.id, giornoN: giorno!.n, base: p.base, attuale: p.esercizioId, testo, nuovoId, attrezzo: canonico(stato, p.base)?.attrezzo ?? 'macchina' })
    if (nuovoId) setAperto(nuovoId)
  }

  if (!giorno) {
    return (
      <div className="screen stack">
        <h1 className="display" style={{ fontSize: '2.4rem' }}>Oggi<span style={{ color: 'var(--fire)' }}>.</span></h1>
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontWeight: 800 }}>Nessuna scheda attiva</div>
          <p className="small fade-dim" style={{ marginTop: 6 }}>Crea la tua scheda dalla sezione Sala → La mia scheda.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen stack" style={{ gap: 16 }}>
      <div className="hero" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="row row--between">
          <span className="kicker">Settimana {sett.n}/{sett.totale} · {programma.nome}</span>
          {mostraCheck && (giorniAlCheck === 0
            ? <span className="pill pill--fire">Check oggi {PROSSIMO_CHECK.ora}</span>
            : giorniAlCheck > 0 && giorniAlCheck <= 14 ? <span className="pill">check −{giorniAlCheck}g</span> : null)}
        </div>
        <h1 className="display" style={{ fontSize: '2.5rem', lineHeight: 1, marginTop: 6 }}>
          Oggi<span style={{ color: 'var(--fire)' }}>.</span>
        </h1>
        <Quote contesto={/GAMBE|LOWER|QUADRICIPITI|FEMORALI|GLUTEI|LEGS/i.test(giorno.nome) ? 'legday' : 'apertura'} />
      </div>

      <div className="row" style={{ overflowX: 'auto', paddingBottom: 4, gap: 8 }}>
        {programma.giorni.map(g => (
          <button key={g.n} className={`pill ${g.n === giornoSel ? 'pill--on' : ''}`} onClick={() => setGiornoSel(g.n)}>
            G{g.n} · {g.nome}
          </button>
        ))}
      </div>

      {altraAperta ? (
        <div className="card" style={{ borderColor: 'var(--fire-deep)' }}>
          <span className="tiny kicker kicker--fire">Sessione aperta</span>
          <div className="small" style={{ marginTop: 4 }}>
            Hai il giorno {sc!.giornoN} · {sc!.giornoNome} in corso ({sc!.esercizi.length} esercizi loggati).
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn--fire" style={{ flex: 2 }} onClick={() => setGiornoSel(sc!.giornoN)}>Torna al giorno {sc!.giornoN}</button>
            <button className="btn btn--ghost" style={{ flex: 1 }}
              onClick={() => { if (confirm('Chiudere la sessione aperta? Le serie loggate finiscono nello storico.')) { invia({ t: 'chiudi-sessione' }) } }}>
              Chiudi
            </button>
          </div>
        </div>
      ) : !inSessione ? (
        <button className="btn btn--fire" onClick={() => invia({ t: 'avvia-sessione', giornoN: giorno.n, giornoNome: giorno.nome, programmaId: programma.id, programmaSnapshot: programma, settimana: sett.n })}>
          Inizia — giorno {giorno.n} · {giorno.nome}
        </button>
      ) : (
        <>
          <div className="card" style={{ padding: '10px 14px' }}>
            <div className="row row--between">
              <span className="small"><b>{serieFatte}</b> serie su {seriePianificate} · {minuti} min</span>
              <button className="tiny fade-dim" onClick={() => invia({ t: 'annulla-sessione' })}>annulla</button>
            </div>
            <div style={{ margin: '8px 0 6px' }}><Progress done={serieFatte} total={seriePianificate} /></div>
            {prossimo && (
              <div className="tiny fade-dim">
                Prossimo: <b style={{ color: 'var(--text)' }}>{canonico(stato, prossimo.esercizioId)?.nome}</b> — {blocchiSettimana(prossimo, sett.n).map(fmtBlocco).join(' + ')}
              </div>
            )}
          </div>
          <button className="btn btn--fire" disabled={fatti.size === 0} onClick={() => { invia({ t: 'timer-stop' }); setResoconto(true) }}>
            Chiudi sessione ({fatti.size}/{giorno.prescrizioni.length})
          </button>
        </>
      )}

      {notaSedutaPrecedente && <div className="exercise-note-preview"><b>Promemoria dall’ultimo workout</b><br />{notaSedutaPrecedente}</div>}
      {programma.nota && (
        <div className="card" style={{ borderStyle: 'dashed', background: 'none', padding: '10px 14px' }}>
          <span className="tiny kicker kicker--fire">Regola del ciclo</span>
          <div className="small" style={{ marginTop: 2 }}>{programma.nota}</div>
        </div>
      )}

      {giorno.addome && (
        <div className="card" style={{ borderStyle: 'dashed', background: 'none', padding: '10px 14px' }}>
          <span className="tiny kicker kicker--fire">Regola del coach</span>
          <div className="small" style={{ marginTop: 2 }}><b>Addome prima della sessione</b> — {programma.custom ? 'Segui le indicazioni riportate dal coach nella scheda.' : ADDOME.dettaglio}</div>
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        {ordinati.map(p => {
          const can = canonico(stato, p.esercizioId)!
          const blocchi = blocchiSettimana(p, sett.n)
          const fatto = fatti.has(p.esercizioId)
          const inAttesa = rimandati.has(p.esercizioId)
          const isAttivo = attivo?.esercizioId === p.esercizioId
          const log = sc?.esercizi.find(e => e.esercizioId === p.esercizioId)

          // card compressa quando completato
          if (fatto && log) {
            const allen = log.serie.filter(isAllenante)
            const top = Math.max(...allen.map(s => s.carico), 0)
            return (
              <button key={p.esercizioId + p.ordine} className="card card--fatta row row--between anim-done" onClick={() => setAperto(p.esercizioId)}>
                <span className="small" style={{ textAlign: 'left' }}>
                  <span style={{ color: 'var(--fire)', marginRight: 8 }}>✓</span>
                  <b>{can.nome}</b> — {log.serie.length} serie{top > 0 ? ` — ${fmtCarico(top)} kg` : ''}
                </span>
                <span className="tiny fade-dim">apri</span>
              </button>
            )
          }

          const ultima = ultimaVolta(stato, p.esercizioId)
          const nota = ultimaNota(stato, p.esercizioId)
          const inc = stato.incrementi[p.esercizioId] ?? incrementoDefault(p.esercizioId)
          const tgt = blocchi.length ? targetBlocco(blocchi[0], ultima, inc) : null
          const alternative = (ALTERNATIVE_COACH[p.esercizioId] ?? [])
            .map(id => canonico(stato, id)).filter(Boolean)

          return (
            <div key={p.esercizioId + p.ordine}
              className={`card card--knurled ${isAttivo ? 'card--attiva' : ''}`}
              style={{ opacity: inAttesa ? 0.55 : 1 }}>
              <button style={{ textAlign: 'left', width: '100%' }} disabled={altraAperta} onClick={() => {
                if (altraAperta) return
                if (!inSessione) invia({ t: 'avvia-sessione', giornoN: giorno.n, giornoNome: giorno.nome, programmaId: programma.id, programmaSnapshot: programma, settimana: sett.n })
                if (inAttesa) invia({ t: 'riprendi-esercizio', esercizioId: p.esercizioId })
                setAperto(p.esercizioId)
              }}>
                <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingLeft: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.2 }}>{can.nome}</div>
                    <div className="small fade-dim" style={{ marginTop: 2 }}>
                      {blocchi.map(fmtBlocco).join('  +  ')}{p.rest ? `  ·  rest ${p.rest}"` : ''}
                    </div>
                    {p.note && <div className="tiny" style={{ color: 'var(--dim)', marginTop: 2 }}>{p.note}</div>}
                    <div className="small" style={{ marginTop: 7 }}>
                      {ultima
                        ? <span className="fade-dim">Ultima ({fmtData(ultima.data)}): <b style={{ color: 'var(--text)' }}>
                            {ultima.serie.filter(isAllenante).map(s => `${fmtCarico(s.carico)}×${s.reps}`).join('  ') || '—'}</b></span>
                        : <span className="fade-dim">Mai loggato — si parte oggi</span>}
                    </div>
                    {tgt && tgt.carico !== null && (
                      <div className="small" style={{ marginTop: 3, color: tgt.aumento ? 'var(--fire)' : 'var(--text)', fontWeight: 700 }}>
                        {tgt.aumento ? '▲ ' : ''}Target: {fmtCarico(tgt.carico)} kg × {tgt.reps}
                      </div>
                    )}
                    {nota && <div className="exercise-note-preview">✎ {nota}</div>}
                  </div>
                  <span className="display" style={{ color: isAttivo ? 'var(--fire)' : 'var(--dim)', fontSize: '1.4rem', paddingLeft: 6 }}>›</span>
                </div>
              </button>
              {collegatoAlSuccessivo(p) && (() => {
                const successivo = ordineScheda[ordineScheda.findIndex(x => x.esercizioId === p.esercizioId) + 1]
                return successivo && <div className="tiny" style={{ marginTop: 8, paddingLeft: 8, color: 'var(--fire)' }}>⇄ In superserie con {canonico(stato, successivo.esercizioId)?.nome}</div>
              })()}
              {inSessione && !fatto && (
                <div className="row" style={{ marginTop: 8, paddingLeft: 8, gap: 8, flexWrap: 'wrap' }}>
                  {inAttesa
                    ? <span className="tiny" style={{ color: 'var(--fire)' }}>In attesa — attrezzo occupato</span>
                    : <button className="tiny fade-dim" onClick={() => { if (confirm(`Rimandare ${can.nome} alla fine della seduta?`)) invia({ t: 'rimanda-esercizio', esercizioId: p.esercizioId }) }}>
                        ⟳ occupato, rimanda
                      </button>}
                  {alternative.length > 0 && (
                    <span className="tiny" style={{ color: 'var(--dim)' }}>
                      Alternativa autorizzata dal coach: {alternative.map(a => a!.nome).join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {aperto && giorno.prescrizioni.some(p => p.esercizioId === aperto) && (() => {
        const p = giorno.prescrizioni.find(p => p.esercizioId === aperto)!
        const g = gruppo(p)
        return <LogSheet
          key={aperto}
          p={p}
          settimana={sett.n}
          avvicinamento={chiedeAvvicinamento}
          onClose={() => setAperto(null)}
          onSerieEffettiva={fatte => dopoSerie(p, fatte)}
          onRinomina={testo => rinomina(p, testo)}
          altriGiorni={programma.giorni.filter(x => x.n !== giorno.n && x.prescrizioni.some(y => y.esercizioId === p.base)).map(x => x.n)}
          superserie={g.length > 1 ? g.map(x => canonico(stato, x.esercizioId)?.nome).join(' + ') : null}
          successivo={(() => {
            const dopo = ordineScheda[ordineScheda.findIndex(x => x.esercizioId === p.esercizioId) + 1]
            return dopo ? { nome: canonico(stato, dopo.esercizioId)?.nome ?? dopo.nomePdf, collegato: collegatoAlSuccessivo(p) } : null
          })()}
          onCollega={attiva => invia({ t: 'superserie', chiave: chiaveSlot(programma.id, giorno.n, p.base), attiva })}
        />
      })()}
      {resoconto && <Resoconto onChiudi={() => setResoconto(false)} />}
    </div>
  )
}
