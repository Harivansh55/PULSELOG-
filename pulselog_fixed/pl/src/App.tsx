import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './components/Toast';
import { Header } from './components/Header';
import { ChangelogCard } from './components/ChangelogCard';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthModal } from './components/AuthModal';
import { FeedModal } from './components/FeedModal';
import { AdminStudio } from './components/AdminStudio';
import { ChangelogItem, ChangelogCategory, UnreadNotificationData } from './types';
import { apiRequest } from './api/client';
import { 
  Sparkles, 
  Search, 
  Rss, 
  X, 
  CheckCircle2, 
  HelpCircle, 
  ArrowUp,
  Inbox
} from 'lucide-react';

function ChangelogApp() {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChangelogCategory | 'All'>('All');
  
  // Modals & Drawers
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadItems, setUnreadItems] = useState<ChangelogItem[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  // Fetch Public Changelogs
  const fetchChangelogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest<{ success: boolean; data: ChangelogItem[] }>(`/api/v1/changelog${qs}`);
      if (res && res.data) {
        setChangelogs(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching changelogs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  // Fetch Unread Count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setUnreadItems([]);
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; data: UnreadNotificationData }>(
        '/api/v1/notifications/unread-count'
      );
      if (res && res.data) {
        setUnreadCount(res.data.unread_count);
        if (res.data.last_viewed_at) {
          const lastDate = new Date(res.data.last_viewed_at).getTime();
          const unreadList = changelogs.filter((c) => {
            const pubDate = c.published_at ? new Date(c.published_at).getTime() : 0;
            return pubDate > lastDate;
          });
          setUnreadItems(unreadList);
        } else {
          setUnreadItems(changelogs.slice(0, 5));
        }
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user, changelogs]);

  useEffect(() => {
    fetchChangelogs();
  }, [fetchChangelogs, isAdminView]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Scroll to hash anchor on initial load if present
  useEffect(() => {
    if (!loading && window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, [loading]);

  // Reaction Handler
  const handleReact = async (changelogId: number, reactionType: 'heart' | 'celebrate' | 'rocket') => {
    if (!user) {
      setAuthModalTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const res = await apiRequest<{
        success: boolean;
        data: {
          action: 'added' | 'removed';
          counts: { heart: number; celebrate: number; rocket: number };
          user_reactions: string[];
        };
      }>(`/api/v1/changelog/${changelogId}/reaction`, {
        method: 'POST',
        body: JSON.stringify({ reaction_type: reactionType }),
      });

      // Update local state
      setChangelogs((prev) =>
        prev.map((item) => {
          if (item.id === changelogId) {
            return {
              ...item,
              reactions: res.data.counts,
              user_reactions: res.data.user_reactions,
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update reaction', 'error');
    }
  };

  // Mark all unread notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/api/v1/notifications/mark-viewed', { method: 'POST' });
      setUnreadCount(0);
      setUnreadItems([]);
      showToast('All notifications marked as read.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to mark notifications as read', 'error');
    }
  };

  const handleOpenAuth = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleSelectChangelog = (slug: string) => {
    const el = document.getElementById(`changelog-${slug}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Sticky Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenAuthModal={handleOpenAuth}
        onOpenFeedModal={() => setIsFeedModalOpen(true)}
        isAdminView={isAdminView}
        onToggleAdminView={() => setIsAdminView(!isAdminView)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isAdminView && isAdmin ? (
          <AdminStudio onChangelogChange={fetchChangelogs} onExit={() => setIsAdminView(false)} />
        ) : (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            
            {/* Hero Section */}
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 shadow-xs mb-3">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>Product Changelog & Engineering Notes</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                What's New in PulseLog
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                Stay updated with the latest releases, design iterations, performance boosts, and bug fixes delivered by our core engineering team.
              </p>
            </div>

            {/* Filter / Search Feedback Bar */}
            {(selectedCategory !== 'All' || searchQuery.trim()) && (
              <div className="mb-6 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Filtered by:</span>
                  {selectedCategory !== 'All' && (
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      Category: {selectedCategory}
                    </span>
                  )}
                  {searchQuery.trim() && (
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      Query: "{searchQuery}"
                    </span>
                  )}
                  <span className="text-slate-400">({changelogs.length} found)</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="text-sky-600 hover:text-sky-700 dark:text-sky-400 font-semibold"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Changelog Timeline Feed */}
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-28 mb-4" />
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4 mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full" />
                      <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : changelogs.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">No releases matched your criteria</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Try adjusting your search query or selecting another category filter.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-semibold"
                >
                  Show All Releases
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {changelogs.map((item) => (
                  <ChangelogCard
                    key={item.id}
                    item={item}
                    onReact={handleReact}
                    onRequireAuth={() => handleOpenAuth('login')}
                  />
                ))}
              </div>
            )}

            {/* Back to top helper */}
            <div className="mt-12 text-center">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                Back to top
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Global Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">PulseLog</span>
            <span>—</span>
            <span>Modern Product Updates & Changelog Hub</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setIsFeedModalOpen(true)}
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Rss className="w-3.5 h-3.5 text-amber-500" />
              <span>JSON Feed 1.1</span>
            </button>
            <span>v2.4.0 Core</span>
            <span>REST API & SQLite</span>
          </div>
        </div>
      </footer>

      {/* Overlays */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        unreadCount={unreadCount}
        unreadItems={unreadItems}
        onMarkAllAsRead={handleMarkAllAsRead}
        onSelectChangelog={handleSelectChangelog}
        onOpenAuth={() => handleOpenAuth('login')}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      <FeedModal
        isOpen={isFeedModalOpen}
        onClose={() => setIsFeedModalOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ChangelogApp />
      </ToastProvider>
    </AuthProvider>
  );
}
