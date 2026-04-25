import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from '../types';

interface TopAppBarProps {
  user: User | null;
  onSignInClick: () => void;
  onSignOut: () => void;
  currentScreen: string;
  onScreenChange: (screen: string) => void;
}

export function TopAppBar({ user, onSignInClick, onSignOut, currentScreen, onScreenChange }: TopAppBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (user: User) => {
    const name = user.name || user.email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  const navLinks = [
    { key: 'hero', label: 'Hero' },
    { key: 'upload', label: 'Upload' },
    { key: 'graph', label: 'Graph' },
    { key: 'details', label: 'Details' },
    ...(user ? [{ key: 'history', label: 'History' }] : []),
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">hub</span>
        <h1 className="text-xl font-bold bg-gradient-to-br from-primary to-cyan-800 bg-clip-text text-transparent font-headline tracking-tight">
          Run-Neeti
        </h1>
      </div>
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
          {navLinks.map(link => (
            <button
              key={link.key}
              onClick={() => onScreenChange(link.key)}
              className={cn(
                "transition-colors",
                currentScreen === link.key 
                  ? "text-primary font-bold hover:text-cyan-700" 
                  : "text-slate-500 hover:text-primary"
              )}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Auth Area */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                {getInitials(user)}
              </div>
              <span className="text-sm font-medium text-on-surface hidden sm:block truncate max-w-[100px]">
                {user.name || user.email.split('@')[0]}
              </span>
              <span className="material-symbols-outlined text-slate-400 text-lg">
                {showDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50"
                >
                  {/* User Info Header */}
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg font-bold shadow-md">
                        {getInitials(user)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{user.name || user.email.split('@')[0]}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="material-symbols-outlined text-primary text-xs">phone</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Phone</span>
                        </div>
                        <p className="text-xs font-medium text-on-surface truncate">{user.phone}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="material-symbols-outlined text-secondary text-xs">cake</span>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Age</span>
                        </div>
                        <p className="text-xs font-medium text-on-surface">{user.age} years</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <button
                      onClick={() => { setShowDropdown(false); onSignOut(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button 
            onClick={onSignInClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(8,145,178,0.2)]"
          >
            <span className="material-symbols-outlined text-lg">person</span>
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

export function BottomNavBar({ currentScreen, onScreenChange, user }: { currentScreen: string; onScreenChange: (screen: string) => void, user: User | null }) {
  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-white/70 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.1)] rounded-full px-4 py-2 border border-slate-200/60">
      <NavItem icon="auto_awesome" label="Hero" active={currentScreen === 'hero'} onClick={() => onScreenChange('hero')} />
      <NavItem icon="upload_file" label="Upload" active={currentScreen === 'upload'} onClick={() => onScreenChange('upload')} />
      <NavItem icon="account_tree" label="Graph" active={currentScreen === 'graph'} onClick={() => onScreenChange('graph')} />
      <NavItem icon="description" label="Details" active={currentScreen === 'details'} onClick={() => onScreenChange('details')} />
      {user && <NavItem icon="history" label="History" active={currentScreen === 'history'} onClick={() => onScreenChange('history')} />}
    </nav>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center px-5 py-2 rounded-full transition-all",
        active ? "bg-primary/10 text-primary scale-90 shadow-[0_0_12px_rgba(8,145,178,0.15)]" : "text-slate-400 hover:bg-slate-100"
      )}
    >
      <span className="material-symbols-outlined mb-1">{icon}</span>
      <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
    </button>
  );
}
