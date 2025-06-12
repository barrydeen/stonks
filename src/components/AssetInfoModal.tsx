'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AssetInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string | null;
}

interface TickerDetails {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
}

export default function AssetInfoModal({ isOpen, onClose, symbol }: AssetInfoModalProps) {
  const [details, setDetails] = useState<TickerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !symbol) return;

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tickers?action=search&q=${encodeURIComponent(symbol)}&limit=1`);
        if (res.ok) {
          const json = await res.json();
          setDetails(json.symbols?.[0] || null);
        }
      } catch (err) {
        console.error('Failed to fetch ticker details', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-white">{symbol} Details</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : details ? (
          <div className="space-y-4 text-slate-300">
            <div className="flex justify-between"><span className="font-medium">Name:</span><span>{details.name || '—'}</span></div>
            <div className="flex justify-between"><span className="font-medium">Exchange:</span><span>{details.exchange || '—'}</span></div>
            <div className="flex justify-between"><span className="font-medium">Type:</span><span className="uppercase">{details.type || '—'}</span></div>
            {details.currency && <div className="flex justify-between"><span className="font-medium">Currency:</span><span>{details.currency}</span></div>}
            {details.country && <div className="flex justify-between"><span className="font-medium">Country:</span><span>{details.country}</span></div>}
            {details.sector && <div className="flex justify-between"><span className="font-medium">Sector:</span><span>{details.sector}</span></div>}
            {details.industry && <div className="flex justify-between"><span className="font-medium">Industry:</span><span>{details.industry}</span></div>}
          </div>
        ) : (
          <p className="text-center text-slate-400">No details available for this symbol.</p>
        )}
      </div>
    </div>
  );
} 