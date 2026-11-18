import { config } from '../config.js'
import { HttpError, send } from '../http.js'
import { makeLimiter, verifyPassword, verifyDummy, createSession, destroySession, sessionCookie } from '../auth.js'

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role })

export function authRoutes({ db, q, route, loginLimit }) {
  // ---- auth
  const startSession = (c, user) => {
    const token = createSession(db, user.id)
    const secure = config.cookieSecure || c.req.headers['x-forwarded-proto'] === 'https'
    return { 'Set-Cookie': sessionCookie(token, secure) }
  }
  route('POST', '/api/auth/login', (c) => {
    const email = String(c.body.email || '').trim().toLowerCase().slice(0, 160)
    const password = String(c.body.password || '').slice(0, 200)
    const key = `${c.ip}|${email}`
    if (!loginLimit.take(key)) throw new HttpError(429, 'Too many sign-in attempts. Try again in 15 minutes.')
    const row = q('SELECT * FROM users WHERE email = ? AND active = 1').get(email)
    const ok = row ? verifyPassword(password, row.password_hash) : (verifyDummy(password), false)
    if (!ok) throw new HttpError(401, 'Incorrect email or password')
    loginLimit.reset(key)
    send(c.res, 200, { user: publicUser(row) }, startSession(c, row))
  }, { body: true })

  // Demo sign-in buttons: signs in the public demo admin or cashier. Only exists in DEMO_MODE.
  // A plain GET (no request body to parse), so it works on any host. The demo logins are already public.
  const demoLimit = makeLimiter(60, 15 * 60 * 1000)
  route('GET', '/api/auth/demo-login', (c) => {
    if (!config.demoMode) throw new HttpError(404, 'Not found')
    if (!demoLimit.take('demo:' + c.ip)) throw new HttpError(429, 'Too many sign-in attempts. Try again in a few minutes.')
    const role = c.url.searchParams.get('role') === 'admin' ? 'admin' : 'cashier'
    const row = q('SELECT * FROM users WHERE email = ? AND role = ?').get(config.demo[role].email.toLowerCase(), role)
    if (!row) throw new HttpError(404, 'The demo account is not available. Use "Restore demo data" or restart the demo.')
    send(c.res, 200, { user: publicUser(row) }, startSession(c, row))
  })

  route('POST', '/api/auth/logout', (c) => {
    destroySession(db, c.token)
    send(c.res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', false) })
  }, { body: true })

  route('GET', '/api/auth/me', (c) => send(c.res, 200, { user: c.user ? publicUser(c.user) : null }))

}
