import { useState } from 'react'
import { navigate } from '../router'
import { useStore } from '../store'
import { TextField } from '../components/Field'
import Logo from '../components/Logo'
import { Icon } from '../components/Icons'
import { usePageTitle } from '../utils'

export default function SignIn() {
  usePageTitle('Sign in')
  const { login, demoLogin, demoAccounts } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true); setError('')
    try { await fn(); navigate('/pos') } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const submit = (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Enter your email and password.')
    run(() => login(email.trim(), password))
  }
  return (
    <div className="login">
      <aside className="login-aside">
        <Logo tone="light" size={44} />
        <h1>Sell fast. Count right.</h1>
        <p>A point of sale and stock system for shops that want one screen for the till, the shelves and the numbers.</p>
        <ul className="login-points">
          <li><Icon name="scan" /> Scan or search, charge in two taps</li>
          <li><Icon name="box" /> Stock updates with every sale and refund</li>
          <li><Icon name="chart" /> Daily takings, profit and top sellers</li>
          <li><Icon name="shield" /> Cashier and admin roles, checked on the server</li>
        </ul>
      </aside>
      <main id="main" className="login-main">
        <form className="login-card" onSubmit={submit} noValidate>
          <h2>Sign in</h2>
          <p className="muted small">Use your shop account.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <TextField label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} />
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {demoAccounts.length > 0 && (
          <section className="login-card demo" aria-label="Demo access">
            <h2>Try the demo</h2>
            <p className="muted small">Public demo accounts with sample sales. Changes reset when the demo restarts.</p>
            {demoAccounts.map((a) => (
              <div className="demo-acct" key={a.role}>
                <div>
                  <strong>{a.role === 'admin' ? 'Admin' : 'Cashier'}</strong>
                  <div className="small muted">Email <code>{a.email}</code></div>
                  <div className="small muted">Password <code>{a.password}</code></div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(() => demoLogin(a.role))}>Sign in as {a.role}</button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
