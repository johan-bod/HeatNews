
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Lock, UserPlus } from 'lucide-react';

const AuthSection = () => {
  return (
    <section className="py-20 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-montserrat text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Join the 
            <span className="bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent"> Revolution</span>
          </h2>
          <p className="font-merriweather text-xl text-slate-600 max-w-2xl mx-auto">
            Get early access to NewsMap and be among the first to experience location-based news discovery.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Sign In */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-300/50 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="font-montserrat text-2xl text-slate-800">Welcome Back</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="font-lato text-slate-700">Email</Label>
                <Input 
                  id="signin-email" 
                  type="email" 
                  placeholder="Enter your email"
                  className="bg-white/80 border-slate-300 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="font-lato text-slate-700">Password</Label>
                <Input 
                  id="signin-password" 
                  type="password" 
                  placeholder="Enter your password"
                  className="bg-white/80 border-slate-300 focus:border-red-500"
                />
              </div>
              <Button className="font-lato w-full bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white">
                <Lock className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </CardContent>
          </Card>

          {/* Sign Up */}
          <Card className="bg-white/70 backdrop-blur-sm border-slate-300/50 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="font-montserrat text-2xl text-slate-800">Get Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="font-lato text-slate-700">Full Name</Label>
                <Input 
                  id="signup-name" 
                  type="text" 
                  placeholder="Enter your name"
                  className="bg-white/80 border-slate-300 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="font-lato text-slate-700">Email</Label>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="Enter your email"
                  className="bg-white/80 border-slate-300 focus:border-blue-500"
                />
              </div>
              <Button className="font-lato w-full bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white">
                <Mail className="w-4 h-4 mr-2" />
                Get Early Access
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default AuthSection;
