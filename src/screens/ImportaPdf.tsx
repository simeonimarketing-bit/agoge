import { useEffect, useState } from 'react'
import { Sheet } from '../components/comuni'
import { useStore } from '../lib/store'
import { tuttiICanonici } from '../lib/progression'
import { importSchema, erroriImportazione, type Importazione } from '../lib/import-schema'
import type { DocumentoPdf } from '../types'
import { archiviaPdf, leggiPdf } from '../lib/pdf-archive'
import { preparaImportazione } from '../lib/import-documento'
import { leggiPaginePdf } from '../lib/lettore-pdf'
import { FormatoNonRiconosciuto, leggiPdfAntonio } from '../lib/lettore-pappa'

// Piano alimentare vuoto per chi non segue Antonio e lo compila a mano
const PIANO_VUOTO: Importazione = { avvisi: [], programma: null, checks: [], alimentazione: {
  nome: 'Il mio piano', dataInizio: new Date().toISOString().slice(0, 10), note: null,
  pasti: [{ nome: 'Colazione', nota: null, opzioni: [{ titolo: null, voci: ['Alimento e quantità'], categorie: [], macro: null }] }],
} }
const LABEL: Record<string, string> = { nome: 'Nome', nota: 'Indicazioni del coach', note: 'Note', giorni: 'Giorni di allenamento', esercizi: 'Esercizi', settimane: 'Prescrizioni per settimana', blocchi: 'Serie e ripetizioni', addome: 'Addome prima della seduta', tecnica: 'Tecnica', misure: 'Misure', data: 'Data del check', peso: 'Peso (kg)', vita: 'Vita (cm)', pasti: 'Pasti', opzioni: 'Opzioni', titolo: 'Nome opzione', voci: 'Alimenti e quantità', categorie: 'Categorie alimentari', macro: 'Macro riportati nel PDF', dataInizio: 'Data di inizio', durataSettimane: 'Durata in settimane', avvicinamento: 'Serie di avvicinamento', repMin: 'Ripetizioni minime', repMax: 'Ripetizioni massime', sets: 'Serie', backOff: 'Back off', aumentoCarico: 'Aumento carico', rest: 'Recupero (secondi)', n: 'Settimana', bf: 'Grasso (%)', fm: 'Massa grassa (kg)', lbm: 'Massa magra (kg)', bmr: 'BMR (kcal)', braccioSx: 'Braccio sinistro (cm)', braccioDx: 'Braccio destro (cm)', gambaSx: 'Gamba sinistra (cm)', gambaDx: 'Gamba destra (cm)' }
const NUMERI = new Set(['durataSettimane', 'sets', 'repMin', 'repMax', 'rest', 'n', 'peso', 'bf', 'fm', 'lbm', 'bmr', 'vita', 'fianchi', 'torace', 'braccioSx', 'braccioDx', 'gambaSx', 'gambaDx', 'spalle', 'bmi', 'kcal', 'proteine', 'carboidrati', 'grassi', 'fibre'])

// Editor a campi: le sezioni del documento rimangono chiuse finché non servono.
function Campi({ valore, campo = '', cambia }: { valore: unknown; campo?: string; cambia: (v: unknown) => void }) {
  const label = LABEL[campo] ?? campo
  if (Array.isArray(valore)) return <div className="stack" style={{ gap: 8 }}>{valore.map((v, i) => {
    const obj = v && typeof v === 'object' ? v as Record<string, unknown> : null
    return <details className="card" key={i}><summary>{String(obj?.nome ?? obj?.titolo ?? (campo === 'settimane' ? `Settimana ${obj?.n}` : `${label} ${i + 1}`))}</summary>
      <Campi valore={v} campo={campo} cambia={x => cambia(valore.map((old, j) => i === j ? x : old))} />
      <button className="small fade-dim" disabled={valore.length === 1 && campo !== 'check' && campo !== 'categorie'} onClick={() => cambia(valore.filter((_, j) => i !== j))}>Rimuovi questa voce</button>
    </details>
  })}{valore.length > 0 && campo !== 'categorie' && <button className="pill" onClick={() => {
    const copia = structuredClone(valore[valore.length - 1])
    if (campo === 'settimane' && copia && typeof copia === 'object') copia.n = Math.max(...valore.map(w => w.n)) + 1
    cambia([...valore, copia])
  }}>+ Duplica ultima voce</button>}</div>
  if (valore !== null && typeof valore === 'object') return <div className="stack" style={{ gap: 10, marginTop: 10 }}>{Object.entries(valore).map(([k, v]) => <div key={k}>
    {v !== null && typeof v === 'object' ? <details><summary>{LABEL[k] ?? k}</summary><Campi valore={v} campo={k} cambia={x => cambia({ ...valore, [k]: x })} /></details> : <Campi valore={v} campo={k} cambia={x => cambia({ ...valore, [k]: x })} />}
  </div>)}</div>
  if (typeof valore === 'boolean') return <label className="row small"><input type="checkbox" checked={valore} onChange={e => cambia(e.target.checked)} /> {label}</label>
  if (campo === 'macro' && valore === null) return <span className="tiny fade-dim">Macro non riportati nel PDF</span>
  if (campo === 'attrezzo') return <label className="small">Attrezzo<select value={String(valore)} onChange={e => cambia(e.target.value)}>{['manubri', 'bilanciere', 'macchina', 'cavo', 'corpo'].map(x => <option key={x}>{x}</option>)}</select></label>
  return <label className="small" style={{ display: 'block' }}>{label}
    {NUMERI.has(campo) || campo.toLowerCase().includes('data') ? <input type={NUMERI.has(campo) ? 'number' : 'date'} step="any" value={valore === null ? '' : String(valore)} onChange={e => cambia(e.target.value === '' ? null : NUMERI.has(campo) ? Number(e.target.value) : e.target.value)} /> : <textarea rows={2} style={{ width: '100%', padding: 10 }} value={valore === null ? '' : String(valore)} onChange={e => cambia(e.target.value || null)} />}
  </label>
}

export default function ImportaPdf({ onClose, documento, onArchiviato }: { onClose: () => void; documento?: DocumentoPdf; onArchiviato?: () => void }) {
  const { stato, invia } = useStore()
  const [documentoSalvato, setDocumentoSalvato] = useState(documento)
  const [attiva, setAttiva] = useState(!documento)
  const [file, setFile] = useState<File | null>(null)
  const [bozza, setBozza] = useState<Importazione | null>(null)
  const [errore, setErrore] = useState('')
  const [busy, setBusy] = useState(false)
  const [nonDiAntonio, setNonDiAntonio] = useState(false)
  const [confermato, setConfermato] = useState(false)
  const [collegamenti, setCollegamenti] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!documento) return
    let presente = true
    leggiPdf(documento.id).then(blob => {
      if (!presente) return
      if (blob) setFile(new File([blob], documento.nome, { type: 'application/pdf' }))
      else setErrore('Il PDF originale non è presente su questo dispositivo. Selezionalo di nuovo per ripristinarlo.')
    }).catch(e => { if (presente) setErrore(e.message) })
    return () => { presente = false }
  }, [documento])
  async function conserva() {
    if (!file) throw new Error('Seleziona un PDF.')
    const d = await archiviaPdf(file, stato.documentiPdf)
    invia({ t: 'salva-documento-pdf', documento: d })
    setDocumentoSalvato(d)
    return d
  }
  async function archivia() {
    setBusy(true); setErrore('')
    try { await conserva(); (onArchiviato ?? onClose)() }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Archiviazione non riuscita.') }
    finally { setBusy(false) }
  }
  // La lettura avviene sul telefono: vale solo per i PDF di Antonio Pappa
  async function leggi() {
    if (!file) { setErrore('Seleziona prima il documento PDF.'); return }
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 12 * 1024 * 1024 || !file.size) { setErrore('Scegli un PDF valido, fino a 12 MB.'); return }
    setBusy(true); setErrore(''); setBozza(null); setConfermato(false); setNonDiAntonio(false)
    try {
      const conservato = await conserva()
      if (conservato.stato === 'importato') throw new Error('Questo PDF è già stato importato. Lo trovi nell’archivio, senza duplicati.')
      setBozza(leggiPdfAntonio(await leggiPaginePdf(file), file.name))
    } catch (e) {
      if (e instanceof FormatoNonRiconosciuto) setNonDiAntonio(true)
      setErrore(e instanceof Error && e.name === 'InvalidPDFException' ? 'Il file non si apre come PDF: prova a scaricarlo di nuovo.' : e instanceof Error ? e.message : 'Lettura non riuscita.')
    } finally { setBusy(false) }
  }
  const parsed = importSchema.safeParse(bozza)
  const problemi = bozza ? parsed.success ? erroriImportazione(parsed.data) : ['Alcuni campi non sono validi. Controlla numeri, nomi e sezioni vuote.'] : []
  if (attiva && bozza?.programma && stato.sessioneCorrente && !stato.sessioneCorrente.programmaSnapshot) problemi.push('Termina la seduta in corso prima di importare una nuova scheda.')
  const cambia = (b: Importazione) => { setBozza(b); setConfermato(false); setErrore('') }
  function salva() {
    if (!bozza || !confermato) return
    try { invia(preparaImportazione(bozza, stato, file?.name ?? 'PDF', collegamenti, { attiva, documento: documentoSalvato })); onClose() }
    catch (e) { setErrore(e instanceof Error ? e.message : 'Importazione non riuscita.') }
  }
  return <Sheet onClose={onClose}><div className="stack">
    <h2>Importa il tuo PDF</h2>
    <p className="small fade-dim">Se ti segue Antonio Pappa, carica il PDF della scheda o dell’alimentazione (anche dei mesi passati): l’app lo legge e compila tutto da sola. Con un altro coach crei la scheda da Sala → + Nuova scheda e il piano con “Compila il piano alimentare a mano”.</p>
    {!bozza && <>
      <label className="small">Documento PDF<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setDocumentoSalvato(undefined); setErrore('') }} /></label>
      {documento && <p className="small">Documento archiviato: <b>{documento.nome}</b></p>}
      <p className="tiny fade-dim">Il PDF viene letto su questo telefono e non viene inviato a nessuno.</p>
      <button className="btn btn--fire" disabled={!file || busy} onClick={leggi}>{busy ? 'Lettura del documento…' : 'Leggi PDF'}</button>
      <button className="btn" disabled={!file || busy} onClick={archivia}>Conserva nell’archivio</button>
      {nonDiAntonio && <p role="status" className="exercise-note-preview">La lettura automatica vale solo per le schede di Antonio Pappa. Conserva il PDF nell’archivio per riaprirlo quando vuoi, poi crea la scheda da Sala → + Nuova scheda e il piano alimentare qui sotto.</p>}
      <button className="btn btn--ghost" disabled={busy} onClick={() => { setBozza(structuredClone(PIANO_VUOTO)); setErrore(''); setAttiva(true) }}>Compila il piano alimentare a mano</button>
    </>}
    {bozza && <>
      <div className="card"><b>Anteprima · {file?.name ?? 'piano compilato a mano'}</b><p className="small">{bozza.programma ? `${bozza.programma.giorni.length} giorni di allenamento · ` : ''}{bozza.alimentazione ? `${bozza.alimentazione.pasti.length} pasti · ` : ''}{bozza.checks.length} check</p></div>
      {bozza.avvisi.length > 0 && <div className="exercise-note-preview"><b>Da controllare nel PDF</b><ul>{bozza.avvisi.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
      {bozza.programma && <details className="card" open><summary><b>Scheda · {bozza.programma.nome}</b></summary><Campi valore={bozza.programma} cambia={p => cambia({ ...bozza, programma: p as Importazione['programma'] })} /></details>}
      {bozza.programma && <details className="card"><summary>Collega gli esercizi al tuo storico</summary><p className="tiny fade-dim">Nomi uguali vengono collegati automaticamente. Per nomi diversi puoi scegliere un esercizio esistente.</p>{[...new Set(bozza.programma.giorni.flatMap(g => g.esercizi.map(e => e.nome)))].map(nome => <label key={nome} className="stack small" style={{ marginTop: 10 }}>{nome}<select value={collegamenti[nome] ?? ''} onChange={e => { setCollegamenti({ ...collegamenti, [nome]: e.target.value }); setConfermato(false) }}><option value="">Automatico (nome esatto)</option><option value="nuovo">Crea esercizio distinto</option>{tuttiICanonici(stato).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>)}</details>}
      {bozza.alimentazione && <details className="card" open={!bozza.programma}><summary><b>Alimentazione · {bozza.alimentazione.nome}</b></summary><Campi valore={bozza.alimentazione} cambia={p => cambia({ ...bozza, alimentazione: p as Importazione['alimentazione'] })} /></details>}
      {bozza.checks.length > 0 && <details className="card"><summary><b>Misure del check ({bozza.checks.length})</b></summary><Campi valore={bozza.checks} campo="check" cambia={p => cambia({ ...bozza, checks: p as Importazione['checks'] })} /></details>}
      {problemi.length > 0 && <ul className="small" role="status">{problemi.map(p => <li key={p}>{p}</li>)}</ul>}
      {attiva && stato.sessioneCorrente && bozza.programma && <p className="small fade-dim">La seduta in corso conserva la sua scheda. La nuova sarà disponibile dopo la chiusura.</p>}
      <fieldset className="card stack" style={{ gap: 8 }}><legend>Come vuoi salvare questo documento?</legend>
        <label className="row small"><input type="radio" name="destinazione" checked={!attiva} onChange={() => setAttiva(false)} />Solo archivio · programmazione passata</label>
        <label className="row small"><input type="radio" name="destinazione" checked={attiva} onChange={() => setAttiva(true)} />Attiva come piano attuale</label>
        <p className="tiny fade-dim">Con “Solo archivio” conservi schede, alimentazione e misure per data, mantenendo i piani attivi invariati. I PDF con sole prescrizioni non creano allenamenti svolti.</p>
      </fieldset>
      <label className="row small" style={{ alignItems: 'flex-start' }}><input type="checkbox" checked={confermato} onChange={e => setConfermato(e.target.checked)} />Ho confrontato i dati e gli eventuali avvisi con il PDF.</label>
      <button className="btn btn--fire" disabled={!confermato || problemi.length > 0} onClick={salva}>{attiva ? 'Salva e attiva' : 'Salva nello storico'}</button>
      <button className="btn btn--ghost" onClick={() => { setBozza(null); setErrore(''); setCollegamenti({}) }}>Scegli un altro PDF</button>
    </>}
    {errore && <p role="alert" style={{ whiteSpace: 'pre-wrap' }}>{errore}</p>}
    <button className="btn btn--ghost" onClick={onClose}>Chiudi</button>
  </div></Sheet>
}
