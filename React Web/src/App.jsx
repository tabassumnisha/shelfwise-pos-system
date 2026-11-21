import { useRoute, navigate } from './router'
import { useStore } from './store'
import Shell from './components/Shell'
import Toast from './components/Toast'
import SignIn from './pages/SignIn'
import Terminal from './pages/Terminal'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import Products from './pages/Products'
import Stock from './pages/Stock'
import Reports from './pages/Reports'
import Team from './pages/Team'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

const ADMIN_ONLY = new Set(['dashboard', 'products', 'stock', 'reports', 'team', 'settings'])

function Page({ seg, admin }) {
  if (ADMIN_ONLY.has(seg) && !admin) return <NotFound reason="This page is for admins." />
  switch (seg) {
    case 'dashboard': return <Dashboard />
    case 'pos': return <Terminal />
    case 'sales': return <Sales />
    case 'products': return <Products />
    case 'stock': return <Stock />
    case 'reports': return <Reports />
    case 'team': return <Team />
    case 'settings': return <Settings />
    default: return <NotFound />
  }
}

export default function App() {
  const { path } = useRoute()
  const { user, admin, ready } = useStore()
  const seg = path.split('/').filter(Boolean)[0]
  if (!ready) return <div className="boot" role="status"><span className="spinner big" /><p className="muted">Loading…</p></div>
  if (!user) return <><SignIn /><Toast /></>
  if (!seg) { navigate(admin ? '/dashboard' : '/pos'); return null }
  return <><Shell path={path}><Page seg={seg} admin={admin} /></Shell><Toast /></>
}
