import { useState, useCallback } from 'react';
import { Download, Copy, Check, X, FileText, Braces } from 'lucide-react';
import type { BriefInput, StoryBrief } from '@/utils/storyBrief';
import { generateBrief } from '@/utils/storyBrief';

interface ExportBriefButtonProps {
  input: BriefInput;
}

type CopyTarget = 'markdown' | 'json' | null;

export default function ExportBriefButton({ input }: ExportBriefButtonProps) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [copied, setCopied] = useState<CopyTarget>(null);

  const openModal = useCallback(() => {
    setBrief(generateBrief(input));
    setOpen(true);
  }, [input]);

  const copy = useCallback(async (target: CopyTarget) => {
    if (!brief || !target) return;
    const text = target === 'markdown'
      ? brief.markdown
      : JSON.stringify(brief.json, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(target);
      setTimeout(() => setCopied(null), 2000);
    }
  }, [brief]);

  const download = useCallback((ext: 'md' | 'json') => {
    if (!brief) return;
    const content = ext === 'md'
      ? brief.markdown
      : JSON.stringify(brief.json, null, 2);
    const mime = ext === 'md' ? 'text/markdown' : 'application/json';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brief.filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [brief]);

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 border border-amber-400/30 rounded-md hover:bg-amber-400/10 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        Export Brief
      </button>

      {open && brief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#0d0d14] border border-ivory-200/10 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ivory-200/10 flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-ivory-100">Investigation Brief</h2>
                <p className="text-xs text-ivory-200/40 mt-0.5">
                  LLM-ready · paste into Claude, ChatGPT, or any AI tool
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-ivory-200/25">
                    {brief.json.coverage.total_articles} sources
                  </span>
                  {brief.json.primary_sources.length > 0 && (
                    <span className="text-[10px] text-cyan-400/50">
                      · {brief.json.primary_sources.length} primary
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-ivory-200/40 hover:text-ivory-100 transition-colors rounded-md hover:bg-ivory-200/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="font-mono text-xs text-ivory-200/70 whitespace-pre-wrap leading-relaxed">
                {brief.markdown}
              </pre>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-ivory-200/10 flex-shrink-0 bg-[#0a0a0f]/80">
              {/* Copy Markdown */}
              <button
                onClick={() => copy('markdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-md transition-colors"
              >
                {copied === 'markdown'
                  ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                  : <><Copy className="w-3.5 h-3.5" /> Copy Markdown</>}
              </button>

              {/* Download .md */}
              <button
                onClick={() => download('md')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ivory-200/70 border border-ivory-200/20 rounded-md hover:bg-ivory-200/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download .md
              </button>

              {/* Copy JSON */}
              <button
                onClick={() => copy('json')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ivory-200/70 border border-ivory-200/20 rounded-md hover:bg-ivory-200/10 transition-colors"
              >
                {copied === 'json'
                  ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                  : <><Braces className="w-3.5 h-3.5" /> Copy JSON</>}
              </button>

              {/* Download JSON */}
              <button
                onClick={() => download('json')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ivory-200/70 border border-ivory-200/20 rounded-md hover:bg-ivory-200/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download .json
              </button>

              <span className="ml-auto text-[10px] text-ivory-200/25 hidden sm:block">
                Generated by HeatNews · heatnews.app
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
