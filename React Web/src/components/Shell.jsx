import { useEffect, useState } from 'react'
import { Link } from '../router'
import { useStore } from '../store'
import { Icon } from './Icons'
import Logo from './Logo'
import { STORE } from '../config'

const NAV = [
  { to: '/dashboard', icon: 'grid', label: 'Dashboard', admin: true },
  { to: '/pos', icon: 'register', label: 'Terminal' },
  { to: '/sales', icon: 'receipt', label: 'Sales' },
  { to: '/products', icon: 'box', label: 'Products', admin: true },
  { to: '/stock', icon: 'truck', label: 'Stock and orders', admin: true },
  { to: '/reports', icon: 'chart', label: 'Reports', admin: true },
  { to: '/team', icon: 'users', label: 'Team', admin: true },
  { to: '/settings', icon: 'gear', label: 'Settings', admin: true },
]

export default function Shell({ path, children }) {
  const { user, admin, logout, products } = useStore()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])
  // Label table cells from their column headers so tables can stack as cards on phones.
  useEffect(() => {
    const label = () => document.querySelectorAll('table.data').forEach((t) => {
      const heads = [...t.querySelectorAll('thead th')].map((h) => (h.querySelector('.sr') ? '' : h.textContent.trim()))
      t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((c, i) => { if (heads[i] && c.getAttribute('data-label') !== heads[i]) c.setAttribute('data-label', heads[i]) }))
    })
    label()
    const mo = new MutationObserver(label)
    mo.observe(document.getElementById('main'), { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])
  const low = products.filter((p) => p.active && p.low).length
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <button type="button" className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        <Logo tone="dark" size={30} />
        <span className="topbar-shop muted small">{STORE.shop}</span>
      </header>
      <nav className={`side${open ? ' open' : ''}`} aria-label="Main">
        <div className="side-logo"><Logo tone="light" size={34} /></div>
        <ul>
          {NAV.filter((n) => !n.admin || admin).map((n) => {
            const on = path === n.to || path.startsWith(n.to + '/')
            return (
              <li key={n.to}>
                <Link to={n.to} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
                  <Icon name={n.icon} /> <span>{n.label}</span>
                  {n.to === '/stock' && low > 0 && <b className="pill warn" aria-label={`${low} low stock`}>{low}</b>}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="side-user">
          <div className="side-who"><span className="avatar" aria-hidden="true">{user.name[0]}</span><span><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Admin' : 'Cashier'}</small></span></div>
          <button type="button" className="side-out" onClick={logout}><Icon name="logout" size={18} /> Sign out</button>
        </div>
      </nav>
      {open && <button type="button" className="side-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <main id="main" className="main">{children}</main>
    </div>
  )
}
