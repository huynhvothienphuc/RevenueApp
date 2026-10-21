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

  it('does nothing once the saved data is up to date (a deleted debt stays deleted)', () => {
    const saved = { version: 2, debts: [] }
    expect(mergeSeed(saved, seed)).toBe(saved)
  })
})
