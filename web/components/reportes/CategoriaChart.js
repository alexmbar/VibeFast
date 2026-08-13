'use client'

import { VChart } from '@visactor/react-vchart'
import { CATEGORIA_LABELS, formatMonto } from '@/lib/gastos/schema'

const COLORS = [
  '#0ea5e9', // sky-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
]

export default function CategoriaChart({ data }) {
  const chartData = data.map((item) => ({
    categoria: CATEGORIA_LABELS[item.categoria] || item.categoria,
    total: item.total / 100,
  }))

  const spec = {
    type: 'pie',
    data: [{ id: 'categorias', values: chartData }],
    valueField: 'total',
    categoryField: 'categoria',
    outerRadius: 0.8,
    innerRadius: 0.6,
    color: COLORS,
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
  }

  return (
    <div className="card bg-base-100 shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">Top 5 Categorías</h3>
      <div style={{ height: 300 }}>
        <VChart spec={spec} />
      </div>
    </div>
  )
}
