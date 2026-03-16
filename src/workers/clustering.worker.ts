/// <reference lib="webworker" />
import { clusterArticles } from '@/utils/topicClustering';
import { serializeCluster } from './clustering.worker.types';
import type { ClusterWorkerInput, ClusterWorkerOutput } from './clustering.worker.types';

self.onmessage = (e: MessageEvent<ClusterWorkerInput>) => {
  const { articles, requestId } = e.data;
  const clusters = clusterArticles(articles);
  const output: ClusterWorkerOutput = {
    clusters: clusters.map(serializeCluster),
    requestId,
  };
  self.postMessage(output);
};
