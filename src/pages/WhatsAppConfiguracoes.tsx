import { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink,
  Building2,
  Store,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModuleLayout } from '@/components/shared/index';
import { supabase } from '@/integrations/supabase/client';
import { useWahaConfigAdapter, useWahaConfigList, type WahaConfigWithLevel } from '@/hooks/useWahaConfigAdapter';
import { useTenantContext } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: string;
}

interface WAHAConfig {
  baseUrl: string;
  apiKey: string;
}

export default function WhatsAppConfiguracoes() {
  const { tenant, accessLevel } = useTenantContext();
  const { config: wahaConfig, saveConfig: saveWahaConfig, isSaving, testConnection, isTesting } = useWahaConfigAdapter();
  const { configs: allConfigs, isLoading: isLoadingConfigs, deleteConfig, isDeleting } = useWahaConfigList();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<WAHAConfig>({ baseUrl: '', apiKey: '' });
  const [showApiKey, setShowApiKey] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('empresa');
  const [franchises, setFranchises] = useState<{ id: string; nome: string; cidade?: string }[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('');
  const [franchiseConfig, setFranchiseConfig] = useState<WAHAConfig>({ baseUrl: '', apiKey: '' });
  const [showFranchiseApiKey, setShowFranchiseApiKey] = useState(false);

  // Carregar franquias do tenant
  useEffect(() => {
    async function loadFranchises() {
      if (!tenant?.id && accessLevel !== 'platform') return;

      let query = supabase
        .from('mt_franchises')
        .select('id, nome, cidade')
        .eq('is_active', true)
        .order('nome');

      if (tenant?.id) {
        query = query.eq('tenant_id', tenant.id);
      }

      const { data } = await query;
      setFranchises(data || []);
    }

    loadFranchises();
  }, [tenant?.id, accessLevel]);

  // Carregar configurações do banco de dados
  useEffect(() => {
    if (wahaConfig) {
      setConfig({
        baseUrl: wahaConfig.api_url || '',
        apiKey: wahaConfig.api_key || '',
      });
      setConfigLoaded(true);
    }
  }, [wahaConfig]);

  // Executar diagnósticos
  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. Verificar conexão com Supabase
    try {
      const { error } = await supabase.from('mt_franchises').select('id').limit(1);
      if (error) throw error;
      results.push({
        name: 'Conexão Supabase',
        status: 'success',
        message: 'Conectado ao banco de dados',
      });
    } catch (err) {
      results.push({
        name: 'Conexão Supabase',
        status: 'error',
        message: 'Erro de conexão',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
    setDiagnostics([...results]);

    // 2. Verificar tabela de configuração WAHA
    try {
      const { data, error } = await supabase
        .from('mt_waha_config')
        .select('id, enabled, api_url, api_key')
        .limit(1);

      if (error) {
        results.push({
          name: 'Tabela waha_config',
          status: 'error',
          message: 'Tabela não encontrada',
          details: error.message,
        });
      } else if (!data || data.length === 0) {
        results.push({
          name: 'Configuração WAHA',
          status: 'warning',
          message: 'Nenhuma configuração encontrada',
          details: 'Configure o WAHA abaixo',
        });
      } else {
        const hasUrl = data[0].api_url && data[0].api_url.length > 0;
        const hasKey = data[0].api_key && data[0].api_key.length > 0;

        if (!hasUrl || !hasKey) {
          results.push({
            name: 'Configurações WAHA',
            status: 'warning',
            message: 'Configurações incompletas',
            details: `URL: ${hasUrl ? '✓' : '✗'} | API Key: ${hasKey ? '✓' : '✗ (configure abaixo)'}`,
          });
        } else {
          results.push({
            name: 'Configurações WAHA',
            status: 'success',
            message: 'URL e API Key configuradas',
          });
        }
      }
    } catch (err) {
      results.push({
        name: 'Tabela waha_config',
        status: 'error',
        message: 'Erro ao verificar',
        details: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
    setDiagnostics([...results]);

    // 3. Verificar tabelas WhatsApp
    const tables = ['mt_whatsapp_sessions', 'mt_whatsapp_conversations', 'mt_whatsapp_messages'];
    for (const tableName of tables) {
      try {
        const { error } = await supabase.from(tableName).select('id').limit(1);
        if (error) {
          results.push({
            name: `Tabela ${tableName.replace('mt_whatsapp_', '')}`,
            status: 'error',
            message: 'Não encontrada',
            details: error.message,
          });
        } else {
          results.push({
            name: `Tabela ${tableName.replace('mt_whatsapp_', '')}`,
            status: 'success',
            message: 'OK',
          });
        }
      } catch (err) {
        results.push({
          name: `Tabela ${tableName.replace('mt_whatsapp_', '')}`,
          status: 'error',
          message: 'Erro',
          details: err instanceof Error ? err.message : 'Erro',
        });
      }
    }
    setDiagnostics([...results]);

    // 4. Testar conexão WAHA
    if (config.baseUrl && config.apiKey) {
      try {
        const testResult = await testConnection({ apiUrl: config.baseUrl, apiKey: config.apiKey });
        if (testResult?.success) {
          results.push({
            name: 'Conexão WAHA API',
            status: 'success',
            message: 'Conectado ao servidor WAHA',
          });
        } else {
          results.push({
            name: 'Conexão WAHA API',
            status: 'error',
            message: 'Falha na conexão',
            details: testResult?.error || 'Verifique a URL e API Key',
          });
        }
      } catch (err) {
        results.push({
          name: 'Conexão WAHA API',
          status: 'error',
          message: 'Erro ao conectar',
          details: err instanceof Error ? err.message : 'Erro',
        });
      }
    } else {
      results.push({
        name: 'Conexão WAHA API',
        status: 'warning',
        message: 'Não testada',
        details: 'Configure a URL e API Key primeiro',
      });
    }
    setDiagnostics([...results]);

    setIsRunning(false);
  };

  // Salvar configurações do tenant (global)
  const handleSaveConfig = async () => {
    if (!config.baseUrl || !config.apiKey) {
      toast.error('Preencha a URL e API Key');
      return;
    }

    try {
      await saveWahaConfig({
        api_url: config.baseUrl,
        api_key: config.apiKey,
        enabled: true,
        default_engine: 'NOWEB',
        franchise_id: null, // Config global do tenant
      });
      toast.success('Configurações da empresa salvas com sucesso!');
      runDiagnostics();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar configurações');
    }
  };

  // Salvar configurações de franquia
  const handleSaveFranchiseConfig = async () => {
    if (!selectedFranchiseId) {
      toast.error('Selecione uma franquia');
      return;
    }
    if (!franchiseConfig.baseUrl || !franchiseConfig.apiKey) {
      toast.error('Preencha a URL e API Key da franquia');
      return;
    }

    try {
      await saveWahaConfig({
        api_url: franchiseConfig.baseUrl,
        api_key: franchiseConfig.apiKey,
        enabled: true,
        default_engine: 'NOWEB',
        franchise_id: selectedFranchiseId,
      });
      toast.success('Configuração da franquia salva!');
      setSelectedFranchiseId('');
      setFranchiseConfig({ baseUrl: '', apiKey: '' });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar configuração da franquia');
    }
  };

  // Deletar configuração de franquia
  const handleDeleteConfig = (configItem: WahaConfigWithLevel) => {
    if (configItem.config_level === 'tenant') {
      toast.error('Não é possível deletar a configuração global da empresa');
      return;
    }
    if (confirm(`Remover configuração da franquia "${configItem.franchise_name}"?`)) {
      deleteConfig(configItem.id);
    }
  };

  // Rodar diagnósticos ao montar
  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'loading':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getBadgeVariant = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const hasErrors = diagnostics.some(d => d.status === 'error');
  const hasWarnings = diagnostics.some(d => d.status === 'warning');
  const allSuccess = diagnostics.length > 0 && diagnostics.every(d => d.status === 'success');

  return (
    <ModuleLayout
      title="Configurações WhatsApp"
      description="Configure a integração com WAHA e verifique o status do sistema"
      breadcrumbs={[
        { label: 'WhatsApp', href: '/whatsapp' },
        { label: 'Configurações' },
      ]}
    >
      {/* Status Geral */}
      <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                <CardTitle>Status do Sistema</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Verificar
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Status Resumido */}
            <div className="mb-4 rounded-lg border p-4">
              {allSuccess ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Sistema operacional - Tudo funcionando!</span>
                </div>
              ) : hasErrors ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Problemas encontrados - Verifique os itens abaixo</span>
                </div>
              ) : hasWarnings ? (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Atenção necessária em alguns itens</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Verificando...</span>
                </div>
              )}
            </div>

            {/* Lista de Diagnósticos */}
            <div className="space-y-2">
              {diagnostics.map((item, index) => (
                <div
                  key={item.name || `diag-${index}`}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                      {item.details && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={getBadgeVariant(item.status) as any}>
                    {item.status === 'success' ? 'OK' :
                     item.status === 'error' ? 'Erro' :
                     item.status === 'warning' ? 'Atenção' : '...'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configuração WAHA - Tabs */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>Configuração WAHA</CardTitle>
            </div>
            <CardDescription>
              Configure a URL e chave de API do servidor WAHA por empresa ou por franquia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="empresa" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa (Global)
                </TabsTrigger>
                <TabsTrigger value="franquias" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Por Franquia
                </TabsTrigger>
              </TabsList>

              {/* Tab: Configuração da Empresa (Global) */}
              <TabsContent value="empresa" className="space-y-4">
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertTitle>Configuração Global</AlertTitle>
                  <AlertDescription>
                    Esta configuração será usada por todas as franquias que não tiverem uma configuração própria.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">URL Base do WAHA</Label>
                  <div className="flex gap-2">
                    <Input
                      id="baseUrl"
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      placeholder="https://waha.seudominio.com.br"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(config.baseUrl, '_blank')}
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key do WAHA</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={config.apiKey}
                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                        placeholder="Sua API Key do WAHA"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(config.apiKey);
                        toast.success('API Key copiada!');
                      }}
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (wahaConfig) {
                        setConfig({
                          baseUrl: wahaConfig.api_url || '',
                          apiKey: wahaConfig.api_key || '',
                        });
                      }
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveConfig}
                    disabled={isSaving || !config.baseUrl || !config.apiKey}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configuração Global
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Tab: Configuração por Franquia */}
              <TabsContent value="franquias" className="space-y-4">
                <Alert>
                  <Store className="h-4 w-4" />
                  <AlertTitle>Configuração por Franquia</AlertTitle>
                  <AlertDescription>
                    Franquias podem ter seu próprio servidor WAHA. Se não configurado, usarão a configuração global da empresa.
                  </AlertDescription>
                </Alert>

                {/* Lista de configs existentes */}
                {allConfigs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Configurações Existentes</Label>
                    <div className="space-y-2">
                      {allConfigs.map((cfg) => (
                        <div
                          key={cfg.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            {cfg.config_level === 'tenant' ? (
                              <Building2 className="h-5 w-5 text-blue-500" />
                            ) : (
                              <Store className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="font-medium">
                                {cfg.config_level === 'tenant' ? 'Configuração Global' : cfg.franchise_name}
                              </p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {cfg.api_url}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cfg.enabled ? 'default' : 'secondary'}>
                              {cfg.enabled ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {cfg.config_level === 'franchise' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteConfig(cfg)}
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Formulário para adicionar config de franquia */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Adicionar Configuração de Franquia</Label>

                  <div className="space-y-2">
                    <Label htmlFor="franchise">Selecione a Franquia</Label>
                    <Select value={selectedFranchiseId} onValueChange={setSelectedFranchiseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma franquia..." />
                      </SelectTrigger>
                      <SelectContent>
                        {franchises
                          .filter(f => !allConfigs.some(c => c.franchise_id === f.id))
                          .map(franchise => (
                            <SelectItem key={franchise.id} value={franchise.id}>
                              {franchise.nome} {franchise.cidade && `(${franchise.cidade})`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Apenas franquias sem configuração própria são listadas
                    </p>
                  </div>

                  {selectedFranchiseId && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="franchiseBaseUrl">URL Base do WAHA (Franquia)</Label>
                        <Input
                          id="franchiseBaseUrl"
                          value={franchiseConfig.baseUrl}
                          onChange={(e) => setFranchiseConfig({ ...franchiseConfig, baseUrl: e.target.value })}
                          placeholder="https://waha-franquia.exemplo.com.br"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="franchiseApiKey">API Key do WAHA (Franquia)</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="franchiseApiKey"
                              type={showFranchiseApiKey ? 'text' : 'password'}
                              value={franchiseConfig.apiKey}
                              onChange={(e) => setFranchiseConfig({ ...franchiseConfig, apiKey: e.target.value })}
                              placeholder="API Key da franquia"
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0"
                              onClick={() => setShowFranchiseApiKey(!showFranchiseApiKey)}
                            >
                              {showFranchiseApiKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveFranchiseConfig}
                          disabled={isSaving || !franchiseConfig.baseUrl || !franchiseConfig.apiKey}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar Configuração
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Webhook Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Webhook</CardTitle>
            <CardDescription>
              Configure este webhook no seu servidor WAHA para receber eventos em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value="https://supabase-app.yeslaserpraiagrande.com.br/functions/v1/waha-webhook"
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText('https://supabase-app.yeslaserpraiagrande.com.br/functions/v1/waha-webhook');
                  toast.success('URL do webhook copiada!');
                }}
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Configure esta URL nas configurações de webhook do seu servidor WAHA
            </p>
          </CardContent>
        </Card>

        {/* Instruções */}
        {(hasErrors || !config.apiKey) && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração Necessária</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>Para o WhatsApp funcionar corretamente:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Certifique-se de que o servidor WAHA está online</li>
                <li>Configure a <strong>URL Base</strong> do servidor WAHA acima</li>
                <li>Configure a <strong>API Key</strong> do WAHA</li>
                <li>Clique em "Verificar" para testar a conexão</li>
                <li>Configure o webhook no servidor WAHA</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}
    </ModuleLayout>
  );
}
