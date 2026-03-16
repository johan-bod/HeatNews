import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isConfigured } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { CreditCard, LogIn, LogOut, Shield, User, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import useSubscription from '@/hooks/useSubscription';
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
  const { isPaid } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
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
      const code = (error as { code?: string }).code ?? '';
      const msg = error instanceof Error ? error.message : String(error);
      // Silently ignore user-closed popup — not an error
      if (code.includes('popup-closed') || code.includes('cancelled') || msg.includes('popup-closed')) return;
      console.error('Sign in failed:', error);
      toast.error(`Sign in failed: ${code || msg}`, { duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    try {
      setIsPortalLoading(true);
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.uid }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed to open portal');
      window.location.href = data.url;
    } catch (error) {
      toast.error((error as Error).message ?? 'Could not open subscription portal');
    } finally {
      setIsPortalLoading(false);
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
          {isPaid ? (
            <DropdownMenuItem
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
              className="cursor-pointer"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isPortalLoading ? 'Loading…' : 'Manage subscription'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link to="/pricing" className="cursor-pointer">
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
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
