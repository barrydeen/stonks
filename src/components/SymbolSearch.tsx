'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SymbolOption {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
  currency?: string;
  country?: string;
}

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
  onSymbolSelect?: (symbolData: SymbolOption) => void;
  placeholder?: string;
  className?: string;
}

export default function SymbolSearch({
  value,
  onChange,
  onSymbolSelect,
  placeholder = "Search symbols...",
  className = "",
}: SymbolSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<SymbolOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const searchSymbols = async () => {
      if (inputValue.length < 1) {
        setOptions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/symbols/search?q=${encodeURIComponent(inputValue)}`);
        if (response.ok) {
          const data = await response.json();
          setOptions(data.symbols || []);
          setIsOpen(data.symbols?.length > 0);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Error searching symbols:', error);
        setOptions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchSymbols, 300);
    return () => clearTimeout(debounceTimeout);
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectOption = (option: SymbolOption) => {
    setInputValue(option.symbol);
    onChange(option.symbol);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onSymbolSelect) {
      onSymbolSelect(option);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < options.length) {
          handleSelectOption(options[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'stock':
        return 'text-blue-400';
      case 'etf':
        return 'text-purple-400';
      case 'crypto':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'stock':
        return '📈';
      case 'etf':
        return '🏛️';
      case 'crypto':
        return '🚀';
      default:
        return '💼';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={`w-full px-3 py-2 pl-10 pr-8 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all ${className}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length >= 1 && options.length > 0 && setIsOpen(true)}
          autoComplete="off"
        />
        
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        
        {isLoading ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
        >
          {options.map((option, index) => (
            <button
              key={option.symbol}
              type="button"
              className={`w-full px-3 py-3 text-left hover:bg-slate-700 focus:bg-slate-700 focus:outline-none transition-colors border-b border-slate-700 last:border-b-0 ${
                index === selectedIndex ? 'bg-slate-700' : 'bg-slate-800'
              }`}
              onClick={() => handleSelectOption(option)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(option.type)}</span>
                  <div>
                    <div className="font-semibold text-white">{option.symbol}</div>
                    <div className="text-xs text-slate-300 truncate max-w-48">
                      {option.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${getTypeColor(option.type)}`}>
                    {option.type?.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-20">
                    {option.exchange}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 