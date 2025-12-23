import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp } from "lucide-react";
import { CompoundInterestCalculator } from "@/components/calculations/CompoundInterestCalculator";
import { MonteCarloSimulation } from "@/components/calculations/MonteCarloSimulation";

const CalculationsPage = () => {
    return (
        <div className="space-y-6 animate-fade-in p-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Financial Calculations
                </h1>
                <p className="text-muted-foreground mt-2">
                    Professional tools for your financial planning and analysis.
                </p>
            </div>

            <Tabs defaultValue="compound" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="compound" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Compound Interest
                    </TabsTrigger>
                    <TabsTrigger value="montecarlo" className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Monte Carlo
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="compound" className="mt-6">
                    <CompoundInterestCalculator />
                </TabsContent>

                <TabsContent value="montecarlo" className="mt-6">
                    <MonteCarloSimulation />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default CalculationsPage;
