import './hero-globe.css';

interface HeatDot {
  angle: number;
  elevation: number;
  color: string;
  size: 'sm' | 'md';
  delay: number;
  ignite?: boolean;
}

const HEAT_DOTS: HeatDot[] = [
  { angle: 35, elevation: 33, color: '#ef4444', size: 'md', delay: 0, ignite: true },
  { angle: 60, elevation: 25, color: '#ef4444', size: 'sm', delay: 0.8 },
  { angle: 15, elevation: 48, color: '#ef4444', size: 'md', delay: 1.5, ignite: true },
  { angle: 350, elevation: 5, color: '#ef4444', size: 'sm', delay: 2.3 },
  { angle: 25, elevation: 10, color: '#ef4444', size: 'sm', delay: 3.1 },
  { angle: 355, elevation: 45, color: '#f97316', size: 'md', delay: 0.3 },
  { angle: 280, elevation: 40, color: '#f97316', size: 'md', delay: 1.0, ignite: true },
  { angle: 260, elevation: 35, color: '#f97316', size: 'sm', delay: 1.8 },
  { angle: 120, elevation: 35, color: '#f97316', size: 'sm', delay: 2.5 },
  { angle: 130, elevation: 22, color: '#f97316', size: 'md', delay: 3.5 },
  { angle: 315, elevation: -20, color: '#f59e0b', size: 'sm', delay: 0.5 },
  { angle: 300, elevation: 20, color: '#f59e0b', size: 'sm', delay: 1.3 },
  { angle: 155, elevation: -30, color: '#f59e0b', size: 'md', delay: 2.0 },
  { angle: 5, elevation: -25, color: '#f59e0b', size: 'sm', delay: 2.8, ignite: true },
  { angle: 345, elevation: 55, color: '#f59e0b', size: 'sm', delay: 3.3 },
  { angle: 75, elevation: 45, color: '#f59e0b', size: 'sm', delay: 0.7 },
];

export default function HeroGlobe() {
  const radius = 160;

  return (
    <div className="hero-globe-container" aria-hidden="true">
      <div className="hero-globe-sphere">
        <div className="hero-globe-grid" />
      </div>
      <div className="hero-globe-orbit">
        {HEAT_DOTS.map((dot, i) => {
          const rad = (dot.angle * Math.PI) / 180;
          const elRad = (dot.elevation * Math.PI) / 180;
          const x = Math.sin(rad) * Math.cos(elRad) * radius;
          const y = -Math.sin(elRad) * radius;
          const z = Math.cos(rad) * Math.cos(elRad) * radius;

          return (
            <div
              key={i}
              className={`hero-globe-dot ${dot.size === 'md' ? 'hero-globe-dot--md' : ''} ${dot.ignite ? 'hero-globe-dot--ignite' : ''}`}
              style={{
                '--dot-color': dot.color,
                '--dot-delay': `${dot.delay}s`,
                '--dot-ignite-delay': `${dot.delay + 2}s`,
                transform: `translate3d(${x}px, ${y}px, ${z}px)`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
