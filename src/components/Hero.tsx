import { Flame, ArrowDown } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative pt-14 overflow-hidden noise-bg">
      {/* Warm radial glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-400/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        {/* Flame icon */}
        <div className="relative mb-8 animate-fade-up">
          <Flame className="w-10 h-10 text-amber-500 animate-pulse-warm" />
          <div className="absolute inset-0 bg-amber-500/15 blur-xl rounded-full" />
        </div>

        {/* Main heading */}
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-navy-900 mb-6 leading-[0.95] tracking-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
          News, Mapped.
          <br />
          <span className="text-amber-600 italic">Everywhere.</span>
        </h1>

        {/* Subtitle */}
        <p className="font-body text-lg md:text-xl text-navy-700/70 mb-12 max-w-xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          From your neighborhood to the globe, discover stories
          where they happen. Visualized by heat.
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-8 md:gap-12 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl font-bold text-amber-600">4</div>
            <div className="font-body text-xs text-navy-700/50 uppercase tracking-widest mt-1">Scales</div>
          </div>
          <div className="w-px h-10 bg-amber-300/40" />
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl font-bold text-amber-600">Live</div>
            <div className="font-body text-xs text-navy-700/50 uppercase tracking-widest mt-1">Updates</div>
          </div>
          <div className="w-px h-10 bg-amber-300/40" />
          <div className="text-center">
            <div className="font-display text-2xl md:text-3xl font-bold text-amber-600">110+</div>
            <div className="font-body text-xs text-navy-700/50 uppercase tracking-widest mt-1">Locations</div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 animate-bounce">
          <ArrowDown className="w-5 h-5 text-amber-400/60" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
