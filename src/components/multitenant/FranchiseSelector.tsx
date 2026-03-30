import React, { useState, useMemo } from 'react';
import { Building, Check, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useTenantContext } from '@/contexts/TenantContext';
import type { Franchise } from '@/types/multitenant';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// =============================================================================
// COMPONENTE: FranchiseSelector
// Permite selecionar/filtrar por franquia dentro do tenant atual
// =============================================================================

interface FranchiseSelectorProps {
  /** Classe CSS adicional */
  className?: string;
  /** Modo de exibição */
  variant?: 'dropdown' | 'select' | 'list';
  /** Callback quando franquia é selecionada */
  onSelect?: (franchise: Franchise | null) => void;
  /** Permitir limpar seleção (ver todas) */
  allowClear?: boolean;
  /** Placeholder quando nenhuma franquia selecionada */
  placeholder?: string;
  /** Mostrar apenas franquias ativas */
  activeOnly?: boolean;
  /** Agrupar por estado */
  groupByState?: boolean;
}

export function FranchiseSelector({
  className,
  variant = 'dropdown',
  onSelect,
  allowClear = true,
  placeholder = 'Todas as unidades',
  activeOnly = true,
  groupByState = false,
}: FranchiseSelectorProps) {
  const { franchise: currentFranchise, franchises, selectFranchise, accessLevel } = useTenantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Verificar se pode selecionar franquias
  // (platform e tenant admins podem selecionar, franchise admins veem apenas a sua)
  const canSelectFranchise = accessLevel === 'platform' || accessLevel === 'tenant';

  // Filtrar franquias
  const filteredFranchises = useMemo(() => {
    let result = franchises;

    if (activeOnly) {
      result = result.filter((f) => f.is_active);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.nome.toLowerCase().includes(query) ||
          f.codigo.toLowerCase().includes(query) ||
          f.endereco_cidade?.toLowerCase().includes(query) ||
          f.endereco_estado?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [franchises, activeOnly, searchQuery]);

  // Agrupar por estado se necessário
  const groupedFranchises = useMemo(() => {
    if (!groupByState) return null;

    const groups: Record<string, Franchise[]> = {};

    filteredFranchises.forEach((franchise) => {
      const state = franchise.endereco_estado || 'Sem Estado';
      if (!groups[state]) {
        groups[state] = [];
      }
      groups[state].push(franchise);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredFranchises, groupByState]);

  // Handler de seleção
  const handleSelect = (franchise: Franchise | null) => {
    selectFranchise(franchise?.id || null);
    onSelect?.(franchise);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Se não pode selecionar e tem franquia definida, mostrar apenas badge
  if (!canSelectFranchise && currentFranchise) {
    return (
      <Badge variant="secondary" className={cn('gap-2', className)}>
        <Building className="h-3 w-3" />
        {currentFranchise.nome}
      </Badge>
    );
  }

  // Se não pode selecionar e não tem franquias, não mostrar nada
  if (!canSelectFranchise || franchises.length === 0) {
    return null;
  }

  // Versão Select (simples)
  if (variant === 'select') {
    return (
      <Select
        value={currentFranchise?.id || 'all'}
        onValueChange={(value) => {
          if (value === 'all') {
            handleSelect(null);
          } else {
            const franchise = franchises.find((f) => f.id === value);
            if (franchise) handleSelect(franchise);
          }
        }}
      >
        <SelectTrigger className={cn('w-[200px]', className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowClear && (
            <SelectItem value="all">{placeholder}</SelectItem>
          )}
          {filteredFranchises.map((franchise) => (
            <SelectItem key={franchise.id} value={franchise.id}>
              {franchise.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Versão lista
  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar unidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {allowClear && (
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
              !currentFranchise
                ? 'bg-primary/10 border-primary'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  !currentFranchise ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Building className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">{placeholder}</div>
                <div className="text-xs text-muted-foreground">
                  {franchises.length} unidade(s)
                </div>
              </div>
            </div>
            {!currentFranchise && <Check className="h-5 w-5 text-primary" />}
          </button>
        )}

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {groupedFranchises ? (
            groupedFranchises.map(([state, stateFranchises]) => (
              <div key={state} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  {state}
                </div>
                {stateFranchises.map((franchise) => (
                  <FranchiseItem
                    key={franchise.id}
                    franchise={franchise}
                    isSelected={currentFranchise?.id === franchise.id}
                    onClick={() => handleSelect(franchise)}
                  />
                ))}
              </div>
            ))
          ) : (
            filteredFranchises.map((franchise) => (
              <FranchiseItem
                key={franchise.id}
                franchise={franchise}
                isSelected={currentFranchise?.id === franchise.id}
                onClick={() => handleSelect(franchise)}
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
        >
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {currentFranchise?.nome || placeholder}
            </span>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {currentFranchise && allowClear && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(null);
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Unidades
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

        {allowClear && (
          <>
            <DropdownMenuItem
              onClick={() => handleSelect(null)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-muted-foreground">{placeholder}</span>
                {!currentFranchise && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <div className="max-h-[250px] overflow-y-auto">
          {filteredFranchises.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Nenhuma unidade encontrada
            </div>
          ) : (
            filteredFranchises.map((franchise) => (
              <DropdownMenuItem
                key={franchise.id}
                onClick={() => handleSelect(franchise)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{franchise.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {franchise.endereco_cidade && franchise.endereco_estado
                        ? `${franchise.endereco_cidade}/${franchise.endereco_estado}`
                        : franchise.codigo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!franchise.is_active && (
                      <Badge variant="secondary" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                    {currentFranchise?.id === franchise.id && (
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

// Componente interno para item de franquia na lista
interface FranchiseItemProps {
  franchise: Franchise;
  isSelected: boolean;
  onClick: () => void;
}

function FranchiseItem({ franchise, isSelected, onClick }: FranchiseItemProps) {
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
          <Building className="h-5 w-5" />
        </div>
        <div className="text-left">
          <div className="font-medium">{franchise.nome}</div>
          <div className="text-xs text-muted-foreground">
            {franchise.endereco_cidade && franchise.endereco_estado
              ? `${franchise.endereco_cidade}/${franchise.endereco_estado}`
              : franchise.codigo}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!franchise.is_active && (
          <Badge variant="secondary" className="text-xs">
            Inativo
          </Badge>
        )}
        {isSelected && <Check className="h-5 w-5 text-primary" />}
      </div>
    </button>
  );
}

export default FranchiseSelector;
