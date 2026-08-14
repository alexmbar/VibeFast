'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMonto } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'

export default function GastoMensualChart({ data }) {
  const { isDark } = useAppTheme()
  const chartData = data.map((item) => ({
    mes: item.mes,
    total: item.total / 100,
  }))

  const spec = {
    type: 'bar',
    theme: isDark ? 'dark' : 'light',
    background: 'transparent',
    data: [{ id: 'mensual', values: chartData }],
    xField: 'mes',
    yField: 'total',
    color: [CHART_COLORS[0]],
    bar: { style: { cornerRadius: [6, 6, 0, 0] } },
    tooltip: {
      mark: {
        content: [
          {
            key: (datum) => `Mes: ${datum?.mes}`,
            value: (datum) => formatMonto(Math.round((datum?.total ?? 0) * 100)),
          },
        ],
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gasto Mensual</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <VChart spec={spec} />
        </div>
      </CardContent>
    </Card>
  )
}
