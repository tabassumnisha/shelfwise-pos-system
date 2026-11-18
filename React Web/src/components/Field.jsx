import { useId } from 'react'

// Defined at module level on purpose: a component created inside another component's render
// is a new type every render, which remounts the input and drops focus after each key press.
export function Field({ label, error, hint, children, className = '' }) {
  const id = useId()
  const child = children({ id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': error ? `${id}-e` : hint ? `${id}-h` : undefined })
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {child}
      {hint && !error && <span className="hint" id={`${id}-h`}>{hint}</span>}
      {error && <span className="err" id={`${id}-e`} role="alert">{error}</span>}
    </div>
  )
}

export const TextField = ({ label, value, onChange, error, hint, type = 'text', className, ...rest }) => (
  <Field label={label} error={error} hint={hint} className={className}>
    {(p) => <input {...p} type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />}
  </Field>
)

export const SelectField = ({ label, value, onChange, error, options, ...rest }) => (
  <Field label={label} error={error}>
    {(p) => (
      <select {...p} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )}
  </Field>
)
