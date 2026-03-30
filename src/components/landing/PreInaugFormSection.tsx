import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Gift, Sparkles, CreditCard, Loader2, ChevronLeft, ChevronRight, User, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// YESlaser Praia Grande - IDs fixos para landing page pública
const YESLASER_TENANT_ID = "ebf87fe2-093a-4fba-bb56-c6835cbc1465";
const PRAIA_GRANDE_FRANCHISE_ID = "529bac26-008c-473b-ad30-305e17e95e53";

interface Friend {
  name: string;
  whatsapp: string;
}

const PreInaugFormSection = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Step 1 fields
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [genero, setGenero] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [consent, setConsent] = useState(false);

  // Step 2 fields - 5 indicações
  const [friends, setFriends] = useState<Friend[]>(
    Array(5).fill(null).map(() => ({ name: "", whatsapp: "" }))
  );

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value.slice(0, -1);
  };

  const handleCepChange = async (value: string) => {
    const formatted = value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || '');
          setComplemento(data.complemento || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || '');
          toast.success("Endereço encontrado!");
        } else {
          toast.error("CEP não encontrado");
        }
      } catch {
        toast.error("Erro ao buscar endereço");
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleFriendChange = (index: number, field: keyof Friend, value: string) => {
    const updated = [...friends];
    updated[index] = { ...updated[index], [field]: field === 'whatsapp' ? formatWhatsApp(value) : value };
    setFriends(updated);
  };

  const handleNextStep = async () => {
    if (!nome.trim()) { setError("Preencha seu nome."); return; }
    if (!sobrenome.trim()) { setError("Preencha seu sobrenome."); return; }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 10) { setError("Preencha um WhatsApp válido."); return; }
    if (!genero) { setError("Selecione seu gênero."); return; }
    if (!cep.trim() || cep.replace(/\D/g, '').length < 8) { setError("Preencha um CEP válido."); return; }
    if (!consent) { setError("Você precisa aceitar os termos para continuar."); return; }

    setError(null);
    setIsSubmitting(true);

    try {
      const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`;
      const whatsappClean = whatsapp.replace(/\D/g, '');

      const { data: leadData, error: dbError } = await supabase
        .from('mt_leads')
        .insert([{
          tenant_id: YESLASER_TENANT_ID,
          franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
          nome: nomeCompleto,
          telefone: whatsappClean,
          whatsapp: whatsappClean,
          genero: genero === 'feminino' ? 'Feminino' : genero === 'masculino' ? 'Masculino' : 'Outro',
          cep: cep,
          endereco: logradouro,
          complemento: complemento,
          bairro: bairro,
          cidade: cidade,
          estado: uf,
          origem: 'landing_indicacoes',
          landing_page: window.location.href,
          utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
          status: 'novo',
          temperatura: 'quente',
          dados_extras: {
            consent: true,
            source: 'preinauguracao_form',
            sobrenome: sobrenome.trim(),
          },
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Error saving lead:', dbError);
        toast.error("Erro ao salvar cadastro. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      if (leadData) {
        setLeadId(leadData.id);
        toast.success("Dados salvos! Agora indique seus amigos.");
      }

      // GTM Event
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: "form_submit",
          formType: "preinauguracao",
          formLocation: "form_section_step1",
        });
      }

      setIsSubmitting(false);
      setStep(2);
    } catch (err) {
      console.error('Error:', err);
      toast.error("Erro ao processar cadastro");
      setIsSubmitting(false);
    }
  };

  const handleSubmitReferrals = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      toast.error("Erro interno. Tente novamente.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const completeFriends = friends.filter(
        (f) => f.name.trim() && f.whatsapp.replace(/\D/g, '').length >= 10
      );

      if (completeFriends.length === 0) {
        toast.info("Nenhuma indicação preenchida. Você pode finalizar sem indicar.");
      }

      // Salvar indicações como novos leads vinculados via indicado_por_id
      if (completeFriends.length > 0) {
        const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`;
        const referralsData = completeFriends.map(friend => ({
          tenant_id: YESLASER_TENANT_ID,
          franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
          nome: friend.name.trim(),
          telefone: friend.whatsapp.replace(/\D/g, ''),
          whatsapp: friend.whatsapp.replace(/\D/g, ''),
          indicado_por_id: leadId,
          indicado_por_nome: nomeCompleto,
          origem: 'indicacao_landing',
          landing_page: window.location.href,
          status: 'novo',
          temperatura: 'frio',
          dados_extras: {
            source: 'landing_indicacoes_referral',
            referrer_lead_id: leadId,
          },
        }));

        const { error: referralsError } = await supabase
          .from('mt_leads')
          .insert(referralsData)
          .select();

        if (referralsError) {
          console.error('Error saving referrals:', referralsError);
          toast.error("Erro ao salvar indicações.");
        } else {
          toast.success(`${completeFriends.length} indicação(ões) registrada(s)!`);
        }
      }

      // GTM Event
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: "form_submit",
          formType: "preinauguracao_indicacoes",
          formLocation: "form_section_step2",
          referrals_count: completeFriends.length,
        });
      }

      // WhatsApp message
      const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`;
      const message = `✅ *Novo Cadastro Yeslaser Praia Grande*

👤 Nome: ${nomeCompleto}
📱 Telefone: ${whatsapp}
⚧️ Gênero: ${genero === 'feminino' ? 'Feminino' : genero === 'masculino' ? 'Masculino' : 'Outro'}
📮 CEP: ${cep}
📍 ${cidade ? `${cidade}/${uf}` : 'N/A'}

👥 Indicações: ${completeFriends.length} amigo(s)
${completeFriends.map((f, i) => `  ${i + 1}. ${f.name} - ${f.whatsapp}`).join('\n')}

🎉 Em breve vamos inaugurar nossa unidade em Praia Grande!`.trim();

      toast.success("Cadastro realizado! Redirecionando para o WhatsApp...");

      setTimeout(() => {
        const whatsappUrl = `https://wa.me/5513978263924?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");

        // Grupo VIP
        setTimeout(() => {
          window.open("https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t", "_blank");
        }, 1000);
      }, 1500);

      setShowSuccess(true);
    } catch (err) {
      console.error('Error:', err);
      toast.error("Erro ao processar indicações");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyClick = () => {
    if (typeof window !== "undefined" && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: "cta_click",
        ctaLocation: "form_buy_button",
      });
    }
    window.open("https://www.asaas.com/c/7ytngzlfment5bsu", "_blank");
  };

  const filledFriendsCount = friends.filter(
    (f) => f.name.trim() && f.whatsapp.replace(/\D/g, '').length >= 10
  ).length;

  // ============ TELA DE SUCESSO ============
  if (showSuccess) {
    const whatsappGroupLink = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";

    return (
      <section id="formulario-preinauguracao" className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <Card className="w-full max-w-4xl mx-auto border-2 border-yeslaser-purple shadow-xl">
            <CardContent className="pt-12 pb-8 text-center">
              <CheckCircle className="w-20 h-20 mx-auto mb-6 text-green-500" />
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-yeslaser-purple">
                Cadastro Realizado com Sucesso!
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                {filledFriendsCount >= 5
                  ? "Você indicou 5 amigos e ganhou 10 sessões grátis!"
                  : filledFriendsCount > 0
                    ? `Você indicou ${filledFriendsCount} amigo(s). Indique 5 para ganhar as 10 sessões grátis!`
                    : "Seu cadastro foi registrado com sucesso!"}
              </p>

              <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6 mb-6">
                <h4 className="text-xl font-bold text-green-800 mb-3">
                  Entre para nosso Grupo VIP!
                </h4>
                <p className="text-green-700 mb-4">
                  Faça parte da nossa comunidade exclusiva no WhatsApp:
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
                  ENTRAR NO GRUPO VIP AGORA
                </Button>
              </div>

              <Button
                onClick={() => window.location.reload()}
                className="bg-yeslaser-purple hover:opacity-90 text-white px-8 py-3 text-lg"
              >
                Fazer Novo Cadastro
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="formulario-preinauguracao" className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <Card className="w-full max-w-4xl mx-auto border-2 border-yeslaser-purple shadow-xl">
          <CardHeader className="bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue text-white p-5 sm:p-6 md:p-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8" />
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl text-center leading-tight px-2">
              Ganhe 10 Sessões Grátis de Depilação a Laser!
            </CardTitle>
            <CardDescription className="text-white/90 text-center text-sm sm:text-base md:text-lg mt-3 px-2">
              Cadastre-se e indique 5 amigos para garantir seu benefício exclusivo
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 md:p-8">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span className={step === 1 ? "font-bold text-primary" : ""}>
                  <User className="inline w-3 h-3 mr-1" />
                  1. Seus Dados
                </span>
                <span className={step === 2 ? "font-bold text-primary" : ""}>
                  <UserPlus className="inline w-3 h-3 mr-1" />
                  2. Indicações
                </span>
              </div>
              <Progress value={step === 1 ? 50 : 100} className="h-2" />
            </div>

            <form onSubmit={handleSubmitReferrals} className="space-y-4">
              {/* ============ STEP 1 - DADOS ============ */}
              {step === 1 && (
                <>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Seus Dados Pessoais
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pf-nome">Nome *</Label>
                      <Input
                        id="pf-nome"
                        type="text"
                        placeholder="Seu nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pf-sobrenome">Sobrenome *</Label>
                      <Input
                        id="pf-sobrenome"
                        type="text"
                        placeholder="Seu sobrenome"
                        value={sobrenome}
                        onChange={(e) => setSobrenome(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="pf-whatsapp">WhatsApp *</Label>
                    <Input
                      id="pf-whatsapp"
                      type="tel"
                      placeholder="(13) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pf-genero">Gênero *</Label>
                    <Select value={genero} onValueChange={setGenero}>
                      <SelectTrigger id="pf-genero" className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="pf-cep">CEP *</Label>
                    <div className="relative">
                      <Input
                        id="pf-cep"
                        type="text"
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        required
                        className="mt-1 pr-10"
                      />
                      {isLoadingCep && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite o CEP para buscar o endereço automaticamente
                    </p>

                    {logradouro && cidade && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800">
                          <strong>Endereço encontrado:</strong><br />
                          {logradouro}{complemento ? `, ${complemento}` : ''}<br />
                          {bairro} - {cidade}/{uf}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="pf-consent"
                        checked={consent}
                        onCheckedChange={(checked) => setConsent(checked as boolean)}
                        className="mt-1"
                      />
                      <Label htmlFor="pf-consent" className="text-sm text-gray-800 cursor-pointer leading-relaxed font-medium">
                        <strong className="text-blue-700">Autorizo o contato</strong> da Yeslaser comigo via WhatsApp, e-mail ou telefone para agendar minhas sessões, enviar lembretes e informar sobre promoções exclusivas. *
                      </Label>
                    </div>
                    <p className="text-xs text-gray-600 ml-8 leading-relaxed">
                      Seus dados serão utilizados apenas para comunicação relacionada aos serviços da Yeslaser e você pode cancelar o recebimento de mensagens a qualquer momento.
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 flex items-start">
                      <AlertCircle className="mr-2 mt-0.5 flex-shrink-0 w-4 h-4" />
                      <span>
                        No próximo passo, você poderá indicar até <strong>5 amigos</strong>. Ao indicar 5 amigos, você ganha <strong>10 sessões grátis</strong> de depilação a laser!
                      </span>
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  )}

                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:opacity-90 text-white font-bold text-base h-12 sm:h-14 shadow-lg hover:scale-[1.02] transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Próximo - Indicar Amigos
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* ============ STEP 2 - INDICAÇÕES ============ */}
              {step === 2 && (
                <>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Indique 5 Amigos e Ganhe!
                  </h3>

                  <div className="space-y-3">
                    {friends.map((friend, index) => (
                      <div key={`friend-${index}`} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                        <h4 className="font-semibold text-primary mb-2 text-sm">
                          Amigo(a) {index + 1}
                          {friend.name.trim() && friend.whatsapp.replace(/\D/g, '').length >= 10 && (
                            <CheckCircle className="inline w-4 h-4 ml-2 text-green-500" />
                          )}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-600 text-xs">Nome *</Label>
                            <Input
                              type="text"
                              value={friend.name}
                              onChange={(e) => handleFriendChange(index, "name", e.target.value)}
                              placeholder="Nome completo"
                              className="mt-1 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-600 text-xs">WhatsApp *</Label>
                            <Input
                              type="tel"
                              value={friend.whatsapp}
                              onChange={(e) => handleFriendChange(index, "whatsapp", e.target.value)}
                              placeholder="(13) 99999-9999"
                              className="mt-1 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Contador de indicações */}
                  <div className={`rounded-lg p-4 ${
                    filledFriendsCount >= 5
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className={`text-sm flex items-start ${
                      filledFriendsCount >= 5 ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {filledFriendsCount >= 5 ? (
                        <>
                          <CheckCircle className="mr-2 mt-0.5 flex-shrink-0 w-4 h-4" />
                          <span>
                            <strong>Parabéns!</strong> Você indicou 5 amigos e vai ganhar 10 sessões grátis de depilação a laser!
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-2 mt-0.5 flex-shrink-0 w-4 h-4" />
                          <span>
                            Você indicou <strong>{filledFriendsCount} de 5</strong> amigos.
                            {filledFriendsCount === 0
                              ? " As indicações são opcionais, mas indique 5 amigos para ganhar as 10 sessões grátis!"
                              : ` Indique mais ${5 - filledFriendsCount} para ganhar as 10 sessões grátis!`}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setStep(1); setError(null); }}
                      className="flex-1 h-12 sm:h-14"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:opacity-90 text-white font-bold text-base h-12 sm:h-14 shadow-lg hover:scale-[1.02] transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Finalizar Cadastro"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>

            {/* Botão de compra direta */}
            <div className="space-y-4 pt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">ou pague direto</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleBuyClick}
                className="w-full bg-gradient-to-r from-yeslaser-purple to-yeslaser-lightBlue hover:opacity-90 text-white font-bold text-sm sm:text-base md:text-lg h-12 sm:h-14 shadow-lg hover:scale-[1.02] transition-all px-4"
              >
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                <span className="truncate">COMPRAR AGORA - R$ 79,90</span>
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 text-xs text-muted-foreground">
              <span className="whitespace-nowrap">🔒 Dados seguros</span>
              <span className="hidden sm:inline">•</span>
              <span className="whitespace-nowrap">⚡ Leva 30 segundos</span>
              <span className="hidden sm:inline">•</span>
              <span className="whitespace-nowrap">💬 Resposta imediata</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PreInaugFormSection;
