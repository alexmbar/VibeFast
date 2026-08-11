'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatMonto } from '@/lib/gastos/schema'

export default function GastoMensualChart({ data }) {
  const chartData = data.map(item => ({
    mes: item.mes,
    total: item.total,
    totalPesos: item.total / 100,
  }))

  return (
    <div className="card bg-base-100 shadow-md p-6">
      <h3 className="font-bold text-lg mb-4">Gasto Mensual</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis />
          <Tooltip
            formatter={(value) => formatMonto(Math.round(value * 100))}
            labelFormatter={(label) => `Mes: ${label}`}
          />
          <Legend />
          <Bar dataKey="totalPesos" fill="#0ea5e9" name="Gasto (MXN)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
