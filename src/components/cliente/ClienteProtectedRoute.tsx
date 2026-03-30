import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { Loader2 } from 'lucide-react';

interface ClienteProtectedRouteProps {
  children: ReactNode;
}

export function ClienteProtectedRoute({ children }: ClienteProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useClienteAuthContext();

  // Exibir loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#662E8E] mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/cliente" replace />;
  }

  return <>{children}</>;
}
