import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not authenticated
  if (!user) {
    console.log('🔒 Access denied: User not authenticated');
    return <Navigate to="/" replace />;
  }

  // Redirect to home if admin access is required but user is not admin
  if (requireAdmin && !isAdmin) {
    console.log('🔒 Access denied: Admin privileges required');
    return <Navigate to="/" replace />;
  }

  // User is authenticated (and admin if required), render children
  return <>{children}</>;
}

// Admin-only route wrapper
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requireAdmin={true}>{children}</ProtectedRoute>;
}
