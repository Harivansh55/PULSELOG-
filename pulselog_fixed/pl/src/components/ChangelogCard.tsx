import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Calendar, 
  Share2, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Zap, 
  Wrench, 
  Clock,
  Heart,
  PartyPopper,
  Rocket
} from 'lucide-react';
import { ChangelogItem, ChangelogCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface ChangelogCardProps {
  item: ChangelogItem;
  onReact: (changelogId: number, type: 'heart' | 'celebrate' | 'rocket') => void;
  onRequireAuth: () => void;
}

export const ChangelogCard: React.FC<ChangelogCardProps> = ({ item, onReact, onRequireAuth }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const formattedDate = item.published_at
    ? new Date(item.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  const getCategoryBadge = (category: ChangelogCategory) => {
    switch (category) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            New
          </span>
        );
      case 'Improved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Zap className="w-3 h-3" />
            Improved
          </span>
        );
      case 'Fixed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Wrench className="w-3 h-3" />
            Fixed
          </span>
        );
      case 'Maintenance':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Clock className="w-3 h-3" />
            Maintenance
          </span>
        );
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#changelog-${item.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast('Direct anchor link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReactionClick = (type: 'heart' | 'celebrate' | 'rocket') => {
    if (!user) {
      showToast('Please sign in to react to product updates.', 'info');
      onRequireAuth();
      return;
    }
    onReact(item.id, type);
  };

  const isHeartActive = item.user_reactions?.includes('heart');
  const isCelebrateActive = item.user_reactions?.includes('celebrate');
  const isRocketActive = item.user_reactions?.includes('rocket');

  return (
    <article
      id={`changelog-${item.slug}`}
      className="scroll-mt-24 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          {getCategoryBadge(item.category)}
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>
        </div>

        {/* Share Anchor */}
        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Copy link to this release"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
        </button>
      </div>

      {/* Release Title */}
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        <a href={`#changelog-${item.slug}`} className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
          {item.title}
        </a>
      </h2>

      {/* Cover Image (if uploaded) */}
      {item.cover_image && (
        <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
          <img
            src={item.cover_image}
            alt={item.title}
            onClick={() => setImageModalOpen(true)}
            className="w-full h-auto max-h-[420px] object-cover hover:scale-[1.01] transition-transform cursor-pointer"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Markdown Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                {children}
                <ExternalLink className="w-3 h-3 inline ml-0.5" />
              </a>
            ),
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {children}
                  </code>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 overflow-x-auto text-xs font-mono border border-slate-800">
                {children}
              </pre>
            ),
          }}
        >
          {item.content_markdown}
        </ReactMarkdown>
      </div>

      {/* Interactive Reactions */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Heart Reaction */}
          <button
            id={`react-heart-${item.id}`}
            onClick={() => handleReactionClick('heart')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isHeartActive
                ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isHeartActive ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{item.reactions?.heart ?? 0}</span>
          </button>

          {/* Celebrate Reaction */}
          <button
            id={`react-celebrate-${item.id}`}
            onClick={() => handleReactionClick('celebrate')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isCelebrateActive
                ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <PartyPopper className={`w-3.5 h-3.5 ${isCelebrateActive ? 'text-amber-500' : ''}`} />
            <span>{item.reactions?.celebrate ?? 0}</span>
          </button>

          {/* Rocket Reaction */}
          <button
            id={`react-rocket-${item.id}`}
            onClick={() => handleReactionClick('rocket')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isRocketActive
                ? 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900/60'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Rocket className={`w-3.5 h-3.5 ${isRocketActive ? 'text-sky-500 fill-sky-500' : ''}`} />
            <span>{item.reactions?.rocket ?? 0}</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">#{item.slug}</span>
      </div>

      {/* Image Lightbox Modal */}
      {imageModalOpen && item.cover_image && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={item.cover_image}
              alt={item.title}
              className="w-full h-auto object-contain max-h-[85vh] rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </article>
  );
};
