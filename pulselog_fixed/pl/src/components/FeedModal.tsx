import React, { useState, useEffect } from 'react';
import { X, Rss, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api/client';
import { JSONFeedResponse } from '../types';
import { useToast } from './Toast';

interface FeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedModal: React.FC<FeedModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [feedData, setFeedData] = useState<JSONFeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const feedUrl = `${window.location.origin}/api/v1/changelog/feed`;

  useEffect(() => {
    if (isOpen) {
      fetchFeed();
    }
  }, [isOpen]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<JSONFeedResponse>('/api/v1/changelog/feed');
      setFeedData(res);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    showToast('JSON Feed 1.1 URL copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">JSON Feed 1.1 Specification</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Standardized syndication format for readers and automation bots</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feed URL Bar */}
        <div className="my-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex-1 overflow-hidden font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
            {feedUrl}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="copy-feed-url-btn"
              onClick={copyUrl}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 text-slate-800 dark:text-slate-100 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </button>
            <a
              href="/api/v1/changelog/feed"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700"
              title="Open raw JSON"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Payload Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Live Feed Payload Preview:</span>
            <button
              onClick={fetchFeed}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 max-h-72 overflow-y-auto font-mono text-xs text-sky-300 border border-slate-800">
            {loading ? (
              <span className="text-slate-500">Loading feed output...</span>
            ) : feedData ? (
              <pre className="whitespace-pre-wrap">{JSON.stringify(feedData, null, 2)}</pre>
            ) : (
              <span className="text-rose-400">Failed to render JSON feed.</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
