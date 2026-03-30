import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useParceriaAuthContext } from '@/contexts/ParceriaAuthContext';
import { Loader2 } from 'lucide-react';

interface ParceriaProtectedRouteProps {
  children: ReactNode;
}

export function ParceriaProtectedRoute({ children }: ParceriaProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useParceriaAuthContext();

  // Exibir loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600/5 to-emerald-500/5">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/parceiro/login" replace />;
  }

  return <>{children}</>;
}
