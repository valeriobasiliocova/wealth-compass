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

// Fetch crypto price from CoinGecko (using ID is more reliable than symbol)
export async function getCryptoPrice(idOrSymbol: string): Promise<number | null> {
    try {
        // If it looks like a symbol (3-4 chars), try to search first to get ID, 
        // but the UI should ideally pass the ID. 
        // We'll assume the input is the ID (e.g. 'bitcoin') for best results, 
        // but fall back to search if needed.

        let coinId = idOrSymbol.toLowerCase();

        // Simple check: if it's short, it might be a symbol, but CoinGecko IDs can also be short (e.g. '0x').
        // Best practice: The UI should store and pass the CoinGecko ID.
        // If we only have a symbol (legacy data), we try to find the ID.
        if (coinId.length <= 5) {
            // Try to find specific ID for symbol
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
