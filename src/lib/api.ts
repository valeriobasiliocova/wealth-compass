// API Service for fetching asset prices

const STORAGE_KEY_FINNHUB = 'wealth_compass_finnhub_key';

// --- Configuration ---

export function getFinnhubKey(): string | null {
    const envKey = import.meta.env.VITE_FINNHUB_API_KEY;
    if (envKey) return envKey;
    return localStorage.getItem(STORAGE_KEY_FINNHUB);
}

export function setFinnhubKey(key: string) {
    localStorage.setItem(STORAGE_KEY_FINNHUB, key);
}

// --- CoinGecko (Crypto) ---

export interface CoinResult {
    id: string;
    symbol: string;
    name: string;
}

// Search for a coin by query (e.g. "bitcoin")
export async function searchCoinGecko(query: string): Promise<CoinResult[]> {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('CoinGecko search failed');
        const data = await res.json();
        return data.coins.map((c: any) => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
        }));
    } catch (error) {
        console.error('CoinGecko search error:', error);
        return [];
    }
}

const STORAGE_KEY_CRYPTO_CACHE = 'wealth_compass_crypto_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedCryptoData {
    timestamp: number;
    prices: Record<string, number>;
}

// Fetch crypto price from CoinGecko (individual) - kept for legacy or single add
export async function getCryptoPrice(idOrSymbol: string): Promise<number | null> {
    try {
        let coinId = idOrSymbol.toLowerCase();
        if (coinId.length <= 5) {
            const results = await searchCoinGecko(coinId);
            const match = results.find(c => c.symbol.toLowerCase() === coinId);
            if (match) coinId = match.id;
        }

        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        if (!res.ok) throw new Error('CoinGecko price fetch failed');
        const data = await res.json();

        return data[coinId]?.usd || null;
    } catch (error) {
        console.error(`Error fetching crypto price for ${idOrSymbol}:`, error);
        return null;
    }
}

// Batch Fetch with Caching
export async function fetchAllCryptoPrices(coinIds: string[], forceRefresh = false): Promise<Record<string, number>> {
    const now = Date.now();
    const uniqueIds = Array.from(new Set(coinIds.map(id => id.toLowerCase()))).filter(id => id);
    if (uniqueIds.length === 0) return {};

    // 1. Check Cache
    if (!forceRefresh) {
        const cachedRaw = localStorage.getItem(STORAGE_KEY_CRYPTO_CACHE);
        if (cachedRaw) {
            try {
                const cached: CachedCryptoData = JSON.parse(cachedRaw);
                if (now - cached.timestamp < CACHE_DURATION) {
                    console.log('Using cached crypto prices');
                    return cached.prices;
                }
            } catch (e) {
                console.error('Cache parse error, ignoring');
            }
        }
    }

    // 2. Fetch from API
    try {
        const idsParam = uniqueIds.join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`);

        if (res.status === 429) {
            throw new Error('Rate limit reached (429). Please wait.');
        }
        if (!res.ok) throw new Error(`CoinGecko Batch Error: ${res.statusText}`);

        const data = await res.json();
        const prices: Record<string, number> = {};

        // Map back to simple Key-Value
        uniqueIds.forEach(id => {
            if (data[id]?.usd) {
                prices[id] = data[id].usd;
            }
        });

        // 3. Update Cache
        const newCache: CachedCryptoData = { timestamp: now, prices: { ...prices } }; // Assuming partial update? No, simple replacement for now.
        // Ideally we merge with existing valid cache if we only fetched a subset?
        // But here we usually fetch ALL.
        localStorage.setItem(STORAGE_KEY_CRYPTO_CACHE, JSON.stringify(newCache));

        return prices;
    } catch (error: any) {
        console.error('Batch crypto fetch error:', error);
        // Fallback to cache if available even if expired?
        // Better to return empty or let UI handle it. 
        // We throw so UI can show the Toast.
        throw error;
    }
}

// --- Finnhub (Stocks/ETFs) ---

// Search for asset by ISIN or Name via Yahoo Finance
export async function searchByIsin(query: string): Promise<{ symbol: string, name: string, isin?: string } | null> {
    try {
        const proxyUrl = 'https://corsproxy.io/?';
        // Yahoo Finance Autocomplete API
        const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=1&newsCount=0`;

        const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        if (!res.ok) throw new Error('Yahoo Search failed');

        const data = await res.json();
        const quote = data.quotes?.[0]; // Best match

        if (quote) {
            return {
                symbol: quote.symbol,
                name: quote.longname || quote.shortname,
                isin: quote.isin // Sometimes available in metadata, if not we rely on user input
            };
        }
        return null;
    } catch (error) {
        console.error(`Error searching for ${query}:`, error);
        return null;
    }
}

export async function getStockPrice(symbol: string): Promise<number | null> {
    const apiKey = getFinnhubKey();

    // Method 1: Finnhub (if key exists) - basic symbols only
    if (apiKey) {
        try {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
            if (!res.ok) {
                if (res.status === 429) throw new Error('Rate limit reached');
                throw new Error('Finnhub fetch failed');
            }
            const data = await res.json();
            if (data.c > 0) return data.c;
        } catch (error) {
            // console.warn(`Finnhub failed for ${symbol}, falling back to proxy...`);
        }
    }

    // Method 2: Yahoo Finance Proxy (Fallback with Suffix Logic)
    const proxyUrl = 'https://corsproxy.io/?';
    const suffixes = ['', '.DE', '.MI', '.L', '.PA', '.AS']; // Common EU exchanges

    // Helper to fetch single
    const fetchYahoo = async (sym: string) => {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}`;
        const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        return data?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
    };

    for (const suffix of suffixes) {
        try {
            const trySymbol = symbol.toUpperCase().endsWith(suffix) ? symbol : symbol + suffix;
            const price = await fetchYahoo(trySymbol);
            if (price) return price;
        } catch (e) {
            // Continue to next suffix
        }
    }

    console.error(`Failed to fetch price for ${symbol} after retries.`);
    return null;
}

// --- Frankfurter (Currency) ---

export async function fetchExchangeRates(baseCurrency: string): Promise<Record<string, number> | null> {
    try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
        if (!res.ok) throw new Error('Frankfurter API failed');
        const data = await res.json();
        return data.rates || null;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return null; // Return null to indicate failure
    }
}
