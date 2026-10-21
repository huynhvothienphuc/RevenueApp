import { describe, expect, it } from 'vitest'

import { checkinStats, DEFAULT_CHECKINS, monthGrid, toggleDay } from '@/lib/checkin'

const base = { ...DEFAULT_CHECKINS, days: {} }

describe('toggleDay', () => {
  it('past and today toggle "done", future toggles "plan"', () => {
    let c = toggleDay(base, '2026-10-21', '2026-10-21')
    expect(c.days['2026-10-21']).toBe('done')
    c = toggleDay(c, '2026-10-05', '2026-10-21')
    expect(c.days['2026-10-05']).toBe('done')
    c = toggleDay(c, '2026-10-26', '2026-10-21')
    expect(c.days['2026-10-26']).toBe('plan')
    c = toggleDay(c, '2026-10-21', '2026-10-21')
    expect(c.days['2026-10-21']).toBeUndefined()
  })

  it('only Monday to Friday: weekends are ignored', () => {
    // 24/10/2026 is a Saturday, 25/10 a Sunday.
    expect(toggleDay(base, '2026-10-24', '2026-10-26')).toBe(base)
    expect(toggleDay(base, '2026-10-25', '2026-10-26')).toBe(base)
    expect(checkinStats({ ...base, days: { '2026-10-24': 'done', '2026-10-23': 'done' } }, '2026-10-26').done).toBe(1)
  })

  it('ignores days outside Oct–Dec', () => {
    expect(toggleDay(base, '2027-01-04', '2026-10-21')).toBe(base)
  })

  it('a planned day that has passed becomes a check-in when clicked', () => {
    const c = toggleDay({ ...base, days: { '2026-10-22': 'plan' } }, '2026-10-22', '2026-10-23')
    expect(c.days['2026-10-22']).toBe('done')
  })
})

describe('checkinStats', () => {
  it('counts check-ins, what is left and the weekly pace', () => {
    const days = { '2026-10-01': 'done', '2026-10-02': 'done', '2026-10-26': 'plan', '2026-10-27': 'plan' }
    const s = checkinStats({ ...base, days }, '2026-10-21')
    expect(s.done).toBe(2)
    expect(s.needed).toBe(34)
    expect(s.planned).toBe(2)
    // Weekdays 21/10–31/12/2026.
    expect(s.workdaysLeft).toBe(52)
    expect(s.perWeek).toBeCloseTo(34 / (52 / 5))
    expect(s.feasible).toBe(true)
    expect(s.onTrack).toBe(false)
  })

  it('today already checked in is not counted as still available', () => {
    const s = checkinStats({ ...base, days: { '2026-10-21': 'done' } }, '2026-10-21')
    expect(s.done).toBe(1)
    expect(s.workdaysLeft).toBe(51)
  })

  it('reached, and not feasible when too few weekdays remain', () => {
    expect(checkinStats({ ...base, goal: 1, days: { '2026-10-01': 'done' } }, '2026-10-21').reached).toBe(true)
    expect(checkinStats({ ...base, goal: 60 }, '2026-12-01').feasible).toBe(false)
  })
})

describe('monthGrid', () => {
  it('starts weeks on Monday', () => {
    const weeks = monthGrid(2026, 10) // 1/10/2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
  })
})
