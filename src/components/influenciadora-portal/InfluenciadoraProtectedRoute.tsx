import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { Loader2 } from 'lucide-react';

interface InfluenciadoraProtectedRouteProps {
  children: ReactNode;
}

export function InfluenciadoraProtectedRoute({ children }: InfluenciadoraProtectedRouteProps) {
  const { isAuthenticated, isLoading, influenciadora } = useInfluenciadoraAuthContext();
  const location = useLocation();

  // Exibir loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#662E8E]/5 to-[#F2B705]/5">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#662E8E] mx-auto mb-4" />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <Navigate to="/influenciadores/login" replace />;
  }

  // Redirecionar para onboarding se não completado
  // (exceto se já estiver no onboarding para evitar loop)
  if (
    influenciadora &&
    !influenciadora.onboarding_completed &&
    location.pathname !== '/influenciadores/onboarding'
  ) {
    return <Navigate to="/influenciadores/onboarding" replace />;
  }

  return <>{children}</>;
}
