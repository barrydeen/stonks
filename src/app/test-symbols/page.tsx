'use client';

import React, { useState } from 'react';
import SymbolSearch from '@/components/SymbolSearch';

export default function TestSymbolsPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('');

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Symbol Search Test</h1>
        
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Test Symbol Autocomplete
          </h2>
          
          <p className="text-slate-400 mb-6">
            Try searching for symbols like "AAPL", "TSLA", "BTCUSD", or "bitcoin"
          </p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Search Symbol
            </label>
            <SymbolSearch
              value={selectedSymbol}
              onChange={setSelectedSymbol}
              placeholder="Type to search stocks, ETFs, and crypto..."
            />
          </div>
          
          {selectedSymbol && (
            <div className="bg-slate-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">Selected Symbol:</h3>
              <code className="text-green-400 text-lg">{selectedSymbol}</code>
            </div>
          )}
          
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-white">Features:</h3>
            <ul className="text-slate-300 space-y-2">
              <li>• 📈 <strong>Stocks:</strong> Search 85,000+ stock symbols</li>
              <li>• 🏛️ <strong>ETFs:</strong> Exchange-traded funds and trusts</li>
              <li>• 🚀 <strong>Crypto:</strong> 4,786+ cryptocurrency pairs</li>
              <li>• ⚡ <strong>Real-time:</strong> Live search with 300ms debounce</li>
              <li>• 🎯 <strong>Smart Matching:</strong> Exact symbols first, then partial</li>
              <li>• ⌨️ <strong>Keyboard Navigation:</strong> Arrow keys and Enter</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 