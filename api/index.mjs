// Vercel serverless entry for the DEMO site. Every /api/* request lands here.
// The database lives in memory and is rebuilt from database/seed.sql when an instance starts,
// so changes made in this mode are temporary. For a real shop use a Node host (see README).
process.env.DEMO_MODE ??= 'true'
process.env.STATELESS_SESSIONS = 'true'
process.env.TRUST_PROXY ??= 'true'
// Demo logins. No password is written in this file. Set DEMO_ADMIN_PASSWORD and DEMO_CASHIER_PASSWORD in the
// host's environment settings (Vercel: Project, Settings, Environment Variables). Without them the passwords are
// derived from SESSION_SECRET, so every serverless instance still agrees. A real shop never uses this file.
// Signing key for the demo cookies: SESSION_SECRET if set, otherwise derived from this project's own Vercel id,
// so every serverless instance signs and verifies the same way.
if (!process.env.SESSION_SECRET && process.env.VERCEL_PROJECT_ID) {
  const { createHash } = await import('node:crypto')
  process.env.SESSION_SECRET = createHash('sha256').update('shelfwise-pos|' + process.env.VERCEL_PROJECT_ID).digest('hex')
}

let handler
async function boot() {
  const { openDb, bootstrap } = await import('../Node API/server/db.js')
  const { createHandler } = await import('../Node API/server/routes.js')
  const db = openDb(':memory:')
  bootstrap(db)
  return createHandler(db)
}

// Vercel sends every /api/* request here through the rewrite in vercel.json. The original path is kept in req.url;
// if a host passes the target instead (/api?path=auth/login), restore the real path.
function restorePath(req) {
  const u = new URL(req.url, 'http://x')
  if (u.pathname === '/api' || u.pathname === '/api/index') {
    const p = u.searchParams.get('path')
    if (p) { u.searchParams.delete('path'); req.url = '/api/' + p.replace(/^\/+/, '') + u.search }
  }
}

export default async function (req, res) {
  try {
    restorePath(req)
    handler ??= boot().catch((e) => { handler = undefined; throw e }) // a failed start is retried on the next request
    const h = await handler
    let timer
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), 8000) })
    try { return await Promise.race([h(req, res), timeout]) } finally { clearTimeout(timer) }
  } catch (e) {
    console.error('[shelfwise-pos] api error', e)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
    }
    res.end(JSON.stringify({ error: `The demo server could not finish this request (${String(e?.message || e).slice(0, 80)}). Please try again.` }))
  }
}
