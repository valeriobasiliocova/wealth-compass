import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import type { Investment } from '@/types/finance';
import { cn } from '@/lib/utils';
import { getStockPrice } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { HelpTooltip } from '@/components/ui/tooltip-helper';

interface InvestmentTableProps {
  investments: Investment[];
  onAdd: (investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Investment>) => void;
  onDelete: (id: string) => void;
}

export function InvestmentTable({ investments, onAdd, onUpdate, onDelete }: InvestmentTableProps) {
  const { formatCurrency, isPrivacyMode, currency: baseCurrency } = useSettings();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    type: 'stock' as const,
    sector: 'Technology',
    quantity: 0,
    avgBuyPrice: 0, // Changed from costBasis
    currency: 'USD',
    geography: 'US',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      let value = 0; // Calculated automatically
      if (form.type === 'stock' || form.type === 'etf') {
        const price = await getStockPrice(form.symbol);
        if (price) {
          value = price * form.quantity;
          if (form.currency !== 'USD') {
            toast.warning('Auto-fetched price is in USD. Please verify currency.');
          }
        } else {
          // Fallback if price fetch fails? Use cost basis?
          // User said "Current Value is a calculated result...".
          // If live price fails, arguably currentValue could assume avgBuyPrice * quantity
          // OR simply 0 asking for update. Original code used 0. Let's stick to 0 or maybe costBasis?
          // Let's use costBasis (initial investment) as a better fallback than 0.
          value = form.quantity * form.avgBuyPrice;
          toast.warning('Could not fetch live price. Using initial investment value.');
        }
      } else {
        // For other types, maybe fallback to cost basis?
        value = form.quantity * form.avgBuyPrice;
      }

      onAdd({
        symbol: form.symbol,
        name: form.name,
        type: form.type,
        sector: form.sector,
        quantity: form.quantity,
        costBasis: form.quantity * form.avgBuyPrice, // Calculated total cost
        currentValue: value,
        currency: form.currency,
        geography: form.geography
      });

      setForm({
        symbol: '',
        name: '',
        type: 'stock',
        sector: 'Technology',
        quantity: 0,
        avgBuyPrice: 0,
        currency: 'USD',
        geography: 'US',
      });
      setOpen(false);
      toast.success('Investment added');
    } catch (error) {
      toast.error('Failed to add investment');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateAll = async () => {
    setIsUpdating(true);
    let updatedCount = 0;
    try {
      await Promise.all(investments.map(async (inv) => {
        if (inv.type === 'stock' || inv.type === 'etf') {
          const price = await getStockPrice(inv.symbol);
          if (price) {
            onUpdate(inv.id, {
              currentValue: price * inv.quantity,
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          }
        }
      }));
      if (updatedCount > 0) toast.success(`Updated ${updatedCount} investments`);
      else toast.info('No updates needed');
    } catch (e) {
      toast.error('Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  const blurClass = isPrivacyMode ? 'privacy-blur' : '';

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Investments
        </CardTitle>
        <div className="flex gap-2">
          {investments.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleUpdateAll} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Update
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Investment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Symbol & Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Symbol
                      <HelpTooltip content="The unique ticker (e.g., AAPL, BTC, VWCE)." />
                    </Label>
                    <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="AAPL" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Apple Inc." required />
                  </div>
                </div>

                {/* Type & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="etf">ETF</SelectItem>
                        <SelectItem value="bond">Bond</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="commodity">Commodity</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Asset Trading Currency
                      <HelpTooltip content="The official currency this asset is traded in (e.g., USD for US Stocks). Do not select your local wallet currency unless they match." />
                    </Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="CHF">CHF (Fr)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sector (Optional/Default) */}
                <div className="grid grid-cols-1">
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Real Estate">Real Estate</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Energy">Energy</SelectItem>
                        <SelectItem value="Consumer">Consumer</SelectItem>
                        <SelectItem value="All World">All World</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Quantity & Avg Buy Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Quantity
                      <HelpTooltip content="Number of shares or tokens held." />
                    </Label>
                    <Input type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Average Buy Price
                      <HelpTooltip content="The average price you paid per single share or token." />
                    </Label>
                    <Input
                      type="number" step="any"
                      value={form.avgBuyPrice}
                      onChange={(e) => setForm({ ...form, avgBuyPrice: +e.target.value })}
                      placeholder="Price per share"
                      required
                    />
                  </div>
                </div>

                {/* Live Preview Summary */}
                <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">Summary</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Initial Investment:</span>
                    <span className="text-lg font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency }).format(form.quantity * form.avgBuyPrice)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Calculated as Quantity ({form.quantity}) × Avg Price ({form.avgBuyPrice}). This will be saved as your Cost Basis.
                  </p>
                </div>

                <Button type="submit" className="w-full gradient-primary" disabled={isAdding}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Investment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {investments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No investments yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right flex items-center justify-end gap-1">
                  Value
                  <HelpTooltip content="Current market value of this investment." side="left" />
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.symbol}</TableCell>
                  <TableCell>{inv.name}</TableCell>
                  <TableCell className="capitalize">{inv.type.replace('_', ' ')}</TableCell>
                  <TableCell>{inv.sector}</TableCell>
                  <TableCell className="text-right">{inv.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      {/* Main Value in Base Currency */}
                      <span className={cn("font-medium", blurClass)}>
                        {formatCurrency(inv.currentValue, inv.currency)}
                      </span>

                      {/* Secondary Value in Original Currency (if different) */}
                      {inv.currency && inv.currency !== baseCurrency && (
                        <span className={cn("text-xs text-muted-foreground", blurClass)}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency }).format(inv.currentValue)}
                        </span>
                      )}

                      {inv.updatedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(inv.updatedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(inv.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
