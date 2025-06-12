'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Currency } from '@/lib/currency';

interface ExchangeRates {
  CAD: number;
  USD: number;
}

interface CurrencyContextType {
  defaultCurrency: Currency;
  setDefaultCurrency: (currency: Currency) => void;
  exchangeRates: ExchangeRates;
  updateUserCurrency: (currency: Currency) => Promise<void>;
  convertAmount: (amount: number, fromCurrency: Currency) => number;
  formatCurrency: (amount: number, currency?: Currency) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { user, token } = useAuth();
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('CAD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ CAD: 1, USD: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user settings and exchange rates
  useEffect(() => {
    if (user && token) {
      fetchUserSettings();
    } else {
      setIsLoading(false);
    }
  }, [user, token]);

  // Fetch exchange rates when component mounts
  useEffect(() => {
    fetchExchangeRates();
  }, []); // Remove defaultCurrency dependency

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDefaultCurrency(data.user.defaultCurrency);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      // Always fetch both directions to ensure we can convert properly
      const [cadResponse, usdResponse] = await Promise.all([
        fetch('/api/exchange-rates?base=CAD'),
        fetch('/api/exchange-rates?base=USD')
      ]);
      
      if (cadResponse.ok && usdResponse.ok) {
        const cadData = await cadResponse.json();
        const usdData = await usdResponse.json();
        
        // Store the rates in a way that makes conversion clear:
        // - USD_TO_CAD: how many CAD per 1 USD (from USD base response)
        // - CAD_TO_USD: how many USD per 1 CAD (from CAD base response)
        setExchangeRates({
          CAD: usdData.rates.CAD, // USD->CAD rate (e.g., 1.37)
          USD: cadData.rates.USD, // CAD->USD rate (e.g., 0.732)
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserCurrency = async (currency: Currency) => {
    if (!token) return;

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ defaultCurrency: currency }),
      });

      if (response.ok) {
        setDefaultCurrency(currency);
      } else {
        throw new Error('Failed to update currency preference');
      }
    } catch (error) {
      console.error('Error updating user currency:', error);
      throw error;
    }
  };

  const convertAmount = (amount: number, fromCurrency: Currency): number => {
    if (fromCurrency === defaultCurrency) return amount;
    
    // exchangeRates now contains:
    // - CAD: USD->CAD rate (how many CAD per 1 USD)
    // - USD: CAD->USD rate (how many USD per 1 CAD)
    
    if (fromCurrency === 'USD' && defaultCurrency === 'CAD') {
      // Converting USD to CAD: multiply by USD->CAD rate
      return amount * (exchangeRates.CAD || 1);
    } else if (fromCurrency === 'CAD' && defaultCurrency === 'USD') {
      // Converting CAD to USD: multiply by CAD->USD rate
      return amount * (exchangeRates.USD || 1);
    }
    
    return amount;
  };

  const formatCurrency = (amount: number, currency?: Currency): string => {
    const targetCurrency = currency || defaultCurrency;
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  };

  const value: CurrencyContextType = {
    defaultCurrency,
    setDefaultCurrency,
    exchangeRates,
    updateUserCurrency,
    convertAmount,
    formatCurrency,
    isLoading,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
} 