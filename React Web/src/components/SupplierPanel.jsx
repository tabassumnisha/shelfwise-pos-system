import { useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import Dialog from './Dialog'
import { TextField } from './Field'
import { Icon } from './Icons'

function SupplierForm({ supplier, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', contact: '', email: '', phone: '', ...(supplier || {}) })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const submit = async (e) => {
    e.preventDefault(); setError(''); setErrors({})
    try {
      supplier ? await api('PUT', `/suppliers/${supplier.id}`, f) : await api('POST', '/suppliers', f)
      onSaved()
    } catch (err) { setError(err.message); setErrors(err.fields || {}) }
  }
  return (
    <Dialog title={supplier ? 'Edit supplier' : 'Add supplier'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-grid">
          <TextField label="Company" value={f.name} onChange={set('name')} error={errors.name} className="full" />
          <TextField label="Contact name" value={f.contact || ''} onChange={set('contact')} error={errors.contact_name} />
          <TextField label="Phone" value={f.phone || ''} onChange={set('phone')} error={errors.phone} />
          <TextField label="Email" type="email" value={f.email || ''} onChange={set('email')} error={errors.email} className="full" />
        </div>
        <div className="btn-row dialog-actions"><button className="btn btn-primary">Save supplier</button></div>
      </form>
    </Dialog>
  )
}

export default function SupplierPanel({ suppliers, reload }) {
  const { notify } = useStore()
  const [editing, setEditing] = useState(null)
  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name}?`)) return
    try { await api('DELETE', `/suppliers/${s.id}`, {}); reload(); notify('Supplier deleted') } catch (e) { notify(e.message, 'error') }
  }
  return (
    <section aria-label="Suppliers">
      <div className="btn-row panel-actions"><button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" /> Add supplier</button></div>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr">Suppliers</caption>
          <thead><tr><th scope="col">Company</th><th scope="col">Contact</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <th scope="row">{s.name}</th><td>{s.contact}</td><td>{s.email}</td><td>{s.phone}</td>
                <td className="right actions">
                  <button type="button" className="icon-btn sm" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}><Icon name="edit" size={18} /></button>
                  <button type="button" className="icon-btn sm" onClick={() => remove(s)} aria-label={`Delete ${s.name}`}><Icon name="trash" size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <SupplierForm supplier={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); notify('Supplier saved') }} />}
    </section>
  )
}
