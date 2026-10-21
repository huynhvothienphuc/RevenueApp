import { describe, expect, it } from 'vitest'

import { syncDisabled } from '@/lib/interest'
import { planRepayment } from '@/lib/repayment'

const tr = 1_000_000
const dates = ['2026-10-27', '2026-11-27', '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27', '2027-04-27', '2027-05-27']
// Priority order = list order.
const debts = [
  { id: 'k1', name: 'Khoản 1', amount: 5 * tr, dueDate: '2026-12-31' },
  { id: 'k2', name: 'Khoản 2', amount: 10 * tr, dueDate: '2027-01-31' },
  { id: 'k3', name: 'Khoản 3', amount: 55 * tr, dueDate: '2027-01-31' },
  { id: 'k4', name: 'Khoản 4', amount: 26 * tr, dueDate: null },
  { id: 'k5', name: 'Khoản 5', amount: 80 * tr, dueDate: '2026-10-31' },
]

function plan({ deposits = {}, list = debts, today = '2026-10-21' } = {}) {
  const periods = syncDisabled(
    dates.map((payoutDate) => ({ payoutDate, deposit: deposits[payoutDate] ?? 0, disabled: false })),
    today,
  )
  return planRepayment({ principal: 253 * tr, interestRate: 0.1, interestCap: 30 * tr, periods, debts: list })
}

const m = (v) => Math.round(v) / tr
const byName = (p) => Object.fromEntries(p.debts.map((d) => [d.name, d]))
const paidTo = (p, name) => p.rows.map((r) => m(r.payments.find((x) => x.name === name)?.amount ?? 0))

describe('planRepayment', () => {
  it('pays in round instalments (multiples of 5tr), in priority order; odd change waits', () => {
    const p = plan()
    expect(paidTo(p, 'Khoản 1')).toEqual([0, 5, 0, 0, 0, 0, 0, 0])
    // 1.13tr left in November is not paid to Khoản 2: it waits, and Khoản 2 gets 10tr in one go.
    expect(paidTo(p, 'Khoản 2')).toEqual([0, 0, 10, 0, 0, 0, 0, 0])
    expect(paidTo(p, 'Khoản 3')).toEqual([0, 0, 20, 30, 5, 0, 0, 0])
    // A final instalment is the exact remainder, round or not.
    expect(paidTo(p, 'Khoản 4')).toEqual([0, 0, 0, 0, 26, 0, 0, 0])
    expect(paidTo(p, 'Khoản 5')).toEqual([0, 0, 0, 0, 0, 30, 30, 20])
    expect(p.rows.map((r) => m(r.closing))).toEqual([278.3, 301.13, 301.13, 301.13, 300.13, 300.13, 300.13, 310.13])
  })

  it('step 0 turns rounding off', () => {
    const periods = syncDisabled(dates.map((payoutDate) => ({ payoutDate, deposit: 0, disabled: false })), '2026-10-21')
    const p = planRepayment({ principal: 253 * tr, interestRate: 0.1, interestCap: 30 * tr, periods, debts, repayStep: 0 })
    expect(m(p.rows[1].payments.find((x) => x.name === 'Khoản 2').amount)).toBe(1.13)
  })

  it('reports what arrives by each due date', () => {
    const d = byName(plan())
    expect(m(d['Khoản 1'].paidByDue)).toBe(5)
    expect(m(d['Khoản 2'].paidByDue)).toBe(10)
    // Due 31/1: the 27/1 instalment still counts.
    expect(m(d['Khoản 3'].paidByDue)).toBe(50)
    expect(d['Khoản 3'].paidOff).toBe('2027-02-27')
    expect(d['Khoản 3'].instalments).toBe(3)
    expect(m(d['Khoản 5'].paidByDue)).toBe(0)
    expect(plan().debts.filter((x) => x.late).map((x) => x.name)).toEqual(['Khoản 3', 'Khoản 5'])
  })

  it('never dips below 300tr and ends with the maximum: 486.13tr - 176tr', () => {
    const p = plan()
    expect(p.rows.slice(1).every((r) => r.closing >= 300 * tr)).toBe(true)
    expect(p.rows.slice(2).every((r) => r.interest === 30 * tr)).toBe(true)
    expect(m(p.finalBalance)).toBe(310.13)
    expect(p.remainingDebt).toBe(0)
    expect(p.paidOffDate).toBe('2027-05-27')
  })

  it('an overdue debt lower in the list does not jump the queue', () => {
    const p = plan()
    const first = (name) => p.rows.findIndex((r) => r.payments.some((x) => x.name === name))
    expect(first('Khoản 5')).toBeGreaterThan(first('Khoản 3'))
  })

  it('reordering the list changes who is paid first', () => {
    const list = [debts[2], debts[0], debts[1], debts[3], debts[4]] // Khoản 3 first
    const p = plan({ list })
    expect(p.rows[1].payments.map((x) => x.name)).toEqual(['Khoản 3'])
  })

  it('a deposit entered on the roadmap is used', () => {
    const p = plan({ today: '2026-11-28', deposits: { '2026-12-27': 50 * tr } })
    expect(byName(p)['Khoản 3'].paidOff).toBe('2026-12-27')
  })
})

describe('planRepayment beyond the roadmap', () => {
  it('ends with the roadmap when everything is paid by then', () => {
    const p = plan()
    expect(p.rows).toHaveLength(8)
    expect(p.rows.some((r) => r.extended)).toBe(false)
  })

  it('keeps going month by month after 5/2027 until every debt is paid', () => {
    const list = [...debts, { id: 'x', name: 'X', amount: 100 * tr, dueDate: null }]
    const p = plan({ list })
    const extra = p.rows.filter((r) => r.extended)
    expect(extra.map((r) => r.payoutDate)).toEqual(['2027-06-27', '2027-07-27', '2027-08-27'])
    // 10 of the 10.13 left over in May, then 30 + 30 + 30.
    expect(paidTo(p, 'X')).toEqual([0, 0, 0, 0, 0, 0, 0, 10, 30, 30, 30])
    expect(byName(p).X.paidOff).toBe('2027-08-27')
    expect(p.paidOffDate).toBe('2027-08-27')
    expect(p.remainingDebt).toBe(0)
    expect(extra.every((r) => r.interest === 30 * tr && r.closing >= 300 * tr)).toBe(true)
  })

  it('crosses the year boundary correctly', () => {
    const list = [{ id: 'y', name: 'Y', amount: 400 * tr, dueDate: null }]
    const p = plan({ list })
    const extra = p.rows.filter((r) => r.extended).map((r) => r.payoutDate)
    expect(extra).toContain('2027-12-27')
    expect(extra).toContain('2028-01-27')
    expect(p.remainingDebt).toBe(0)
  })
})

describe('planRepayment budget', () => {
  it('shows each payout as round new money plus the change carried from before', () => {
    const p = plan()
    expect(p.rows.map((r) => (r.budget === null ? null : m(r.budget)))).toEqual([null, 6.13, 30, 30, 30, 30, 30, 30])
    expect(p.rows.map((r) => m(r.carry))).toEqual([0, 0, 1.13, 1.13, 1.13, 0.13, 0.13, 0.13])
    // What is paid never exceeds budget + carry.
    expect(p.rows.every((r) => r.withdraw <= (r.budget ?? 0) + r.carry)).toBe(true)
  })
})
