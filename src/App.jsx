import { useEffect, useMemo } from 'react'

import { AppLayout } from '@/components/app-layout'
import { calculateRoadmap } from '@/lib/interest'
import { HOME, pages } from '@/lib/pages'
import { planRepayment } from '@/lib/repayment'
import { navigate, usePath } from '@/lib/router'
import { useAppData } from '@/lib/store'
import { CheckinPage } from '@/pages/checkin'
import { DebtsPage } from '@/pages/debts'
import { LandingPage } from '@/pages/landing'
import { OverviewPage } from '@/pages/overview'

function App() {
  // Trailing slash tolerated: "/debts/" is "/debts".
  const path = usePath().replace(/(.)\/+$/, '$1')
  const route = pages.find((p) => p.path === path)
  const page = route?.id ?? 'landing'

  // Unknown URL: go home.
  useEffect(() => {
    if (!route) navigate(HOME, { replace: true })
  }, [route])

  const [data, actions] = useAppData()
  const roadmap = useMemo(() => calculateRoadmap(data), [data])
  const plan = useMemo(() => planRepayment(data), [data])

  if (page === 'checkin') {
    return <CheckinPage checkins={data.checkins} onToggle={actions.toggleCheckin} onSaveGoal={actions.setCheckinGoal} />
  }
  if (route?.bare) return <LandingPage roadmap={roadmap} />

  return (
    <AppLayout
      activePage={page}
      onNavigate={(id) => navigate(pages.find((p) => p.id === id)?.path ?? HOME)}
      onExport={actions.exportJson}
      onImport={actions.importJson}
      onReset={() => {
        if (window.confirm('Khôi phục dữ liệu gốc? Mọi chỉnh sửa sẽ bị xoá.')) actions.reset()
      }}
    >
      {page === 'debts' ? (
        <DebtsPage data={data} roadmap={roadmap} plan={plan} actions={actions} />
      ) : (
        <OverviewPage data={data} roadmap={roadmap} actions={actions} />
      )}
    </AppLayout>
  )
}

export default App
