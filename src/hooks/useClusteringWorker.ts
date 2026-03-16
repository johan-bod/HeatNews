import { useRef, useState, useEffect, useCallback } from 'react';
import { analyzeArticleHeat, heatLevelToColor } from '@/utils/topicClustering';
import { deserializeCluster } from '@/workers/clustering.worker.types';
import type { ClusterWorkerOutput } from '@/workers/clustering.worker.types';
import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';

export function useClusteringWorker() {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clusters, setClusters] = useState<StoryCluster[]>([]);
  const [isClustering, setIsClustering] = useState(false);

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../workers/clustering.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = (e: MessageEvent<ClusterWorkerOutput>) => {
        const { clusters: serialized, requestId } = e.data;
        if (requestId !== requestIdRef.current) return; // stale result
        const deserialized = serialized.map(deserializeCluster);
        // Sync heatLevel + color back onto articles
        for (const cluster of deserialized) {
          const color = heatLevelToColor(cluster.heatLevel);
          for (const a of cluster.articles) {
            a.heatLevel = cluster.heatLevel;
            a.color = color;
          }
        }
        setClusters(deserialized);
        setIsClustering(false);
      };
      worker.onerror = () => {
        setIsClustering(false);
        // Worker failed — fall back handled in runClustering
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }
    return () => workerRef.current?.terminate();
  }, []);

  const runClustering = useCallback((articles: NewsArticle[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (articles.length === 0) {
        setClusters([]);
        return;
      }
      setIsClustering(true);
      const id = ++requestIdRef.current;

      if (workerRef.current) {
        workerRef.current.postMessage({ articles, requestId: id });
      } else {
        // Synchronous fallback
        const cs = analyzeArticleHeat(articles, 'international');
        for (const cluster of cs) {
          const color = heatLevelToColor(cluster.heatLevel);
          for (const a of cluster.articles) {
            a.heatLevel = cluster.heatLevel;
            a.color = color;
          }
        }
        setClusters(cs);
        setIsClustering(false);
      }
    }, 150);
  }, []);

  return { clusters, isClustering, runClustering };
}
