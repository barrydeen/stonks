'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Plus, Minus } from 'lucide-react';
import TransactionModal from './TransactionModal';
import CurrencySelector from './CurrencySelector';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Currency } from '@/lib/currency';
import SideMenu from './SideMenu';
import AssetInfoModal from './AssetInfoModal';

interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL';
  quantity: number;
  price: number;
  currency: Currency;
  date: string;
}

interface Holding {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currency: string;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
  isCash?: boolean;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  holdingsCount: number;
}

interface PortfolioData {
  holdings: Holding[];
  summary: PortfolioSummary;
}

interface ChartDataPoint {
  date: string;
  value: number;
  currency: string;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

const TIME_RANGES = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '12m', label: '12M' }
];

export default function Dashboard() {
  const { convertAmount, formatCurrency, defaultCurrency, isLoading: currencyLoading } = useCurrency();
  const { token, logout } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoldingSymbol, setSelectedHoldingSymbol] = useState<string | null>(null);
  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pieOuterRadius = useMemo(() => {
    if (windowWidth < 640) return 80;      // mobile (small screens)
    if (windowWidth < 1024) return 110;    // tablet / small laptops
    return 140;                            // desktop and larger
  }, [windowWidth]);

  // Custom label inside pie slices
  const renderPieLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#f1f5f9"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }, []);

  useEffect(() => {
    if (!currencyLoading && token) {
      fetchPortfolio();
      fetchTransactions();
      fetchChartData();
    } else if (!token && !currencyLoading) {
      // No token available, user should be redirected by parent component
      setIsLoading(false);
    }
  }, [currencyLoading, defaultCurrency, token]);

  useEffect(() => {
    if (!currencyLoading && token) {
      fetchChartData();
    }
  }, [selectedTimeRange, currencyLoading, defaultCurrency, token]);

  const handleAuthError = (response: Response) => {
    if (response.status === 401 || response.status === 403) {
      setAuthError('Your session has expired. Please log in again.');
      logout();
      return true;
    }
    return false;
  };

  const fetchChartData = async () => {
    if (!token) return;
    
    setIsChartLoading(true);
    try {
      const response = await fetch(`/api/portfolio/snapshot?range=${selectedTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (handleAuthError(response)) return;

      if (response.ok) {
        const data = await response.json();
        const convertedData = data.data.map((point: ChartDataPoint) => ({
          ...point,
          value: point.currency === defaultCurrency ? point.value : convertAmount(point.value, point.currency as Currency)
        }));
        setChartData(convertedData);
        setAuthError(null);
      } else {
        console.error('Failed to fetch chart data:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsChartLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (handleAuthError(response)) return;

      if (response.ok) {
        const data = await response.json();
        setPortfolio(data);
        setAuthError(null);
      } else {
        console.error('Failed to fetch portfolio:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (handleAuthError(response)) return;

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setAuthError(null);
      } else {
        console.error('Failed to fetch transactions:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleTransactionAdded = () => {
    fetchPortfolio();
    fetchTransactions();
    fetchChartData();
    setIsModalOpen(false);
  };

  // Convert portfolio values to display currency
  const convertedPortfolio = portfolio ? {
    holdings: portfolio.holdings.map(holding => ({
      ...holding,
      avgPrice: holding.isCash ? 1 : convertAmount(holding.avgPrice, holding.currency as Currency),
      totalValue: convertAmount(holding.totalValue, holding.currency as Currency),
      totalCost: convertAmount(holding.totalCost, holding.currency as Currency),
      gainLoss: holding.isCash ? 0 : convertAmount(holding.gainLoss, holding.currency as Currency),
      gainLossPercent: holding.gainLossPercent || 0,
    })),
    summary: (() => {
      // Calculate correct totals AFTER currency conversion
      const convertedHoldings = portfolio.holdings.map(holding => ({
        totalValue: convertAmount(holding.totalValue, holding.currency as Currency),
        totalCost: convertAmount(holding.totalCost, holding.currency as Currency),
        gainLoss: holding.isCash ? 0 : convertAmount(holding.gainLoss, holding.currency as Currency),
      }));
      
      const totalValue = convertedHoldings.reduce((sum, h) => sum + h.totalValue, 0);
      const totalCost = convertedHoldings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalGainLoss = convertedHoldings.reduce((sum, h) => sum + h.gainLoss, 0);
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      
      return {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdingsCount: portfolio.holdings.length,
      };
    })()
  } : null;

  // Generate pie chart data
  const pieData = useMemo(() => {
    if (!convertedPortfolio || convertedPortfolio.holdings.length === 0) {
      return [];
    }

    const colors = [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];

    return convertedPortfolio.holdings.map((holding, index) => ({
      name: holding.isCash ? `${holding.currency} Cash` : holding.symbol,
      value: holding.totalValue,
      color: colors[index % colors.length],
    }));
  }, [convertedPortfolio]);

  // Early return if there's an auth error
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-red-500/50 shadow-xl backdrop-blur-sm max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Error</h2>
          <p className="text-slate-300">{authError}</p>
        </div>
      </div>
    );
  }

  if (currencyLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 text-lg font-medium">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <SideMenu
        onAddTransaction={() => setIsModalOpen(true)}
        onLogout={logout}
      />
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 pt-28 max-w-7xl">
        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-white">
                {convertedPortfolio ? formatCurrency(Math.round(convertedPortfolio.summary.totalValue)) : formatCurrency(0)}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Total Gain/Loss</p>
              <p className={`text-2xl font-bold ${
                convertedPortfolio && convertedPortfolio.summary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {convertedPortfolio ? formatCurrency(Math.round(convertedPortfolio.summary.totalGainLoss)) : formatCurrency(0)}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
            <div className="space-y-2">
              <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Gain/Loss Percentage</p>
              <p className={`text-2xl font-bold ${
                convertedPortfolio && convertedPortfolio.summary.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {convertedPortfolio ? `${(convertedPortfolio.summary.totalGainLossPercent || 0).toFixed(2)}%` : '0.00%'}
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm mb-12">
          <div className="flex justify-end mb-6">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.key} value={range.key} className="bg-slate-700 text-slate-300">
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          {isChartLoading ? (
            <div className="flex items-center justify-center h-80 text-slate-400">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Loading chart data...</p>
              </div>
            </div>
          ) : chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (selectedTimeRange === '7d' || selectedTimeRange === '30d') {
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else {
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }
                    }}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '12px',
                      color: '#f1f5f9'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#065f46' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-slate-400">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-lg font-medium">No portfolio data yet</p>
                <p className="text-sm">Your portfolio value history will appear here as you add transactions</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts and Holdings Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Portfolio Allocation Chart */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
            {pieData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={pieOuterRadius}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderPieLabel}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)} 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #ffffff',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-slate-400">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                    <DollarSign className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-lg font-medium">No holdings to display</p>
                  <p className="text-sm">Add your first transaction to see your portfolio allocation</p>
                </div>
              </div>
            )}
          </div>

          {/* Holdings Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-6">Current Holdings</h2>
            {convertedPortfolio && convertedPortfolio.holdings.length > 0 ? (
              <div className="space-y-1">
                {convertedPortfolio.holdings.map((holding, index) => (
                  <div
                    key={`${holding.symbol}-${holding.currency}`}
                    onClick={() => {
                      if (!holding.isCash) {
                        setSelectedHoldingSymbol(holding.symbol);
                        setIsHoldingModalOpen(true);
                      }
                    }}
                    className={`py-4 px-2 hover:bg-slate-700/30 transition-colors rounded-lg ${index < convertedPortfolio.holdings.length - 1 ? 'border-b border-slate-700/30' : ''} ${holding.isCash ? '' : 'cursor-pointer'}`}
                  >
                    {/* Main row: Symbol and Value */}
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-white text-lg">
                        {holding.isCash ? (
                          <span className="flex items-center space-x-2">
                            <span className="text-green-400 text-xl">💰</span>
                            <span>{holding.currency} Cash</span>
                          </span>
                        ) : (
                          holding.symbol
                        )}
                      </div>
                      <div className="font-bold text-white text-lg">{formatCurrency(holding.totalValue)}</div>
                    </div>
                    
                    {/* Secondary row: Quantity/Avg Price and Gain/Loss */}
                    <div className="flex justify-between items-center">
                      <div className="text-slate-400 text-sm">
                        {holding.isCash ? (
                          <span>{formatCurrency(holding.quantity)}</span>
                        ) : (
                          <span>{holding.quantity.toFixed(4)} shares • {formatCurrency(holding.avgPrice)} avg</span>
                        )}
                      </div>
                      <div className={`text-sm font-medium ${
                        holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {holding.isCash ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span>{formatCurrency(holding.gainLoss)} ({(holding.gainLossPercent || 0).toFixed(2)}%)</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                    <Plus className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-lg font-medium">No holdings yet</p>
                  <p className="text-sm">Add your first transaction to start tracking your portfolio!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-8 rounded-2xl border border-slate-600/50 shadow-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div className="space-y-1">
              {transactions.slice(0, 10).map((transaction, index) => {
                const convertedPrice = convertAmount(transaction.price, transaction.currency);
                const convertedTotal = convertedPrice * transaction.quantity;
                
                return (
                  <div key={transaction.id} className={`py-4 px-2 hover:bg-slate-700/30 transition-colors rounded-lg ${index < Math.min(transactions.length, 10) - 1 ? 'border-b border-slate-700/30' : ''}`}>
                    {/* Main row: Symbol/Type and Total */}
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-white text-lg">{transaction.symbol}</span>
                        <span className={`flex items-center space-x-1 font-medium text-sm px-2 py-1 rounded-md ${
                          transaction.type === 'BUY' || transaction.type === 'DEPOSIT' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                        }`}>
                          {(transaction.type === 'BUY' || transaction.type === 'DEPOSIT') ? 
                            <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          <span>{transaction.type}</span>
                        </span>
                      </div>
                      <div className="font-bold text-white text-lg">{formatCurrency(convertedTotal)}</div>
                    </div>
                    
                    {/* Secondary row: Date and details */}
                    <div className="flex justify-between items-center">
                      <div className="text-slate-400 text-sm">
                        <span className="mr-3">{new Date(transaction.date).toLocaleDateString()}</span>
                        <span>
                          {(transaction.type === 'DEPOSIT' || transaction.type === 'WITHDRAWAL') ? (
                            formatCurrency(transaction.quantity)
                          ) : (
                            <>
                              {transaction.quantity} shares
                              <span> • {formatCurrency(convertedPrice)}
                                {transaction.currency !== defaultCurrency && (
                                  <span className="text-slate-500"> ({transaction.currency})</span>
                                )}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-lg font-medium">No transactions yet</p>
                <p className="text-sm">Start by adding your first trade to see your activity here!</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />

      {/* Asset details modal */}
      <AssetInfoModal
        isOpen={isHoldingModalOpen}
        onClose={() => setIsHoldingModalOpen(false)}
        symbol={selectedHoldingSymbol}
      />
    </div>
  );
} 