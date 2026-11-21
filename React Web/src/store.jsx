import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

// Everything comes from the server. Nothing about sales, stock or prices is kept in the browser.
export function StoreProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false) // true once we know whether someone is signed in
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [demoAccounts, setDemoAccounts] = useState([])
  const [demoMode, setDemoMode] = useState(false)
  const [rules, setRules] = useState({ maxCashierDiscountPct: 10, maxAdminDiscountPct: 50 })
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  // kind: 'success' (default) or 'error'. Errors stay a little longer.
  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind, id: Date.now() })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 5000 : 2800)
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api('GET', '/products'), api('GET', '/categories')])
      setProducts(p.products)
      setCategories(c.categories)
    } catch { /* the page that needs them shows its own error */ }
  }, [])

  useEffect(() => {
    api('GET', '/config').then((c) => { setDemoAccounts(c.demoAccounts); setDemoMode(c.demoMode); if (c.pos) setRules(c.pos) }).catch(() => {})
    api('GET', '/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (user) loadProducts()
    else { setProducts([]); setCategories([]) }
  }, [user, loadProducts])

  const withRetry = async (fn) => {
    try { return await fn() } catch (e) {
      if (e.status < 500) throw e
      await new Promise((r) => setTimeout(r, 700)) // a serverless instance may have just started
      return fn()
    }
  }
  const login = useCallback(async (email, password) => {
    const d = await withRetry(() => api('POST', '/auth/login', { email, password }))
    setUser(d.user)
    return d.user
  }, [])
  const demoLogin = useCallback(async (role) => {
    const d = await withRetry(() => api('GET', `/auth/demo-login?role=${role}`))
    setUser(d.user)
    return d.user
  }, [])
  const logout = useCallback(async () => {
    try { await api('POST', '/auth/logout', {}) } catch { /* the cookie expires anyway */ }
    setUser(null)
  }, [])

  const resetDemo = useCallback(async () => {
    try {
      await api('POST', '/admin/reset-demo', {})
      await loadProducts()
      notify('Demo data restored')
    } catch (e) { notify(e.message, 'error') }
  }, [loadProducts, notify])

  const value = { user, admin: user?.role === 'admin', ready, products, categories, loadProducts, demoAccounts, demoMode, rules, toast, notify, login, demoLogin, logout, resetDemo }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
