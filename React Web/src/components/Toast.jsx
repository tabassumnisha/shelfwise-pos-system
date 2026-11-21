import { useStore } from '../store'
import { Icon } from './Icons'

export default function Toast() {
  const { toast } = useStore()
  if (!toast) return null
  const bad = toast.kind === 'error'
  return (
    <div className={`toast${bad ? ' bad' : ''}`} role={bad ? 'alert' : 'status'} key={toast.id}>
      <Icon name={bad ? 'alert' : 'check'} size={18} /> {toast.message}
    </div>
  )
}
