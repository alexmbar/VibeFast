'use client'

import { VChart } from '@visactor/react-vchart'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMonto } from '@/lib/gastos/schema'
import { CHART_COLORS } from '@/lib/theme/chartColors'
import { useAppTheme } from '@/components/layout/AppTheme'

const SUFIJO_PROYECTADO = ' (proyectado)'

// `dataSecundaria` es opcional: si se pasa, la gráfica dibuja dos líneas
// (ej. gasto vs. ingreso) con leyenda; si no, se comporta como una sola
// serie igual que antes.
//
// `dataFutura`/`dataFuturaSecundaria` son opcionales: proyección de días
// futuros (a partir de recurrencias activas, no de gastos/ingresos reales
// -- el cron de recurrencias nunca genera filas por adelantado, ver
// web/app/api/cron/generar-recurrencias/route.js). Se dibujan como línea
// punteada, en serie aparte, para no confundirse con lo ya capturado.
//
// `rango`/`opcionesRango`/`onRangoChange` son opcionales: si se pasan los
// tres, la tarjeta muestra un selector de ventana (ej. 7/30 días) en el
// header. Quien controla la fecha `desde` de `data`/`dataSecundaria` es el
// caller (ver web/app/(app)/dashboard/page.js), este componente solo pinta.
export default function TendenciaChart({
  data,
  dataSecundaria,
  dataFutura,
  dataFuturaSecundaria,
  labelPrincipal = 'Gasto',
  labelIngreso = 'Ingreso',
  rango,
  opcionesRango,
  onRangoChange,
}) {
  const { isDark } = useAppTheme()
  const esMultiSerie = !!dataSecundaria

  // Cada definición se filtra si no trae datos, para que el índice de
  // `colores` (posicional, mismo orden en que VChart encuentra cada valor
  // de `serie` por primera vez en `chartData`) nunca se desalinee sin
  // importar qué combinación de series venga vacía.
  const definicionesSerie = [
    { label: labelPrincipal, items: data, color: CHART_COLORS[0] },
    esMultiSerie && { label: labelIngreso, items: dataSecundaria, color: CHART_COLORS[3] },
    { label: `${labelPrincipal}${SUFIJO_PROYECTADO}`, items: dataFutura, color: CHART_COLORS[0] },
    esMultiSerie && { label: `${labelIngreso}${SUFIJO_PROYECTADO}`, items: dataFuturaSecundaria, color: CHART_COLORS[3] },
  ].filter((serie) => serie && serie.items?.length)

  const chartData = definicionesSerie.flatMap((serie) =>
    serie.items.map((item) => ({
      fecha: item.fecha,
      total: item.total / 100,
      serie: serie.label,
    }))
  )
  const colores = definicionesSerie.map((serie) => serie.color)
  const mostrarLeyenda = definicionesSerie.length > 1

  const spec = {
    type: 'line',
    theme: isDark ? 'dark' : 'light',
    background: 'transparent',
    data: [{ id: 'tendencia', values: chartData }],
    xField: 'fecha',
    yField: 'total',
    seriesField: 'serie',
    color: colores,
    legends: mostrarLeyenda ? { visible: true, orient: 'bottom' } : undefined,
    point: { visible: true, style: { size: 4 } },
    line: {
      style: {
        curveType: 'monotone',
        lineDash: (datum) => (datum?.serie?.endsWith(SUFIJO_PROYECTADO) ? [6, 4] : []),
      },
    },
    tooltip: {
      mark: {
        content: mostrarLeyenda
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
        {opcionesRango && onRangoChange && (
          <CardAction className="flex gap-1">
            {opcionesRango.map((opcion) => (
              <Button
                key={opcion.dias}
                type="button"
                size="xs"
                variant={rango === opcion.dias ? 'secondary' : 'ghost'}
                onClick={() => onRangoChange(opcion.dias)}
              >
                {opcion.label}
              </Button>
            ))}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <VChart spec={spec} />
        </div>
      </CardContent>
    </Card>
  )
}
