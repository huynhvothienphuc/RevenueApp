import { describe, expect, it } from 'vitest'

import { endOfMonth } from '@/lib/format'

describe('endOfMonth', () => {
  it('moves a due date to the last day of its month', () => {
    expect(endOfMonth('2027-01-21')).toBe('2027-01-31')
    expect(endOfMonth('2027-01')).toBe('2027-01-31')
    expect(endOfMonth('2027-02-10')).toBe('2027-02-28')
    expect(endOfMonth('2028-02')).toBe('2028-02-29')
    expect(endOfMonth('2026-11-05')).toBe('2026-11-30')
    expect(endOfMonth(null)).toBe(null)
    expect(endOfMonth('')).toBe(null)
  })
})

describe('formatDayPadded', () => {
  it('always shows DD/MM/YYYY', async () => {
    const { formatDayPadded } = await import('@/lib/format')
    expect(formatDayPadded('2026-10-21')).toBe('21/10/2026')
    expect(formatDayPadded('2027-1-5')).toBe('05/01/2027')
  })
})
