import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Building2, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DadosPlano } from '@/hooks/useOnboardingAdapter';

interface Props {
  data: Partial<DadosPlano>;
  onUpdate: (data: Partial<DadosPlano>) => void;
}

const PLANOS = [
  {
    id: 'starter',
    nome: 'Starter',
    descricao: 'Para pequenas operações',
    max_franquias: 5,
    max_usuarios: 20,
    max_leads_mes: 1000,
    badge: null,
  },
  {
    id: 'professional',
    nome: 'Professional',
    descricao: 'Para operações em crescimento',
    max_franquias: 20,
    max_usuarios: 100,
    max_leads_mes: 10000,
    badge: 'Popular',
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    descricao: 'Para grandes redes',
    max_franquias: 100,
    max_usuarios: 500,
    max_leads_mes: 50000,
    badge: null,
  },
  {
    id: 'unlimited',
    nome: 'Unlimited',
    descricao: 'Sem limites',
    max_franquias: 9999,
    max_usuarios: 9999,
    max_leads_mes: 999999,
    badge: 'Premium',
  },
];

export default function StepPlano({ data, onUpdate }: Props) {
  const handlePlanSelect = (planoId: string) => {
    const plano = PLANOS.find((p) => p.id === planoId);
    if (plano) {
      onUpdate({
        plano: planoId,
        max_franquias: plano.max_franquias,
        max_usuarios: plano.max_usuarios,
        max_leads_mes: plano.max_leads_mes,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Plano e Limites</h2>
        <p className="text-sm text-muted-foreground">
          Selecione o plano e configure os limites de recursos
        </p>
      </div>

      {/* Seleção de Plano */}
      <RadioGroup
        value={data.plano || 'starter'}
        onValueChange={handlePlanSelect}
        className="grid gap-4 md:grid-cols-2"
      >
        {PLANOS.map((plano) => (
          <Label
            key={plano.id}
            htmlFor={plano.id}
            className="cursor-pointer"
          >
            <Card
              className={cn(
                'transition-all',
                data.plano === plano.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              )}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={plano.id} id={plano.id} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plano.nome}</span>
                        {plano.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {plano.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plano.descricao}
                      </p>
                    </div>
                  </div>
                  {data.plano === plano.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-muted rounded">
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <span className="font-medium">
                      {plano.max_franquias === 9999 ? '∞' : plano.max_franquias}
                    </span>
                    <span className="text-muted-foreground block">Franquias</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <span className="font-medium">
                      {plano.max_usuarios === 9999 ? '∞' : plano.max_usuarios}
                    </span>
                    <span className="text-muted-foreground block">Usuários</span>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <span className="font-medium">
                      {plano.max_leads_mes === 999999
                        ? '∞'
                        : (plano.max_leads_mes / 1000).toFixed(0) + 'K'}
                    </span>
                    <span className="text-muted-foreground block">Leads/mês</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Label>
        ))}
      </RadioGroup>

      {/* Limites Customizados */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Limites Customizados</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="max_franquias">Máx. Franquias</Label>
            <Input
              id="max_franquias"
              type="number"
              min={1}
              value={data.max_franquias || 5}
              onChange={(e) =>
                onUpdate({ max_franquias: parseInt(e.target.value) || 5 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_usuarios">Máx. Usuários</Label>
            <Input
              id="max_usuarios"
              type="number"
              min={1}
              value={data.max_usuarios || 20}
              onChange={(e) =>
                onUpdate({ max_usuarios: parseInt(e.target.value) || 20 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_leads_mes">Máx. Leads/mês</Label>
            <Input
              id="max_leads_mes"
              type="number"
              min={100}
              value={data.max_leads_mes || 1000}
              onChange={(e) =>
                onUpdate({ max_leads_mes: parseInt(e.target.value) || 1000 })
              }
            />
          </div>
        </div>
      </div>

      {/* Validade */}
      <div className="border-t pt-4">
        <h3 className="text-md font-medium mb-4">Validade</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="data_ativacao">Data de Ativação</Label>
            <Input
              id="data_ativacao"
              type="date"
              value={data.data_ativacao || new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdate({ data_ativacao: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_expiracao">Data de Expiração (opcional)</Label>
            <Input
              id="data_expiracao"
              type="date"
              value={data.data_expiracao || ''}
              onChange={(e) => onUpdate({ data_expiracao: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para sem prazo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
