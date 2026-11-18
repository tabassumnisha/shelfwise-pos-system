import { Link } from '../router'
import { usePageTitle } from '../utils'

export default function NotFound({ reason }) {
  usePageTitle('Not found')
  return (
    <div className="page empty">
      <h1>Page not available</h1>
      <p className="muted">{reason || 'That page does not exist.'}</p>
      <Link to="/pos" className="btn btn-dark">Back to the terminal</Link>
    </div>
  )
}
