import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isConfigured } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Shield, User, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LoginButtonProps {
  redirectTo?: string;
}

export function LoginButton({ redirectTo }: LoginButtonProps = {}) {
  const { user, signInWithGoogle, logout, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!isConfigured) return (
    <Button disabled variant="outline" size="sm" title="Auth not configured">
      <LogIn className="w-4 h-4 mr-2" />
      Sign in
    </Button>
  );

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      if (redirectTo) navigate(redirectTo);
    } catch (error) {
      console.error('Sign in failed:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Button disabled variant="outline" size="sm">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  // User is logged in - show dropdown menu
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span className="max-w-32 truncate">{user.displayName || user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
              {isAdmin && (
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600 font-semibold">Admin Access</span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <>
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // User is not logged in - show sign in button
  return (
    <Button onClick={handleSignIn} variant="outline" size="sm" aria-label="Sign in with Google" className="flex items-center gap-2">
      <LogIn className="w-4 h-4" />
      Sign in with Google
    </Button>
  );
}
