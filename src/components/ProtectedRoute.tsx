import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  // Redirect to home if not authenticated, preserving intended destination
  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // Redirect to home if admin access is required but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated (and admin if required), render children
  return <>{children}</>;
}

// Admin-only route wrapper
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>;
}
