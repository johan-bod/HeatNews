
import React from 'react';
import { LogIn, UserPlus, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuthSection = () => {
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Join the 
            <span className="bg-gradient-to-r from-red-400 to-slate-400 bg-clip-text text-transparent"> Future</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Connect to save your preferences, get personalized feeds, and access premium features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Sign In Card */}
          <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:border-red-500/50 transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-slate-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
              <p className="text-slate-400">Sign in to your account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500"
                />
              </div>
              <Button className="w-full bg-gradient-to-r from-red-600 to-slate-600 hover:from-red-700 hover:to-slate-700 text-white transition-all duration-300">
                Sign In
              </Button>
              <p className="text-center text-sm text-slate-400">
                <a href="#" className="text-red-400 hover:text-red-300 transition-colors">Forgot password?</a>
              </p>
            </CardContent>
          </Card>

          {/* Sign Up Card */}
          <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 hover:border-slate-500/50 transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Get Started</CardTitle>
              <p className="text-slate-400">Create your account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email" className="text-slate-300">Email</Label>
                <Input 
                  id="new-email" 
                  type="email" 
                  placeholder="your@email.com"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-300">Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="••••••••"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-slate-500"
                />
              </div>
              <Button className="w-full bg-gradient-to-r from-slate-600 to-red-600 hover:from-slate-700 hover:to-red-700 text-white transition-all duration-300">
                Create Account
              </Button>
              <p className="text-center text-sm text-slate-400">
                By signing up, you agree to our <a href="#" className="text-slate-400 hover:text-slate-300 transition-colors">Terms</a>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="mt-16 text-center">
          <div className="bg-slate-800/20 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/30">
            <Settings className="w-8 h-8 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-4">Personalize Your Experience</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-300">
              <div>
                <div className="text-red-400 font-semibold mb-1">Custom Locations</div>
                <div>Set multiple locations for comprehensive coverage</div>
              </div>
              <div>
                <div className="text-slate-400 font-semibold mb-1">Topic Preferences</div>
                <div>Choose categories that matter most to you</div>
              </div>
              <div>
                <div className="text-red-300 font-semibold mb-1">Smart Notifications</div>
                <div>Get alerts tailored to your interests and location</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthSection;
