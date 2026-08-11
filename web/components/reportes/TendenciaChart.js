'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatMonto } from '@/lib/gastos/schema'

export default function TendenciaChart({ data }) {
  const chartData = data.map(item => ({
    fecha: item.fecha,
    total: item.total,
    totalPesos: item.total / 100,
  }))

  return (
    <div className="card bg-base-100 shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">Tendencia Diaria</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip
            formatter={(value) => formatMonto(Math.round(value * 100))}
            labelFormatter={(label) => `Fecha: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalPesos"
            stroke="#0ea5e9"
            name="Gasto (MXN)"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
