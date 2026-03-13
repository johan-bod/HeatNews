import { Flame, MousePointer2 } from 'lucide-react';

export default function GlobeLegend() {
  return (
    <div className="w-full bg-navy-900 border-t border-ivory-200/5">
      <div className="max-w-4xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {/* Heat scale */}
        <div className="flex items-center gap-2">
          <span className="font-body text-[11px] text-ivory-200/30 uppercase tracking-wider">Heat</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="font-body text-[10px] text-ivory-200/25">Cold</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-body text-[10px] text-ivory-200/25">Warm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            <span className="font-body text-[10px] text-ivory-200/25">Hot</span>
          </div>
        </div>

        <div className="w-px h-4 bg-ivory-200/10 hidden sm:block" />

        {/* Interaction hints */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-body text-[10px] text-ivory-200/25">
            <MousePointer2 className="w-3 h-3 text-ivory-200/20" />
            Click a marker for details
          </span>
          <span className="flex items-center gap-1.5 font-body text-[10px] text-ivory-200/25">
            <MousePointer2 className="w-3 h-3 text-ivory-200/20" />
            Click globe to interact, scroll to continue
          </span>
        </div>
      </div>
    </div>
  );
}
