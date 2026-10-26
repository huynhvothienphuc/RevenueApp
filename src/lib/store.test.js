import { describe, expect, it } from 'vitest'

import { mergeSeed } from '@/lib/store'

const seed = {
  version: 2,
  debts: [
    { id: 'k1', name: 'Khoản 1', amount: 5, dueDate: '2026-12-31' },
    { id: 'k6', name: 'Khoản 6', amount: 50, dueDate: null },
  ],
}

describe('mergeSeed', () => {
  it('adds debts that are new in a newer data.json, keeping saved edits', () => {
    const saved = { version: 1, debts: [{ id: 'x1', name: 'Khoản 1', amount: 7, dueDate: '2026-12-31' }] }
    const merged = mergeSeed(saved, seed)
    expect(merged.version).toBe(2)
    expect(merged.debts.map((d) => [d.name, d.amount])).toEqual([
      ['Khoản 1', 7], // saved edit kept, not duplicated (same name)
      ['Khoản 6', 50],
    ])
  })

  it('treats data saved before versioning as version 1', () => {
    expect(mergeSeed({ debts: [] }, seed).debts.map((d) => d.id)).toEqual(['k1', 'k6'])
  })

  it('adds withdrawals that are new in data.json to the saved periods, once', () => {
    const seedV3 = {
      version: 3,
      debts: [],
      periods: [{ payoutDate: '2026-11-27', withdrawals: [{ id: 'r1', amount: 3.7 }, { id: 'r2', amount: 8.6 }] }],
    }
    const saved = {
      version: 2,
      debts: [],
      periods: [
        { payoutDate: '2026-10-27', deposit: 0 },
        { payoutDate: '2026-11-27', deposit: 0, withdrawals: [{ id: 'r1', amount: 3.7 }] },
      ],
    }
    const merged = mergeSeed(saved, seedV3)
    expect(merged.periods[0]).toBe(saved.periods[0])
    expect(merged.periods[1].withdrawals.map((w) => w.id)).toEqual(['r1', 'r2']) // r1 not duplicated
    // Up to date: a withdrawal deleted later is not added back.
    const deleted = { ...merged, periods: [merged.periods[0], { ...merged.periods[1], withdrawals: [] }] }
    expect(mergeSeed(deleted, seedV3)).toBe(deleted)
  })

  it('does not duplicate a withdrawal already typed in by hand (same amount, other id)', () => {
    const seedV3 = { version: 3, debts: [], periods: [{ payoutDate: '2026-11-27', withdrawals: [{ id: 'r1', amount: 3.7 }] }] }
    const saved = { version: 2, debts: [], periods: [{ payoutDate: '2026-11-27', withdrawals: [{ id: 'uuid', amount: 3.7 }] }] }
    expect(mergeSeed(saved, seedV3).periods[0].withdrawals.map((w) => w.id)).toEqual(['uuid'])
  })

  it('does nothing once the saved data is up to date (a deleted debt stays deleted)', () => {
    const saved = { version: 2, debts: [] }
    expect(mergeSeed(saved, seed)).toBe(saved)
  })
})
