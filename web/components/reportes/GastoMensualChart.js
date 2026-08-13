'use client'

import { VChart } from '@visactor/react-vchart'
import { formatMonto } from '@/lib/gastos/schema'

export default function GastoMensualChart({ data }) {
  const chartData = data.map((item) => ({
    mes: item.mes,
    total: item.total / 100,
  }))

  const spec = {
    type: 'bar',
    data: [{ id: 'mensual', values: chartData }],
    xField: 'mes',
    yField: 'total',
    color: ['#0ea5e9'],
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
    <div className="card bg-base-100 shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">Gasto Mensual</h3>
      <div style={{ height: 300 }}>
        <VChart spec={spec} />
      </div>
    </div>
  )
}
