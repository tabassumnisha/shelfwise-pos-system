import { HttpError, send } from '../http.js'
import { hashPassword } from '../auth.js'
import { validateUser } from '../validate.js'

const userJson = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: !!u.active, createdAt: u.created_at })

export function userRoutes({ db, q, route, requireAdmin }) {
  const get = (id) => {
    const u = q('SELECT * FROM users WHERE id = ?').get(id)
    if (!u) throw new HttpError(404, 'User not found')
    return u
  }
  route('GET', '/api/users', (c) => {
    requireAdmin(c)
    send(c.res, 200, { users: q('SELECT * FROM users ORDER BY id').all().map(userJson) })
  })
  route('POST', '/api/users', (c) => {
    requireAdmin(c)
    const v = validateUser(c.body)
    if (q('SELECT 1 FROM users WHERE email = ?').get(v.email)) throw new HttpError(409, 'A user with this email already exists', { email: 'Already used' })
    const r = q('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)').run(v.email, v.name, hashPassword(v.password), v.role)
    send(c.res, 201, { user: userJson(get(Number(r.lastInsertRowid))) })
  }, { body: true })
  route('PATCH', '/api/users/:id', (c) => {
    const me = requireAdmin(c)
    const id = Number(c.params.id)
    const u = get(id)
    const v = validateUser(c.body, { partial: true })
    if (id === me.id && (v.active === 0 || (v.role && v.role !== 'admin'))) throw new HttpError(409, 'You cannot deactivate or demote your own account')
    if (v.email && v.email !== u.email && q('SELECT 1 FROM users WHERE email = ?').get(v.email)) throw new HttpError(409, 'A user with this email already exists', { email: 'Already used' })
    q('UPDATE users SET name=?, email=?, role=?, active=?, password_hash=? WHERE id=?').run(
      v.name ?? u.name, v.email ?? u.email, v.role ?? u.role, v.active ?? u.active, v.password ? hashPassword(v.password) : u.password_hash, id)
    if (v.active === 0 || v.password) q('DELETE FROM sessions WHERE user_id = ?').run(id)
    send(c.res, 200, { user: userJson(get(id)) })
  }, { body: true })
}
