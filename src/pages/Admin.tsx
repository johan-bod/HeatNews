import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, RefreshCw, Trash2, BarChart3, Database, Clock, TrendingUp, Zap } from 'lucide-react';
import { refreshNewsCache } from '@/services/cachedNews';
import { getCacheData, clearExpiredCache } from '@/utils/cache';
import { toast } from 'sonner';

export default function Admin() {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState<Record<string, unknown> | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = () => {
    const stats = {
      localCache: getCacheData('local_news'),
      regionalCache: getCacheData('regional_news'),
      nationalCache: getCacheData('national_news'),
      internationalCache: getCacheData('international_news'),
    };
    setCacheStats(stats);

    const lastRefreshTimestamp = getCacheData<number>('last_background_refresh');
    if (lastRefreshTimestamp) {
      setLastRefresh(new Date(lastRefreshTimestamp));
    }
  };

  const handleRefreshCache = async () => {
    try {
      setIsRefreshing(true);
      await refreshNewsCache();
      loadCacheStats();
      toast.success('Cache refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      toast.error('Failed to refresh cache');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (!confirm('Are you sure you want to clear all cache? This will trigger a fresh API fetch.')) return;

    localStorage.removeItem('news_cache_local_news');
    localStorage.removeItem('news_cache_regional_news');
    localStorage.removeItem('news_cache_national_news');
    localStorage.removeItem('news_cache_international_news');
    localStorage.removeItem('news_cache_last_background_refresh');
    clearExpiredCache();
    loadCacheStats();
    toast.success('All cache cleared');
  };

  const calculateCacheSize = (cache: unknown) => {
    if (!cache || typeof cache !== 'object') return '0 KB';
    const size = JSON.stringify(cache).length;
    return size > 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`;
  };

  const getTimeUntilRefresh = () => {
    if (!lastRefresh) return 'Unknown';
    const fourHoursLater = new Date(lastRefresh.getTime() + 4 * 60 * 60 * 1000);
    const diff = fourHoursLater.getTime() - Date.now();
    if (diff <= 0) return 'Refresh pending';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const cacheRegions = [
    { key: 'localCache', label: 'Hyperlocal', flag: '🇫🇷', detail: 'French cities' },
    { key: 'regionalCache', label: 'Regional', flag: '🏛️', detail: 'French regions' },
    { key: 'nationalCache', label: 'National', flag: '🇪🇺', detail: 'European countries' },
    { key: 'internationalCache', label: 'International', flag: '🌍', detail: 'Worldwide news' },
  ] as const;

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={cacheStats ? 'default' : 'secondary'} className={cacheStats ? 'bg-green-600' : ''}>
                {cacheStats ? 'Active' : 'Empty'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {cacheStats ? '4 regions cached' : 'No cached data'}
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
              <p className="text-xs text-muted-foreground mt-1">Auto-refresh every 4 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cacheStats ? calculateCacheSize(cacheStats) : '0 KB'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total storage used</p>
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
            <CardDescription>Manage the 4-hour background caching system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cacheRegions.map(region => {
                const cache = cacheStats?.[region.key] as Record<string, unknown> | undefined;
                const articles = cache?.articles as unknown[] | undefined;
                return (
                  <div key={region.key} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{region.flag} {region.label}</h3>
                      <Badge variant="outline" className="text-xs">
                        {articles?.length || 0} articles
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Size: {calculateCacheSize(cache)}</p>
                    <p className="text-xs text-slate-400">{region.detail}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button onClick={handleRefreshCache} disabled={isRefreshing} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Force Refresh Cache'}
              </Button>
              <Button onClick={handleClearCache} variant="destructive" className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear All Cache
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
            <CardDescription>NewsData.io API consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">Estimated Daily Usage</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600">~24 requests</p>
                <p className="text-xs text-slate-500 mt-1">6 auto-refreshes/day x 4 regions</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h3 className="font-semibold text-sm">Free Tier Limit</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">200 / day</p>
                <p className="text-xs text-slate-500 mt-1">88% headroom remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
