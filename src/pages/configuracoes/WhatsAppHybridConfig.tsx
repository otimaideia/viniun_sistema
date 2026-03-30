import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Zap,
  Shield,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantContext } from '@/contexts/TenantContext';
import { useWhatsAppHybridConfigMT } from '@/hooks/multitenant/useWhatsAppHybridConfigMT';
import type { HybridConfigUpdate } from '@/hooks/multitenant/useWhatsAppHybridConfigMT';
import { useWhatsAppProvidersMT } from '@/hooks/multitenant/useWhatsAppProvidersMT';

export default function WhatsAppHybridConfig() {
  const navigate = useNavigate();
  const { tenant, accessLevel } = useTenantContext();
  const {
    config,
    isHybridEnabled,
    isConfigured,
    integrationStatus,
    statusLabel,
    isLoading,
    saveConfig,
    toggleHybrid,
    canConfigure,
    refetch,
  } = useWhatsAppHybridConfigMT();

  const { providers, wahaProviders, metaProviders } = useWhatsAppProvidersMT();

  const [localConfig, setLocalConfig] = useState<HybridConfigUpdate>({});
  const [hasChanges, setHasChanges] = useState(false);

  const getStatusIcon = () => {
    switch (integrationStatus) {
      case 'hybrid_active': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'hybrid_incomplete': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'single_provider': return <Wifi className="h-5 w-5 text-blue-500" />;
      default: return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (integrationStatus) {
      case 'hybrid_active': return 'bg-green-100 text-green-800';
      case 'hybrid_incomplete': return 'bg-yellow-100 text-yellow-800';
      case 'single_provider': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateLocal = (key: keyof HybridConfigUpdate, value: any) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveConfig.mutate(localConfig, {
      onSuccess: () => {
        setHasChanges(false);
        setLocalConfig({});
      },
    });
  };

  const getValue = <K extends keyof HybridConfigUpdate>(key: K): any => {
    if (key in localConfig) return localConfig[key];
    return config?.[key as keyof typeof config];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Integração Híbrida WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Configure WAHA + Meta Cloud API
              {tenant && ` - ${tenant.nome_fantasia}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {hasChanges && canConfigure && (
            <Button size="sm" onClick={handleSave} disabled={saveConfig.isPending}>
              {saveConfig.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold text-lg">Status da Integração</h3>
                <Badge className={getStatusColor()}>{statusLabel}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{wahaProviders.length}</p>
                <p className="text-xs text-muted-foreground">WAHA</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{metaProviders.length}</p>
                <p className="text-xs text-muted-foreground">Meta API</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{providers.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Modo Híbrido</CardTitle>
                <CardDescription>
                  Quando ativado, o sistema escolhe automaticamente entre WAHA e Meta Cloud API
                  para cada mensagem, otimizando custo e entregabilidade.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={getValue('hybrid_enabled') ?? isHybridEnabled}
              onCheckedChange={(checked) => {
                if (canConfigure) {
                  toggleHybrid.mutate(checked);
                }
              }}
              disabled={!canConfigure || toggleHybrid.isPending}
            />
          </div>
        </CardHeader>
        {!isHybridEnabled && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Provider único:</Label>
              <Select
                value={getValue('single_provider_type') ?? 'waha'}
                onValueChange={(v) => updateLocal('single_provider_type', v)}
                disabled={!canConfigure}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waha">WAHA (Gratuito)</SelectItem>
                  <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Config Tabs (visible when hybrid is enabled) */}
      {isHybridEnabled && (
        <Tabs defaultValue="routing">
          <TabsList>
            <TabsTrigger value="routing">Roteamento</TabsTrigger>
            <TabsTrigger value="window">Janela 24h</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="hours">Horário Comercial</TabsTrigger>
            <TabsTrigger value="fallback">Fallback</TabsTrigger>
          </TabsList>

          {/* Roteamento */}
          <TabsContent value="routing" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-base">Roteamento Automático</CardTitle>
                </div>
                <CardDescription>
                  Regras automáticas para selecionar o melhor provider por mensagem.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Roteamento automático</Label>
                    <p className="text-xs text-muted-foreground">
                      Seleciona automaticamente WAHA ou Meta baseado nas regras configuradas
                    </p>
                  </div>
                  <Switch
                    checked={getValue('auto_routing_enabled') ?? true}
                    onCheckedChange={(v) => updateLocal('auto_routing_enabled', v)}
                    disabled={!canConfigure}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Preferir provider gratuito</Label>
                    <p className="text-xs text-muted-foreground">
                      Sempre que possível, usar WAHA (grátis) em vez de Meta (pago)
                    </p>
                  </div>
                  <Switch
                    checked={getValue('prefer_free_provider') ?? true}
                    onCheckedChange={(v) => updateLocal('prefer_free_provider', v)}
                    disabled={!canConfigure}
                  />
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/whatsapp/providers')}
                  >
                    Gerenciar Providers
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/whatsapp/routing')}
                  >
                    Regras de Roteamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Janela 24h */}
          <TabsContent value="window" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle className="text-base">Janela de 24 Horas (Meta Cloud API)</CardTitle>
                </div>
                <CardDescription>
                  A Meta permite mensagens gratuitas dentro de 24h após última mensagem do cliente.
                  Fora da janela, é necessário usar templates (pagos).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rastrear janela de 24h</Label>
                    <p className="text-xs text-muted-foreground">
                      Monitora quando a janela abre/fecha para cada conversa
                    </p>
                  </div>
                  <Switch
                    checked={getValue('window_tracking_enabled') ?? true}
                    onCheckedChange={(v) => updateLocal('window_tracking_enabled', v)}
                    disabled={!canConfigure}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Detecção automática</Label>
                    <p className="text-xs text-muted-foreground">
                      Detecta automaticamente quando o cliente inicia a conversa
                    </p>
                  </div>
                  <Switch
                    checked={getValue('auto_detect_window') ?? true}
                    onCheckedChange={(v) => updateLocal('auto_detect_window', v)}
                    disabled={!canConfigure}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custos */}
          <TabsContent value="costs" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle className="text-base">Controle de Custos</CardTitle>
                </div>
                <CardDescription>
                  Configure limites de orçamento e alertas para mensagens pagas via Meta Cloud API.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas de orçamento</Label>
                    <p className="text-xs text-muted-foreground">
                      Notifica quando o gasto mensal se aproxima do limite
                    </p>
                  </div>
                  <Switch
                    checked={getValue('budget_alerts_enabled') ?? false}
                    onCheckedChange={(v) => updateLocal('budget_alerts_enabled', v)}
                    disabled={!canConfigure}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Limite mensal (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      value={getValue('monthly_budget_limit') ?? 0}
                      onChange={(e) => updateLocal('monthly_budget_limit', Number(e.target.value))}
                      disabled={!canConfigure}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      0 = sem limite
                    </p>
                  </div>
                  <div>
                    <Label>Alerta em (%)</Label>
                    <Input
                      type="number"
                      min={0.5}
                      max={1}
                      step={0.05}
                      value={getValue('budget_alert_threshold') ?? 0.80}
                      onChange={(e) => updateLocal('budget_alert_threshold', Number(e.target.value))}
                      disabled={!canConfigure}
                      placeholder="0.80"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Alertar quando atingir esse % do limite
                    </p>
                  </div>
                </div>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/whatsapp/custos')}
                >
                  Ver Detalhes de Custos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Horário Comercial */}
          <TabsContent value="hours" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle className="text-base">Horário Comercial</CardTitle>
                </div>
                <CardDescription>
                  Define o horário comercial para regras de roteamento baseadas em horário.
                  Fora do horário, o sistema pode usar provider diferente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={getValue('business_hours_start') ?? '08:00'}
                      onChange={(e) => updateLocal('business_hours_start', e.target.value)}
                      disabled={!canConfigure}
                    />
                  </div>
                  <div>
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={getValue('business_hours_end') ?? '18:00'}
                      onChange={(e) => updateLocal('business_hours_end', e.target.value)}
                      disabled={!canConfigure}
                    />
                  </div>
                </div>
                <div>
                  <Label>Dias úteis</Label>
                  <div className="flex gap-2 mt-2">
                    {[
                      { day: 0, label: 'Dom' },
                      { day: 1, label: 'Seg' },
                      { day: 2, label: 'Ter' },
                      { day: 3, label: 'Qua' },
                      { day: 4, label: 'Qui' },
                      { day: 5, label: 'Sex' },
                      { day: 6, label: 'Sáb' },
                    ].map(({ day, label }) => {
                      const days: number[] = getValue('business_days') ?? [1, 2, 3, 4, 5];
                      const isActive = days.includes(day);
                      return (
                        <Button
                          key={day}
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className="w-12"
                          disabled={!canConfigure}
                          onClick={() => {
                            const newDays = isActive
                              ? days.filter(d => d !== day)
                              : [...days, day].sort();
                            updateLocal('business_days', newDays);
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fallback */}
          <TabsContent value="fallback" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle className="text-base">Fallback</CardTitle>
                </div>
                <CardDescription>
                  Quando o provider principal falha, o sistema tenta automaticamente o outro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Fallback automático</Label>
                    <p className="text-xs text-muted-foreground">
                      Tenta o outro provider se o principal falhar
                    </p>
                  </div>
                  <Switch
                    checked={getValue('fallback_enabled') ?? true}
                    onCheckedChange={(v) => updateLocal('fallback_enabled', v)}
                    disabled={!canConfigure}
                  />
                </div>
                <Separator />
                <div>
                  <Label>Provider de fallback</Label>
                  <Select
                    value={getValue('fallback_provider_type') ?? 'waha'}
                    onValueChange={(v) => updateLocal('fallback_provider_type', v)}
                    disabled={!canConfigure}
                  >
                    <SelectTrigger className="w-[200px] mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waha">WAHA (Gratuito)</SelectItem>
                      <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Links Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/whatsapp/providers')}>
              <div className="text-center">
                <Settings className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Providers</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/whatsapp/routing')}>
              <div className="text-center">
                <Shield className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Regras</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/whatsapp/custos')}>
              <div className="text-center">
                <DollarSign className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Custos</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-3" onClick={() => navigate('/whatsapp/routing-logs')}>
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Logs</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
