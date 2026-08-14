'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMonto } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'

export default function TendenciaChart({ data }) {
  const { isDark } = useAppTheme()
  const chartData = data.map((item) => ({
    fecha: item.fecha,
    total: item.total / 100,
  }))

  const spec = {
    type: 'line',
    data: [{ id: 'tendencia', values: chartData }],
    xField: 'fecha',
    yField: 'total',
    color: [CHART_COLORS[0]],
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
    tooltip: {
      mark: {
        content: [
          {
            key: (datum) => `Fecha: ${datum?.fecha}`,
            value: (datum) => formatMonto(Math.round((datum?.total ?? 0) * 100)),
          },
        ],
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia Diaria</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <VChart spec={spec} theme={isDark ? 'dark' : 'light'} />
        </div>
      </CardContent>
    </Card>
  )
}
