import { describe, expect, it } from 'vitest'

import { buildPeriods, calculateRoadmap, syncDisabled } from '@/lib/interest'

const tr = 1_000_000
const dates = ['2026-10-27', '2026-11-27', '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27', '2027-04-27', '2027-05-27']

function setup({ deposits = {}, today = '2026-10-21' } = {}) {
  const periods = syncDisabled(
    dates.map((payoutDate) => ({ payoutDate, deposit: deposits[payoutDate] ?? 0, disabled: false })),
    today,
  )
  return calculateRoadmap({ principal: 253 * tr, interestRate: 0.1, interestCap: 30 * tr, periods })
}

const totals = (roadmap) => roadmap.rows.map((r) => r.total / tr)

describe('calculateRoadmap', () => {
  it('compounds 10% until interest hits the 30tr cap', () => {
    const r = setup()
    expect(totals(r)).toEqual([278.3, 306.13, 336.13, 366.13, 396.13, 426.13, 456.13, 486.13])
    expect(r.rows[0].interest).toBe(25.3 * tr)
    expect(r.rows[1].interest).toBe(27.83 * tr)
    expect(r.rows.slice(2).every((row) => row.interest === 30 * tr)).toBe(true)
    expect(r.threshold).toBe(300 * tr)
    expect(r.rows[r.reachIndex].payoutDate).toBe('2026-11-27')
    expect(r.finalTotal).toBe(486.13 * tr)
  })

  it('a deposit in the current period re-syncs that period and every later one', () => {
    const before = setup({ today: '2026-10-28' })
    const after = setup({ today: '2026-10-28', deposits: { '2026-11-27': 5 * tr } })
    expect(after.rows[0]).toEqual(before.rows[0]) // fixed history untouched
    expect(after.rows[1].base).toBe(283.3 * tr)
    expect(after.rows[1].interest).toBe(28.33 * tr)
    expect(after.rows[1].total).toBe(311.63 * tr)
    expect(after.rows[2].opening).toBe(311.63 * tr)
    expect(after.finalTotal).toBe(491.63 * tr)
  })

  it('only the current period takes a deposit; future deposits count as 0', () => {
    const r = setup({ today: '2026-10-21', deposits: { '2026-12-27': 50 * tr } })
    expect(r.rows.map((row) => row.status)).toEqual(['current', ...Array(7).fill('future')])
    expect(r.rows[2].deposit).toBe(0)
    expect(r.finalTotal).toBe(486.13 * tr)
  })

  it('keeps a fixed past deposit in the calculation', () => {
    const r = setup({ today: '2026-11-28', deposits: { '2026-11-27': 5 * tr } })
    expect(r.rows[1].status).toBe('past')
    expect(r.rows[1].deposit).toBe(5 * tr)
    expect(r.rows[2].status).toBe('current')
  })
})

describe('syncDisabled', () => {
  it('fixes periods whose payout date has passed, and never un-fixes them', () => {
    const periods = [
      { payoutDate: '2026-10-27', deposit: 0, disabled: false },
      { payoutDate: '2026-11-27', deposit: 0, disabled: true },
      { payoutDate: '2026-12-27', deposit: 0, disabled: false },
    ]
    expect(syncDisabled(periods, '2026-10-27').map((p) => p.disabled)).toEqual([false, true, false])
    expect(syncDisabled(periods, '2026-10-28').map((p) => p.disabled)).toEqual([true, true, false])
  })
})

describe('buildPeriods', () => {
  const base = [
    { payoutDate: '2026-10-27', deposit: 0, disabled: true },
    { payoutDate: '2026-11-27', deposit: 5 * tr, disabled: false },
  ]
  it('extends monthly on the same day, keeping existing deposits', () => {
    const result = buildPeriods(base, '2027-01')
    expect(result.map((p) => p.payoutDate)).toEqual(['2026-10-27', '2026-11-27', '2026-12-27', '2027-01-27'])
    expect(result[1].deposit).toBe(5 * tr)
  })
  it('shrinks, but never drops fixed periods', () => {
    expect(buildPeriods(base, '2026-09').map((p) => p.payoutDate)).toEqual(['2026-10-27'])
  })
})
