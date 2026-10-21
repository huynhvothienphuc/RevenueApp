import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'

// Shows "20.000.000" when idle and raw digits while typing. Empty input -> null.
export function MoneyInput({ value, onChange, allowNegative = false, className, ...props }) {
  const [draft, setDraft] = useState(null)

  function handleChange(event) {
    const raw = event.target.value
    const negative = allowNegative && raw.trim().startsWith('-')
    const digits = raw.replace(/\D/g, '')
    setDraft(`${negative ? '-' : ''}${digits}`)
    onChange(digits === '' ? null : Number(digits) * (negative ? -1 : 1))
  }

  return (
    <Input
      inputMode="numeric"
      className={className}
      value={draft ?? (value === null || value === undefined ? '' : formatNumber(value))}
      onFocus={() => setDraft(value === null || value === undefined ? '' : String(value))}
      onBlur={() => setDraft(null)}
      onChange={handleChange}
      {...props}
    />
  )
}
