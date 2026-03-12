import { Flame, Mail, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-amber-200/30 bg-ivory-50/80">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-amber-600" />
              <span className="font-display text-lg font-bold text-navy-800">
                Heat<span className="text-amber-600">Story</span>
              </span>
            </div>
            <p className="font-body text-sm text-navy-700/60 leading-relaxed">
              Real-time news mapping with geographic heat visualization. See what's happening, where it's happening.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <h3 className="font-body text-xs font-semibold text-navy-700/40 uppercase tracking-widest mb-4">Product</h3>
              <ul className="space-y-2.5">
                <li><a href="#" className="font-body text-sm text-navy-700/60 hover:text-amber-600 transition-colors">Features</a></li>
                <li><a href="#" className="font-body text-sm text-navy-700/60 hover:text-amber-600 transition-colors">API</a></li>
                <li><a href="#" className="font-body text-sm text-navy-700/60 hover:text-amber-600 transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-body text-xs font-semibold text-navy-700/40 uppercase tracking-widest mb-4">Connect</h3>
              <div className="flex gap-3">
                <a href="#" className="text-navy-700/40 hover:text-amber-600 transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href="#" className="text-navy-700/40 hover:text-amber-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-amber-200/20 mt-10 pt-6 text-center">
          <p className="font-body text-xs text-navy-700/35">
            &copy; {new Date().getFullYear()} HeatStory. Built with real-time data.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
