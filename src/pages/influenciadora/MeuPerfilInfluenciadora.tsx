import { useState } from 'react';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { InfluenciadoraLayout } from '@/components/influenciadora-portal/InfluenciadoraLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Instagram,
  Save,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safeGetInitials } from '@/utils/unicodeSanitizer';
import { getTipoLabel, getTamanhoLabel, getPlataformaIcon, formatSeguidores } from '@/types/influenciadora';

export default function MeuPerfilInfluenciadora() {
  const { influenciadora, refreshInfluenciadora } = useInfluenciadoraAuthContext();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');

  // Form states
  const [nome_artistico, setNomeArtistico] = useState(influenciadora?.nome_artistico || '');
  const [email, setEmail] = useState(influenciadora?.email || '');
  const [telefone, setTelefone] = useState(influenciadora?.telefone || '');
  const [biografia, setBiografia] = useState(influenciadora?.biografia || '');
  const [cidade, setCidade] = useState(influenciadora?.cidade || '');
  const [estado, setEstado] = useState(influenciadora?.estado || '');

  const handleSaveProfile = async () => {
    if (!influenciadora?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mt_influencers')
        .update({
          nome_artistico,
          email,
          telefone,
          biografia,
          cidade,
          estado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', influenciadora.id);

      if (error) throw error;

      await refreshInfluenciadora();
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = influenciadora?.nome_artistico || influenciadora?.nome_completo || '';

  return (
    <InfluenciadoraLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
            <p className="text-gray-500">
              Gerencie suas informações pessoais e redes sociais
            </p>
          </div>
        </div>

        {/* Profile Summary Card */}
        <Card className="bg-gradient-to-r from-[#662E8E]/5 to-[#F2B705]/5 border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={influenciadora?.foto_perfil} />
                  <AvatarFallback className="bg-[#662E8E]/10 text-[#662E8E] text-2xl">
                    {safeGetInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full shadow-md"
                  disabled
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <p className="text-gray-500">{influenciadora?.nome_completo}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                  <Badge variant="outline" className="bg-white">
                    {getTipoLabel(influenciadora?.tipo || 'influenciador')}
                  </Badge>
                  {influenciadora?.tamanho && (
                    <Badge variant="outline" className="bg-white">
                      {getTamanhoLabel(influenciadora.tamanho)}
                    </Badge>
                  )}
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    {formatSeguidores(influenciadora?.total_seguidores || 0)} seguidores
                  </Badge>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Código de Indicação</p>
                <p className="text-2xl font-bold text-[#662E8E]">
                  {influenciadora?.codigo_indicacao || '---'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="redes">Redes Sociais</TabsTrigger>
          </TabsList>

          {/* Dados Pessoais */}
          <TabsContent value="dados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#662E8E]" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize suas informações de contato e apresentação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_completo">Nome Completo</Label>
                    <Input
                      id="nome_completo"
                      value={influenciadora?.nome_completo || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      Para alterar o nome completo, entre em contato com a equipe
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome_artistico">Nome Artístico</Label>
                    <Input
                      id="nome_artistico"
                      value={nome_artistico}
                      onChange={(e) => setNomeArtistico(e.target.value)}
                      placeholder="Como você é conhecida(o)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="telefone"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="pl-10"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className="pl-10"
                        placeholder="Sua cidade"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      placeholder="UF"
                      maxLength={2}
                      className="uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="biografia">Biografia</Label>
                  <Textarea
                    id="biografia"
                    value={biografia}
                    onChange={(e) => setBiografia(e.target.value)}
                    placeholder="Conte um pouco sobre você e seu trabalho..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-gray-500">
                    {biografia.length}/500 caracteres
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-[#662E8E] hover:bg-[#662E8E]/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar alterações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redes Sociais */}
          <TabsContent value="redes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-[#662E8E]" />
                  Minhas Redes Sociais
                </CardTitle>
                <CardDescription>
                  Gerencie suas redes sociais e métricas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {influenciadora?.redes_sociais && influenciadora.redes_sociais.length > 0 ? (
                  <div className="space-y-4">
                    {influenciadora.redes_sociais.map((rede) => (
                      <div
                        key={rede.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center text-white font-bold">
                            {rede.plataforma.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium capitalize">
                              {getPlataformaIcon(rede.plataforma)}
                            </p>
                            <p className="text-sm text-gray-500">
                              @{rede.username || 'usuário'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-[#662E8E]">
                              {formatSeguidores(rede.seguidores)}
                            </p>
                            <p className="text-xs text-gray-500">seguidores</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {rede.taxa_engajamento}%
                            </p>
                            <p className="text-xs text-gray-500">engajamento</p>
                          </div>
                          {rede.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={rede.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <Instagram className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Nenhuma rede social cadastrada</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Entre em contato para adicionar suas redes
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métricas Consolidadas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Consolidadas</CardTitle>
                <CardDescription>
                  Resumo do seu alcance e engajamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#662E8E]/5 rounded-lg text-center">
                    <p className="text-2xl font-bold text-[#662E8E]">
                      {formatSeguidores(influenciadora?.total_seguidores || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Total Seguidores</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(influenciadora?.taxa_engajamento_media || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">Engajamento Médio</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {influenciadora?.redes_sociais?.length || 0}
                    </p>
                    <p className="text-sm text-gray-500">Redes Cadastradas</p>
                  </div>
                  <div className="p-4 bg-[#F2B705]/10 rounded-lg text-center">
                    <p className="text-2xl font-bold text-[#662E8E]">
                      {influenciadora?.quantidade_indicacoes || 0}
                    </p>
                    <p className="text-sm text-gray-500">Total Indicações</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </InfluenciadoraLayout>
  );
}
