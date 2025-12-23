import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { FinanceProvider } from "./contexts/FinanceContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import LoginPage from "./pages/Login";
import MainLayout from "./components/layout/MainLayout";
import CashFlowPage from "./pages/CashFlow";
import InvestmentsPage from "./pages/Investments";
import CryptoPage from "./pages/Crypto";
import CalculationsPage from "./pages/Calculations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SettingsProvider>
          <FinanceProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cash-flow" element={<CashFlowPage />} />
                  <Route path="/investments" element={<InvestmentsPage />} />
                  <Route path="/crypto" element={<CryptoPage />} />
                  <Route path="/calculations" element={<CalculationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </FinanceProvider>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
