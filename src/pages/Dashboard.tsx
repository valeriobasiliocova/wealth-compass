import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, Bitcoin, Camera, RefreshCw, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinance } from '@/contexts/FinanceContext';
import { StatCard } from '@/components/dashboard/StatCard';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { InvestmentTable } from '@/components/dashboard/InvestmentTable';
import { CryptoTable } from '@/components/dashboard/CryptoTable';
import { LiabilitiesTable } from '@/components/dashboard/LiabilitiesTable';
import { LiquidityCards } from '@/components/dashboard/LiquidityCards';
import { IncomeExpenseModule } from '@/components/dashboard/IncomeExpenseModule';
import { getCryptoPrice, getStockPrice } from '@/lib/api';
import { toast } from 'sonner';
import type { TimeRange } from '@/types/finance';
import { useSettings } from '@/contexts/SettingsContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { convertCurrency } = useSettings();
  const finance = useFinance();
  const totals = finance.calculateTotals();
  const chartData = finance.getSnapshotsByRange(timeRange);
  const cashFlow = finance.getMonthlyCashFlow(new Date());

  if (!finance.isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    let updatedCount = 0;

    try {
      // 1. Update Crypto
      const cryptoPromises = finance.data.crypto.map(async (h) => {
        const price = await getCryptoPrice(h.symbol);
        if (price !== null) {
          finance.updateCrypto(h.id, {
            currentPrice: price,
            updatedAt: new Date().toISOString()
          });
          return true;
        }
        return false;
      });

      // 2. Update Stocks/ETFs
      const stockPromises = finance.data.investments
        .filter(inv => inv.type === 'stock' || inv.type === 'etf')
        .map(async (inv) => {
          const price = await getStockPrice(inv.symbol);
          if (price !== null) {
            finance.updateInvestment(inv.id, {
              currentValue: price * inv.quantity,
              updatedAt: new Date().toISOString()
            });
            return true;
          }
          return false;
        });

      const results = await Promise.all([...cryptoPromises, ...stockPromises]);
      updatedCount = results.filter(Boolean).length;

      setLastUpdated(new Date());
      if (updatedCount > 0) {
        toast.success(`Refreshed prices for ${updatedCount} assets`);
      } else {
        toast.info('No prices needed updating or all failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Global refresh partially failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Personal Finance</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <p>Track your wealth journey</p>
              {lastUpdated && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              onClick={handleGlobalRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Prices
            </Button>
            <Button onClick={() => finance.takeSnapshot(convertCurrency)} className="gradient-primary">
              <Camera className="h-4 w-4 mr-2" /> Take Snapshot
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Net Worth"
            value={totals.netWorth}
            icon={TrendingUp}
            helpText="Your total financial value. Calculated as: (All Assets + Cash + Crypto) - (All Debts/Liabilities)."
          />
          <StatCard
            title="Liquidity"
            value={totals.totalLiquidity}
            icon={Wallet}
            helpText="Cash or investments that can be quickly converted to cash (e.g., Bank Accounts, Savings)."
          />
          <StatCard
            title="Investments"
            value={totals.totalInvestments}
            icon={TrendingUp}
            helpText="The current total market value of your Stocks, ETFs, and other investment vehicles."
          />
          <StatCard
            title="Crypto"
            value={totals.totalCrypto}
            icon={Bitcoin}
            helpText="The current total market value of your Cryptocurrency holdings."
          />
        </div>

        {/* Net Worth Chart */}
        <NetWorthChart data={chartData} currentRange={timeRange} onRangeChange={setTimeRange} />

        {/* Income & Expenses */}
        <IncomeExpenseModule
          income={finance.data.income}
          expenses={finance.data.expenses}
          monthlyIncome={cashFlow.monthlyIncome}
          monthlyExpenses={cashFlow.monthlyExpenses}
          savingsRate={cashFlow.savingsRate}
          onAddIncome={finance.addIncome}
          onDeleteIncome={finance.deleteIncome}
          onAddExpense={finance.addExpense}
          onDeleteExpense={finance.deleteExpense}
        />

        {/* Liquidity */}
        <LiquidityCards
          accounts={finance.data.liquidity}
          onAdd={finance.addLiquidity}
          onUpdate={finance.updateLiquidity}
          onDelete={finance.deleteLiquidity}
        />

        {/* Investment Portfolio */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InvestmentTable
              investments={finance.data.investments}
              onAdd={finance.addInvestment}
              onUpdate={finance.updateInvestment}
              onDelete={finance.deleteInvestment}
            />
          </div>
          <AllocationChart investments={finance.data.investments} groupBy="sector" />
        </div>

        {/* Crypto Holdings */}
        <CryptoTable
          holdings={finance.data.crypto}
          onAdd={finance.addCrypto}
          onUpdate={finance.updateCrypto}
          onDelete={finance.deleteCrypto}
        />

        {/* Liabilities */}
        <LiabilitiesTable
          liabilities={finance.data.liabilities}
          onAdd={finance.addLiability}
          onUpdate={finance.updateLiability}
          onDelete={finance.deleteLiability}
        />
      </div>
    </div>
  );
};

export default Dashboard;
