import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Bitcoin, RefreshCw, Loader2, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CryptoHolding } from '@/types/finance';
import { cn } from '@/lib/utils';
import { getCryptoPrice, searchCoinGecko, type CoinResult } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { HelpTooltip } from '@/components/ui/tooltip-helper';

interface CryptoTableProps {
  holdings: CryptoHolding[];
  onAdd: (holding: Omit<CryptoHolding, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<CryptoHolding>) => void;
  onDelete: (id: string) => void;
}

export function CryptoTable({ holdings, onAdd, onUpdate, onDelete }: CryptoTableProps) {
  const { formatCurrency, isPrivacyMode } = useSettings();
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<CoinResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [form, setForm] = useState({
    symbol: '',
    name: '',
    quantity: 0,
    avgBuyPrice: 0,
    currentPrice: 0,
    coinId: '', // Hidden field to store CoinGecko ID if found
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchCoinGecko(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectCoin = async (coin: CoinResult) => {
    setForm(prev => ({
      ...prev,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      coinId: coin.id
    }));
    setSearchOpen(false);

    // Auto-fetch price on selection
    const price = await getCryptoPrice(coin.id);
    if (price) {
      setForm(prev => ({ ...prev, currentPrice: price }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      let price = form.currentPrice;
      // If no price entered, try to fetch it using ID if we have it, or symbol
      if (price === 0) {
        // Prefer coinId if we have it from search
        const lookup = form.coinId || form.symbol;
        if (lookup) {
          const fetchedPrice = await getCryptoPrice(lookup);
          if (fetchedPrice) {
            price = fetchedPrice;
          } else {
            toast.warning(`Could not fetch price. Saved with $0.`);
          }
        }
      }

      onAdd({
        symbol: form.symbol,
        name: form.name,
        quantity: form.quantity,
        avgBuyPrice: form.avgBuyPrice,
        currentPrice: price,
        currency: 'USD'
      });

      setForm({ symbol: '', name: '', quantity: 0, avgBuyPrice: 0, currentPrice: 0, coinId: '' });
      setOpen(false);
      toast.success('Crypto holding added successfully');
    } catch (error) {
      toast.error('Failed to add crypto holding');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateAll = async () => {
    setIsUpdating(true);
    let updatedCount = 0;

    try {
      await Promise.all(holdings.map(async (h) => {
        const price = await getCryptoPrice(h.symbol);
        if (price) {
          onUpdate(h.id, {
            currentPrice: price,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        }
      }));

      if (updatedCount > 0) {
        toast.success(`Updated prices for ${updatedCount} assets`);
      } else {
        toast.info('No prices could be updated');
      }
    } catch (error) {
      toast.error('Failed to update prices');
    } finally {
      setIsUpdating(false);
    }
  };

  const getGainLoss = (h: CryptoHolding) => {
    const costBasis = h.quantity * h.avgBuyPrice;
    const currentValue = h.quantity * h.currentPrice;
    const gain = currentValue - costBasis;
    const percent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    return { costBasis, currentValue, gain, percent };
  };

  const blurClass = isPrivacyMode ? 'privacy-blur' : '';

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-warning" />
          Crypto Holdings
        </CardTitle>
        <div className="flex gap-2">
          {holdings.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateAll}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Update Prices
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Crypto Holding</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Search / Symbol Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Asset Search (CoinGecko)
                    <HelpTooltip content="Search for a cryptocurrency to auto-fill its symbol and name." />
                  </Label>
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={searchOpen} className="w-full justify-between">
                        {form.symbol ? `${form.name} (${form.symbol})` : "Search coin..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search Bitcoin..." value={searchQuery} onValueChange={setSearchQuery} />
                        <CommandList>
                          {isSearching && <CommandEmpty>Searching...</CommandEmpty>}
                          {!isSearching && searchResults.length === 0 && <CommandEmpty>No results found.</CommandEmpty>}
                          <CommandGroup heading="Results">
                            {searchResults.map((coin) => (
                              <CommandItem
                                key={coin.id}
                                value={coin.id}
                                onSelect={() => handleSelectCoin(coin)}
                              >
                                <span>{coin.name}</span>
                                <span className="ml-2 text-muted-foreground uppercase">{coin.symbol}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-muted-foreground">Search to auto-fill details and fetch price.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Symbol</Label>
                    <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="BTC" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bitcoin" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Buy Price</Label>
                    <Input type="number" step="any" value={form.avgBuyPrice} onChange={(e) => setForm({ ...form, avgBuyPrice: +e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Price</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.currentPrice}
                      onChange={(e) => setForm({ ...form, currentPrice: +e.target.value })}
                      placeholder="Auto-fetch if 0"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={isAdding}>
                  {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Crypto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No crypto holdings yet. Add your first one!</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Buy</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right flex items-center justify-end gap-1">
                  Gain/Loss
                  <HelpTooltip content="The theoretical profit or loss you would make if you sold your investments right now at the current market price (Unrealized P&L)." side="left" />
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => {
                const { currentValue, gain, percent } = getGainLoss(h);
                return (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono font-medium">{h.symbol}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell className="text-right">{h.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(h.avgBuyPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={blurClass}>{formatCurrency(h.currentPrice)}</span>
                        {h.updatedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(h.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right", blurClass)}>{formatCurrency(currentValue)}</TableCell>
                    <TableCell className={cn('text-right font-medium', blurClass, gain >= 0 ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(gain)} ({percent.toFixed(1)}%)
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(h.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
