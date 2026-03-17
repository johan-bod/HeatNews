import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw, Trash2, BarChart3, Database, Clock, TrendingUp, Zap, Users, AlertTriangle } from 'lucide-react';
import { refreshNewsCache } from '@/services/cachedNews';
import { getCacheData, getCacheMetadata, clearExpiredCache } from '@/utils/cache';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { NewsArticle } from '@/types/news';

interface RegionMeta {
  articles: number;
  sizeKb: string;
  ageMinutes: number | null;
  isStale: boolean;
  lastUpdated: string;
}

const REGIONS = [
  { cacheKey: 'local_news',         label: 'Hyperlocal', flag: '🇫🇷', detail: 'French cities' },
  { cacheKey: 'regional_news',      label: 'Regional',   flag: '🏛️', detail: 'French regions' },
  { cacheKey: 'national_news',      label: 'National',   flag: '🇪🇺', detail: 'European countries' },
  { cacheKey: 'international_news', label: 'International', flag: '🌍', detail: 'Worldwide news' },
] as const;

function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m ago`;
}

function loadRegionMeta(): Record<string, RegionMeta> {
  const result: Record<string, RegionMeta> = {};
  for (const r of REGIONS) {
    const data = getCacheData<NewsArticle[]>(r.cacheKey);
    const meta = getCacheMetadata(r.cacheKey);
    const articleCount = Array.isArray(data) ? data.length : 0;
    const raw = data ? JSON.stringify(data) : '';
    const sizeBytes = new TextEncoder().encode(raw).length;
    const sizeKb = sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(1)} KB` : `${sizeBytes} B`;

    let ageMinutes: number | null = null;
    let isStale = false;
    let lastUpdated = '—';

    if (meta) {
      ageMinutes = (Date.now() - meta.timestamp) / 60_000;
      isStale = ageMinutes > 4 * 60; // >4h
      lastUpdated = new Date(meta.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
      });
    }

    result[r.cacheKey] = { articles: articleCount, sizeKb, ageMinutes, isStale, lastUpdated };
  }
  return result;
}

export default function Admin() {
  useDocumentTitle('Admin — HeatStory');
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [regionMeta, setRegionMeta] = useState<Record<string, RegionMeta>>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [clearPending, setClearPending] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  const refreshMeta = () => {
    setRegionMeta(loadRegionMeta());
    const ts = getCacheData<number>('last_background_refresh');
    if (ts) setLastRefresh(new Date(ts));
  };

  useEffect(() => {
    refreshMeta();
    // Fetch Firestore user count
    if (db) {
      getCountFromServer(collection(db, 'users'))
        .then(snap => setUserCount(snap.data().count))
        .catch(() => setUserCount(null));
    }
  }, []);

  const handleRefreshCache = async () => {
    try {
      setIsRefreshing(true);
      await refreshNewsCache();
      refreshMeta();
      toast.success('Cache refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      toast.error('Failed to refresh cache');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (!clearPending) {
      setClearPending(true);
      setTimeout(() => setClearPending(false), 4000);
      return;
    }
    setClearPending(false);
    for (const r of REGIONS) localStorage.removeItem(`news_cache_${r.cacheKey}`);
    localStorage.removeItem('news_cache_last_background_refresh');
    clearExpiredCache();
    refreshMeta();
    toast.success('All cache cleared');
  };

  const getTimeUntilRefresh = () => {
    if (!lastRefresh) return 'Unknown';
    const next = new Date(lastRefresh.getTime() + 4 * 60 * 60 * 1000);
    const diff = next.getTime() - Date.now();
    if (diff <= 0) return 'Overdue';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  // Estimate today's requests: each refresh = 4 calls (one per region)
  // BroadcastChannel ensures only one tab actually fetches, so per-session.
  const totalArticles = Object.values(regionMeta).reduce((s, r) => s + r.articles, 0);
  const totalSizeKb = (() => {
    let bytes = 0;
    for (const r of REGIONS) {
      const data = getCacheData(r.cacheKey);
      if (data) bytes += new TextEncoder().encode(JSON.stringify(data)).length;
    }
    return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
  })();

  const hasStaleRegion = Object.values(regionMeta).some(r => r.isStale);
  const anyData = Object.values(regionMeta).some(r => r.articles > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl font-bold font-montserrat text-slate-800">Admin Panel</h1>
          </div>
          <p className="text-slate-600">
            Welcome, <span className="font-semibold">{user?.displayName || user?.email}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={anyData ? 'default' : 'secondary'} className={anyData ? 'bg-green-600' : ''}>
                  {anyData ? 'Active' : 'Empty'}
                </Badge>
                {hasStaleRegion && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Stale
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {anyData ? `${totalArticles} articles cached` : 'No cached data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Refresh</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTimeUntilRefresh()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastRefresh
                  ? `Last: ${lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Auto-refresh every 4h'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSizeKb}</div>
              <p className="text-xs text-muted-foreground mt-1">Total localStorage used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userCount === null ? '—' : userCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Firestore users/{'{uid}'} docs</p>
            </CardContent>
          </Card>
        </div>

        {/* Cache Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cache Management
            </CardTitle>
            <CardDescription>Per-region cache freshness and article counts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {REGIONS.map(region => {
                const meta = regionMeta[region.cacheKey];
                return (
                  <div
                    key={region.cacheKey}
                    className={`border rounded-lg p-4 ${meta?.isStale ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{region.flag} {region.label}</h3>
                      <div className="flex items-center gap-1">
                        {meta?.isStale && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        <Badge variant="outline" className="text-xs">
                          {meta?.articles ?? 0} articles
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">Size: {meta?.sizeKb ?? '0 B'}</p>
                    {meta?.ageMinutes !== null && meta?.ageMinutes !== undefined ? (
                      <p className={`text-xs ${meta.isStale ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                        Updated {formatAge(meta.ageMinutes)} ({meta.lastUpdated})
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">No data yet</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button onClick={handleRefreshCache} disabled={isRefreshing} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Force Refresh Cache'}
              </Button>
              <Button
                onClick={handleClearCache}
                variant="destructive"
                className={`flex items-center gap-2 transition-all ${clearPending ? 'ring-2 ring-red-400' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                {clearPending ? 'Click again to confirm' : 'Clear All Cache'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              API Usage
            </CardTitle>
            <CardDescription>NewsData.io API consumption estimate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">Per refresh</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">4 requests</p>
                <p className="text-xs text-slate-500 mt-1">1 per region per cycle</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <h3 className="font-semibold text-sm">Estimated daily</h3>
                </div>
                <p className="text-2xl font-bold text-slate-700">~24 requests</p>
                <p className="text-xs text-slate-500 mt-1">6 auto-refreshes/day × 4 regions</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-sm">Free tier limit</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">200 / day</p>
                <p className="text-xs text-slate-500 mt-1">~88% headroom remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
