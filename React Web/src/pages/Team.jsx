import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { usePageTitle, fmtDate, label } from '../utils'
import { Icon } from '../components/Icons'
import Dialog from '../components/Dialog'
import { TextField, SelectField } from '../components/Field'

function UserForm({ user, onClose, onSaved }) {
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', role: user?.role || 'cashier', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e) => {
    e.preventDefault(); setError(''); setErrors({})
    try {
      if (user) { const b = { name: f.name, email: f.email, role: f.role }; if (f.password) b.password = f.password; await api('PATCH', `/users/${user.id}`, b) }
      else await api('POST', '/users', f)
      onSaved()
    } catch (err) { setError(err.message); setErrors(err.fields || {}) }
  }
  return (
    <Dialog title={user ? 'Edit team member' : 'Add team member'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-grid">
          <TextField label="Name" value={f.name} onChange={set('name')} error={errors.name} />
          <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} />
          <SelectField label="Role" value={f.role} onChange={set('role')} error={errors.role} options={[{ value: 'cashier', label: 'Cashier' }, { value: 'admin', label: 'Admin' }]} />
          <TextField label={user ? 'New password (optional)' : 'Password'} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="At least 10 characters." />
        </div>
        <div className="btn-row dialog-actions"><button className="btn btn-primary">Save</button></div>
      </form>
    </Dialog>
  )
}

export default function Team() {
  usePageTitle('Team')
  const { user: me, notify } = useStore()
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => api('GET', '/users').then((d) => setUsers(d.users)).catch((e) => notify(e.message, 'error')), [notify])
  useEffect(() => { load() }, [load])
  const toggle = async (u) => {
    try { await api('PATCH', `/users/${u.id}`, { active: !u.active }); load(); notify(u.active ? 'Account deactivated' : 'Account reactivated') } catch (e) { notify(e.message, 'error') }
  }
  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Team</h1><p className="muted">Admins manage the shop. Cashiers use the terminal and see only their own sales.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" /> Add team member</button>
      </header>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr">Team members</caption>
          <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Added</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <th scope="row">{u.name}{u.id === me.id && <small>You</small>}</th><td>{u.email}</td><td>{label(u.role)}</td>
                <td><span className={`badge ${u.active ? 'completed' : 'cancelled'}`}>{u.active ? 'Active' : 'Inactive'}</span></td><td>{fmtDate(u.createdAt)}</td>
                <td className="right actions">
                  <button type="button" className="icon-btn sm" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Icon name="edit" size={18} /></button>
                  {u.id !== me.id && <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(u)} aria-label={`${u.active ? 'Deactivate' : 'Reactivate'} ${u.name}`}>{u.active ? 'Deactivate' : 'Reactivate'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); notify('Saved') }} />}
    </div>
  )
}
