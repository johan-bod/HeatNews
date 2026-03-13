import { Flame, ChevronDown } from 'lucide-react';

const Hero = () => {
  const scrollToGlobe = () => {
    const globe = document.getElementById('globe-section');
    if (globe) {
      globe.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-20 pb-8 bg-navy-900 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-900/95 to-transparent" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(217,158,43,0.3) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
        {/* Brand icon */}
        <div className="flex justify-center mb-4 animate-fade-up">
          <div className="relative">
            <Flame className="w-8 h-8 text-amber-500" />
            <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
          </div>
        </div>

        {/* Tagline */}
        <h1 className="font-display text-3xl md:text-5xl font-bold text-ivory-50 mb-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          Map coverage. Spot patterns. <span className="text-amber-500">Surface stories.</span>
        </h1>
        <p className="font-body text-sm md:text-base text-ivory-200/50 max-w-lg mx-auto mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          HeatStory shows you which stories get the most coverage, which regions are underreported, and which local stories are bubbling up before they go national.
        </p>

        {/* Scroll CTA */}
        <button
          onClick={scrollToGlobe}
          aria-label="See today's coverage map"
          className="inline-flex items-center gap-2 font-body text-xs text-amber-400/60 hover:text-amber-400 transition-colors animate-fade-up"
          style={{ animationDelay: '0.3s' }}
        >
          See today's coverage map
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      </div>
    </section>
  );
};

export default Hero;
