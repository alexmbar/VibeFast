'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CATEGORIA_LABELS } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'
import { useUserConfig } from '@/lib/config/UserConfigContext'

export default function CategoriaChart({ data }) {
  const { isDark } = useAppTheme()
  const { formatMonto } = useUserConfig()
  const totalCentavos = data.reduce((sum, item) => sum + item.total, 0)

  const chartData = data.map((item) => ({
    categoria: CATEGORIA_LABELS[item.categoria] || item.categoria,
    total: item.total / 100,
  }))

  const spec = {
    type: 'pie',
    theme: isDark ? 'dark' : 'light',
    background: 'transparent',
    data: [{ id: 'categorias', values: chartData }],
    valueField: 'total',
    categoryField: 'categoria',
    outerRadius: 0.9,
    innerRadius: 0.75,
    color: CHART_COLORS,
    legends: { visible: true, orient: 'bottom' },
    pie: { style: { cornerRadius: 4 } },
    tooltip: {
      mark: {
        content: [
          {
            key: (datum) => datum?.categoria,
            value: (datum) => formatMonto(Math.round((datum?.total ?? 0) * 100)),
          },
        ],
      },
    },
    indicator: [
      {
        visible: true,
        offsetY: -8,
        title: {
          style: { text: 'Total', fontSize: 12, opacity: 0.6 },
        },
      },
      {
        visible: true,
        offsetY: 14,
        title: {
          style: { text: formatMonto(totalCentavos), fontSize: 18, fontWeight: 'bold' },
        },
      },
    ],
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Categorías</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <VChart spec={spec} />
        </div>
      </CardContent>
    </Card>
  )
}
