import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Native select for mobile compatibility (Radix Select has issues on some mobile browsers)
import { Checkbox } from "@/components/ui/checkbox";
import { toast as sonnerToast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Crown, MessageCircle, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const YESLASER_TENANT_ID = "ebf87fe2-093a-4fba-bb56-c6835cbc1465";
const PRAIA_GRANDE_FRANCHISE_ID = "529bac26-008c-473b-ad30-305e17e95e53";
const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/CfyRi14Gjth5SPpfiTkr0k?mode=gi_t";

interface VIPRegistrationFormProps {
  variant?: "a" | "b";
  compact?: boolean;
}

const VIPRegistrationForm = ({ variant = "a", compact = false }: VIPRegistrationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Form fields
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [genero, setGenero] = useState("");
  const [cep, setCep] = useState("");
  const [consent, setConsent] = useState(false);

  // Address fields (auto-filled by CEP)
  const [logradouro, setLogradouro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

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
    const formatted = value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
    setCep(formatted);

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || "");
          setComplemento(data.complemento || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
          sonnerToast.success("Endereço encontrado!");
        } else {
          sonnerToast.error("CEP não encontrado");
          setLogradouro("");
          setBairro("");
          setCidade("");
          setUf("");
        }
      } catch {
        sonnerToast.error("Erro ao buscar endereço");
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome || !whatsapp) {
      sonnerToast.error("Preencha seu nome e WhatsApp para continuar.");
      return;
    }

    if (!genero) {
      sonnerToast.error("Selecione seu gênero para continuar.");
      return;
    }

    if (!cep || cep.replace(/\D/g, "").length < 8) {
      sonnerToast.error("Preencha seu CEP para continuar.");
      return;
    }

    if (!consent) {
      sonnerToast.error("Você precisa aceitar os termos para continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = whatsapp.replace(/\D/g, "");
      const generoFormatted = genero === "feminino" ? "Feminino" : genero === "masculino" ? "Masculino" : "Outro";

      const leadData = {
        tenant_id: YESLASER_TENANT_ID,
        franchise_id: PRAIA_GRANDE_FRANCHISE_ID,
        nome,
        email: email || null,
        telefone: cleanPhone,
        whatsapp: cleanPhone,
        genero: generoFormatted,
        cep: cep.replace(/\D/g, ""),
        endereco: logradouro || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: uf || null,
        origem: "grupo_vip_whatsapp",
        landing_page: window.location.href,
        utm_source: new URLSearchParams(window.location.search).get("utm_source") || null,
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || null,
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || null,
        status: "novo",
        temperatura: "morno",
        dados_extras: {
          source: "landing_grupo_vip",
          consent,
          ab_variant: variant,
          ab_test: "grupo_vip_layout_2026",
        },
      };

      // Tentar inserir; se telefone já existe, atualizar dados
      const { error } = await supabase
        .from("mt_leads")
        .insert([leadData]);

      if (error) {
        // Duplicate phone (unique constraint) - update existing lead and continue
        if (error.code === "23505") {
          console.log("Lead já existe, atualizando dados...");
          const { error: updateError } = await supabase
            .from("mt_leads")
            .update({
              nome,
              email: email || null,
              genero: generoFormatted,
              cep: cep.replace(/\D/g, ""),
              endereco: logradouro || null,
              complemento: complemento || null,
              bairro: bairro || null,
              cidade: cidade || null,
              estado: uf || null,
              origem: "grupo_vip_whatsapp",
              landing_page: window.location.href,
              utm_source: new URLSearchParams(window.location.search).get("utm_source") || null,
              utm_medium: new URLSearchParams(window.location.search).get("utm_medium") || null,
              utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || null,
              dados_extras: {
                source: "landing_grupo_vip",
                consent,
                ab_variant: variant,
                ab_test: "grupo_vip_layout_2026",
                recadastro: true,
                recadastro_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq("tenant_id", YESLASER_TENANT_ID)
            .eq("telefone", cleanPhone);

          if (updateError) {
            console.error("Error updating VIP lead:", updateError);
            sonnerToast.error("Erro ao atualizar cadastro. Tente novamente.");
            setIsSubmitting(false);
            return;
          }
        } else {
          console.error("Error saving VIP lead:", error);
          sonnerToast.error("Erro ao salvar cadastro. Tente novamente.");
          setIsSubmitting(false);
          return;
        }
      }

      sonnerToast.success("Cadastro realizado! Entrando no Grupo VIP...");
      setIsSuccess(true);
    } catch (error) {
      console.error("Error:", error);
      sonnerToast.error("Erro ao enviar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className={`w-full ${compact ? "" : "max-w-lg mx-auto"} border-2 border-green-300 shadow-xl`}>
        <CardContent className="pt-8 pb-6 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-2xl font-bold mb-2 text-green-700">
            Bem-vindo(a) ao Grupo VIP!
          </h3>
          <p className="text-gray-600 mb-6">
            Seu cadastro foi realizado com sucesso. Clique abaixo para entrar no grupo.
          </p>
          <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
            <Button
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg px-8 py-6 shadow-xl hover:scale-105 transition-all"
            >
              <MessageCircle className="w-6 h-6 mr-2" />
              ENTRAR NO GRUPO VIP
            </Button>
          </a>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${compact ? "" : "max-w-lg mx-auto"} border-2 border-[#6B2D8B]/30 shadow-xl bg-white`}>
      <CardContent className={compact ? "pt-4 pb-4 px-4" : "pt-6 pb-6"}>
        {!compact && (
          <div className="text-center mb-6">
            <Crown className="w-10 h-10 mx-auto mb-3 text-[#6B2D8B]" />
            <h3 className="text-xl font-bold text-[#6B2D8B]">
              Cadastre-se para Entrar no Grupo VIP
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              Preencha seus dados para ter acesso ao grupo exclusivo
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={compact ? "space-y-3" : "space-y-4"}>
          {/* Nome */}
          <div>
            <Label htmlFor="vip-nome" className="font-semibold">
              Nome Completo *
            </Label>
            <Input
              id="vip-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              className="mt-1"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="vip-email" className="font-semibold">
              E-mail
            </Label>
            <Input
              id="vip-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <Label htmlFor="vip-whatsapp" className="font-semibold">
              WhatsApp *
            </Label>
            <Input
              id="vip-whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
              placeholder="(13) 99999-9999"
              className="mt-1"
              required
            />
          </div>

          {/* Gênero */}
          <div>
            <Label htmlFor="vip-genero" className="font-semibold">
              Gênero *
            </Label>
            <select
              id="vip-genero"
              value={genero}
              onChange={(e) => setGenero(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
              required
            >
              <option value="">Selecione</option>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* CEP */}
          <div>
            <Label htmlFor="vip-cep" className="font-semibold">
              CEP *
            </Label>
            <div className="relative">
              <Input
                id="vip-cep"
                type="text"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="mt-1"
                required
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground mt-0.5" />
              )}
            </div>
            {!logradouro && !isLoadingCep && (
              <p className="text-xs text-muted-foreground mt-1">
                Digite o CEP para buscar o endereço automaticamente
              </p>
            )}
          </div>

          {/* Endereço encontrado */}
          {logradouro && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-800">
                  {logradouro}
                  {bairro && ` - ${bairro}`}
                  {cidade && uf && ` - ${cidade}/${uf}`}
                </p>
              </div>
            </div>
          )}

          {/* Consent */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="vip-consent"
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked as boolean)}
                className="mt-1 border-blue-400"
              />
              <Label
                htmlFor="vip-consent"
                className="text-sm text-gray-800 cursor-pointer leading-relaxed font-medium"
              >
                <strong className="text-blue-700">Autorizo o contato</strong> da Yeslaser comigo via WhatsApp, e-mail ou telefone para agendar minhas sessões, enviar lembretes e informar sobre promoções exclusivas. *
              </Label>
            </div>
            <p className="text-xs text-gray-600 ml-8 mt-1 leading-relaxed">
              Seus dados serão utilizados apenas para comunicação relacionada aos serviços da Yeslaser e você pode cancelar o recebimento de mensagens a qualquer momento.
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-lg py-6 shadow-xl hover:scale-105 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <MessageCircle className="w-6 h-6 mr-2" />
                CADASTRAR E ENTRAR NO GRUPO VIP
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            🔒 Seus dados estão seguros e não serão compartilhados com terceiros.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default VIPRegistrationForm;
