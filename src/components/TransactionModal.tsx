'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SymbolSearch from './SymbolSearch';
import type { Currency } from '@/lib/currency';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onTransactionAdded,
}: TransactionModalProps) {
  const { token, logout } = useAuth();
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'BUY' as 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL',
    quantity: '',
    price: '',
    currency: 'USD' as Currency,
    date: new Date().toISOString().split('T')[0],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPriceFetching, setIsPriceFetching] = useState(false);

  const isCashTransaction = formData.type === 'DEPOSIT' || formData.type === 'WITHDRAWAL';

  // Function to detect currency based on symbol and exchange
  const detectCurrency = (symbol: string, exchange: string, country?: string): Currency => {
    // Canadian exchanges
    if (exchange?.includes('TSX') || exchange?.includes('TSE') || exchange?.includes('Canadian')) {
      return 'CAD';
    }
    
    // Crypto symbols typically end with USD
    if (symbol?.includes('USD') || symbol?.includes('USDT') || symbol?.includes('BUSD')) {
      return 'USD';
    }
    
    // Country-based detection
    if (country === 'Canada') {
      return 'CAD';
    }
    
    // Default to USD for most stocks and crypto
    return 'USD';
  };

  // Function to fetch current price for a symbol
  const fetchCurrentPrice = async (symbol: string) => {
    setIsPriceFetching(true);
    try {
      const response = await fetch(`/api/prices?symbol=${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const priceData = await response.json();
        return priceData.price || priceData.currentPrice;
      }
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setIsPriceFetching(false);
    }
    return null;
  };

  // Handle symbol selection with automatic price and currency detection
  const handleSymbolSelect = async (symbolData: any) => {
    const detectedCurrency = detectCurrency(symbolData.symbol, symbolData.exchange, symbolData.country);
    
    // Update form with symbol and currency first
    setFormData(prev => ({
      ...prev,
      symbol: symbolData.symbol,
      currency: detectedCurrency
    }));

    // Fetch current price
    const currentPrice = await fetchCurrentPrice(symbolData.symbol);
    if (currentPrice) {
      setFormData(prev => ({
        ...prev,
        price: currentPrice.toString()
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!token) {
      setError('Not authenticated. Please log in.');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
      };

      // For cash transactions, set default values
      if (isCashTransaction) {
        payload.symbol = 'CASH';
        payload.price = 1; // Cash has no price movement
      }

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onTransactionAdded();
        setFormData({
          symbol: '',
          type: 'BUY',
          quantity: '',
          price: '',
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
        });
      } else if (response.status === 401 || response.status === 403) {
        setError('Your session has expired. Please log in again.');
        logout();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create transaction');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white">Add Transaction</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Type
            </label>
            <select
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' })
              }
            >
              <option value="BUY">Buy Asset</option>
              <option value="SELL">Sell Asset</option>
              <option value="DEPOSIT">Cash Deposit</option>
              <option value="WITHDRAWAL">Cash Withdrawal</option>
            </select>
          </div>

          {!isCashTransaction && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Symbol
              </label>
              <SymbolSearch
                value={formData.symbol}
                onChange={(symbol) => setFormData({ ...formData, symbol })}
                onSymbolSelect={handleSymbolSelect}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                {isCashTransaction ? 'Amount' : 'Quantity'}
              </label>
              <input
                type="number"
                step={isCashTransaction ? "0.01" : "0.0001"}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </div>

            {!isCashTransaction && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Price {isPriceFetching && <span className="text-xs text-green-400 ml-2">(fetching...)</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  disabled={isPriceFetching}
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Currency
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value as Currency })
                }
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-xl p-4">
              {error}
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 