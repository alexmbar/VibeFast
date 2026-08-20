'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMonto } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'

// `dataSecundaria` es opcional: si se pasa, la gráfica dibuja barras
// agrupadas por serie (ej. gasto vs. ingreso) con leyenda; si no, se
// comporta como una sola serie igual que antes.
export default function GastoMensualChart({ data, dataSecundaria, labelPrincipal = 'Gasto', labelIngreso = 'Ingreso' }) {
  const { isDark } = useAppTheme()
  const esMultiSerie = !!dataSecundaria

  const serieUno = data.map((item) => ({
    mes: item.mes,
    total: item.total / 100,
    serie: labelPrincipal,
  }))
  const chartData = esMultiSerie
    ? [
        ...serieUno,
        ...dataSecundaria.map((item) => ({
          mes: item.mes,
          total: item.total / 100,
          serie: labelIngreso,
        })),
      ]
    : serieUno

  const spec = {
    type: 'bar',
    theme: isDark ? 'dark' : 'light',
    background: 'transparent',
    data: [{ id: 'mensual', values: chartData }],
    xField: 'mes',
    yField: 'total',
    seriesField: esMultiSerie ? 'serie' : undefined,
    color: esMultiSerie ? [CHART_COLORS[0], CHART_COLORS[3]] : [CHART_COLORS[0]],
    legends: esMultiSerie ? { visible: true, orient: 'bottom' } : undefined,
    bar: { style: { cornerRadius: [6, 6, 0, 0] } },
    tooltip: {
      mark: {
        content: esMultiSerie
          ? [
              {
                key: (datum) => datum?.serie,
                value: (datum) => formatMonto(Math.round((datum?.total ?? 0) * 100)),
              },
            ]
          : [
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
        <CardTitle>{esMultiSerie ? 'Gasto e Ingreso Mensual' : 'Gasto Mensual'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <VChart spec={spec} />
        </div>
      </CardContent>
    </Card>
  )
}
