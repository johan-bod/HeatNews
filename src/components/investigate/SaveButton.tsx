import { Bookmark } from 'lucide-react';
import { useSavedStories } from '@/hooks/useSavedStories';
import { toast } from '@/components/ui/sonner';
import { createSavedStory } from '@/services/savedStories';
import type { StoryCluster } from '@/utils/topicClustering';
import type { NewsArticle } from '@/types/news';
import type { PotentialAssessment, TimelineInfo } from '@/utils/storyBrief';
import type { CoverageGapResult } from '@/utils/coverageGap';

interface SaveButtonProps {
  cluster: StoryCluster;
  lead: NewsArticle;
  potential: PotentialAssessment;
  timeline: TimelineInfo | null;
  coverageGap: CoverageGapResult | null;
  /** 'sm' for dashboard cards, 'md' for Investigate page header */
  size?: 'sm' | 'md';
}

export default function SaveButton({
  cluster, lead, potential, timeline, coverageGap, size = 'md',
}: SaveButtonProps) {
  const { isSaved, getSaved, save, remove } = useSavedStories();
  const alreadySaved = isSaved(lead.id);
  const existing = getSaved(lead.id);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (alreadySaved && existing) {
      await remove(existing.id);
      toast.success('Removed from watchlist.');
    } else {
      await save(createSavedStory(cluster, lead, potential, timeline, coverageGap));
      toast.success('Story saved to watchlist.');
    }
  }

  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      onClick={toggle}
      title={alreadySaved ? 'Remove from watchlist' : 'Save to watchlist'}
      className={`flex items-center gap-1.5 transition-colors ${
        alreadySaved
          ? 'text-amber-400'
          : 'text-ivory-200/30 hover:text-ivory-200/70'
      }`}
    >
      <Bookmark className={`${icon} ${alreadySaved ? 'fill-amber-400' : ''}`} />
      {size === 'md' && (
        <span className="text-xs">{alreadySaved ? 'Saved' : 'Save'}</span>
      )}
    </button>
  );
}
