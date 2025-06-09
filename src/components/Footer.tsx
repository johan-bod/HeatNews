
import React from 'react';
import { Globe, Mail, MapPin, Twitter, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-slate-400/30 bg-white/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <Globe className="w-6 h-6 text-red-600 mr-2" />
              <span className="font-montserrat text-xl font-bold text-slate-800">NewsMap</span>
            </div>
            <p className="font-merriweather text-slate-600 mb-6 max-w-md">
              Revolutionizing how you discover and consume news through intelligent geolocation and personalized filtering.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-500 hover:text-red-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-500 hover:text-red-600 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-500 hover:text-red-600 transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-montserrat text-slate-800 font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-slate-600">
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Features</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Pricing</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">API</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Documentation</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-montserrat text-slate-800 font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-slate-600">
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">About</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Blog</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Careers</a></li>
              <li><a href="#" className="font-lato hover:text-slate-800 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-400/30 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="font-lato text-slate-500 text-sm">
            © 2024 NewsMap. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-sm text-slate-500">
            <a href="#" className="font-lato hover:text-slate-700 transition-colors">Privacy Policy</a>
            <a href="#" className="font-lato hover:text-slate-700 transition-colors">Terms of Service</a>
            <a href="#" className="font-lato hover:text-slate-700 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
