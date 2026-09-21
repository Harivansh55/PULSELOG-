import React from 'react';
import { X, Bell, CheckCheck, Sparkles, Zap, Wrench, Clock, ArrowRight } from 'lucide-react';
import { ChangelogItem, ChangelogCategory } from '../types';
import { useAuth } from '../context/AuthContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  unreadItems: ChangelogItem[];
  onMarkAllAsRead: () => void;
  onSelectChangelog: (slug: string) => void;
  onOpenAuth: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  unreadCount,
  unreadItems,
  onMarkAllAsRead,
  onSelectChangelog,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const getCategoryIcon = (cat: ChangelogCategory) => {
    switch (cat) {
      case 'New':
        return <Sparkles className="w-3 h-3 text-emerald-500" />;
      case 'Improved':
        return <Zap className="w-3 h-3 text-sky-500" />;
      case 'Fixed':
        return <Wrench className="w-3 h-3 text-amber-500" />;
      default:
        return <Clock className="w-3 h-3 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">What's New</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && user && (
                <button
                  id="mark-all-read-btn"
                  onClick={onMarkAllAsRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/60 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Guest Sign-in Reminder */}
          {!user && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Sign in to sync your read status across devices.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="text-xs font-bold text-amber-900 dark:text-amber-200 underline shrink-0 ml-2"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {unreadItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400 mb-3">
                  <CheckCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">You're up to date!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                  You have read all recent changelogs. Check back soon for future release announcements.
                </p>
              </div>
            ) : (
              unreadItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectChangelog(item.slug);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {getCategoryIcon(item.category)}
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.content_markdown.replace(/[#*`_]/g, '')}
                  </p>
                  <div className="mt-2 flex items-center text-[11px] font-semibold text-sky-600 dark:text-sky-400 gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Read release notes</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">PulseLog Notification Center</span>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
