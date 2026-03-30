import React, { useState, useEffect } from 'react';
import { Building2, Check, ChevronDown, Globe, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { getTenantUrl } from '@/hooks/multitenant/useTenantDetection';
import type { Tenant } from '@/types/multitenant';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// COMPONENTE: TenantSelector
// Permite que platform admins alternem entre diferentes tenants
// =============================================================================

interface TenantSelectorProps {
  /** Classe CSS adicional */
  className?: string;
  /** Modo de exibição: dropdown ou lista */
  variant?: 'dropdown' | 'list';
  /** Callback quando tenant é selecionado */
  onSelect?: (tenant: Tenant) => void;
  /** Se deve redirecionar para o subdomínio do tenant */
  redirectOnSelect?: boolean;
  /** Mostrar apenas tenants ativos */
  activeOnly?: boolean;
}

export function TenantSelector({
  className,
  variant = 'dropdown',
  onSelect,
  redirectOnSelect = false,
  activeOnly = true,
}: TenantSelectorProps) {
  const { tenant: currentTenant, accessLevel, selectTenant, isLoading: contextLoading } = useTenantContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Apenas platform admins podem ver o seletor de tenant
  const canSelectTenant = accessLevel === 'platform';

  // Carregar lista de tenants
  useEffect(() => {
    if (!canSelectTenant) {
      setIsLoading(false);
      return;
    }

    const loadTenants = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('mt_tenants')
          .select('*')
          .order('nome_fantasia', { ascending: true });

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTenants(data || []);
      } catch (err) {
        console.error('Erro ao carregar tenants:', err);
        setTenants([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTenants();
  }, [canSelectTenant, activeOnly]);

  // Filtrar tenants pela busca
  const filteredTenants = tenants.filter(
    (t) =>
      t.nome_fantasia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler de seleção
  const handleSelect = async (tenant: Tenant) => {
    // Se já é o tenant atual, apenas fechar
    if (currentTenant?.id === tenant.id) {
      setIsOpen(false);
      return;
    }

    if (redirectOnSelect) {
      // Redirecionar para o subdomínio do tenant
      window.location.href = getTenantUrl(tenant.slug, '/');
    } else {
      // Trocar de tenant no contexto
      setIsSwitching(true);
      try {
        await selectTenant(tenant.id);
        toast.success(`Trocou para ${tenant.nome_fantasia}`);
        onSelect?.(tenant);
      } catch (err) {
        console.error('Erro ao trocar de tenant:', err);
        toast.error('Erro ao trocar de empresa');
      } finally {
        setIsSwitching(false);
      }
    }
    setIsOpen(false);
  };

  // Não renderizar se não pode selecionar
  if (!canSelectTenant) {
    return null;
  }

  // Versão lista
  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          ) : (
            filteredTenants.map((tenant) => (
              <TenantItem
                key={tenant.id}
                tenant={tenant}
                isSelected={currentTenant?.id === tenant.id}
                onClick={() => handleSelect(tenant)}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // Versão dropdown (padrão)
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-between min-w-[200px]', className)}
          disabled={isLoading || isSwitching || contextLoading}
        >
          <div className="flex items-center gap-2">
            {isSwitching || contextLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">
              {isSwitching ? 'Carregando...' : (currentTenant?.nome_fantasia || 'Selecionar empresa')}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresas
        </DropdownMenuLabel>

        <div className="px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-[250px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhuma empresa encontrada
            </div>
          ) : (
            filteredTenants.map((tenant) => (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleSelect(tenant)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{tenant.nome_fantasia}</span>
                    <span className="text-xs text-muted-foreground">
                      {tenant.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!tenant.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                    {currentTenant?.id === tenant.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente interno para item de tenant na lista
interface TenantItemProps {
  tenant: Tenant;
  isSelected: boolean;
  onClick: () => void;
}

function TenantItem({ tenant, isSelected, onClick }: TenantItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:bg-accent'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          <Building2 className="h-5 w-5" />
        </div>
        <div className="text-left">
          <div className="font-medium">{tenant.nome_fantasia}</div>
          <div className="text-xs text-muted-foreground">{tenant.slug}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!tenant.is_active && (
          <Badge variant="secondary" className="text-xs">
            Inativo
          </Badge>
        )}
        {isSelected && <Check className="h-5 w-5 text-primary" />}
      </div>
    </button>
  );
}

export default TenantSelector;
