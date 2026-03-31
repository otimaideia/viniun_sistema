import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  User,
  Palette,
  Settings,
  Package,
  Grid3X3,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEmpresaSave } from '@/hooks/multitenant/useEmpresaSave';
import type { Tenant, TenantBranding } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Editar Empresa (Tenant)
// Formulário completo para edição de uma empresa
// =============================================================================

interface Module {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
  categoria: string;
  is_core: boolean;
}

const PLANOS = [
  { value: 'starter', label: 'Starter', franquias: 1, usuarios: 5, leads: 500 },
  { value: 'professional', label: 'Professional', franquias: 5, usuarios: 25, leads: 2500 },
  { value: 'enterprise', label: 'Enterprise', franquias: 20, usuarios: 100, leads: 10000 },
  { value: 'unlimited', label: 'Unlimited', franquias: null, usuarios: null, leads: null },
];

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Recife', label: 'Recife (GMT-3)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (GMT-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
];

const COLOR_PRESETS = [
  { name: 'Azul', primary: '#3B82F6', secondary: '#1E40AF' },
  { name: 'Verde', primary: '#22C55E', secondary: '#15803D' },
  { name: 'Roxo', primary: '#8B5CF6', secondary: '#6D28D9' },
  { name: 'Rosa', primary: '#EC4899', secondary: '#BE185D' },
  { name: 'Laranja', primary: '#F97316', secondary: '#C2410C' },
  { name: 'Vermelho', primary: '#EF4444', secondary: '#B91C1C' },
  { name: 'Ciano', primary: '#06B6D4', secondary: '#0E7490' },
  { name: 'Amarelo', primary: '#EAB308', secondary: '#A16207' },
];

export default function EmpresaEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const { save: saveEmpresa } = useEmpresaSave();

  // Estado do formulário - Dados da Empresa
  const [empresa, setEmpresa] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    slug: '',
    subdominio: '',
    dominio_customizado: '',
  });

  // Estado do formulário - Endereço
  const [endereco, setEndereco] = useState({
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
  });

  // Estado do formulário - Responsável
  const [responsavel, setResponsavel] = useState({
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_cargo: '',
    responsavel_email: '',
  });

  // Estado do formulário - Branding
  const [branding, setBranding] = useState({
    cor_primaria: '#3B82F6',
    cor_secundaria: '#1E40AF',
    cor_acento: '#F59E0B',
    logo_url: '',
    logo_escuro_url: '',
    favicon_url: '',
    fonte_primaria: 'Inter',
    fonte_secundaria: 'Inter',
  });

  // Estado do formulário - Configurações
  const [config, setConfig] = useState({
    timezone: 'America/Sao_Paulo',
    idioma: 'pt-BR',
    moeda: 'BRL',
  });

  // Estado do formulário - Plano
  const [plano, setPlano] = useState({
    plano: 'professional',
    max_franquias: 5,
    max_usuarios: 25,
    max_leads_mes: 2500,
    data_ativacao: '',
    data_expiracao: '',
  });

  // Estado do formulário - Módulos
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([]);

  // Carregar dados
  useEffect(() => {
    loadModules();
    if (isEditing) {
      loadTenant();
    }
  }, [id]);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_modules')
        .select('*')
        .eq('is_active', true)
        .order('categoria')
        .order('ordem');

      if (error) throw error;
      setModules(data || []);

      // Se é criação, selecionar módulos CORE automaticamente
      if (!isEditing) {
        const coreModules = (data || [])
          .filter((m) => m.is_core)
          .map((m) => m.id);
        setModulosSelecionados(coreModules);
      }
    } catch (error) {
      console.error('Erro ao carregar módulos:', error);
    }
  };

  const loadTenant = async () => {
    setIsLoading(true);
    try {
      // Buscar tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('mt_tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (tenantError) throw tenantError;

      // Preencher dados da empresa
      setEmpresa({
        nome_fantasia: tenantData.nome_fantasia || '',
        razao_social: tenantData.razao_social || '',
        cnpj: tenantData.cnpj || '',
        slug: tenantData.slug || '',
        subdominio: tenantData.subdominio || '',
        dominio_customizado: tenantData.dominio_customizado || '',
      });

      // Preencher endereço
      setEndereco({
        cep: tenantData.cep || '',
        endereco: tenantData.endereco || '',
        numero: tenantData.numero || '',
        complemento: tenantData.complemento || '',
        bairro: tenantData.bairro || '',
        cidade: tenantData.cidade || '',
        estado: tenantData.estado || '',
        telefone: tenantData.telefone || '',
        email: tenantData.email || '',
      });

      // Preencher responsável
      setResponsavel({
        responsavel_nome: tenantData.responsavel_nome || '',
        responsavel_cpf: tenantData.responsavel_cpf || '',
        responsavel_cargo: tenantData.responsavel_cargo || '',
        responsavel_email: tenantData.responsavel_email || '',
      });

      // Preencher configurações
      setConfig({
        timezone: tenantData.timezone || 'America/Sao_Paulo',
        idioma: tenantData.idioma || 'pt-BR',
        moeda: tenantData.moeda || 'BRL',
      });

      // Preencher plano
      setPlano({
        plano: tenantData.plano || 'professional',
        max_franquias: tenantData.max_franquias || 5,
        max_usuarios: tenantData.max_usuarios || 25,
        max_leads_mes: tenantData.max_leads_mes || 2500,
        data_ativacao: tenantData.data_ativacao || '',
        data_expiracao: tenantData.data_expiracao || '',
      });

      // Buscar branding
      const { data: brandingData } = await supabase
        .from('mt_tenant_branding')
        .select('*')
        .eq('tenant_id', id)
        .single();

      if (brandingData) {
        setBranding({
          cor_primaria: brandingData.cor_primaria || '#3B82F6',
          cor_secundaria: brandingData.cor_secundaria || '#1E40AF',
          cor_acento: brandingData.cor_acento || '#F59E0B',
          logo_url: brandingData.logo_url || '',
          logo_escuro_url: brandingData.logo_escuro_url || '',
          favicon_url: brandingData.favicon_url || '',
          fonte_primaria: brandingData.fonte_primaria || 'Inter',
          fonte_secundaria: brandingData.fonte_secundaria || 'Inter',
        });
      }

      // Buscar módulos selecionados
      const { data: modulesData } = await supabase
        .from('mt_tenant_modules')
        .select('module_id')
        .eq('tenant_id', id);

      if (modulesData) {
        setModulosSelecionados(modulesData.map((m) => m.module_id));
      }
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
      toast({
        title: 'Erro ao carregar empresa',
        description: 'Não foi possível carregar os dados da empresa.',
        variant: 'destructive',
      });
      navigate('/configuracoes/empresas');
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar slug automaticamente
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Buscar endereço pelo CEP
  const fetchAddressByCep = async () => {
    if (!endereco.cep || endereco.cep.length < 8) return;

    setIsFetchingCep(true);
    try {
      const cepClean = endereco.cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setEndereco((prev) => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  // Aplicar preset de cores
  const applyColorPreset = (preset: { primary: string; secondary: string }) => {
    setBranding((prev) => ({
      ...prev,
      cor_primaria: preset.primary,
      cor_secundaria: preset.secondary,
    }));
  };

  // Aplicar limites do plano
  const applyPlanLimits = (planValue: string) => {
    const selectedPlan = PLANOS.find((p) => p.value === planValue);
    if (selectedPlan) {
      setPlano((prev) => ({
        ...prev,
        plano: planValue,
        max_franquias: selectedPlan.franquias || 9999,
        max_usuarios: selectedPlan.usuarios || 9999,
        max_leads_mes: selectedPlan.leads || 999999,
      }));
    }
  };

  // Toggle módulo
  const toggleModule = (moduleId: string, isCore: boolean) => {
    if (isCore) return; // Módulos CORE não podem ser desmarcados

    setModulosSelecionados((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Salvar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!empresa.nome_fantasia || !empresa.cnpj || !empresa.slug) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Dados do tenant
      const tenantData = {
        ...empresa,
        ...endereco,
        ...responsavel,
        ...config,
        ...plano,
        subdominio: empresa.subdominio || empresa.slug,
      };

      const tenantId = await saveEmpresa({
        isEditing,
        tenantId: id,
        tenantData,
        brandingData: branding,
        modulosSelecionados,
      });

      toast({
        title: isEditing ? 'Empresa atualizada' : 'Empresa criada',
        description: `${empresa.nome_fantasia} foi ${isEditing ? 'atualizada' : 'criada'} com sucesso.`,
      });

      navigate(`/configuracoes/empresas/${tenantId}`);
    } catch (error: unknown) {
      console.error('Erro ao salvar empresa:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar a empresa.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" type="button" asChild>
            <Link to={isEditing ? `/configuracoes/empresas/${id}` : '/configuracoes/empresas'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? `Editando ${empresa.nome_fantasia}`
                : 'Preencha os dados para criar uma nova empresa'}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="empresa" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="empresa">
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="endereco">
            <MapPin className="w-4 h-4 mr-2" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="responsavel">
            <User className="w-4 h-4 mr-2" />
            Responsável
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="plano">
            <Package className="w-4 h-4 mr-2" />
            Plano
          </TabsTrigger>
          <TabsTrigger value="modulos">
            <Grid3X3 className="w-4 h-4 mr-2" />
            Módulos
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dados da Empresa */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações básicas da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                  <Input
                    id="nome_fantasia"
                    value={empresa.nome_fantasia}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmpresa((prev) => ({
                        ...prev,
                        nome_fantasia: value,
                        slug: prev.slug || generateSlug(value),
                        subdominio: prev.subdominio || generateSlug(value),
                      }));
                    }}
                    placeholder="Nome da empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={empresa.razao_social}
                    onChange={(e) =>
                      setEmpresa((prev) => ({
                        ...prev,
                        razao_social: e.target.value,
                      }))
                    }
                    placeholder="Razão social completa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={empresa.cnpj}
                    onChange={(e) =>
                      setEmpresa((prev) => ({ ...prev, cnpj: e.target.value }))
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={empresa.slug}
                    onChange={(e) =>
                      setEmpresa((prev) => ({
                        ...prev,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    placeholder="nome-empresa"
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único da empresa
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subdominio">Subdomínio</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdominio"
                      value={empresa.subdominio}
                      onChange={(e) =>
                        setEmpresa((prev) => ({
                          ...prev,
                          subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      placeholder="empresa"
                    />
                    <span className="text-muted-foreground whitespace-nowrap">.seusite.com.br</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dominio_customizado">Domínio Customizado</Label>
                  <Input
                    id="dominio_customizado"
                    value={empresa.dominio_customizado}
                    onChange={(e) =>
                      setEmpresa((prev) => ({
                        ...prev,
                        dominio_customizado: e.target.value,
                      }))
                    }
                    placeholder="painel.empresa.com.br"
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional - domínio próprio da empresa
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Endereço e Contato */}
        <TabsContent value="endereco">
          <Card>
            <CardHeader>
              <CardTitle>Endereço e Contato</CardTitle>
              <CardDescription>
                Localização e informações de contato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={endereco.cep}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, cep: e.target.value }))
                      }
                      onBlur={fetchAddressByCep}
                      placeholder="00000-000"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={fetchAddressByCep}
                      disabled={isFetchingCep}
                    >
                      {isFetchingCep ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco.endereco}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, endereco: e.target.value }))
                    }
                    placeholder="Rua, Avenida..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={endereco.numero}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, numero: e.target.value }))
                    }
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={endereco.complemento}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, complemento: e.target.value }))
                    }
                    placeholder="Sala 101"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={endereco.bairro}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, bairro: e.target.value }))
                    }
                    placeholder="Bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={endereco.cidade}
                    onChange={(e) =>
                      setEndereco((prev) => ({ ...prev, cidade: e.target.value }))
                    }
                    placeholder="Cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={endereco.estado}
                    onChange={(e) =>
                      setEndereco((prev) => ({
                        ...prev,
                        estado: e.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={2}
                    placeholder="UF"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Contato</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={endereco.telefone}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, telefone: e.target.value }))
                      }
                      placeholder="(00) 0000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={endereco.email}
                      onChange={(e) =>
                        setEndereco((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="contato@empresa.com.br"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Responsável */}
        <TabsContent value="responsavel">
          <Card>
            <CardHeader>
              <CardTitle>Responsável Legal</CardTitle>
              <CardDescription>
                Dados do responsável legal pela empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="responsavel_nome">Nome Completo</Label>
                  <Input
                    id="responsavel_nome"
                    value={responsavel.responsavel_nome}
                    onChange={(e) =>
                      setResponsavel((prev) => ({
                        ...prev,
                        responsavel_nome: e.target.value,
                      }))
                    }
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel_cpf">CPF</Label>
                  <Input
                    id="responsavel_cpf"
                    value={responsavel.responsavel_cpf}
                    onChange={(e) =>
                      setResponsavel((prev) => ({
                        ...prev,
                        responsavel_cpf: e.target.value,
                      }))
                    }
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel_cargo">Cargo</Label>
                  <Input
                    id="responsavel_cargo"
                    value={responsavel.responsavel_cargo}
                    onChange={(e) =>
                      setResponsavel((prev) => ({
                        ...prev,
                        responsavel_cargo: e.target.value,
                      }))
                    }
                    placeholder="Diretor, Sócio, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel_email">E-mail</Label>
                  <Input
                    id="responsavel_email"
                    type="email"
                    value={responsavel.responsavel_email}
                    onChange={(e) =>
                      setResponsavel((prev) => ({
                        ...prev,
                        responsavel_email: e.target.value,
                      }))
                    }
                    placeholder="responsavel@empresa.com.br"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Branding */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>
                Cores, logos e fontes da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Presets de cores */}
              <div>
                <Label className="mb-2 block">Paletas Predefinidas</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyColorPreset(preset)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-accent transition-colors"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <span className="text-sm">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cores */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cor_primaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="cor_primaria"
                      value={branding.cor_primaria}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_primaria: e.target.value,
                        }))
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={branding.cor_primaria}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_primaria: e.target.value,
                        }))
                      }
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor_secundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="cor_secundaria"
                      value={branding.cor_secundaria}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_secundaria: e.target.value,
                        }))
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={branding.cor_secundaria}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_secundaria: e.target.value,
                        }))
                      }
                      placeholder="#1E40AF"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor_acento">Cor de Acento</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="cor_acento"
                      value={branding.cor_acento}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_acento: e.target.value,
                        }))
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={branding.cor_acento}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          cor_acento: e.target.value,
                        }))
                      }
                      placeholder="#F59E0B"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Preview</Label>
                <div className="flex gap-4 items-center">
                  <div
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: branding.cor_primaria }}
                  >
                    Botão Primário
                  </div>
                  <div
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: branding.cor_secundaria }}
                  >
                    Botão Secundário
                  </div>
                  <div
                    className="px-4 py-2 rounded text-white"
                    style={{ backgroundColor: branding.cor_acento }}
                  >
                    Acento
                  </div>
                </div>
              </div>

              {/* Logos */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logo_url">URL do Logo</Label>
                  <Input
                    id="logo_url"
                    value={branding.logo_url}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        logo_url: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_escuro_url">URL do Logo (Modo Escuro)</Label>
                  <Input
                    id="logo_escuro_url"
                    value={branding.logo_escuro_url}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        logo_escuro_url: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="favicon_url">URL do Favicon</Label>
                  <Input
                    id="favicon_url"
                    value={branding.favicon_url}
                    onChange={(e) =>
                      setBranding((prev) => ({
                        ...prev,
                        favicon_url: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Fontes */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fonte_primaria">Fonte Primária</Label>
                  <Select
                    value={branding.fonte_primaria}
                    onValueChange={(value) =>
                      setBranding((prev) => ({ ...prev, fonte_primaria: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fonte_secundaria">Fonte Secundária</Label>
                  <Select
                    value={branding.fonte_secundaria}
                    onValueChange={(value) =>
                      setBranding((prev) => ({ ...prev, fonte_secundaria: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Plano */}
        <TabsContent value="plano">
          <Card>
            <CardHeader>
              <CardTitle>Plano e Limites</CardTitle>
              <CardDescription>
                Configurações de plano e limites de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seleção de Plano */}
              <div className="grid gap-4 md:grid-cols-4">
                {PLANOS.map((p) => (
                  <div
                    key={p.value}
                    onClick={() => applyPlanLimits(p.value)}
                    className={cn(
                      'border rounded-lg p-4 cursor-pointer transition-all',
                      plano.plano === p.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    )}
                  >
                    <h4 className="font-semibold">{p.label}</h4>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>{p.franquias || '∞'} franquias</li>
                      <li>{p.usuarios || '∞'} usuários</li>
                      <li>{p.leads || '∞'} leads/mês</li>
                    </ul>
                  </div>
                ))}
              </div>

              {/* Limites Personalizados */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Limites Personalizados</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="max_franquias">Máx. Franquias</Label>
                    <Input
                      id="max_franquias"
                      type="number"
                      value={plano.max_franquias}
                      onChange={(e) =>
                        setPlano((prev) => ({
                          ...prev,
                          max_franquias: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_usuarios">Máx. Usuários</Label>
                    <Input
                      id="max_usuarios"
                      type="number"
                      value={plano.max_usuarios}
                      onChange={(e) =>
                        setPlano((prev) => ({
                          ...prev,
                          max_usuarios: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_leads_mes">Máx. Leads/mês</Label>
                    <Input
                      id="max_leads_mes"
                      type="number"
                      value={plano.max_leads_mes}
                      onChange={(e) =>
                        setPlano((prev) => ({
                          ...prev,
                          max_leads_mes: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Período de Vigência</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="data_ativacao">Data de Ativação</Label>
                    <Input
                      id="data_ativacao"
                      type="date"
                      value={plano.data_ativacao?.split('T')[0] || ''}
                      onChange={(e) =>
                        setPlano((prev) => ({
                          ...prev,
                          data_ativacao: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_expiracao">Data de Expiração</Label>
                    <Input
                      id="data_expiracao"
                      type="date"
                      value={plano.data_expiracao?.split('T')[0] || ''}
                      onChange={(e) =>
                        setPlano((prev) => ({
                          ...prev,
                          data_expiracao: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Configurações Gerais */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Configurações</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select
                      value={config.timezone}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idioma">Idioma</Label>
                    <Select
                      value={config.idioma}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, idioma: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (BR)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="moeda">Moeda</Label>
                    <Select
                      value={config.moeda}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, moeda: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (R$)</SelectItem>
                        <SelectItem value="USD">Dólar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Módulos */}
        <TabsContent value="modulos">
          <Card>
            <CardHeader>
              <CardTitle>Módulos</CardTitle>
              <CardDescription>
                Selecione os módulos habilitados para esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge>{modulosSelecionados.length} selecionado(s)</Badge>
                <span className="text-sm text-muted-foreground">
                  Módulos CORE são obrigatórios
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {modules.map((modulo) => {
                  const isSelected =
                    modulosSelecionados.includes(modulo.id) || modulo.is_core;

                  return (
                    <div
                      key={modulo.id}
                      onClick={() => toggleModule(modulo.id, modulo.is_core)}
                      className={cn(
                        'border rounded-lg p-4 cursor-pointer transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50',
                        modulo.is_core && 'cursor-default'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          disabled={modulo.is_core}
                          className="mt-0.5"
                        />
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
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {modulo.descricao}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
