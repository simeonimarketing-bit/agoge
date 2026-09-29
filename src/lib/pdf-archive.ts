import type { DocumentoPdf, Stato } from '../types'

const DB = 'agoge-documenti'
const STORE = 'pdf'
export const MAX_PDF_BYTES = 12 * 1024 * 1024

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Archivio non disponibile su questo browser.'))
    request.onblocked = () => reject(new Error('Chiudi le altre schede dell’app e riprova.'))
  })
}

export async function leggiPdf(id: string): Promise<Blob | undefined> {
  const db = await database()
  try {
    return await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(id)
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(new Error('Impossibile aprire questo PDF.'))
    })
  } finally { db.close() }
}

export async function scriviPdf(files: { id: string; blob: Blob }[]): Promise<void> {
  const db = await database()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      for (const file of files) tx.objectStore(STORE).put(file.blob, file.id)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(new Error('Non c’è spazio per salvare i PDF. Libera spazio sul dispositivo e riprova.'))
      tx.onerror = () => { /* onabort gestisce il fallimento dell’intera transazione */ }
    })
  } finally { db.close() }
}

export async function archiviaPdf(file: File, esistenti: DocumentoPdf[], categoria: DocumentoPdf['categoria'] = 'da-classificare', dataDocumento?: string): Promise<DocumentoPdf> {
  if (!file.name.toLowerCase().endsWith('.pdf') || !file.size || file.size > MAX_PDF_BYTES) throw new Error(`${file.name}: scegli un PDF fino a 12 MB.`)
  const buffer = await file.arrayBuffer()
  if (!new TextDecoder().decode(buffer.slice(0, 1024)).includes('%PDF-')) throw new Error(`${file.name}: il file non è un PDF valido.`)
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const id = 'pdf-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  // Un duplicato ripristina il file eventualmente mancante, senza duplicare i dati estratti.
  await scriviPdf([{ id, blob: new Blob([buffer], { type: 'application/pdf' }) }])
  return esistenti.find(d => d.id === id) ?? {
    id, nome: file.name, titolo: file.name.replace(/\.pdf$/i, ''), dimensione: file.size,
    caricatoIl: new Date().toISOString(), dataDocumento, categoria,
    stato: 'da-leggere', programmi: [], piani: [], checks: [],
  }
}

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Impossibile preparare il backup dei PDF.'))
    r.readAsDataURL(blob)
  })
}
export async function pdfPerBackup(stato: Stato) {
  const files: { id: string; base64: string }[] = []
  for (const d of stato.documentiPdf) {
    const blob = await leggiPdf(d.id)
    if (!blob) throw new Error(`PDF originale mancante: ${d.nome}. Ricaricalo nell’archivio prima di esportare il backup completo.`)
    files.push({ id: d.id, base64: await base64(blob) })
  }
  return files
}
export async function ripristinaPdf(files: unknown, documenti: DocumentoPdf[]) {
  if (!Array.isArray(files)) {
    if (documenti.length) throw new Error('Nel backup mancano i PDF originali.')
    return
  }
  const blobs = []
  for (const d of documenti) {
    const f = files.find(f => f && f.id === d.id)
    if (!f || typeof f.base64 !== 'string' || f.base64.length > MAX_PDF_BYTES * 1.34) throw new Error(`PDF mancante o non valido nel backup: ${d.nome}`)
    const bytes = Uint8Array.from(atob(f.base64), c => c.charCodeAt(0))
    if (bytes.length > MAX_PDF_BYTES || !new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw new Error('Il backup contiene un PDF non valido.')
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const id = 'pdf-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    if (id !== d.id) throw new Error('Il PDF nel backup non corrisponde al documento archiviato.')
    blobs.push({ id: d.id, blob: new Blob([bytes], { type: 'application/pdf' }) })
  }
  if (blobs.length) await scriviPdf(blobs)
}
