'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { CATEGORIA_LABELS, centavosToPesos } from '@/lib/gastos/schema'

const COLORS = [
  '#0ea5e9', // sky-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
]

export default function CategoriaChart({ data }) {
  const chartData = data.map((item, idx) => ({
    name: CATEGORIA_LABELS[item.categoria] || item.categoria,
    value: item.total,
    valuePesos: centavosToPesos(item.total),
    index: idx,
  }))

  return (
    <div className="card bg-base-100 shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">Top 5 Categorías</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, valuePesos }) => `${name}: $${valuePesos}`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${centavosToPesos(value)}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
