'use client';

import React, { useState } from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/lib/currency';

const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
];

export default function CurrencySelector() {
  const { defaultCurrency, updateUserCurrency } = useCurrency();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCurrencyChange = async (newCurrency: Currency) => {
    if (newCurrency === defaultCurrency || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateUserCurrency(newCurrency);
    } catch (error) {
      console.error('Failed to update currency:', error);
      // You could add toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-2">
        {currencies.map((currency) => (
          <button
            key={currency.value}
            onClick={() => handleCurrencyChange(currency.value)}
            disabled={isUpdating}
            className={`
              px-3 py-1 rounded-md text-sm font-medium transition-colors
              ${
                defaultCurrency === currency.value
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {currency.symbol} {currency.value}
          </button>
        ))}
      </div>
      {isUpdating && (
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Updating...</span>
        </div>
      )}
    </div>
  );
} 