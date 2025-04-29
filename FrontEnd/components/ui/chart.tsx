import type React from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface AreaChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export const AreaChart: React.FC<AreaChartProps> = ({ data, index, categories, colors, valueFormatter, className }) => {
  return (
    <ComposedChart width={400} height={200} data={data} className={className}>
      <CartesianGrid stroke="#f5f5f5" />
      <XAxis dataKey={index} />
      <YAxis tickFormatter={valueFormatter} />
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
      {categories.map((category, i) => (
        <Area
          key={category}
          type="monotone"
          dataKey={category}
          fill={colors[i % colors.length]}
          stroke={colors[i % colors.length]}
        />
      ))}
    </ComposedChart>
  )
}

interface BarChartProps {
  data: any[]
  index: string
  categories: string[]
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export const BarChart: React.FC<BarChartProps> = ({ data, index, categories, colors, valueFormatter, className }) => {
  return (
    <ComposedChart width={400} height={200} data={data} className={className}>
      <CartesianGrid stroke="#f5f5f5" />
      <XAxis dataKey={index} />
      <YAxis tickFormatter={valueFormatter} />
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
      {categories.map((category, i) => (
        <Bar key={category} dataKey={category} fill={colors[i % colors.length]} />
      ))}
    </ComposedChart>
  )
}

interface PieChartProps {
  data: any[]
  index: string
  category: string
  colors: string[]
  valueFormatter?: (value: any) => string
  className?: string
}

export const PieChart: React.FC<PieChartProps> = ({ data, index, category, colors, valueFormatter, className }) => {
  return (
    <RechartsPieChart width={400} height={200} className={className}>
      <Pie data={data} dataKey={category} nameKey={index} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
        {data.map((entry, i) => (
          <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
        ))}
      </Pie>
      <Tooltip formatter={valueFormatter ? (value) => [valueFormatter(value)] : undefined} />
      <Legend />
    </RechartsPieChart>
  )
}

import { Cell } from "recharts"
