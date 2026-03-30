import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Users, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

interface InfluenciadoraOption {
  id: string;
  codigo: string;
  nome: string;
  nome_artistico: string | null;
  foto_perfil: string | null;
  instagram: string | null;
}

interface InfluenciadoraSelectProps {
  value?: string;
  onSelect: (codigo: string, influenciadora: InfluenciadoraOption) => void;
  disabled?: boolean;
  className?: string;
}

export function InfluenciadoraSelect({
  value,
  onSelect,
  disabled,
  className,
}: InfluenciadoraSelectProps) {
  const [open, setOpen] = useState(false);
  const [influenciadoras, setInfluenciadoras] = useState<InfluenciadoraOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { tenant } = useTenantContext();

  useEffect(() => {
    if (!tenant?.id) return;

    const loadInfluenciadoras = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('mt_influencers')
        .select('id, codigo, nome, nome_artistico, foto_perfil, instagram')
        .eq('tenant_id', tenant.id)
        .eq('status', 'aprovado')
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('codigo', 'is', null)
        .order('nome');

      if (!error && data) {
        setInfluenciadoras(data.filter((i) => i.codigo));
      }
      setIsLoading(false);
    };

    loadInfluenciadoras();
  }, [tenant?.id]);

  const selected = influenciadoras.find((i) => i.codigo === value);

  const getDisplayName = (inf: InfluenciadoraOption) =>
    inf.nome_artistico || inf.nome;

  const getInitials = (inf: InfluenciadoraOption) => {
    const name = inf.nome_artistico || inf.nome;
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => Array.from(w)[0] || '')
      .join('')
      .toUpperCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            'justify-between font-normal text-xs h-9 w-full',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.foto_perfil || undefined} />
                <AvatarFallback className="text-[8px]">
                  {getInitials(selected)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{getDisplayName(selected)}</span>
              <span className="text-muted-foreground text-[10px]">
                ({selected.codigo})
              </span>
            </div>
          ) : isLoading ? (
            'Carregando...'
          ) : (
            'Selecionar influenciadora'
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome ou codigo..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {influenciadoras.length === 0
                ? 'Nenhuma influenciadora aprovada.'
                : 'Nenhuma encontrada.'}
            </CommandEmpty>
            <CommandGroup>
              {influenciadoras.map((inf) => (
                <CommandItem
                  key={inf.id}
                  value={`${inf.nome} ${inf.nome_artistico || ''} ${inf.codigo}`}
                  onSelect={() => {
                    onSelect(inf.codigo, inf);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={inf.foto_perfil || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(inf)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{getDisplayName(inf)}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="font-mono">{inf.codigo}</span>
                      {inf.instagram && (
                        <>
                          <span>·</span>
                          <Instagram className="h-2.5 w-2.5" />
                          <span className="truncate">@{inf.instagram.replace('@', '')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {value === inf.codigo && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
