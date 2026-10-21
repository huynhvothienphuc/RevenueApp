import { Check } from 'lucide-react'
import { Fragment } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatMillion, formatVND } from '@/lib/format'
import { cn } from '@/lib/utils'

// Month by month: what to withdraw after each payout and who receives it.
export function RepaymentPlan({ plan }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kế hoạch trả nợ</CardTitle>
        <CardDescription>Đơn vị: triệu đồng · cam = đang trả góp · xanh ✓ = trả xong</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Trả hết nợ</div>
            <div className="text-xl font-semibold tabular-nums">
              {plan.paidOffDate ? formatDate(plan.paidOffDate) : `Còn ${formatVND(plan.remainingDebt)}`}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
              Còn lại {plan.rows.length > 0 && `(${formatDate(plan.rows[plan.rows.length - 1].payoutDate)})`}
            </div>
            <div className="text-xl font-semibold tabular-nums">{formatVND(plan.finalBalance)}</div>
          </div>
        </div>



        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mốc</TableHead>
              <TableHead className="text-right">Ngân sách</TableHead>
              {plan.debts.map((debt) => (
                <TableHead key={debt.id} className="text-right">
                  {debt.name} ({formatMillion(debt.amount)})
                </TableHead>
              ))}
              <TableHead className="text-right">Còn lại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.rows.map((row, i) => {
              const firstExtended = row.extended && !plan.rows[i - 1]?.extended
              return (
                <Fragment key={row.payoutDate}>
                  {firstExtended && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={plan.debts.length + 3} className="pt-4 text-xs font-medium text-muted-foreground">
                        Kéo dài sau lộ trình để trả hết nợ
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className={cn(row.status === 'current' && 'bg-muted/50', row.extended && 'text-muted-foreground')}>
                    <TableCell className="font-medium">
                      {formatDate(row.payoutDate)}
                      {row.extended && <span className="ml-1.5 text-xs font-normal">kéo dài</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.budget === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          {formatMillion(row.budget)}
                          {row.carry > 0 && (
                            <div className="text-xs text-muted-foreground">+{formatMillion(row.carry)} dư</div>
                          )}
                        </>
                      )}
                    </TableCell>
                    {plan.debts.map((debt) => {
                      const payment = row.payments.find((p) => p.debtId === debt.id)
                      return (
                        <TableCell
                          key={debt.id}
                          className={cn(
                            'text-right tabular-nums',
                            // Instalment (in progress): orange. Debt finished (✓): green.
                            payment &&
                              !payment.done &&
                              'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
                            payment?.done && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
                          )}
                        >
                          {payment && (
                            <span className={cn('inline-flex items-center gap-1', payment.done && 'font-medium')}>
                              {formatMillion(payment.amount)}
                              {payment.done && <Check className="size-3.5" aria-label="xong" />}
                            </span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-medium tabular-nums">{formatMillion(row.closing)}</TableCell>
                  </TableRow>
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
