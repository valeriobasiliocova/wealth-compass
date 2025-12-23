import { useMemo } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { PieChart as PieChartIcon, BarChart3 as BarChartIcon } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const COIN_COLORS: Record<string, string> = {
    BTC: '#F7931A', // Bitcoin Orange
    CRO: '#1060FF', // Cronos Blue (Brighter for dark mode visibility)
    ETH: '#627EEA', // Ethereum Blue
    SOL: '#14F195', // Solana Green
    USDT: '#26A17B', // Tether Green
    BNB: '#F3BA2F', // Binance Yellow
    ADA: '#0033AD', // Cardano Blue
    XRP: '#00AACE', // XRP Blue
    DOGE: '#C2A633', // Dogecoin Gold
    DOT: '#E6007A', // Polkadot Pink
    AVAX: '#E84142', // Avalanche Red
    MATIC: '#8247E5', // Polygon Purple
    LINK: '#2A5ADA', // Chainlink Blue
};

const getCoinColor = (symbol: string, index: number) => {
    return COIN_COLORS[symbol.toUpperCase()] || COLORS[index % COLORS.length];
};

export function CryptoAllocationChart() {
    const { data } = useFinance();
    const { formatCurrency, isPrivacyMode } = useSettings();

    const chartData = useMemo(() => {
        const totalValue = data.crypto.reduce((sum, c) => sum + (c.quantity * c.currentPrice), 0);

        return data.crypto
            .map((c) => ({
                name: c.symbol,
                value: c.quantity * c.currentPrice,
                percentage: totalValue > 0 ? ((c.quantity * c.currentPrice) / totalValue) * 100 : 0
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [data.crypto]);

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Portfolio Allocation
                </CardTitle>
            </CardHeader>
            <CardContent className={cn("h-[300px]", isPrivacyMode && "blur-sm select-none pointer-events-none")}>
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No assets found
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getCoinColor(entry.name, index)} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => isPrivacyMode ? "****" : formatCurrency(value)}
                                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#FFFFFF" }}
                                itemStyle={{ color: "#FFFFFF" }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}

export function CryptoPerformanceChart() {
    const { data } = useFinance();
    const { formatCurrency, isPrivacyMode, currencySymbol } = useSettings();

    const chartData = useMemo(() => {
        return data.crypto
            .map((c) => {
                const invested = c.quantity * c.avgBuyPrice;
                const current = c.quantity * c.currentPrice;
                const netProfit = current - invested;

                return {
                    name: c.symbol,
                    invested,
                    current,
                    netProfit,
                };
            })
            .filter(item => item.current > 0 || item.invested > 0)
            .sort((a, b) => b.netProfit - a.netProfit); // Sort by highest profit
    }, [data.crypto]);

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5 text-success" />
                    Net Profit / Loss
                </CardTitle>
            </CardHeader>
            <CardContent className={cn("h-[300px]", isPrivacyMode && "blur-sm select-none pointer-events-none")}>
                {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No assets found
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={0}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <ReferenceLine y={0} stroke="#4b5563" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                hide={isPrivacyMode}
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${currencySymbol}${Math.abs(val) >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                formatter={(value: number, name: string) => {
                                    if (isPrivacyMode) return "****";
                                    if (name === 'Net P/L') {
                                        return [
                                            <span className={value >= 0 ? "text-success" : "text-destructive"}>
                                                {value >= 0 ? '+' : ''}{formatCurrency(value)}
                                            </span>,
                                            "Net P/L"
                                        ];
                                    }
                                    return formatCurrency(value);
                                }}
                            />
                            {/* Single Bar with Conditional Formatting */}
                            <Bar dataKey="netProfit" name="Net P/L" radius={[4, 4, 4, 4]} maxBarSize={50}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
