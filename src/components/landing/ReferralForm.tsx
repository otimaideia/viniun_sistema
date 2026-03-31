import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Viniun - IDs fixos para landing page pública
const VINIUN_TENANT_ID = "ebf87fe2-093a-4fba-bb56-c6835cbc1465";
const PRAIA_GRANDE_FRANCHISE_ID = "529bac26-008c-473b-ad30-305e17e95e53";

interface Friend {
  name: string;
  email: string;
  whatsapp: string;
}

const ReferralForm = () => {
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [personalData, setPersonalData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    genero: "",
    data_nascimento: "",
    cep: "",
    logradouro: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    ibge: "",
    gia: "",
    ddd: "",
    siafi: "",
    consent: false,
  });

  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const [friends, setFriends] = useState<Friend[]>(
    Array(5).fill(null).map(() => ({ name: "", email: "", whatsapp: "" }))
  );

  const handlePersonalDataChange = (field: string, value: string | boolean) => {
    setPersonalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCepChange = async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '');

    setPersonalData((prev) => ({ ...prev, cep: cleanCep }));

    // Busca endereço quando CEP estiver completo
    if (cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          setPersonalData((prev) => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
            ibge: data.ibge || '',
            gia: data.gia || '',
            ddd: data.ddd || '',
            siafi: data.siafi || '',
          }));

          sonnerToast.success("CEP encontrado! Endereço preenchido automaticamente.");
        } else {
          sonnerToast.error("CEP não encontrado. Verifique o CEP digitado.");
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        sonnerToast.error("Erro ao buscar endereço. Tente novamente.");
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleFriendChange = (index: number, field: keyof Friend, value: string) => {
    const updatedFriends = [...friends];
    updatedFriends[index] = { ...updatedFriends[index], [field]: value };
    setFriends(updatedFriends);
  };

  const validatePersonalData = () => {
    if (!personalData.name || !personalData.email || !personalData.whatsapp ||
        !personalData.genero || !personalData.consent) {
      sonnerToast.error("Dados incompletos. Preencha todos os campos obrigatórios e aceite o consentimento.");
      return false;
    }
    return true;
  };

  const validateFriends = () => {
    const completeFriends = friends.filter(
      (friend) => friend.name && friend.email && friend.whatsapp
    );

    if (completeFriends.length === 0) {
      sonnerToast.info("Nenhuma indicação preenchida. Você pode prosseguir, mas não terá direito às 10 sessões grátis.");
      // Permitir continuar mesmo sem indicações
      return true;
    }

    if (completeFriends.length < 5) {
      sonnerToast.info(`Você indicou apenas ${completeFriends.length} amigo(s). Para ganhar as 10 sessões grátis, precisa indicar 5 amigos.`);
      // Permitir continuar com indicações parciais
      return true;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1 && !validatePersonalData()) return;
    if (step === 2 && !validateFriends()) return;

    setIsSubmitting(true);

    try {
      // ETAPA 1: Salvar lead imediatamente após primeira etapa (mt_leads)
      if (step === 1) {
        const { data: leadData, error: leadError } = await supabase
          .from('mt_leads')
          .insert([{
            tenant_id: VINIUN_TENANT_ID,
            franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
            nome: personalData.name,
            email: personalData.email,
            telefone: personalData.whatsapp.replace(/\D/g, ''),
            whatsapp: personalData.whatsapp.replace(/\D/g, ''),
            genero: personalData.genero,
            data_nascimento: personalData.data_nascimento || null,
            cep: personalData.cep,
            endereco: personalData.logradouro,
            complemento: personalData.complemento,
            bairro: personalData.bairro,
            cidade: personalData.cidade,
            estado: personalData.uf,
            origem: 'landing_indicacoes',
            landing_page: window.location.href,
            utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
            utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
            utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
            status: 'novo',
            temperatura: 'quente',
            dados_extras: {
              ibge: personalData.ibge,
              gia: personalData.gia,
              ddd: personalData.ddd,
              siafi: personalData.siafi,
              consent: personalData.consent,
              source: 'landing_indicacoes',
            },
          }])
          .select()
          .single();

        if (leadError) {
          console.error('Error saving lead:', leadError);
          sonnerToast.error("Erro ao salvar dados. Tente novamente.");
          setIsSubmitting(false);
          return;
        }

        if (leadData) {
          setLeadId(leadData.id);
          sonnerToast.success("Dados salvos! Agora indique seus amigos.");
        }

        setIsSubmitting(false);
        setStep(2);
        return;
      }

      // ETAPA 2: Salvar indicações (se houver)
      if (step === 2 && leadId) {
        // Filtrar apenas indicações com nome e WhatsApp (email é opcional)
        const completeFriends = friends.filter(
          (friend) => friend.name && friend.whatsapp
        );

        // Salvar indicações como novos leads vinculados ao lead principal
        if (completeFriends.length > 0) {
          const referralsData = completeFriends.map(friend => ({
            tenant_id: VINIUN_TENANT_ID,
            franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
            nome: friend.name,
            email: friend.email || null,
            telefone: friend.whatsapp.replace(/\D/g, ''),
            whatsapp: friend.whatsapp.replace(/\D/g, ''),
            indicado_por_id: leadId,
            indicado_por_nome: personalData.name,
            origem: 'indicacao_landing',
            landing_page: window.location.href,
            status: 'novo',
            temperatura: 'frio',
            dados_extras: {
              source: 'landing_indicacoes_referral',
              referrer_lead_id: leadId,
            },
          }));

          const { data: savedReferrals, error: referralsError } = await supabase
            .from('mt_leads')
            .insert(referralsData)
            .select();

          if (referralsError) {
            console.error('Error saving referrals:', referralsError);
            sonnerToast.error("Erro ao salvar indicações. Entre em contato conosco.");
          } else {
            sonnerToast.success(`${completeFriends.length} indicação(ões) registrada(s) com sucesso.`);
          }
        } else {
        }

        // Aguardar um momento para garantir que tudo foi salvo
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mensagem simplificada do WhatsApp
        const message = `✅ *Novo Cadastro Viniun*

👤 Nome: ${personalData.name}
📧 Email: ${personalData.email}
📱 Telefone: ${personalData.whatsapp}

🎉 Em breve vamos inaugurar nossa unidade em Praia Grande!

Você está na lista VIP e será um dos primeiros a conhecer nossa unidade e garantir seus benefícios exclusivos.

Entraremos em contato em breve com mais novidades! 🚀`;

        sonnerToast.success("Cadastro realizado com sucesso! Redirecionando para o WhatsApp...");

        // Aguardar mais um pouco antes de abrir as abas
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Abrir WhatsApp com a mensagem em nova aba
        const whatsappUrl = `https://wa.me/5513978263924?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");

        // Abrir grupo VIP do WhatsApp em nova aba (após 1 segundo)
        const whatsappGroupLink = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";
        setTimeout(() => {
          window.open(whatsappGroupLink, "_blank");
        }, 1000);

        setStep(3);
      } // Fim do if (step === 2 && leadId)
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      sonnerToast.error("Erro ao enviar cadastro. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 3) {
    const whatsappGroupLink = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";

    return (
      <Card className="w-full max-w-2xl mx-auto border-2 border-viniun-navy shadow-xl">
        <CardContent className="pt-12 pb-8 text-center">
          <CheckCircle className="w-24 h-24 mx-auto mb-6 text-green-500" />
          <h3 className="text-3xl font-bold mb-4 text-viniun-navy">
            Parabéns! Cadastro Realizado!
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            Você ganhou benefícios exclusivos!
          </p>

          {/* WhatsApp VIP Group CTA */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center mb-3">
              <svg className="w-8 h-8 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <h4 className="text-xl font-bold text-green-800">
                Entre para nosso Grupo VIP!
              </h4>
            </div>
            <p className="text-green-700 mb-4">
              Faça parte da nossa comunidade exclusiva no WhatsApp e tenha acesso a:
            </p>
            <ul className="text-left text-green-700 space-y-1 max-w-md mx-auto mb-4">
              <li>✨ Ofertas exclusivas e promoções especiais</li>
              <li>🎁 Descontos VIP de até 50% OFF</li>
              <li>👑 Prioridade no agendamento</li>
              <li>💎 Brindes e surpresas para membros</li>
            </ul>
            <Button
              onClick={() => window.open(whatsappGroupLink, "_blank")}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg font-bold shadow-lg hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5 mr-2 inline-block" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              ENTRAR NO GRUPO VIP AGORA
            </Button>
          </div>

          <div className="bg-viniun-lightBlue/10 rounded-lg p-6 mb-6">
            <p className="text-md font-semibold text-viniun-navy mb-2">
              📱 Próximos passos:
            </p>
            <ul className="text-left text-gray-700 space-y-2 max-w-md mx-auto">
              <li>1. Entre no Grupo VIP do WhatsApp</li>
              <li>2. Aguarde nosso contato para agendar</li>
              <li>3. Escolha a melhor data para sua avaliação</li>
              <li>4. Comece suas sessões grátis!</li>
            </ul>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="bg-viniun-navy hover:bg-viniun-dark text-white px-8 py-3 text-lg"
          >
            Fazer Novo Cadastro
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-2 border-viniun-navy shadow-xl">
      <CardHeader className="bg-gradient-to-r from-viniun-navy to-viniun-lightBlue text-white p-4 sm:p-6">
        <CardTitle className="text-xl sm:text-2xl md:text-3xl text-center leading-tight">
          🎁 Ganhe Benefícios Exclusivos!
        </CardTitle>
        <CardDescription className="text-white/90 text-center text-sm sm:text-base md:text-lg mt-2">
          Cadastre-se e indique 5 amigos para garantir seu benefício exclusivo
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 md:pt-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${
              step >= 1 ? "bg-viniun-navy text-white" : "bg-gray-200 text-gray-400"
            }`}>
              1
            </div>
            <div className={`w-12 sm:w-24 h-1 ${step >= 2 ? "bg-viniun-navy" : "bg-gray-200"}`} />
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base ${
              step >= 2 ? "bg-viniun-navy text-white" : "bg-gray-200 text-gray-400"
            }`}>
              2
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <div className="space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-viniun-navy mb-4 flex items-center">
                <User className="mr-2 flex-shrink-0" size={20} />
                <span>Seus Dados Pessoais</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="name" className="text-gray-700 font-semibold">
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={personalData.name}
                    onChange={(e) => handlePersonalDataChange("name", e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="mt-1 border-gray-300 focus:border-viniun-navy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-700 font-semibold">
                    E-mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) => handlePersonalDataChange("email", e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1 border-gray-300 focus:border-viniun-navy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="text-gray-700 font-semibold">
                    WhatsApp *
                  </Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={personalData.whatsapp}
                    onChange={(e) => handlePersonalDataChange("whatsapp", e.target.value)}
                    placeholder="(13) 99999-9999"
                    className="mt-1 border-gray-300 focus:border-viniun-navy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="genero" className="text-gray-700 font-semibold">
                    Gênero *
                  </Label>
                  <Select
                    value={personalData.genero}
                    onValueChange={(value) => handlePersonalDataChange("genero", value)}
                  >
                    <SelectTrigger className="mt-1 border-gray-300 focus:border-viniun-navy">
                      <SelectValue placeholder="Selecione seu gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Campo Data de Nascimento */}
                <div>
                  <Label htmlFor="data_nascimento" className="text-gray-700 font-semibold">
                    Data de Nascimento
                  </Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={personalData.data_nascimento}
                    onChange={(e) => handlePersonalDataChange("data_nascimento", e.target.value)}
                    className="mt-1 border-gray-300 focus:border-viniun-navy"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Campo CEP com busca automática */}
                <div>
                  <Label htmlFor="cep" className="text-gray-700 font-semibold">
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    type="text"
                    value={personalData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="mt-1 border-gray-300 focus:border-viniun-navy"
                    disabled={isLoadingCep}
                  />
                  {isLoadingCep && (
                    <p className="text-xs text-blue-600 mt-1">Buscando endereço...</p>
                  )}
                </div>

                {/* Campos hidden para dados do endereço */}
                <input type="hidden" value={personalData.logradouro} />
                <input type="hidden" value={personalData.complemento} />
                <input type="hidden" value={personalData.bairro} />
                <input type="hidden" value={personalData.cidade} />
                <input type="hidden" value={personalData.uf} />
                <input type="hidden" value={personalData.ibge} />
                <input type="hidden" value={personalData.gia} />
                <input type="hidden" value={personalData.ddd} />
                <input type="hidden" value={personalData.siafi} />
              </div>

              <div className="space-y-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent"
                    checked={personalData.consent}
                    onCheckedChange={(checked) => handlePersonalDataChange("consent", checked as boolean)}
                    className="mt-1 border-blue-400"
                  />
                  <Label
                    htmlFor="consent"
                    className="text-sm text-gray-800 cursor-pointer leading-relaxed font-medium"
                  >
                    <strong className="text-blue-700">Autorizo o contato</strong> da Viniun comigo via WhatsApp, e-mail ou telefone para agendar minhas sessões, enviar lembretes e informar sobre promoções exclusivas. *
                  </Label>
                </div>
                <p className="text-xs text-gray-600 ml-8 leading-relaxed">
                  ℹ️ Seus dados serão utilizados apenas para comunicação relacionada aos serviços da Viniun e você pode cancelar o recebimento de mensagens a qualquer momento.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-yellow-800 flex items-start">
                  <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                  <span>
                    No próximo passo, você poderá indicar até 5 amigos. Ao indicar 5 amigos, você ganha benefícios exclusivos!
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg sm:text-xl font-bold text-viniun-navy mb-4 flex items-center">
                <UserPlus className="mr-2 flex-shrink-0" size={20} />
                <span>Indique 5 Amigos e Ganhe!</span>
              </h3>

              <div className="space-y-4">
                {friends.map((friend, index) => (
                  <div key={`friend-${index}`} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                    <h4 className="font-semibold text-viniun-navy mb-3 text-sm sm:text-base">
                      Amigo(a) {index + 1}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-gray-600 text-sm">Nome *</Label>
                        <Input
                          type="text"
                          value={friend.name}
                          onChange={(e) => handleFriendChange(index, "name", e.target.value)}
                          placeholder="Nome completo"
                          className="mt-1 text-sm border-gray-300 focus:border-viniun-navy"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm">E-mail (opcional)</Label>
                        <Input
                          type="email"
                          value={friend.email}
                          onChange={(e) => handleFriendChange(index, "email", e.target.value)}
                          placeholder="email@exemplo.com"
                          className="mt-1 text-sm border-gray-300 focus:border-viniun-navy"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm">WhatsApp *</Label>
                        <Input
                          type="tel"
                          value={friend.whatsapp}
                          onChange={(e) => handleFriendChange(index, "whatsapp", e.target.value)}
                          placeholder="(13) 99999-9999"
                          className="mt-1 text-sm border-gray-300 focus:border-viniun-navy"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 flex items-start">
                    <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>
                      <strong>As indicações são opcionais!</strong> Você pode prosseguir sem indicar ninguém,
                      mas para ganhar as 10 sessões grátis, é necessário indicar 5 amigos.
                    </span>
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 flex items-start">
                    <CheckCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <span>
                      Indique 5 amigos e ganhe benefícios exclusivos!
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="border-viniun-navy text-viniun-navy hover:bg-viniun-navy hover:text-white w-full sm:w-auto order-2 sm:order-1"
              >
                Voltar
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-viniun-navy to-viniun-lightBlue hover:from-viniun-dark hover:to-viniun-lightBlue text-white px-6 sm:px-8 py-3 text-base sm:text-lg w-full sm:w-auto sm:ml-auto order-1 sm:order-2"
            >
              {isSubmitting ? (
                "Enviando..."
              ) : step === 1 ? (
                "Próximo Passo →"
              ) : (
                "Finalizar Cadastro"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReferralForm;