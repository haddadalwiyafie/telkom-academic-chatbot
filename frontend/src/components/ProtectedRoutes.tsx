import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: ReactNode;
  requireRole?: string;
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-bg-deep text-text-dim">
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-primary-teal" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Memverifikasi akses...
        </div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;

  if (requireRole && user.role?.toLowerCase() !== requireRole.toLowerCase()) {
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}
