import React from 'react';
import { Menu, X, Plus, LogOut } from 'lucide-react';
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
              className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* Menu items */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Settings
              </h3>
              <div className="p-2 bg-slate-800/50 rounded-xl">
                <CurrencySelector />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={onAddTransaction}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-3"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Transaction</span>
                </button>

                <button
                  onClick={onLogout}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center space-x-3"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 