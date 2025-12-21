import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getFinnhubKey, setFinnhubKey as saveFinnhubKey, fetchExchangeRates } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

interface SettingsContextType {
    currency: Currency;
    setCurrency: (c: Currency) => void;
    exchangeRate: number; // Legacy: Manual USD to Base
    setExchangeRate: (rate: number) => void; // Legacy
    currencyRates: Record<string, number> | null;
    refreshRates: () => Promise<void>;
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    finnhubKey: string;
    isFinnhubKeyEnv: boolean;
    setFinnhubKey: (key: string) => void;
    formatCurrency: (value: number, sourceCurrency?: string) => string;
    convertCurrency: (value: number, sourceCurrency?: string) => number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currency, setCurrencyState] = useState<Currency>('EUR');
    const [exchangeRate, setExchangeRateState] = useState<number>(1);
    const [currencyRates, setCurrencyRates] = useState<Record<string, number> | null>(null);
    const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
    const [finnhubKey, setFinnhubKeyState] = useState<string>('');

    // Check if env var is present
    const isFinnhubKeyEnv = !!import.meta.env.VITE_FINNHUB_API_KEY;

    // Load Profile from Supabase or LocalStorage fallback
    useEffect(() => {
        if (!user) {
            // Fallback to local storage if no user
            setCurrencyState((localStorage.getItem('wc_currency') as Currency) || 'EUR');
            setExchangeRateState(parseFloat(localStorage.getItem('wc_exchange_rate') || '1'));
            setIsPrivacyMode(localStorage.getItem('wc_privacy_mode') === 'true');
            setFinnhubKeyState(getFinnhubKey() || '');
            return;
        }

        const loadProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setCurrencyState((data.base_currency as Currency) || 'EUR');
                    setIsPrivacyMode(data.is_privacy_mode || false);
                    if (data.finnhub_key) setFinnhubKeyState(data.finnhub_key);
                } else if (error && error.code === 'PGRST116') {
                    // Profile doesn't exist? Create one.
                    await supabase.from('profiles').insert([{ id: user.id }]);
                }
            } catch (err) {
                console.error('Failed to load profile', err);
            }
        };

        loadProfile();
    }, [user]);

    // Refresh rates whenever base currency changes
    const refreshRates = useCallback(async () => {
        const rates = await fetchExchangeRates(currency);
        if (rates) {
            setCurrencyRates(rates);
            localStorage.setItem('wc_currency_rates', JSON.stringify(rates));
        }
    }, [currency]);

    useEffect(() => {
        refreshRates();
    }, [refreshRates]);

    const setCurrency = async (c: Currency) => {
        setCurrencyState(c);
        if (user) {
            await supabase.from('profiles').update({ base_currency: c }).eq('id', user.id);
        } else {
            localStorage.setItem('wc_currency', c);
        }
    };

    const setExchangeRate = (rate: number) => {
        setExchangeRateState(rate);
        localStorage.setItem('wc_exchange_rate', rate.toString());
    };

    const togglePrivacyMode = async () => {
        const next = !isPrivacyMode;
        setIsPrivacyMode(next);
        if (user) {
            await supabase.from('profiles').update({ is_privacy_mode: next }).eq('id', user.id);
        } else {
            localStorage.setItem('wc_privacy_mode', next.toString());
        }
    };

    const setFinnhubKey = async (key: string) => {
        setFinnhubKeyState(key);
        if (user) {
            await supabase.from('profiles').update({ finnhub_key: key }).eq('id', user.id);
        }
        saveFinnhubKey(key);
    };

    const convertCurrency = useCallback((value: number, sourceCurrency?: string): number => {
        if (!sourceCurrency || sourceCurrency === currency) return value;
        if (currencyRates && currencyRates[sourceCurrency]) {
            const rate = currencyRates[sourceCurrency];
            if (rate) return value / rate;
        }
        if (sourceCurrency === 'USD') return value * exchangeRate;
        return value;
    }, [currency, currencyRates, exchangeRate]);

    const formatCurrency = (value: number, sourceCurrency?: string) => {
        const converted = convertCurrency(value, sourceCurrency);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(converted);
    };

    return (
        <SettingsContext.Provider
            value={{
                currency,
                setCurrency,
                exchangeRate,
                setExchangeRate,
                currencyRates,
                refreshRates,
                isPrivacyMode,
                togglePrivacyMode,
                finnhubKey,
                isFinnhubKeyEnv,
                setFinnhubKey,
                formatCurrency,
                convertCurrency
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
