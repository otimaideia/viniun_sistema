import { useState } from 'react';
import { ClienteLayout } from '@/components/cliente';
import { useClienteAuthContext } from '@/contexts/ClienteAuthContext';
import { useClienteAgendamentosAdapter } from '@/hooks/useClienteAgendamentosAdapter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCPF, maskCPF } from '@/utils/cpf';
import { formatPhone } from '@/utils/phone';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  Save,
  Loader2,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Briefcase,
  Home,
  Instagram,
  Heart,
  AlertTriangle,
  Clock,
  Globe,
  Users,
  Bell,
  MessageSquare,
  Pill,
  Stethoscope,
  Sun,
  Baby
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function ClientePerfil() {
  const { lead } = useClienteAuthContext();
  const { atualizarDados } = useClienteAgendamentosAdapter(lead?.id || null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Dados Pessoais
    nome: lead?.nome || '',
    sobrenome: lead?.sobrenome || '',
    email: lead?.email || '',
    telefone: lead?.telefone || '',
    data_nascimento: lead?.data_nascimento || '',
    profissao: lead?.profissao || '',
    estado_civil: lead?.estado_civil || '',
    nacionalidade: lead?.nacionalidade || '',
    // Endereço
    cep: lead?.cep || '',
    endereco: lead?.endereco || '',
    numero: lead?.numero || '',
    complemento: lead?.complemento || '',
    bairro: lead?.bairro || '',
    proximidade: lead?.proximidade || '',
    // Contato e Redes
    instagram: lead?.instagram || '',
    preferencia_contato: lead?.preferencia_contato || '',
    melhor_horario_contato: lead?.melhor_horario_contato || '',
    dia_preferencial: lead?.dia_preferencial || '',
    // Saúde e Tratamento
    tipo_pele: lead?.tipo_pele || '',
    alergias: lead?.alergias || '',
    condicoes_medicas: lead?.condicoes_medicas || '',
    medicamentos_uso: lead?.medicamentos_uso || '',
    historico_tratamentos: lead?.historico_tratamentos || '',
    areas_interesse: lead?.areas_interesse || '',
    fotossensibilidade: lead?.fotossensibilidade || false,
    gravidez_lactacao: lead?.gravidez_lactacao || false,
    // Contato de Emergência
    contato_emergencia_nome: lead?.contato_emergencia_nome || '',
    contato_emergencia_telefone: lead?.contato_emergencia_telefone || '',
    contato_emergencia_parentesco: lead?.contato_emergencia_parentesco || '',
    // Preferências
    aceita_marketing: lead?.aceita_marketing ?? true,
    aceita_pesquisa: lead?.aceita_pesquisa ?? true,
  });

  const handleSave = async () => {
    setIsSaving(true);
    const success = await atualizarDados(formData);
    setIsSaving(false);

    if (success) {
      toast.success('Dados atualizados com sucesso!');
      setIsEditing(false);
    } else {
      toast.error('Erro ao atualizar dados');
    }
  };

  const handleCancel = () => {
    setFormData({
      // Dados Pessoais
      nome: lead?.nome || '',
      sobrenome: lead?.sobrenome || '',
      email: lead?.email || '',
      telefone: lead?.telefone || '',
      data_nascimento: lead?.data_nascimento || '',
      profissao: lead?.profissao || '',
      estado_civil: lead?.estado_civil || '',
      nacionalidade: lead?.nacionalidade || '',
      // Endereço
      cep: lead?.cep || '',
      endereco: lead?.endereco || '',
      numero: lead?.numero || '',
      complemento: lead?.complemento || '',
      bairro: lead?.bairro || '',
      proximidade: lead?.proximidade || '',
      // Contato e Redes
      instagram: lead?.instagram || '',
      preferencia_contato: lead?.preferencia_contato || '',
      melhor_horario_contato: lead?.melhor_horario_contato || '',
      dia_preferencial: lead?.dia_preferencial || '',
      // Saúde e Tratamento
      tipo_pele: lead?.tipo_pele || '',
      alergias: lead?.alergias || '',
      condicoes_medicas: lead?.condicoes_medicas || '',
      medicamentos_uso: lead?.medicamentos_uso || '',
      historico_tratamentos: lead?.historico_tratamentos || '',
      areas_interesse: lead?.areas_interesse || '',
      fotossensibilidade: lead?.fotossensibilidade || false,
      gravidez_lactacao: lead?.gravidez_lactacao || false,
      // Contato de Emergência
      contato_emergencia_nome: lead?.contato_emergencia_nome || '',
      contato_emergencia_telefone: lead?.contato_emergencia_telefone || '',
      contato_emergencia_parentesco: lead?.contato_emergencia_parentesco || '',
      // Preferências
      aceita_marketing: lead?.aceita_marketing ?? true,
      aceita_pesquisa: lead?.aceita_pesquisa ?? true,
    });
    setIsEditing(false);
  };

  return (
    <ClienteLayout>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500">Gerencie suas informações pessoais</p>
        </div>

        {/* Main Grid - 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card + Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Avatar/Nome */}
            <Card className="bg-gradient-to-r from-[#662E8E]/5 to-transparent border-[#662E8E]/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#662E8E]/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-[#662E8E]" />
                  </div>
                  <div>
                    <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">
                      {lead?.nome}
                    </h2>
                    <p className="text-gray-500">Cliente Viniun</p>
                    {lead?.email && (
                      <p className="text-sm text-[#662E8E] mt-1">{lead.email}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados pessoais */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg">Dados Pessoais</CardTitle>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="w-full sm:w-auto border-[#662E8E] text-[#662E8E] hover:bg-[#662E8E]/5"
                  >
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none bg-[#662E8E] hover:bg-[#4a2268]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4 text-gray-400" />
                      Nome
                    </Label>
                    {isEditing ? (
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.nome || '-'}</p>
                    )}
                  </div>

                  {/* Sobrenome */}
                  <div className="space-y-2">
                    <Label htmlFor="sobrenome" className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4 text-gray-400" />
                      Sobrenome
                    </Label>
                    {isEditing ? (
                      <Input
                        id="sobrenome"
                        value={formData.sobrenome}
                        onChange={(e) => setFormData({ ...formData, sobrenome: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.sobrenome || '-'}</p>
                    )}
                  </div>

                  {/* CPF (não editável) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      CPF
                    </Label>
                    <p className="text-gray-900 py-2 font-medium">
                      {lead?.cpf ? maskCPF(lead.cpf) : 'Não cadastrado'}
                    </p>
                    {isEditing && (
                      <p className="text-xs text-gray-500">
                        Para alterar o CPF, entre em contato com a unidade
                      </p>
                    )}
                  </div>

                  {/* RG (não editável) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-600">
                      <FileText className="h-4 w-4 text-gray-400" />
                      RG
                    </Label>
                    <p className="text-gray-900 py-2 font-medium">
                      {lead?.rg || 'Não cadastrado'}
                    </p>
                    {isEditing && (
                      <p className="text-xs text-gray-500">
                        Para alterar o RG, entre em contato com a unidade
                      </p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      Telefone
                    </Label>
                    {isEditing ? (
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.telefone ? formatPhone(lead.telefone) : 'Não cadastrado'}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email
                    </Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.email || 'Não cadastrado'}
                      </p>
                    )}
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento" className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      Data de Nascimento
                    </Label>
                    {isEditing ? (
                      <Input
                        id="data_nascimento"
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.data_nascimento
                          ? new Date(lead.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')
                          : 'Não cadastrado'}
                      </p>
                    )}
                  </div>

                  {/* Profissão */}
                  <div className="space-y-2">
                    <Label htmlFor="profissao" className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      Profissão
                    </Label>
                    {isEditing ? (
                      <Input
                        id="profissao"
                        value={formData.profissao}
                        onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.profissao || 'Não cadastrado'}</p>
                    )}
                  </div>

                  {/* Estado Civil */}
                  <div className="space-y-2">
                    <Label htmlFor="estado_civil" className="flex items-center gap-2 text-gray-600">
                      <Heart className="h-4 w-4 text-gray-400" />
                      Estado Civil
                    </Label>
                    {isEditing ? (
                      <Select
                        value={formData.estado_civil}
                        onValueChange={(value) => setFormData({ ...formData, estado_civil: value })}
                      >
                        <SelectTrigger className="focus:ring-[#662E8E]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                          <SelectItem value="casado">Casado(a)</SelectItem>
                          <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                          <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                          <SelectItem value="uniao_estavel">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.estado_civil
                          ? {
                              solteiro: 'Solteiro(a)',
                              casado: 'Casado(a)',
                              divorciado: 'Divorciado(a)',
                              viuvo: 'Viúvo(a)',
                              uniao_estavel: 'União Estável',
                            }[lead.estado_civil] || lead.estado_civil
                          : 'Não informado'}
                      </p>
                    )}
                  </div>

                  {/* Nacionalidade */}
                  <div className="space-y-2">
                    <Label htmlFor="nacionalidade" className="flex items-center gap-2 text-gray-600">
                      <Globe className="h-4 w-4 text-gray-400" />
                      Nacionalidade
                    </Label>
                    {isEditing ? (
                      <Input
                        id="nacionalidade"
                        value={formData.nacionalidade}
                        onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                        placeholder="Ex: Brasileira"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.nacionalidade || 'Não informado'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* === SEÇÕES OCULTAS DO PORTAL DO CLIENTE (somente info básica) === */}
            {false as boolean && <>
            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5 text-[#662E8E]" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* CEP */}
                  <div className="space-y-2">
                    <Label htmlFor="cep" className="text-gray-600">CEP</Label>
                    {isEditing ? (
                      <Input
                        id="cep"
                        value={formData.cep}
                        onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                        placeholder="00000-000"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.cep || '-'}</p>
                    )}
                  </div>

                  {/* Endereço (logradouro) */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco" className="text-gray-600">Endereço</Label>
                    {isEditing ? (
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                        placeholder="Rua, Avenida, etc"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.endereco || '-'}</p>
                    )}
                  </div>

                  {/* Número */}
                  <div className="space-y-2">
                    <Label htmlFor="numero" className="text-gray-600">Número</Label>
                    {isEditing ? (
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.numero || '-'}</p>
                    )}
                  </div>

                  {/* Complemento */}
                  <div className="space-y-2">
                    <Label htmlFor="complemento" className="text-gray-600">Complemento</Label>
                    {isEditing ? (
                      <Input
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                        placeholder="Apto, Bloco, etc"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.complemento || '-'}</p>
                    )}
                  </div>

                  {/* Bairro */}
                  <div className="space-y-2">
                    <Label htmlFor="bairro" className="text-gray-600">Bairro</Label>
                    {isEditing ? (
                      <Input
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.bairro || '-'}</p>
                    )}
                  </div>

                  {/* Proximidade (ponto de referência) */}
                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="proximidade" className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Ponto de Referência
                    </Label>
                    {isEditing ? (
                      <Input
                        id="proximidade"
                        value={formData.proximidade}
                        onChange={(e) => setFormData({ ...formData, proximidade: e.target.value })}
                        placeholder="Próximo a..."
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.proximidade || '-'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contato e Redes Sociais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#662E8E]" />
                  Contato e Redes Sociais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Instagram */}
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2 text-gray-600">
                      <Instagram className="h-4 w-4 text-gray-400" />
                      Instagram
                    </Label>
                    {isEditing ? (
                      <Input
                        id="instagram"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@usuario"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.instagram || '-'}</p>
                    )}
                  </div>

                  {/* Preferência de Contato */}
                  <div className="space-y-2">
                    <Label htmlFor="preferencia_contato" className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      Preferência de Contato
                    </Label>
                    {isEditing ? (
                      <Select
                        value={formData.preferencia_contato}
                        onValueChange={(value) => setFormData({ ...formData, preferencia_contato: value })}
                      >
                        <SelectTrigger className="focus:ring-[#662E8E]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="telefone">Telefone</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.preferencia_contato
                          ? { whatsapp: 'WhatsApp', telefone: 'Telefone', email: 'E-mail', sms: 'SMS' }[lead.preferencia_contato] || lead.preferencia_contato
                          : '-'}
                      </p>
                    )}
                  </div>

                  {/* Melhor Horário */}
                  <div className="space-y-2">
                    <Label htmlFor="melhor_horario_contato" className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400" />
                      Melhor Horário
                    </Label>
                    {isEditing ? (
                      <Select
                        value={formData.melhor_horario_contato}
                        onValueChange={(value) => setFormData({ ...formData, melhor_horario_contato: value })}
                      >
                        <SelectTrigger className="focus:ring-[#662E8E]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manha">Manhã (8h-12h)</SelectItem>
                          <SelectItem value="tarde">Tarde (12h-18h)</SelectItem>
                          <SelectItem value="noite">Noite (18h-21h)</SelectItem>
                          <SelectItem value="qualquer">Qualquer horário</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.melhor_horario_contato
                          ? { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', qualquer: 'Qualquer horário' }[lead.melhor_horario_contato] || lead.melhor_horario_contato
                          : '-'}
                      </p>
                    )}
                  </div>

                  {/* Dias Preferenciais */}
                  <div className="space-y-2">
                    <Label htmlFor="dia_preferencial" className="flex items-center gap-2 text-gray-600">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      Dias Preferenciais
                    </Label>
                    {isEditing ? (
                      <Input
                        id="dia_preferencial"
                        value={formData.dia_preferencial}
                        onChange={(e) => setFormData({ ...formData, dia_preferencial: e.target.value })}
                        placeholder="Ex: Segunda a Sexta"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.dia_preferencial || '-'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saúde e Tratamento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#662E8E]" />
                  Saúde e Tratamento
                </CardTitle>
                <p className="text-sm text-gray-500">Informações importantes para tratamentos a laser</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tipo de Pele (Fitzpatrick) */}
                  <div className="space-y-2">
                    <Label htmlFor="tipo_pele" className="flex items-center gap-2 text-gray-600">
                      <Sun className="h-4 w-4 text-gray-400" />
                      Tipo de Pele (Fitzpatrick)
                    </Label>
                    {isEditing ? (
                      <Select
                        value={formData.tipo_pele}
                        onValueChange={(value) => setFormData({ ...formData, tipo_pele: value })}
                      >
                        <SelectTrigger className="focus:ring-[#662E8E]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="I">I - Muito clara (sempre queima)</SelectItem>
                          <SelectItem value="II">II - Clara (queima facilmente)</SelectItem>
                          <SelectItem value="III">III - Média (às vezes queima)</SelectItem>
                          <SelectItem value="IV">IV - Morena (raramente queima)</SelectItem>
                          <SelectItem value="V">V - Morena escura (quase nunca queima)</SelectItem>
                          <SelectItem value="VI">VI - Negra (nunca queima)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.tipo_pele
                          ? {
                              I: 'I - Muito clara',
                              II: 'II - Clara',
                              III: 'III - Média',
                              IV: 'IV - Morena',
                              V: 'V - Morena escura',
                              VI: 'VI - Negra',
                            }[lead.tipo_pele] || lead.tipo_pele
                          : 'Não informado'}
                      </p>
                    )}
                  </div>

                  {/* Áreas de Interesse */}
                  <div className="space-y-2">
                    <Label htmlFor="areas_interesse" className="text-gray-600">
                      Áreas de Interesse
                    </Label>
                    {isEditing ? (
                      <Input
                        id="areas_interesse"
                        value={formData.areas_interesse}
                        onChange={(e) => setFormData({ ...formData, areas_interesse: e.target.value })}
                        placeholder="Ex: Rosto, axilas, pernas"
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.areas_interesse || '-'}</p>
                    )}
                  </div>

                  {/* Fotossensibilidade */}
                  <div className="space-y-2">
                    <Label htmlFor="fotossensibilidade" className="flex items-center gap-2 text-gray-600">
                      <Sun className="h-4 w-4 text-gray-400" />
                      Sensibilidade à Luz
                    </Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2 py-2">
                        <Switch
                          id="fotossensibilidade"
                          checked={formData.fotossensibilidade}
                          onCheckedChange={(checked) => setFormData({ ...formData, fotossensibilidade: checked })}
                        />
                        <span className="text-sm text-gray-600">
                          {formData.fotossensibilidade ? 'Sim, tenho sensibilidade' : 'Não tenho sensibilidade'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.fotossensibilidade ? 'Sim' : 'Não'}
                      </p>
                    )}
                  </div>

                  {/* Gravidez/Lactação */}
                  <div className="space-y-2">
                    <Label htmlFor="gravidez_lactacao" className="flex items-center gap-2 text-gray-600">
                      <Baby className="h-4 w-4 text-gray-400" />
                      Gravidez/Amamentação
                    </Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2 py-2">
                        <Switch
                          id="gravidez_lactacao"
                          checked={formData.gravidez_lactacao}
                          onCheckedChange={(checked) => setFormData({ ...formData, gravidez_lactacao: checked })}
                        />
                        <span className="text-sm text-gray-600">
                          {formData.gravidez_lactacao ? 'Sim, estou grávida ou amamentando' : 'Não'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.gravidez_lactacao ? 'Sim' : 'Não'}
                      </p>
                    )}
                  </div>

                  {/* Alergias */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="alergias" className="flex items-center gap-2 text-gray-600">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      Alergias
                    </Label>
                    {isEditing ? (
                      <Textarea
                        id="alergias"
                        value={formData.alergias}
                        onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                        placeholder="Descreva suas alergias conhecidas"
                        className="focus-visible:ring-[#662E8E] min-h-[80px]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.alergias || 'Nenhuma informada'}</p>
                    )}
                  </div>

                  {/* Condições Médicas */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="condicoes_medicas" className="flex items-center gap-2 text-gray-600">
                      <Stethoscope className="h-4 w-4 text-gray-400" />
                      Condições Médicas
                    </Label>
                    {isEditing ? (
                      <Textarea
                        id="condicoes_medicas"
                        value={formData.condicoes_medicas}
                        onChange={(e) => setFormData({ ...formData, condicoes_medicas: e.target.value })}
                        placeholder="Diabetes, pressão alta, etc."
                        className="focus-visible:ring-[#662E8E] min-h-[80px]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.condicoes_medicas || 'Nenhuma informada'}</p>
                    )}
                  </div>

                  {/* Medicamentos em Uso */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="medicamentos_uso" className="flex items-center gap-2 text-gray-600">
                      <Pill className="h-4 w-4 text-gray-400" />
                      Medicamentos em Uso
                    </Label>
                    {isEditing ? (
                      <Textarea
                        id="medicamentos_uso"
                        value={formData.medicamentos_uso}
                        onChange={(e) => setFormData({ ...formData, medicamentos_uso: e.target.value })}
                        placeholder="Liste os medicamentos que está usando"
                        className="focus-visible:ring-[#662E8E] min-h-[80px]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.medicamentos_uso || 'Nenhum informado'}</p>
                    )}
                  </div>

                  {/* Histórico de Tratamentos */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="historico_tratamentos" className="text-gray-600">
                      Histórico de Tratamentos Estéticos
                    </Label>
                    {isEditing ? (
                      <Textarea
                        id="historico_tratamentos"
                        value={formData.historico_tratamentos}
                        onChange={(e) => setFormData({ ...formData, historico_tratamentos: e.target.value })}
                        placeholder="Tratamentos realizados anteriormente"
                        className="focus-visible:ring-[#662E8E] min-h-[80px]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.historico_tratamentos || 'Nenhum informado'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contato de Emergência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#662E8E]" />
                  Contato de Emergência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="contato_emergencia_nome" className="text-gray-600">
                      Nome
                    </Label>
                    {isEditing ? (
                      <Input
                        id="contato_emergencia_nome"
                        value={formData.contato_emergencia_nome}
                        onChange={(e) => setFormData({ ...formData, contato_emergencia_nome: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">{lead?.contato_emergencia_nome || '-'}</p>
                    )}
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="contato_emergencia_telefone" className="text-gray-600">
                      Telefone
                    </Label>
                    {isEditing ? (
                      <Input
                        id="contato_emergencia_telefone"
                        value={formData.contato_emergencia_telefone}
                        onChange={(e) => setFormData({ ...formData, contato_emergencia_telefone: e.target.value })}
                        className="focus-visible:ring-[#662E8E]"
                      />
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.contato_emergencia_telefone ? formatPhone(lead.contato_emergencia_telefone) : '-'}
                      </p>
                    )}
                  </div>

                  {/* Parentesco */}
                  <div className="space-y-2">
                    <Label htmlFor="contato_emergencia_parentesco" className="text-gray-600">
                      Parentesco
                    </Label>
                    {isEditing ? (
                      <Select
                        value={formData.contato_emergencia_parentesco}
                        onValueChange={(value) => setFormData({ ...formData, contato_emergencia_parentesco: value })}
                      >
                        <SelectTrigger className="focus:ring-[#662E8E]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pai">Pai</SelectItem>
                          <SelectItem value="mae">Mãe</SelectItem>
                          <SelectItem value="conjuge">Cônjuge</SelectItem>
                          <SelectItem value="filho">Filho(a)</SelectItem>
                          <SelectItem value="irmao">Irmão(ã)</SelectItem>
                          <SelectItem value="amigo">Amigo(a)</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-gray-900 py-2 font-medium">
                        {lead?.contato_emergencia_parentesco
                          ? {
                              pai: 'Pai',
                              mae: 'Mãe',
                              conjuge: 'Cônjuge',
                              filho: 'Filho(a)',
                              irmao: 'Irmão(ã)',
                              amigo: 'Amigo(a)',
                              outro: 'Outro',
                            }[lead.contato_emergencia_parentesco] || lead.contato_emergencia_parentesco
                          : '-'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </>}
            {/* === FIM SEÇÕES OCULTAS === */}

            {/* Preferências de Comunicação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#662E8E]" />
                  Preferências de Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Aceita Marketing */}
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium text-gray-900">Receber comunicações de marketing</p>
                      <p className="text-sm text-gray-500">Promoções, novidades e ofertas especiais</p>
                    </div>
                    {isEditing ? (
                      <Switch
                        checked={formData.aceita_marketing}
                        onCheckedChange={(checked) => setFormData({ ...formData, aceita_marketing: checked })}
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-sm ${lead?.aceita_marketing ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {lead?.aceita_marketing ? 'Sim' : 'Não'}
                      </span>
                    )}
                  </div>

                  {/* Aceita Pesquisa */}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-gray-900">Participar de pesquisas de satisfação</p>
                      <p className="text-sm text-gray-500">Ajude-nos a melhorar nossos serviços</p>
                    </div>
                    {isEditing ? (
                      <Switch
                        checked={formData.aceita_pesquisa}
                        onCheckedChange={(checked) => setFormData({ ...formData, aceita_pesquisa: checked })}
                      />
                    ) : (
                      <span className={`px-2 py-1 rounded text-sm ${lead?.aceita_pesquisa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {lead?.aceita_pesquisa ? 'Sim' : 'Não'}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Informações adicionais */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outras Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-500">Unidade</span>
                  <span className="text-gray-900 font-medium">{lead?.unidade || '-'}</span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-500">Cidade</span>
                  <span className="text-gray-900 font-medium">{lead?.cidade || '-'}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500">Cliente desde</span>
                  <span className="text-gray-900 font-medium">
                    {lead?.created_at
                      ? new Date(lead.created_at).toLocaleDateString('pt-BR', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Help card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="font-semibold text-blue-900 mb-2">Precisa de ajuda?</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Para alterar informações sensíveis como CPF, entre em contato com a unidade Viniun mais próxima.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Falar com a unidade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClienteLayout>
  );
}
