import { CalendarDays } from 'lucide-react'

import { MoneyTimeline } from '@/components/money-timeline'
import { Card, CardContent } from '@/components/ui/card'
import { formatDayPadded } from '@/lib/format'
import { interestTimeline } from '@/lib/timelines'
import { useToday } from '@/lib/today'

// "/": a bare page with only today's date and the interest timeline (no sidebar, no header).
export function LandingPage({ data, roadmap }) {
  const today = useToday()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-xs">
        <CalendarDays className="size-4 text-sky-600 dark:text-sky-400" />
        <span className="text-muted-foreground">Hôm nay</span>
        <time dateTime={today} className="font-semibold tabular-nums">
          {formatDayPadded(today)}
        </time>
      </div>
      <Card className="w-full max-w-5xl">
        <CardContent>
          <MoneyTimeline points={interestTimeline(data, roadmap)} accentCurrent stackOnMobile />
        </CardContent>
      </Card>
    </main>
  )
}
