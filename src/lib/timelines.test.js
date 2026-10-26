import { describe, expect, it } from 'vitest'

import { calculateRoadmap, syncDisabled } from '@/lib/interest'
import { holdingTimeline } from '@/lib/timelines'

const tr = 1_000_000
const dates = ['2026-10-27', '2026-11-27', '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27', '2027-04-27', '2027-05-27']
const roadmapOn = (today, withdrawals = {}) =>
  calculateRoadmap({
    principal: 253 * tr,
    interestRate: 0.1,
    interestCap: 30 * tr,
    periods: syncDisabled(
      dates.map((payoutDate) => ({
        payoutDate,
        deposit: 0,
        withdrawals: (withdrawals[payoutDate] ?? []).map((amount, i) => ({ id: `w${i}`, amount })),
        disabled: false,
      })),
      today,
    ),
  })

describe('holdingTimeline', () => {
  it('shows the money held from each payout date: 27/10 pays 278,3tr, held until 27/11', () => {
    const points = holdingTimeline(roadmapOn('2026-10-21'))
    expect(points.map((p) => `${p.label} ${p.value}`)).toEqual([
      '27/9 253tr',
      '27/10 278,3tr',
      '27/11 306,1tr',
      '27/12 336,1tr',
      '27/1 366,1tr',
      '27/2 396,1tr',
      '27/3 426,1tr',
      '27/4 456,1tr',
      '27/5 486,1tr',
    ])
    expect(points[0].note).toBe('Hiện tại')
    expect(points[2].note).toBe('Đạt 300tr')
    // Only 27/1 starts a new year.
    expect(points.map((p) => p.yearBreak).filter(Boolean)).toEqual(['2027'])
    expect(points[4].yearBreak).toBe('2027')
  })

  it('a withdrawal after 27/10 shows the payout, what was taken out and what is left', () => {
    const points = holdingTimeline(roadmapOn('2026-10-27', { '2026-11-27': [3.7 * tr, 8.6 * tr] }))
    expect(`${points[1].label} ${points[1].value}`).toBe('27/10 266tr')
    expect(points[1].lines).toEqual(['Lãi: 278,3tr', 'Đã rút: 12,3tr', 'Còn: 266tr'])
    expect(points[0].lines).toEqual([])
  })

  it('moves "now" to 27/10 once that payout has passed (1/11: 278,3tr)', () => {
    const points = holdingTimeline(roadmapOn('2026-11-01'))
    const current = points.find((p) => p.status === 'current')
    expect(`${current.label} ${current.value}`).toBe('27/10 278,3tr')
  })

  it('after the last payout, the month after it is "now"', () => {
    const points = holdingTimeline(roadmapOn('2027-06-01'))
    expect(points.filter((p) => p.status === 'current').map((p) => p.label)).toEqual(['27/5'])
  })
})
