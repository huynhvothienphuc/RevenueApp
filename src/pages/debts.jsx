import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { MoneyInput } from '@/components/money-input'
import { MoneyTimeline } from '@/components/money-timeline'
import { RepaymentPlan } from '@/components/repayment-plan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { endOfMonth, formatDate, formatShort, formatVND } from '@/lib/format'
import { interestTimeline, paymentTimeline } from '@/lib/timelines'

// When the plan pays this debt off, and whether that meets its deadline.
function PlannedPayoff({ debt }) {
  if (!debt) return <span className="text-muted-foreground">—</span>
  const instalments = debt.instalments > 1 ? `${debt.instalments} đợt` : '1 đợt'
  if (debt.late) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <Badge variant="destructive">{debt.paidOff ? `Trễ: ${formatDate(debt.paidOff)}` : 'Chưa trả xong'}</Badge>
        <span className="text-xs text-muted-foreground tabular-nums">
          Trước hạn: {formatShort(debt.paidByDue)} / {formatShort(debt.amount)} · {instalments}
        </span>
      </div>
    )
  }
  if (!debt.paidOff) return <span className="text-muted-foreground">Chưa xong trong lộ trình</span>
  return (
    <span className="tabular-nums">
      {formatDate(debt.paidOff)}
      <span className="ml-1 text-xs text-muted-foreground">({instalments})</span>
    </span>
  )
}

const emptyDraft = { name: '', amount: null, dueDate: '' }


export function DebtsPage({ data, roadmap, plan, actions }) {
  const [draft, setDraft] = useState(emptyDraft)
  const total = data.debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0)
  const paymentPoints = paymentTimeline(data, plan)
  // Interest alone (debts ignored), same as the overview: the big picture.
  const interestPoints = interestTimeline(data, roadmap)
  const planById = new Map(plan.debts.map((d) => [d.id, d]))

  function addDebt(event) {
    event.preventDefault()
    if (!draft.name.trim()) return
    actions.addDebt({ name: draft.name.trim(), amount: draft.amount ?? 0, dueDate: endOfMonth(draft.dueDate) })
    setDraft(emptyDraft)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lãi</CardTitle>
          <CardDescription>Gốc + lãi ở mỗi mốc, chưa trừ nợ</CardDescription>
        </CardHeader>
        <CardContent>
          <MoneyTimeline points={interestPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nợ</CardTitle>
          <CardDescription>Ngân sách (phần vượt 300tr) ở mỗi mốc và số trừ cho từng người (✓ = trả xong)</CardDescription>
        </CardHeader>
        <CardContent>
          <MoneyTimeline points={paymentPoints} minColumn="5rem" />
        </CardContent>
      </Card>

      <RepaymentPlan plan={plan} />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nợ</CardTitle>
          <CardDescription>
            Thứ tự trong bảng là thứ tự ưu tiên trả (trên cùng trả trước), đổi bằng nút ↑↓. Sửa trực tiếp trong bảng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addDebt}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Ưu tiên</TableHead>
                  <TableHead className="min-w-40">Người</TableHead>
                  <TableHead className="min-w-40">Số tiền nợ</TableHead>
                  <TableHead className="min-w-40">Hạn trả (cuối tháng)</TableHead>
                  <TableHead>Dự kiến trả</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.debts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      Chưa có khoản nợ nào.
                    </TableCell>
                  </TableRow>
                )}
                {data.debts.map((debt, i) => (
                  <TableRow key={debt.id} className="align-top">
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <span className="w-4 text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Ưu tiên ${debt.name} lên trên`}
                          disabled={i === 0}
                          onClick={() => actions.moveDebt(debt.id, -1)}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Đưa ${debt.name} xuống dưới`}
                          disabled={i === data.debts.length - 1}
                          onClick={() => actions.moveDebt(debt.id, 1)}
                        >
                          <ChevronDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        aria-label="Người"
                        value={debt.name}
                        onChange={(e) => actions.updateDebt(debt.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <MoneyInput
                        className="h-8 tabular-nums"
                        aria-label="Số tiền nợ"
                        value={debt.amount}
                        onChange={(v) => actions.updateDebt(debt.id, { amount: v ?? 0 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="month"
                        className="h-8"
                        aria-label="Hạn trả (cuối tháng)"
                        value={debt.dueDate ? debt.dueDate.slice(0, 7) : ''}
                        onChange={(e) => actions.updateDebt(debt.id, { dueDate: endOfMonth(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <PlannedPayoff debt={planById.get(debt.id)} />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xoá khoản nợ ${debt.name}`}
                        onClick={() => actions.removeDebt(debt.id)}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* New debt row: added at the bottom (lowest priority) */}
                <TableRow className="hover:bg-transparent">
                  <TableCell />
                  <TableCell>
                    <Input
                      className="h-8"
                      placeholder="Tên người"
                      aria-label="Người (khoản mới)"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <MoneyInput
                      className="h-8 tabular-nums"
                      placeholder="0 ₫"
                      aria-label="Số tiền nợ (khoản mới)"
                      value={draft.amount}
                      onChange={(v) => setDraft({ ...draft, amount: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="month"
                      className="h-8"
                      aria-label="Hạn trả (khoản mới, cuối tháng)"
                      value={draft.dueDate}
                      onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                    />
                  </TableCell>
                  <TableCell />
                  <TableCell>
                    <Button type="submit" size="icon-sm" aria-label="Thêm khoản nợ" disabled={!draft.name.trim()}>
                      <Plus />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
              {data.debts.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell />
                    <TableCell>Tổng</TableCell>
                    <TableCell className="tabular-nums">{formatVND(total)}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
