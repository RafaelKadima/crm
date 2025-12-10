import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetricData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface MetricsChartProps {
  data: MetricData[];
  height?: number;
}

export default function MetricsChart({ data, height = 300 }: MetricsChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        Sem dados para exibir
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'currentColor' }}
        />
        <YAxis 
          yAxisId="left"
          className="text-xs"
          tick={{ fill: 'currentColor' }}
          tickFormatter={formatCurrency}
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          className="text-xs"
          tick={{ fill: 'currentColor' }}
          tickFormatter={formatNumber}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg, #fff)',
            borderColor: 'var(--tooltip-border, #e5e7eb)',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'Gasto') return formatCurrency(value);
            return formatNumber(value);
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="spend"
          name="Gasto"
          stroke="#3B82F6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="clicks"
          name="Cliques"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="conversions"
          name="Conversões"
          stroke="#8B5CF6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

