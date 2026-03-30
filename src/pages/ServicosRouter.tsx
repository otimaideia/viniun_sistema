// Componente de redirecionamento para /servicos baseado no nível de acesso
import { useTenantContext } from '@/contexts/TenantContext';
import Servicos from './Servicos';
import { Loader2 } from 'lucide-react';

export default function ServicosRouter() {
  const { isLoading } = useTenantContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Todos os níveis (platform, tenant, franchise) veem a página completa
  // O filtro de dados é feito via RLS + TenantContext nos hooks
  // As ações (criar/editar/excluir) são controladas por useUserPermissions
  return <Servicos />;
}
