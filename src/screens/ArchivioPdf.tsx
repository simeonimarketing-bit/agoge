import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { archiviaPdf, leggiPdf } from '../lib/pdf-archive'
import { fmtBlocco, fmtData, fineProgramma, blocchiSettimana } from '../lib/progression'
import { Sheet } from '../components/comuni'
import type { DocumentoPdf, Programma, Stato } from '../types'
import ImportaPdf from './ImportaPdf'

const CATEGORIE: Record<DocumentoPdf['categoria'], string> = { allenamento: 'Allenamento', alimentazione: 'Alimentazione', check: 'Check', misto: 'Più contenuti', 'da-classificare': 'Da classificare' }
type Voce = { id: string; titolo: string; data?: string; categoria: DocumentoPdf['categoria']; documento?: DocumentoPdf; programma?: Programma; piano?: Stato['pianiAlimentari'][number] }

function SchedaArchiviata({ programma }: { programma: Programma }) {
  const { stato, invia } = useStore()
  const [settimana, setSettimana] = useState(1)
  const attivo = stato.profilo.programmaAttivoId === programma.id
  const sessioni = stato.sessioni.filter(s => s.programmaId === programma.id)
  return <section className="stack">
    <h3>{programma.nome}</h3><p className="small fade-dim">{fmtData(programma.dataInizio)} → {fmtData(fineProgramma(programma))} · {programma.durataSettimane} settimane</p>
    <label className="small">Settimana della scheda<select value={settimana} onChange={e => setSettimana(Number(e.target.value))}>{Array.from({ length: programma.durataSettimane }, (_, i) => <option key={i + 1} value={i + 1}>Settimana {i + 1}</option>)}</select></label>
    {programma.nota && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{programma.nota}</p>}
    {programma.giorni.map(g => <details key={g.n} className="card" open={programma.giorni.length === 1}><summary>G{g.n} · {g.nome}</summary><div className="stack" style={{ marginTop: 12 }}>{g.prescrizioni.map(p => <div key={p.ordine}><b className="small">{p.nomePdf}</b><p className="small">{blocchiSettimana(p, settimana).map(fmtBlocco).join(' + ')}{p.rest !== undefined ? ` · recupero ${p.rest} s` : ''}</p>{p.note && <p className="tiny fade-dim">{p.note}</p>}</div>)}</div></details>)}
    <p className="small fade-dim">{sessioni.length ? `${sessioni.length} allenamenti registrati con questa scheda, consultabili in Storico → Workout.` : 'Nessun allenamento registrato per questa scheda. Qui vedi il programma prescritto dal coach.'}</p>
    <button className="btn" disabled={attivo} onClick={() => invia({ t: 'profilo', patch: { programmaAttivoId: programma.id } })}>{attivo ? 'Scheda attuale' : 'Usa questa scheda da oggi'}</button>
  </section>
}

function DietaArchiviata({ piano }: { piano: Stato['pianiAlimentari'][number] }) {
  const { stato, invia } = useStore()
  const attivo = stato.pianoAlimentareId === piano.id && !stato.profilo.dietaLibera
  return <section className="stack"><h3>{piano.nome}</h3><p className="small fade-dim">Dal {fmtData(piano.dataInizio)}</p>{piano.note && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{piano.note}</p>}
    {piano.pasti.map(p => <details key={p.id} className="card"><summary>{p.nome} · {p.opzioni.length} opzioni</summary>{p.nota && <p className="small">{p.nota}</p>}{p.opzioni.map(o => <div key={o.n} style={{ marginTop: 12 }}><b className="small">Opzione {o.n}{o.titolo ? ` · ${o.titolo}` : ''}</b><ul className="small">{o.voci.map((v, i) => <li key={i}>{v}</li>)}</ul></div>)}</details>)}
    <button className="btn" disabled={attivo} onClick={() => invia({ t: 'seleziona-dieta', id: piano.id })}>{attivo ? 'Piano alimentare attuale' : 'Usa questo piano da oggi'}</button>
  </section>
}

function DettaglioDocumento({ voce, onClose, onLeggi }: { voce: Voce; onClose: () => void; onLeggi: (d: DocumentoPdf) => void }) {
  const { stato, invia } = useStore()
  const doc = stato.documentiPdf.find(d => d.id === voce.id)
  const [url, setUrl] = useState('')
  const [errore, setErrore] = useState('')
  useEffect(() => {
    if (!doc) return
    let presente = true; let objectUrl = ''
    leggiPdf(doc.id).then(blob => {
      if (!presente) return
      if (!blob) { setErrore('Originale non presente: ricarica lo stesso PDF per ripristinarlo.'); return }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(e => { if (presente) setErrore(e.message) })
    return () => { presente = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [doc?.id])
  const programmi = doc ? stato.programmiUtente.filter(p => doc.programmi.includes(p.id)) : voce.programma ? [voce.programma] : []
  const piani = doc ? stato.pianiAlimentari.filter(p => doc.piani.includes(p.id)) : voce.piano ? [voce.piano] : []
  return <Sheet onClose={onClose}><div className="stack">
    <h2>{doc?.titolo ?? voce.titolo}</h2>
    {doc && <>
      <p className="small fade-dim">{doc.nome} · {(doc.dimensione / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB</p>
      <label className="small">Tipo di documento<select value={doc.categoria} onChange={e => invia({ t: 'salva-documento-pdf', documento: { ...doc, categoria: e.target.value as DocumentoPdf['categoria'] } })}>{Object.entries(CATEGORIE).map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}</select></label>
      <label className="small">Data del documento (per ordinarlo nello storico)<input type="date" value={doc.dataDocumento ?? ''} onChange={e => invia({ t: 'salva-documento-pdf', documento: { ...doc, dataDocumento: e.target.value || undefined } })} /></label>
      {url && <div className="row" style={{ gap: 8 }}><a className="btn" href={url} target="_blank" rel="noopener noreferrer">Apri PDF originale</a><a className="btn btn--ghost" href={url} download={doc.nome}>Scarica</a></div>}
      {errore && <p role="alert">{errore}</p>}
      {doc.stato === 'da-leggere' && <><p className="small fade-dim">PDF conservato. I dati non sono ancora stati estratti: puoi leggere il documento originale oppure avviare la lettura automatica.</p><button className="btn btn--fire" onClick={() => onLeggi(doc)}>Leggi i dati del PDF</button></>}
    </>}
    {programmi.map(p => <SchedaArchiviata key={p.id} programma={p} />)}
    {piani.map(p => <DietaArchiviata key={p.id} piano={p} />)}
    {!!doc?.checks.length && <p className="small">Check importati: {doc.checks.map(fmtData).join(' · ')}. Misure e grafici nella sezione Check.</p>}
    <button className="btn btn--ghost" onClick={onClose}>Chiudi</button>
  </div></Sheet>
}

export default function ArchivioPdf() {
  const { stato, invia } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [messaggio, setMessaggio] = useState('')
  const [filtro, setFiltro] = useState('tutti')
  const [sel, setSel] = useState<Voce | null>(null)
  const [daLeggere, setDaLeggere] = useState<DocumentoPdf | null>(null)
  const [categoria, setCategoria] = useState<DocumentoPdf['categoria']>('da-classificare')
  async function carica(files: File[]) {
    setBusy(true); setMessaggio('')
    const noti = [...stato.documentiPdf]; const errori: string[] = []; let aggiunti = 0; let duplicati = 0
    for (const file of files) {
      try {
        const d = await archiviaPdf(file, noti, categoria)
        if (noti.some(n => n.id === d.id)) duplicati++
        else { noti.push(d); aggiunti++ }
        invia({ t: 'salva-documento-pdf', documento: d })
      } catch (e) { errori.push(e instanceof Error ? e.message : `Errore su ${file.name}`) }
    }
    setMessaggio([`${aggiunti} PDF aggiunti all’archivio.`, duplicati ? `${duplicati} già presenti: nessun duplicato creato.` : '', ...errori].filter(Boolean).join('\n'))
    setBusy(false)
  }
  const collegati = new Set(stato.documentiPdf.flatMap(d => [...d.programmi, ...d.piani]))
  const voci: Voce[] = [
    ...stato.documentiPdf.map(d => ({ id: d.id, titolo: d.titolo, data: d.dataDocumento, categoria: d.categoria, documento: d })),
    ...stato.programmiUtente.filter(p => !collegati.has(p.id)).map(p => ({ id: p.id, titolo: p.nome, data: p.dataInizio, categoria: 'allenamento' as const, programma: p })),
    ...stato.pianiAlimentari.filter(p => !collegati.has(p.id)).map(p => ({ id: p.id, titolo: p.nome, data: p.dataInizio, categoria: 'alimentazione' as const, piano: p })),
  ]
  const visibili = voci.filter(v => filtro === 'tutti' || v.categoria === filtro || (v.documento && filtro !== 'da-classificare' && (filtro === 'allenamento' ? v.documento.programmi.length : filtro === 'alimentazione' ? v.documento.piani.length : v.documento.checks.length))).sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '') || a.titolo.localeCompare(b.titolo))
  return <section className="stack" style={{ gap: 14 }}>
    <h2>Archivio programmazioni</h2>
    <p className="small fade-dim">Tutte le tue schede, alimentazioni e check, anche vecchi. Caricare un PDF qui non cambia i piani attuali.</p>
    <div className="card stack">
      <label className="small">Cosa stai caricando?<select value={categoria} disabled={busy} onChange={e => setCategoria(e.target.value as DocumentoPdf['categoria'])}>{Object.entries(CATEGORIE).map(([v, nome]) => <option key={v} value={v}>{v === 'da-classificare' ? 'Documenti diversi / da classificare' : nome}</option>)}</select></label>
      <button className="btn btn--fire" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Salvataggio dei PDF…' : '+ Carica PDF nell’archivio'}</button>
      <input ref={fileRef} aria-label="PDF da archiviare" hidden type="file" multiple accept="application/pdf,.pdf" disabled={busy} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) void carica(files) }} />
      <p className="tiny fade-dim">Puoi selezionare più file insieme, fino a 12 MB ciascuno. Gli originali restano su questo dispositivo e sono inclusi nel backup.</p>
    </div>
    {messaggio && <p role="status" className="small" style={{ whiteSpace: 'pre-wrap' }}>{messaggio}</p>}
    <label className="small">Mostra<select value={filtro} onChange={e => setFiltro(e.target.value)}><option value="tutti">Tutte le programmazioni</option><option value="allenamento">Allenamento</option><option value="alimentazione">Alimentazione</option><option value="check">Check</option><option value="da-classificare">Da classificare</option></select></label>
    {!visibili.length && <p className="card small fade-dim">{voci.length ? 'Nessun documento in questa categoria.' : 'Carica i tuoi PDF per costruire lo storico delle programmazioni.'}</p>}
    {visibili.map(v => <button key={v.id} className="card row row--between" style={{ textAlign: 'left' }} onClick={() => setSel(v)}><div><b>{v.titolo}</b><p className="small fade-dim">{v.data ? fmtData(v.data) : 'Data da indicare'} · {CATEGORIE[v.categoria]}</p><p className="tiny fade-dim">{v.documento?.stato === 'da-leggere' ? 'PDF conservato · dati da leggere' : 'Dati disponibili'}{v.id === stato.profilo.programmaAttivoId || v.documento?.programmi.includes(stato.profilo.programmaAttivoId ?? '') ? ' · scheda attuale' : ''}{v.id === stato.pianoAlimentareId || v.documento?.piani.includes(stato.pianoAlimentareId ?? '') ? ' · dieta attuale' : ''}</p></div><span>›</span></button>)}
    {sel && <DettaglioDocumento voce={sel} onClose={() => setSel(null)} onLeggi={d => { setSel(null); setDaLeggere(d) }} />}
    {daLeggere && <ImportaPdf documento={daLeggere} onClose={() => setDaLeggere(null)} />}
  </section>
}
