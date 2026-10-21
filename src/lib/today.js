import { useEffect, useState } from 'react'

import { todayKey } from '@/lib/format'

// Today's date ("YYYY-MM-DD"), kept live: updates at midnight and when the tab comes back into view.
export function useToday() {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const update = () => setToday(todayKey())
    let timer
    const scheduleMidnight = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        update()
        scheduleMidnight()
      }, next - now)
    }
    scheduleMidnight()
    const onVisible = () => document.visibilityState === 'visible' && update()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', update)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', update)
    }
  }, [])
  return today
}
