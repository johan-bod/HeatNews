# Feed Card Investigate Entry Point Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Investigate this story" button to feed article cards so users can reach /investigate from the news feed.

**Architecture:** Pass existing `clusters` array from Index.tsx to NewsDemo as a prop. Each card looks up its cluster and shows an investigate button when the cluster has 2+ articles.

**Tech Stack:** React 19, TypeScript, React Router v7, Tailwind CSS

---

## Chunk 1: Feed Investigate Button

### Task 1: Add investigate button to NewsDemo

**Files:**
- Modify: `src/components/NewsDemo.tsx`

- [ ] **Step 1: Add imports**

After line 5 (`import type { NewsArticle } from '@/types/news';`), add:
```typescript
import type { StoryCluster } from '@/utils/topicClustering';
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Add `clusters` prop to interface**

Change the `NewsDemoProps` interface (lines 8-13) from:
```typescript
interface NewsDemoProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  selectedScale?: string;
  onArticleLocate?: (lat: number, lng: number) => void;
}
```
to:
```typescript
interface NewsDemoProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  selectedScale?: string;
  onArticleLocate?: (lat: number, lng: number) => void;
  clusters?: StoryCluster[];
}
```

- [ ] **Step 3: Destructure new prop and add navigate hook**

Change line 31 from:
```typescript
const NewsDemo = ({ articles, isLoading = false, selectedScale = 'all', onArticleLocate }: NewsDemoProps) => {
```
to:
```typescript
const NewsDemo = ({ articles, isLoading = false, selectedScale = 'all', onArticleLocate, clusters }: NewsDemoProps) => {
  const navigate = useNavigate();
```

- [ ] **Step 4: Add investigate button inside each card**

After the closing `</div>` of the metadata flex row (after line 212), add the investigate button before the card's closing `</div>` and `</CardContent>`:

```tsx
{(() => {
  const cluster = clusters?.find(c => c.articles.some(a => a.id === article.id));
  const showInvestigate = cluster && cluster.articles.length >= 2;
  return showInvestigate ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/investigate?article=${article.id}`, {
          state: { cluster, article },
        });
      }}
      className="text-xs text-amber-400 hover:text-amber-300 transition-colors mt-2"
    >
      Investigate this story →
    </button>
  ) : null;
})()}
```

This goes inside the `<div className="flex-1 min-w-0">` block, after the metadata `<div>` (line 212) and before the closing `</div>` at line 213.

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/NewsDemo.tsx
git commit -m "feat: add investigate button to feed article cards"
```

---

### Task 2: Pass clusters from Index.tsx to NewsDemo

**Files:**
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add clusters prop to NewsDemo usage**

Find the existing `<NewsDemo` JSX (line 443):
```tsx
<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} />
```

Change to:
```tsx
<NewsDemo articles={articles} isLoading={isLoading} selectedScale={selectedScale} onArticleLocate={handleArticleLocate} clusters={clusters} />
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: pass clusters to NewsDemo for investigate entry point"
```
