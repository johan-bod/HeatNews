export interface WatchRule {
  id: string;
  createdAt: number;
  label: string;
  /** Case-insensitive keywords matched against cluster headline + topics. ANY must match. */
  keywords: string[];
  /** Optional region/country strings. If non-empty, ANY must match an article's country or location. */
  regions: string[];
  active: boolean;
}

export interface StoryAlert {
  id: string;
  /** Composite dedup key: `${leadArticleId}::${ruleId}` */
  dedupeKey: string;
  ruleId: string;
  ruleLabel: string;
  triggeredAt: number;
  headline: string;
  leadArticleId: string;
  heatLevel: number;
  read: boolean;
}
