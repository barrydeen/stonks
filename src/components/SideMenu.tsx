import React from 'react';
import { Menu, X } from 'lucide-react';
import CurrencySelector from './CurrencySelector';

interface SideMenuProps {
  onAddTransaction: () => void;
  onLogout: () => void;
}

export default function SideMenu({ onAddTransaction, onLogout }: SideMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Header bar */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-slate-900/50 backdrop-blur-md z-30 border-b border-slate-800/50">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Stonks
          </h1>
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gradient-to-br from-slate-900 to-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l border-slate-700/50 shadow-2xl`}
      >
        <div className="p-6 space-y-8">
          {/* Close button */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-blue-900 hover:bg-blue-800 transition-colors"
            >
              <X className="w-6 h-6 text-slate-300" />
            </button>
          </div>

          {/* Menu items */}
          <div className="space-y-10">
            {/* Currency toggle centered */}
            <div className="flex justify-center mb-10">
              <CurrencySelector />
            </div>

            {/* Links */}
            <div className="w-full divide-y divide-white/20 text-left text-white font-semibold tracking-wide">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onAddTransaction();
                }}
                className="block py-4 px-4 hover:bg-slate-700/40 transition-colors"
              >
                Add Transaction
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onLogout();
                }}
                className="block py-4 px-4 hover:bg-slate-700/40 transition-colors"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 