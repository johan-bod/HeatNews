interface GlobeTooltipProps {
  title: string;
  source: string;
  position: { x: number; y: number };
}

export default function GlobeTooltip({ title, source, position }: GlobeTooltipProps) {
  return (
    <div
      className="fixed z-30 pointer-events-none max-w-56 bg-navy-900/90 backdrop-blur-sm border border-amber-500/15 rounded-md px-3 py-2 shadow-lg"
      style={{
        left: position.x + 12,
        top: position.y - 10,
      }}
    >
      <p className="font-body text-xs text-ivory-50 leading-tight line-clamp-2">{title}</p>
      <p className="font-body text-[10px] text-ivory-200/50 mt-0.5">{source}</p>
    </div>
  );
}
