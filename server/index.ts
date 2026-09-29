import { createServer } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { estraiPdf } from './import.ts'

const port = Number(process.env.PORT ?? 3001)
const root = resolve('dist')
const key = process.env.OPENAI_API_KEY
const access = process.env.IMPORT_ACCESS_CODE
const model = process.env.OPENAI_IMPORT_MODEL
const origin = process.env.APP_ORIGIN
const attempts = new Map<string, { n: number; until: number }>()
let active = 0
const maxBytes = 12 * 1024 * 1024
const server = createServer(async (req, res) => {
  const send = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
  const path = (req.url ?? '/').split('?')[0]
  if (path.startsWith('/api/')) {
    if (origin && req.headers.origin && req.headers.origin !== origin) return send(403, { error: 'Origine non autorizzata.' })
    if (origin && req.headers.origin === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Import-Code' }); return res.end()
    }
    if (path === '/api/import-status' && req.method === 'GET') return send(200, { available: Boolean(key && access && model) })
    if (path !== '/api/import-pdf' || req.method !== 'POST') return send(404, { error: 'Endpoint non trovato.' })
    if (!key || !access || !model) return send(503, { error: 'Importazione PDF non ancora attivata. Il gestore deve configurare il servizio.' })
    for (const [ip, v] of attempts) if (v.until < Date.now()) attempts.delete(ip)
    const ip = req.socket.remoteAddress ?? 'unknown'
    const rate = attempts.get(ip) ?? { n: 0, until: Date.now() + 3600000 }
    attempts.set(ip, rate)
    if (++rate.n > 30) return send(429, { error: 'Troppe richieste. Riprova più tardi.' })
    const code = Buffer.from(String(req.headers['x-import-code'] ?? ''))
    const expected = Buffer.from(access)
    if (code.length !== expected.length || !timingSafeEqual(code, expected)) return send(401, { error: 'Codice di accesso non valido.' })
    if (!String(req.headers['content-type']).startsWith('application/pdf')) return send(415, { error: 'Seleziona un file PDF.' })
    if (active >= 2) return send(429, { error: 'Importazione occupata. Riprova tra poco.' })
    active++
    try {
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of req) { size += chunk.length; if (size > maxBytes) { send(413, { error: 'Il PDF supera 12 MB.' }); return }; chunks.push(chunk) }
      const pdf = Buffer.concat(chunks)
      if (!pdf.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return send(400, { error: 'Il file non è un PDF valido.' })
      send(200, await estraiPdf(pdf, 'documento.pdf', key, model))
    } catch (e) { send(502, { error: e instanceof Error && !e.message.includes('"') ? e.message : 'Dati estratti non validi. Riprova con un PDF più leggibile.' }) }
    finally { active-- }
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, { error: 'Metodo non consentito.' })
  try {
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path))
    if (!file.startsWith(root + '/')) return send(403, { error: 'Accesso negato.' })
    const data = await readFile(file)
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': path.includes('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(req.method === 'HEAD' ? undefined : data)
  } catch { send(404, { error: 'Pagina non trovata.' }) }
})
server.requestTimeout = 240000
server.listen(port, process.env.HOST ?? '127.0.0.1', () => console.log(`AGOGE: http://localhost:${port}`))
