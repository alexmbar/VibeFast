'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatMonto } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'

// `dataSecundaria` es opcional: si se pasa, la gráfica dibuja dos líneas
// (ej. gasto vs. ingreso) con leyenda; si no, se comporta como una sola
// serie igual que antes (usado tal cual en /reportes, que solo tiene gasto).
export default function TendenciaChart({ data, dataSecundaria, labelPrincipal = 'Gasto', labelIngreso = 'Ingreso' }) {
  const { isDark } = useAppTheme()
  const esMultiSerie = !!dataSecundaria

  const serieUno = data.map((item) => ({
    fecha: item.fecha,
    total: item.total / 100,
    serie: labelPrincipal,
  }))
  const chartData = esMultiSerie
    ? [
        ...serieUno,
        ...dataSecundaria.map((item) => ({
          fecha: item.fecha,
          total: item.total / 100,
          serie: labelIngreso,
        })),
      ]
    : serieUno

  const spec = {
    type: 'line',
    theme: isDark ? 'dark' : 'light',
    background: 'transparent',
    data: [{ id: 'tendencia', values: chartData }],
    xField: 'fecha',
    yField: 'total',
    seriesField: 'serie',
    color: esMultiSerie ? [CHART_COLORS[0], CHART_COLORS[3]] : [CHART_COLORS[0]],
    legends: esMultiSerie ? { visible: true, orient: 'bottom' } : undefined,
    point: { visible: false },
    line: { style: { curveType: 'monotone' } },
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
          <VChart spec={spec} />
        </div>
      </CardContent>
    </Card>
  )
}
