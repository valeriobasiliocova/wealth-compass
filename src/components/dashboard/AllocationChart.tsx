import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpTooltip } from '@/components/ui/tooltip-helper';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Investment } from '@/types/finance';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface AllocationChartProps {
  investments: Investment[];
  groupBy: 'geography' | 'sector' | 'type';
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AllocationChart({ investments, groupBy }: AllocationChartProps) {
  const { currency, exchangeRate, isPrivacyMode } = useSettings();

  const grouped = investments.reduce((acc, inv) => {
    const key = inv[groupBy];
    acc[key] = (acc[key] || 0) + inv.currentValue;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(grouped).map(([name, value]) => ({ name, value }));

  const formatCurrency = (value: number) => {
    const converted = value * (currency === 'USD' ? 1 : exchangeRate);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact'
    }).format(converted);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold capitalize flex items-center gap-2">
          Allocation by {groupBy}
          <HelpTooltip content="How your money is divided among different categories (Stocks, Crypto, Cash) to manage risk." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No investments yet
          </div>
        ) : (
          <div className={cn(isPrivacyMode && "privacy-blur")}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
                <Legend
                  formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
