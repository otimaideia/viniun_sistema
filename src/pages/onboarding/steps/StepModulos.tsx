import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Target,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Briefcase,
  TrendingUp,
  Palette,
  Handshake,
  Video,
  Bot,
  Zap,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DadosModulos } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosModulos>;
  onUpdate: (data: Partial<DadosModulos>) => void;
}

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: string;
  is_core: boolean;
}

// Mapeamento de ícones
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users,
  Target,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  Briefcase,
  TrendingUp,
  Palette,
  Handshake,
  Video,
  Bot,
  Zap,
  Lock,
};

const CATEGORIA_LABELS: Record<string, string> = {
  vendas: 'Vendas',
  operacao: 'Operação',
  comunicacao: 'Comunicação',
  marketing: 'Marketing',
  gestao: 'Gestão',
  sistema: 'Sistema',
  rh: 'RH',
};

export default function StepModulos({ data, onUpdate }: Props) {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadModulos = async () => {
      setIsLoading(true);
      try {
        const { data: modulosData, error } = await supabase
          .from('mt_modules')
          .select('*')
          .eq('is_active', true)
          .order('categoria')
          .order('ordem');

        if (error) throw error;
        setModulos(modulosData || []);
      } catch (error) {
        console.error('Erro ao carregar módulos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModulos();
  }, []);

  const toggleModulo = (codigo: string, isCore: boolean) => {
    // Módulos CORE não podem ser desmarcados
    if (isCore) return;

    const current = data.modulos_selecionados || [];
    const newSelection = current.includes(codigo)
      ? current.filter((c) => c !== codigo)
      : [...current, codigo];

    onUpdate({ modulos_selecionados: newSelection });
  };

  const isSelected = (codigo: string) => {
    return (data.modulos_selecionados || []).includes(codigo);
  };

  // Agrupar módulos por categoria
  const modulosPorCategoria = modulos.reduce(
    (acc, modulo) => {
      const cat = modulo.categoria || 'outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(modulo);
      return acc;
    },
    {} as Record<string, Modulo[]>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Módulos</h2>
          <p className="text-sm text-muted-foreground">Carregando módulos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Módulos</h2>
        <p className="text-sm text-muted-foreground">
          Selecione os módulos que serão habilitados para esta empresa
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Badge>
          {(data.modulos_selecionados || []).length} selecionado(s)
        </Badge>
        <span className="text-muted-foreground">
          Módulos CORE são obrigatórios
        </span>
      </div>

      {Object.entries(modulosPorCategoria).map(([categoria, catModulos]) => (
        <div key={categoria} className="space-y-3">
          <h3 className="text-md font-medium text-muted-foreground">
            {CATEGORIA_LABELS[categoria] || categoria}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {catModulos.map((modulo) => {
              const IconComponent = ICON_MAP[modulo.icone] || Settings;
              const selected = isSelected(modulo.codigo) || modulo.is_core;

              return (
                <Card
                  key={modulo.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50',
                    modulo.is_core && 'cursor-default'
                  )}
                  onClick={() => toggleModulo(modulo.codigo, modulo.is_core)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selected}
                          disabled={modulo.is_core}
                          className="mt-0.5"
                        />
                        <div
                          className={cn(
                            'w-8 h-8 rounded flex items-center justify-center',
                            selected ? 'bg-primary/20' : 'bg-muted'
                          )}
                        >
                          <IconComponent
                            className={cn(
                              'w-4 h-4',
                              selected
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {modulo.nome}
                          </span>
                          {modulo.is_core && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              CORE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {modulo.descricao}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
