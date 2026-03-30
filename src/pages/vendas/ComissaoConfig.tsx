import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, Target, Users, DollarSign, Percent, Plus, Trash2, ExternalLink, AlertTriangle, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCommissionRulesMT } from '@/hooks/multitenant/useCommissionRulesMT';
import { useTenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { COMMISSION_ROLE_LABELS } from '@/types/vendas';
import { toast } from 'sonner';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface GoalInfo {
  id: string;
  titulo: string;
  meta_valor: number;
  assigned_to: string | null;
  assigned_name?: string;
}

interface TeamMember {
  id: string;
  nome: string;
  cargo: string | null;
  commission_role: string | null;
}

export default function ComissaoConfig() {
  const { tenant, franchise, accessLevel } = useTenantContext();
  const {
    rules, tiers, isLoading,
    updateRule, createRule, addTier, updateTier, removeTier,
  } = useCommissionRulesMT();

  // Read-only data from other modules
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  // New tier form
  const [newTierMeta, setNewTierMeta] = useState('');
  const [newTierPct, setNewTierPct] = useState('');

  // Simulator
  const [simFaturamento, setSimFaturamento] = useState('');

  // Distribution warning
  const distributionSum = (rules?.percentual_supervisora || 0) + (rules?.percentual_consultoras || 0);
  const distributionWarning = rules && distributionSum !== 100;

  // Fetch goals from mt_goals (read-only)
  useEffect(() => {
    if (!tenant?.id) return;
    const fetchGoals = async () => {
      setIsLoadingGoals(true);
      try {
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonth = now.getMonth() === 11
          ? `${now.getFullYear() + 1}-01-01`
          : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

        let query = supabase
          .from('mt_goals')
          .select('id, titulo, meta_valor, assigned_to')
          .eq('tenant_id', tenant.id)
          .eq('tipo', 'receita')
          .gte('data_fim', monthStart)
          .lte('data_inicio', nextMonth);

        if (franchise?.id) {
          query = query.eq('franchise_id', franchise.id);
        }

        const { data } = await query;
        setGoals((data || []) as GoalInfo[]);
      } catch (err) {
        console.error('Erro ao buscar metas:', err);
      } finally {
        setIsLoadingGoals(false);
      }
    };
    fetchGoals();
  }, [tenant?.id, franchise?.id]);

  // Fetch team members with commission_role (read-only)
  useEffect(() => {
    if (!tenant?.id) return;
    const fetchTeam = async () => {
      setIsLoadingTeam(true);
      try {
        let query = supabase
          .from('mt_users')
          .select('id, nome, cargo, commission_role')
          .eq('tenant_id', tenant.id)
          .eq('status', 'ativo')
          .not('commission_role', 'is', null)
          .order('nome');

        if (franchise?.id && accessLevel !== 'platform') {
          query = query.eq('franchise_id', franchise.id);
        }

        const { data } = await query;
        setTeamMembers((data || []) as TeamMember[]);
      } catch (err) {
        console.error('Erro ao buscar equipe:', err);
      } finally {
        setIsLoadingTeam(false);
      }
    };
    fetchTeam();
  }, [tenant?.id, franchise?.id, accessLevel]);

  const handleCreateRule = async () => {
    if (!franchise?.id) {
      toast.error('Selecione uma franquia primeiro');
      return;
    }
    await createRule(franchise.id);
  };

  const handleAddTier = async () => {
    const meta = parseFloat(newTierMeta);
    const pct = parseFloat(newTierPct);
    if (isNaN(meta) || meta <= 0 || isNaN(pct) || pct <= 0) {
      toast.error('Preencha meta e percentual');
      return;
    }
    // Validate duplicate meta value
    if (tiers.some(t => t.meta_valor === meta)) {
      toast.error(`Ja existe um tier com meta de ${formatCurrency(meta)}`);
      return;
    }
    await addTier(meta, pct);
    setNewTierMeta('');
    setNewTierPct('');
  };

  // Separate goals
  const globalGoal = goals.find(g => !g.assigned_to);
  const individualGoals = goals.filter(g => !!g.assigned_to);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/vendas/comissoes" className="hover:text-foreground">Comissoes</Link>
          <span>/</span>
          <span>Configuracao</span>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/vendas" className="hover:text-foreground">Vendas</Link>
            <span>/</span>
            <Link to="/vendas/comissoes" className="hover:text-foreground">Comissoes</Link>
            <span>/</span>
            <span>Configuracao</span>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configuracao de Comissoes
          </h1>
          {franchise && (
            <p className="text-sm text-muted-foreground mt-1">
              Franquia: <strong>{franchise.nome}</strong>
            </p>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link to="/vendas/comissoes">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      {/* Read-only: Metas do Mes */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-purple-500" />
              Metas do Mes Atual
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/metas" className="text-xs">
                Gerenciar Metas <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription>
            Metas de receita usadas no calculo de comissoes (vindas do modulo Metas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGoals ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : goals.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Nenhuma meta cadastrada para este mes</p>
                <p className="text-xs mt-1">
                  Os valores padrao serao usados: Global {formatCurrency(rules?.meta_global_default || 200000)}, Individual {formatCurrency(rules?.meta_individual_default || 75000)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {globalGoal && (
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Global</Badge>
                    <span className="text-sm">{globalGoal.titulo}</span>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(globalGoal.meta_valor)}</span>
                </div>
              )}
              {individualGoals.map(g => (
                <div key={g.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Individual</Badge>
                    <span className="text-sm">{g.titulo}</span>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(g.meta_valor)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-only: Equipe de Comissao */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-500" />
              Equipe de Comissao
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/configuracoes/usuarios" className="text-xs">
                Gerenciar em Usuarios <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription>
            Profissionais com papel de comissao definido (gerenciado em Usuarios)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTeam ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : teamMembers.length === 0 ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Nenhum profissional com papel de comissao definido</p>
                <p className="text-xs mt-1">
                  Acesse Usuarios para definir os papeis (consultora, supervisora, gerente, aplicadora).
                </p>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-center">Papel de Comissao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.cargo || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {m.commission_role ? COMMISSION_ROLE_LABELS[m.commission_role as keyof typeof COMMISSION_ROLE_LABELS] || m.commission_role : '-'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* If no rules, show create button */}
      {!rules && (
        <Card>
          <CardContent className="py-8 text-center">
            <Settings className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-4">
              Nenhuma regra de comissao configurada para esta franquia.
            </p>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Regras Padrao
            </Button>
          </CardContent>
        </Card>
      )}

      {rules && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tiers de Comissao Global */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-purple-500" />
                Tiers de Comissao Global
              </CardTitle>
              <CardDescription>
                Faixas de faturamento e percentuais de comissao global.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meta (R$)</TableHead>
                      <TableHead className="text-center">Percentual (%)</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">
                          {formatCurrency(tier.meta_valor)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            defaultValue={tier.percentual}
                            className="w-20 h-7 text-center mx-auto"
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== tier.percentual) {
                                updateTier(tier.id, { percentual: val });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeTier(tier.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Add new tier */}
                    <TableRow>
                      <TableCell>
                        <Input
                          type="number"
                          step="1000"
                          min="0"
                          placeholder="Ex: 300000"
                          value={newTierMeta}
                          onChange={(e) => setNewTierMeta(e.target.value)}
                          className="h-7"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="Ex: 1.5"
                          value={newTierPct}
                          onChange={(e) => setNewTierPct(e.target.value)}
                          className="w-20 h-7 text-center mx-auto"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary"
                          onClick={handleAddTier}
                          disabled={!newTierMeta || !newTierPct}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Distribuicao Global */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-4 w-4 text-blue-500" />
                Distribuicao da Comissao Global
              </CardTitle>
              <CardDescription>
                Como o pool de comissao global e dividido entre os papeis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Supervisora (%)</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={rules.percentual_supervisora}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== rules.percentual_supervisora) {
                        updateRule({ percentual_supervisora: val });
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Consultoras (%)</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={rules.percentual_consultoras}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== rules.percentual_consultoras) {
                        updateRule({ percentual_consultoras: val });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Individual - Consultora (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  defaultValue={rules.percentual_individual}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== rules.percentual_individual) {
                      updateRule({ percentual_individual: val });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Sobre vendas individuais (so paga se bater meta global E individual)
                </p>
              </div>
              {distributionWarning && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>Supervisora ({rules.percentual_supervisora}%) + Consultoras ({rules.percentual_consultoras}%) = <strong>{distributionSum}%</strong>. Deveria somar 100%.</p>
                </div>
              )}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Exemplo:</strong> Se faturamento = {formatCurrency(250000)} e tier = 1.2%
                <br />
                Pool = {formatCurrency(250000 * 0.012)} → Supervisora {rules.percentual_supervisora}% = {formatCurrency(250000 * 0.012 * (rules.percentual_supervisora / 100))},
                Consultoras {rules.percentual_consultoras}% = {formatCurrency(250000 * 0.012 * (rules.percentual_consultoras / 100))}
              </div>
            </CardContent>
          </Card>

          {/* Gerente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-orange-500" />
                Gerente
              </CardTitle>
              <CardDescription>
                Percentual sobre o faturamento total da franquia (só paga se meta global batida).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Percentual Gerente (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  defaultValue={rules.percentual_gerente}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val !== rules.percentual_gerente) {
                      updateRule({ percentual_gerente: val });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Produtividade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-teal-500" />
                Produtividade (Aplicadoras)
              </CardTitle>
              <CardDescription>
                Piso diario minimo + percentual sobre servicos realizados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Piso Diario (R$)</label>
                  <Input
                    type="number"
                    step="10"
                    min="0"
                    defaultValue={rules.piso_produtividade_diaria}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== rules.piso_produtividade_diaria) {
                        updateRule({ piso_produtividade_diaria: val });
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Percentual (%)</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    defaultValue={rules.percentual_produtividade}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val !== rules.percentual_produtividade) {
                        updateRule({ percentual_produtividade: val });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <strong>Regra:</strong> Se 10% dos servicos do dia {'>'} piso → paga diferenca.
                Se 10% {'<'} piso → so piso.
              </div>
            </CardContent>
          </Card>
          {/* Simulador */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-emerald-500" />
                Simulador de Comissoes
              </CardTitle>
              <CardDescription>
                Teste o impacto das configuracoes antes de processar. Nada e salvo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Faturamento do Mes (R$)</label>
                  <Input
                    type="number"
                    step="10000"
                    min="0"
                    placeholder="Ex: 250000"
                    value={simFaturamento}
                    onChange={(e) => setSimFaturamento(e.target.value)}
                  />
                </div>
              </div>

              {(() => {
                const fat = parseFloat(simFaturamento);
                if (!fat || fat <= 0 || !rules) return null;

                // Find matching tier (sorted DESC by meta_valor)
                const sortedTiers = [...tiers].sort((a, b) => b.meta_valor - a.meta_valor);
                const metaGlobal = globalGoal?.meta_valor || rules.meta_global_default || 200000;
                const atingida = fat >= metaGlobal;

                let matchedTier: typeof tiers[0] | null = null;
                if (atingida) {
                  for (const t of sortedTiers) {
                    if (fat >= t.meta_valor) {
                      matchedTier = t;
                      break;
                    }
                  }
                }

                const tierPct = matchedTier?.percentual || 0;
                const pool = atingida ? fat * (tierPct / 100) : 0;
                const supCount = teamMembers.filter(m => m.commission_role === 'supervisora').length;
                const consCount = teamMembers.filter(m => m.commission_role === 'consultora').length;
                const gerCount = teamMembers.filter(m => m.commission_role === 'gerente').length;
                const supPool = pool * (rules.percentual_supervisora / 100);
                const consPool = pool * (rules.percentual_consultoras / 100);
                const perSup = supCount > 0 ? supPool / supCount : 0;
                const perCons = consCount > 0 ? consPool / consCount : 0;
                const gerVal = atingida ? fat * ((rules.percentual_gerente || 1) / 100) : 0;
                const totalEstimado = pool + (gerVal * gerCount);

                return (
                  <div className="space-y-3">
                    {/* Meta status */}
                    <div className={`p-3 rounded-lg text-sm ${atingida ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300'}`}>
                      Meta Global: {formatCurrency(metaGlobal)} — {atingida ? '✅ BATIDA' : '❌ NAO BATIDA'} (faturamento: {formatCurrency(fat)})
                      {atingida && matchedTier && (
                        <span className="ml-2">| Tier: {matchedTier.percentual}%</span>
                      )}
                    </div>

                    {atingida && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Papel</TableHead>
                              <TableHead className="text-center">Qtd</TableHead>
                              <TableHead className="text-right">Pool Total</TableHead>
                              <TableHead className="text-right">Por Pessoa</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Supervisora ({rules.percentual_supervisora}%)</TableCell>
                              <TableCell className="text-center">{supCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(supPool)}</TableCell>
                              <TableCell className="text-right font-semibold">{supCount > 0 ? formatCurrency(perSup) : '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Consultoras ({rules.percentual_consultoras}%)</TableCell>
                              <TableCell className="text-center">{consCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(consPool)}</TableCell>
                              <TableCell className="text-right font-semibold">{consCount > 0 ? formatCurrency(perCons) : '-'}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Gerente ({rules.percentual_gerente}%)</TableCell>
                              <TableCell className="text-center">{gerCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(gerVal * gerCount)}</TableCell>
                              <TableCell className="text-right font-semibold">{gerCount > 0 ? formatCurrency(gerVal) : '-'}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Total Estimado (Global + Gerente)</span>
                      <span className="text-lg font-bold">{formatCurrency(totalEstimado)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      * Comissoes individuais (1% por consultora) nao estao incluidas pois dependem das vendas de cada uma.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
