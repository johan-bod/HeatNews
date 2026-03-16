import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Send, Trash2, ToggleLeft, ToggleRight, Rss, Globe, Tag } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useSourceFeeds } from '@/hooks/useSourceFeeds';
import UpgradePrompt from '@/components/UpgradePrompt';
import { buildFeedUrl } from '@/utils/feedParser';
import type { SourceFeed, FeedSourceType } from '@/types/sourceFeed';

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS: Array<{
  type: FeedSourceType;
  label: string;
  icon: string;
  placeholder: string;
  hint: string;
}> = [
  { type: 'telegram', icon: '✈️', label: 'Telegram channel',  placeholder: 'channel_username',      hint: 'e.g. iranintl_fa, hezbollah, TASS_agency' },
  { type: 'facebook', icon: '📘', label: 'Facebook page',     placeholder: 'page-name-or-id',        hint: 'Public pages only — e.g. guardiannews' },
  { type: 'youtube',  icon: '▶️', label: 'YouTube channel',   placeholder: 'UCxxxxxxxxx or @handle', hint: 'Channel ID or @handle' },
  { type: 'reddit',   icon: '🔸', label: 'Subreddit',         placeholder: 'worldnews',              hint: 'Subreddit name without r/' },
  { type: 'rss',      icon: '📡', label: 'RSS/Atom feed',     placeholder: 'https://…/feed.xml',     hint: 'Any public RSS or Atom URL' },
];

const TYPE_BADGE: Record<FeedSourceType, string> = {
  telegram: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
  facebook: 'bg-blue-500/10 text-blue-400 border-blue-400/20',
  youtube:  'bg-red-500/10 text-red-400 border-red-400/20',
  reddit:   'bg-orange-500/10 text-orange-400 border-orange-400/20',
  rss:      'bg-amber-500/10 text-amber-400 border-amber-400/20',
  custom:   'bg-ivory-200/10 text-ivory-200/50 border-ivory-200/15',
};

const TYPE_LABEL: Record<FeedSourceType, string> = {
  telegram: 'Telegram', facebook: 'Facebook', youtube: 'YouTube',
  reddit: 'Reddit', rss: 'RSS', custom: 'Custom',
};

// ── Test connection button ─────────────────────────────────────────────────────

function TestConnectionButton({ rsshubBase }: { rsshubBase: string }) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');

  async function test() {
    setStatus('testing');
    try {
      // Test with a known public Telegram channel feed
      const testUrl = `${rsshubBase.replace(/\/$/, '')}/telegram/channel/telegram`;
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(testUrl)}`);
      setStatus(res.ok ? 'ok' : 'error');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <button
      onClick={test}
      disabled={status === 'testing'}
      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex-shrink-0 ${
        status === 'ok'    ? 'text-emerald-400 border-emerald-400/30' :
        status === 'error' ? 'text-red-400 border-red-400/30' :
        'text-ivory-200/40 border-ivory-200/15 hover:border-ivory-200/30'
      }`}
    >
      {status === 'testing' ? '…' : status === 'ok' ? '✓ OK' : status === 'error' ? '✗ Failed' : 'Test'}
    </button>
  );
}

// ── Add feed form ─────────────────────────────────────────────────────────────

function AddFeedForm({ rsshubBase, onAdd }: { rsshubBase: string; onAdd: (feed: SourceFeed) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedSourceType>('telegram');
  const [handle, setHandle] = useState('');
  const [label, setLabel]   = useState('');
  const [tags, setTags]     = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const preset = PRESETS.find(p => p.type === type)!;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    const url = buildFeedUrl(type, handle.trim(), rsshubBase);
    onAdd({
      id:         `feed-${Date.now()}`,
      createdAt:  Date.now(),
      label:      label.trim() || `${preset.label}: ${handle.trim()}`,
      url,
      type,
      tags:       tags.split(',').map(t => t.trim()).filter(Boolean),
      country:    country.trim() || undefined,
      language:   language.trim() || undefined,
      maxItems:   20,
      active:     true,
    });
    setHandle(''); setLabel(''); setTags(''); setCountry(''); setLanguage(''); setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add source feed
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-3 rounded-xl border border-ivory-200/10 bg-ivory-200/[0.03]">
      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.type}
            type="button"
            onClick={() => { setType(p.type); setHandle(''); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              type === p.type
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                : 'border-ivory-200/10 text-ivory-200/40 hover:border-ivory-200/25'
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Handle / URL */}
      <div>
        <input
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder={preset.placeholder}
          required
          className="w-full bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
        />
        <p className="text-[10px] text-ivory-200/25 mt-1 pl-1">{preset.hint}</p>
      </div>

      {/* Optional fields */}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Display name (optional)"
          className="bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
        />
        <div className="flex items-center gap-1.5">
          <Tag className="w-3 h-3 text-ivory-200/30 flex-shrink-0" />
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Tags, comma-separated"
            className="flex-1 bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-ivory-200/30 flex-shrink-0" />
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="Country code (e.g. FR)"
            className="flex-1 bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
          />
        </div>
        <input
          value={language}
          onChange={e => setLanguage(e.target.value)}
          placeholder="Language (e.g. ar, fa)"
          className="bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
        >
          Add feed
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-ivory-200/40 hover:text-ivory-200/70 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Feed row ──────────────────────────────────────────────────────────────────

function FeedRow({
  feed,
  articleCount,
  onToggle,
  onDelete,
}: {
  feed: SourceFeed;
  articleCount: number;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${feed.active ? 'border-ivory-200/12 bg-ivory-200/[0.02]' : 'border-ivory-200/6 opacity-50'}`}>
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className="text-ivory-200/40 hover:text-amber-400 transition-colors flex-shrink-0">
          {feed.active
            ? <ToggleRight className="w-4 h-4 text-amber-400" />
            : <ToggleLeft  className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-semibold text-ivory-100 truncate">{feed.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_BADGE[feed.type]}`}>
              {TYPE_LABEL[feed.type]}
            </span>
            {articleCount > 0 && (
              <span className="text-[9px] text-ivory-200/30 flex-shrink-0">{articleCount} items</span>
            )}
          </div>
          <p className="text-[10px] text-ivory-200/25 truncate">{feed.url}</p>
          {feed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {feed.tags.map(t => (
                <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-amber-400/8 text-amber-400/60">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <button onClick={onDelete} className="text-ivory-200/20 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const RSSHUB_STORAGE_KEY = 'ht-rsshub-base';
const DEFAULT_RSSHUB = 'https://rsshub.app';

export default function SourceFeedsPanel({ canAddFeed = true, isPaid = false }: { canAddFeed?: boolean; isPaid?: boolean }) {
  const navigate = useNavigate();
  const { feeds, feedArticles, isFetching, addFeed, toggleFeed, deleteFeed, refreshFeeds } = useSourceFeeds(isPaid);
  const effectiveCanAddFeed = canAddFeed && (isPaid || feeds.length < 2);

  const [rsshubBase, setRsshubBase] = useState(() =>
    localStorage.getItem(RSSHUB_STORAGE_KEY) ?? DEFAULT_RSSHUB
  );

  useEffect(() => {
    localStorage.setItem(RSSHUB_STORAGE_KEY, rsshubBase);
  }, [rsshubBase]);

  const countByFeed = (feedId: string) => feedArticles.filter(a => a.feedId === feedId).length;

  // Recent items across all feeds, sorted by date
  const recent = [...feedArticles]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 20);

  return (
    <div className="space-y-6">

      {/* ── Configured feeds ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-ivory-200/50 uppercase tracking-wider">Source feeds</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-ivory-200/25">{feeds.filter(f => f.active).length} active</span>
            {feeds.length > 0 && (
              <button
                onClick={refreshFeeds}
                disabled={isFetching}
                className="flex items-center gap-1 text-[10px] text-ivory-200/35 hover:text-amber-400 transition-colors"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Fetching…' : 'Refresh'}
              </button>
            )}
          </div>
        </div>

        {feeds.length === 0 ? (
          <div className="text-center py-6 mb-3">
            <Rss className="w-7 h-7 text-ivory-200/15 mx-auto mb-2" />
            <p className="text-xs text-ivory-200/30 mb-1">No source feeds yet.</p>
            <p className="text-[10px] text-ivory-200/20 max-w-xs mx-auto">
              Add Telegram channels, Facebook pages, government RSS feeds,
              or any public RSS/Atom endpoint to monitor alongside news coverage.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mb-3">
            {feeds.map(feed => (
              <FeedRow
                key={feed.id}
                feed={feed}
                articleCount={countByFeed(feed.id)}
                onToggle={() => toggleFeed(feed.id)}
                onDelete={() => deleteFeed(feed.id)}
              />
            ))}
          </div>
        )}

        {effectiveCanAddFeed
          ? <AddFeedForm rsshubBase={rsshubBase} onAdd={async (feed) => {
              const result = await addFeed(feed);
              if (result.success) toast.success('Feed added.');
              else if (result.limitReached) toast.error('Upgrade to Pro to add more source feeds.');
            }} />
          : <UpgradePrompt feature="source feeds" limitReached="You've reached the free limit of 2 source feeds." />
        }
      </section>

      {/* ── Recent feed items ─────────────────────────────────────────────── */}
      {feedArticles.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-ivory-200/50 uppercase tracking-wider mb-3">
            Recent posts <span className="normal-case text-ivory-200/25 font-normal">({feedArticles.length} total)</span>
          </h3>
          <div className="space-y-2">
            {recent.map(article => {
              const feed = feeds.find(f => f.id === article.feedId);
              return (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => {
                    // If the article is in the live cluster pool, open investigate instead
                    e.preventDefault();
                    navigate(`/app/investigate?article=${article.id}`, {
                      state: { article },
                    });
                  }}
                  className="block p-3 rounded-lg border border-ivory-200/6 hover:border-ivory-200/15 hover:bg-ivory-200/[0.03] transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {feed && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_BADGE[feed.type]}`}>
                        {feed.label}
                      </span>
                    )}
                    <span className="text-[10px] text-ivory-200/25 flex-shrink-0">
                      {new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Send className="w-2.5 h-2.5 text-ivory-200/15 ml-auto flex-shrink-0" />
                  </div>
                  <p className="text-xs text-ivory-200/70 leading-snug line-clamp-2">{article.title}</p>
                  {article.secondaryTopics && article.secondaryTopics.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {article.secondaryTopics.slice(0, 3).map(t => (
                        <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-amber-400/8 text-amber-400/60">{t}</span>
                      ))}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── RSSHub settings ──────────────────────────────────────────────── */}
      <section>
        <details className="group">
          <summary className="text-[10px] text-ivory-200/25 hover:text-ivory-200/50 cursor-pointer list-none flex items-center gap-1 select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            RSSHub instance
          </summary>
          <div className="mt-2 space-y-2">
            <p className="text-[10px] text-ivory-200/25">
              By default HeatNews uses the public rsshub.app instance. For serious monitoring,
              self-host your own instance to avoid rate limits.
            </p>
            <div className="flex gap-2">
              <input
                value={rsshubBase}
                onChange={e => setRsshubBase(e.target.value)}
                placeholder="https://rsshub.app"
                className="flex-1 bg-transparent border border-ivory-200/15 rounded-lg px-3 py-1.5 text-xs text-ivory-100 placeholder-ivory-200/30 focus:outline-none focus:border-amber-400/50"
              />
              <TestConnectionButton rsshubBase={rsshubBase} />
            </div>
            {rsshubBase !== DEFAULT_RSSHUB && (
              <button
                onClick={() => setRsshubBase(DEFAULT_RSSHUB)}
                className="text-[10px] text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}
