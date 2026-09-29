import type { Pagina } from './lettore-pappa'

// Estrae dal PDF, sul dispositivo, le parole con la loro posizione e i bordi
// delle tabelle. Nessun dato lascia il telefono.
// Il modulo pdfjs viene passato dall'esterno: nel browser si usa la build con
// worker (vedi leggiPaginePdf), nei test la build legacy per Node.

type PdfJs = typeof import('pdfjs-dist')

export async function estraiPagine(pdfjs: PdfJs, dati: ArrayBuffer | Uint8Array): Promise<Pagina[]> {
  const doc = await pdfjs.getDocument({ data: dati instanceof Uint8Array ? dati : new Uint8Array(dati), verbosity: 0 }).promise
  const pagine: Pagina[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n)
    const testo = await pg.getTextContent()
    const voci = testo.items.flatMap(it => 'str' in it && it.str.trim()
      ? [{ x: it.transform[4], y: it.transform[5], w: it.width, s: it.str }] : [])
    const ops = await pg.getOperatorList()
    const orizz: Pagina['orizz'] = []
    const vert: Pagina['vert'] = []
    // Word disegna i bordi delle celle come rettangoli pieni sottili
    ops.fnArray.forEach((f, i) => {
      if (f !== pdfjs.OPS.constructPath) return
      const [sub, coords] = ops.argsArray[i] as [number[], number[]]
      let k = 0
      for (const op of sub) {
        if (op === pdfjs.OPS.rectangle) {
          const [x, y, w, h] = coords.slice(k, k + 4)
          const aw = Math.abs(w), ah = Math.abs(h), x0 = Math.min(x, x + w), y0 = Math.min(y, y + h)
          if (ah < 2.5 && aw > 5) orizz.push({ y: y0 + ah / 2, x1: x0, x2: x0 + aw })
          else if (aw < 2.5 && ah > 5) vert.push({ x: x0 + aw / 2, y1: y0, y2: y0 + ah })
          k += 4
        } else if (op === pdfjs.OPS.moveTo || op === pdfjs.OPS.lineTo) k += 2
        else if (op === pdfjs.OPS.curveTo) k += 6
        else if (op === pdfjs.OPS.curveTo2 || op === pdfjs.OPS.curveTo3) k += 4
      }
    })
    pagine.push({ voci, orizz, vert })
  }
  await doc.destroy()
  return pagine
}

export async function leggiPaginePdf(file: Blob): Promise<Pagina[]> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return estraiPagine(pdfjs, await file.arrayBuffer())
}
