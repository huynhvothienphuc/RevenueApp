import { describe, expect, it } from 'vitest'

import { calculateRoadmap, syncDisabled } from '@/lib/interest'
import { holdingTimeline } from '@/lib/timelines'

const tr = 1_000_000
const dates = ['2026-10-27', '2026-11-27', '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27', '2027-04-27', '2027-05-27']
const roadmapOn = (today) =>
  calculateRoadmap({
    principal: 253 * tr,
    interestRate: 0.1,
    interestCap: 30 * tr,
    periods: syncDisabled(dates.map((payoutDate) => ({ payoutDate, deposit: 0, disabled: false })), today),
  })

describe('holdingTimeline', () => {
  it('shows the money held each month: interest from the 27th counts from the next month', () => {
    const points = holdingTimeline(roadmapOn('2026-10-21'))
    expect(points.map((p) => `${p.label} ${p.value}`)).toEqual([
      '10/2026 253tr',
      '11/2026 278,3tr',
      '12/2026 306,1tr',
      '1/2027 336,1tr',
      '2/2027 366,1tr',
      '3/2027 396,1tr',
      '4/2027 426,1tr',
      '5/2027 456,1tr',
      '6/2027 486,1tr',
    ])
    expect(points[0].note).toBe('Hiện tại')
    expect(points[2].note).toBe('Đạt 300tr')
  })

  it('moves "now" to November once 27/10 has passed (1/11: 278,3tr)', () => {
    const points = holdingTimeline(roadmapOn('2026-11-01'))
    const current = points.find((p) => p.status === 'current')
    expect(`${current.label} ${current.value}`).toBe('11/2026 278,3tr')
  })

  it('after the last payout, the month after it is "now"', () => {
    const points = holdingTimeline(roadmapOn('2027-06-01'))
    expect(points.filter((p) => p.status === 'current').map((p) => p.label)).toEqual(['6/2027'])
  })
})
