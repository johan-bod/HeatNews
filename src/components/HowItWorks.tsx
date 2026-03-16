export default function HowItWorks() {
  return (
    <section className="w-full bg-navy-900 border-t border-ivory-200/5">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Column 1: Source Credibility */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">

              Source credibility
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">

              Every source is classified into one of six credibility tiers —
              from wire services like AFP and Reuters down to independent outlets.
              This tier determines how much weight a source carries in our heat calculation.
            </p>
          </div>

          {/* Column 2: Coverage Patterns */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">

              Coverage patterns
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">

              When multiple independent sources cover the same story, the heat goes up.
              A story reported by three wire services and two regional papers
              is more significant than one covered by a single outlet.
            </p>
          </div>

          {/* Column 3: Emerging Stories */}
          <div>
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-3">

              Emerging stories
            </h3>
            <p className="font-body text-sm text-ivory-200/60 leading-relaxed">

              Our convergence bonus detects when unrelated sources start covering the
              same event simultaneously — a signal that something important is developing,
              even before major outlets pick it up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
