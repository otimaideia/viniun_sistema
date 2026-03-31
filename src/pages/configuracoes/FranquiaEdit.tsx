import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building,
  ArrowLeft,
  Save,
  Loader2,
  MapPin,
  Phone,
  User,
  Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { Tenant } from '@/types/multitenant';

// =============================================================================
// PÁGINA: Criar/Editar Franquia
// Formulário completo para gerenciamento de franquias
// =============================================================================

export default function FranquiaEdit() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Estado do formulário
  const [formData, setFormData] = useState({
    tenant_id: searchParams.get('tenant') || '',
    codigo: '',
    nome: '',
    cnpj: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    email: '',
    responsavel_nome: '',
    responsavel_telefone: '',
    responsavel_email: '',
  });

  useEffect(() => {
    loadTenants();
    if (isEditing) {
      loadFranchise();
    }
  }, [id]);

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('mt_tenants')
        .select('id, nome_fantasia, slug')
        .eq('is_active', true)
        .order('nome_fantasia');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadFranchise = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('mt_franchises')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        tenant_id: data.tenant_id || '',
        codigo: data.codigo || '',
        nome: data.nome || '',
        cnpj: data.cnpj || '',
        cep: data.cep || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        telefone: data.telefone || '',
        email: data.email || '',
        responsavel_nome: data.responsavel_nome || '',
        responsavel_telefone: data.responsavel_telefone || '',
        responsavel_email: data.responsavel_email || '',
      });
    } catch (error) {
      console.error('Erro ao carregar franquia:', error);
      toast({
        title: 'Erro ao carregar franquia',
        description: 'Não foi possível carregar os dados da franquia.',
        variant: 'destructive',
      });
      navigate('/configuracoes/franquias');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAddressByCep = async () => {
    if (!formData.cep || formData.cep.length < 8) return;

    setIsFetchingCep(true);
    try {
      const cepClean = formData.cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.tenant_id || !formData.codigo || !formData.nome) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha empresa, código e nome da franquia.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('mt_franchises')
          .update(formData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('mt_franchises')
          .insert({ ...formData, is_active: true })
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Franquia criada',
          description: `${formData.nome} foi criada com sucesso.`,
        });

        navigate(`/configuracoes/franquias/${data.id}`);
        return;
      }

      toast({
        title: 'Franquia atualizada',
        description: `${formData.nome} foi atualizada com sucesso.`,
      });

      navigate(`/configuracoes/franquias/${id}`);
    } catch (error: unknown) {
      console.error('Erro ao salvar franquia:', error);
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar a franquia.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
            <Link to={isEditing ? `/configuracoes/franquias/${id}` : '/configuracoes/franquias'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building className="h-6 w-6" />
              {isEditing ? 'Editar Franquia' : 'Nova Franquia'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? `Editando ${formData.nome}`
                : 'Preencha os dados para criar uma nova franquia'}
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados da Franquia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Dados da Franquia
            </CardTitle>
            <CardDescription>
              Informações básicas da franquia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Empresa *</Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(value) => updateField('tenant_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => updateField('codigo', e.target.value.toUpperCase())}
                  placeholder="Ex: 001, MTZ, SP01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => updateField('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => updateField('nome', e.target.value)}
                placeholder="Nome da franquia/unidade"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </CardTitle>
            <CardDescription>
              Localização da franquia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => updateField('cep', e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => updateField('endereco', e.target.value)}
                placeholder="Rua, Avenida..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => updateField('numero', e.target.value)}
                  placeholder="123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento}
                  onChange={(e) => updateField('complemento', e.target.value)}
                  placeholder="Sala 101"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => updateField('bairro', e.target.value)}
                placeholder="Bairro"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => updateField('estado', e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="UF"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </CardTitle>
            <CardDescription>
              Informações de contato da franquia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => updateField('telefone', e.target.value)}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="unidade@empresa.com.br"
              />
            </div>
          </CardContent>
        </Card>

        {/* Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Responsável
            </CardTitle>
            <CardDescription>
              Responsável pela franquia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="responsavel_nome">Nome</Label>
              <Input
                id="responsavel_nome"
                value={formData.responsavel_nome}
                onChange={(e) => updateField('responsavel_nome', e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_telefone">Telefone</Label>
              <Input
                id="responsavel_telefone"
                value={formData.responsavel_telefone}
                onChange={(e) => updateField('responsavel_telefone', e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_email">E-mail</Label>
              <Input
                id="responsavel_email"
                type="email"
                value={formData.responsavel_email}
                onChange={(e) => updateField('responsavel_email', e.target.value)}
                placeholder="responsavel@empresa.com.br"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
