import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { InvestmentTable } from '@/components/dashboard/InvestmentTable';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, PieChart } from 'lucide-react';

export default function InvestmentsPage() {
    const finance = useFinance();

    return (
        <div className="min-h-screen bg-background dark p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gradient">Investments</h1>
                <p className="text-muted-foreground">Manage your stock and ETF portfolio</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <InvestmentTable
                        investments={finance.data.investments}
                        onAdd={finance.addInvestment}
                        onUpdate={finance.updateInvestment}
                        onDelete={finance.deleteInvestment}
                    />
                </div>

                {/* Sidebar / Stats */}
                <div className="space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChart className="h-4 w-4" /> Allocation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AllocationChart investments={finance.data.investments} groupBy="sector" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
