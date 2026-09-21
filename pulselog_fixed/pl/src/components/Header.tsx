import React, { useState, useRef, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Bell, 
  Rss, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChangelogCategory } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: ChangelogCategory | 'All';
  onCategorySelect: (cat: ChangelogCategory | 'All') => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenAuthModal: (initialTab?: 'login' | 'signup') => void;
  onOpenFeedModal: () => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  unreadCount,
  onOpenNotifications,
  onOpenAuthModal,
  onOpenFeedModal,
  isAdminView,
  onToggleAdminView,
}) => {
  const { user, isAdmin, login, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const categories: (ChangelogCategory | 'All')[] = ['All', 'New', 'Improved', 'Fixed', 'Maintenance'];

  // Global keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">PulseLog</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Live
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                  Product Updates & Releases
                </span>
              </div>
            </a>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="search-changelog"
                type="text"
                placeholder="Search updates, releases, fixes... (⌘K)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* JSON Feed 1.1 Button */}
            <button
              id="feed-btn"
              onClick={onOpenFeedModal}
              title="JSON Feed 1.1 Specification"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
            >
              <Rss className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">JSON Feed</span>
            </button>

            {/* Notification Bell Badge */}
            <button
              id="notifications-bell-btn"
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors"
              title="What's New notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Admin Studio Toggle (Only for ADMIN role) */}
            {isAdmin && (
              <button
                id="admin-studio-toggle-btn"
                onClick={onToggleAdminView}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all ${
                  isAdminView
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 ring-2 ring-slate-900 dark:ring-white'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">{isAdminView ? 'Exit Studio' : 'Admin Studio'}</span>
              </button>
            )}

            {/* Auth / Profile Area */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                      {user.role.toLowerCase()}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Role: {user.role}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          if (!isAdminView) onToggleAdminView();
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Admin Publishing Studio
                      </button>
                    )}

                    <button
                      id="logout-btn"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="header-admin-demo-btn"
                  onClick={async () => {
                    await login('admin@pulselog.dev', 'AdminPass123!');
                    if (!isAdminView) onToggleAdminView();
                  }}
                  title="1-Click Login as Admin (admin@pulselog.dev)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 rounded-xl transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Admin Demo</span>
                </button>
                <button
                  id="header-login-btn"
                  onClick={() => onOpenAuthModal('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                >
                  Sign In
                </button>
                <button
                  id="header-signup-btn"
                  onClick={() => onOpenAuthModal('signup')}
                  className="hidden sm:inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 rounded-xl shadow-sm transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search updates, releases, fixes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation Pills (Shown on public changelog view) */}
        {!isAdminView && (
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar border-t border-slate-100 dark:border-slate-800/60">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`filter-category-${cat.toLowerCase()}`}
                  onClick={() => onCategorySelect(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
